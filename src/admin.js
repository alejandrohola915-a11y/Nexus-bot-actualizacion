const { getGrupo, guardarGrupo, getUsuario, guardarUsuario, cargarUsuarios, guardarUsuarios } = require('./database');
const { isOwner } = require('./owners');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');

const IMG_DIR = path.join(__dirname, '../data/images');
fs.ensureDirSync(IMG_DIR);

function safeJidPart(jid) {
    return jid.replace(/[^a-zA-Z0-9]/g, '_');
}

function esAdmin(groupMetadata, jid) {
    if (!groupMetadata) return false;
    const participante = groupMetadata.participants.find(p => p.id === jid);
    return participante && (participante.admin === 'admin' || participante.admin === 'superadmin');
}

// Permite admin del grupo O owner del bot
function esAdminOOwner(groupMetadata, jid) {
    return isOwner(jid) || esAdmin(groupMetadata, jid);
}

// Detecta tipo de media (image/video/gif) desde un mensaje o quoted
function detectarMedia(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (msg.message?.imageMessage) return { tipo: 'image', mediaMsg: msg.message.imageMessage };
    if (quoted?.imageMessage) return { tipo: 'image', mediaMsg: quoted.imageMessage };
    if (msg.message?.videoMessage) {
        const m = msg.message.videoMessage;
        return { tipo: m.gifPlayback ? 'gif' : 'video', mediaMsg: m };
    }
    if (quoted?.videoMessage) {
        const m = quoted.videoMessage;
        return { tipo: m.gifPlayback ? 'gif' : 'video', mediaMsg: m };
    }
    return { tipo: null, mediaMsg: null };
}

async function descargarMedia(mediaMsg, tipo) {
    const tipoBaileys = tipo === 'image' ? 'image' : 'video';
    const stream = await downloadContentFromMessage(mediaMsg, tipoBaileys);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

function esBotAdmin(groupMetadata, botJid) {
    if (!groupMetadata) return false;
    const bot = groupMetadata.participants.find(p => p.id === botJid);
    return bot && (bot.admin === 'admin' || bot.admin === 'superadmin');
}

async function cmdKick(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #kick @usuario' });
        return;
    }
    const objetivo = mencionados[0];
    try {
        await sock.groupParticipantsUpdate(jid, [objetivo], 'remove');
        await sock.sendMessage(jid, {
            text: `🚫 @${objetivo.split('@')[0]} fue expulsado del grupo.`,
            mentions: [objetivo]
        });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude expulsar al usuario. Verifica mis permisos.' });
    }
}

async function cmdPromote(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #promote @usuario' });
        return;
    }
    const objetivo = mencionados[0];
    try {
        await sock.groupParticipantsUpdate(jid, [objetivo], 'promote');
        await sock.sendMessage(jid, {
            text: `⬆️ @${objetivo.split('@')[0]} ahora es *administrador* del grupo. 👑`,
            mentions: [objetivo]
        });
        const g = getGrupo(jid);
        if (g.alertas) {
            await sock.sendMessage(jid, {
                text: `🔔 *Alerta:* @${objetivo.split('@')[0]} fue promovido a administrador.`,
                mentions: [objetivo]
            });
        }
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude promover al usuario. Verifica mis permisos.' });
    }
}

async function cmdDemote(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #demote @usuario' });
        return;
    }
    const objetivo = mencionados[0];
    try {
        await sock.groupParticipantsUpdate(jid, [objetivo], 'demote');
        await sock.sendMessage(jid, {
            text: `⬇️ @${objetivo.split('@')[0]} ya no es administrador del grupo.`,
            mentions: [objetivo]
        });
        const g = getGrupo(jid);
        if (g.alertas) {
            await sock.sendMessage(jid, {
                text: `🔔 *Alerta:* @${objetivo.split('@')[0]} fue removido de administrador.`,
                mentions: [objetivo]
            });
        }
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude degradar al usuario. Verifica mis permisos.' });
    }
}

async function cmdAntilink(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #antilink enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.antilink = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `🔗 Antilink *${opcion === 'enable' || opcion === 'on' ? 'activado ✅' : 'desactivado ❌'}*` });
}

async function verificarAntilink(sock, jid, msg, groupMetadata, senderJid) {
    const g = getGrupo(jid);
    if (!g.antilink) return;
    if (esAdmin(groupMetadata, senderJid)) return;
    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || ''
    );
    const tieneLink = /https?:\/\/|wa\.me\/|chat\.whatsapp\.com\//i.test(texto);
    if (!tieneLink) return;
    try {
        await sock.sendMessage(jid, {
            text: `⚠️ @${senderJid.split('@')[0]} los enlaces no están permitidos en este grupo.`,
            mentions: [senderJid]
        });
        await sock.groupParticipantsUpdate(jid, [senderJid], 'remove');
    } catch {}
}

async function cmdSetwelcome(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const texto = args.join(' ');
    if (!texto) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setwelcome [texto]\nUsa @usuario para mencionar al nuevo miembro.' });
        return;
    }
    const g = getGrupo(jid);
    g.mensajeBienvenida = texto;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Mensaje de bienvenida establecido:\n\n_${texto}_` });
}

async function cmdSetgoodbye(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const texto = args.join(' ');
    if (!texto) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setgoodbye [texto]' });
        return;
    }
    const g = getGrupo(jid);
    g.mensajeDespedida = texto;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Mensaje de despedida establecido:\n\n_${texto}_` });
}

// ── Helper interno: guardar media de bienvenida o despedida ───────────────────
async function guardarMediaBG(sock, jid, groupMetadata, senderJid, msg, modo, soloImagen) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const { tipo, mediaMsg } = detectarMedia(msg);
    if (!mediaMsg) {
        const ejemplo = soloImagen
            ? `❌ Envía o responde una *imagen* con *#set${modo}image*`
            : `❌ Envía o responde *imagen / gif / video (máx 1 min)* con *#setmultimedia${modo}*`;
        await sock.sendMessage(jid, { text: `${ejemplo}\n\nEsa media se enviará cuando alguien ${modo === 'welcome' ? 'entre' : 'salga'} del grupo.` });
        return;
    }
    if (soloImagen && tipo !== 'image') {
        await sock.sendMessage(jid, { text: '❌ Este comando solo acepta *imágenes*. Para video/gif usa *#setmultimedia' + modo + '*.' });
        return;
    }
    if (tipo === 'video' || tipo === 'gif') {
        const segs = Number(mediaMsg.seconds || 0);
        if (segs && segs > 60) {
            await sock.sendMessage(jid, { text: `❌ El video dura *${segs}s*. El máximo permitido es *60 segundos*.` });
            return;
        }
    }
    try {
        const buffer = await descargarMedia(mediaMsg, tipo);
        const ext = tipo === 'image' ? 'jpg' : (tipo === 'gif' ? 'mp4' : 'mp4');
        const filename = `${modo}_${safeJidPart(jid)}.${ext}`;
        const filepath = path.join(IMG_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        const g = getGrupo(jid);
        const campo = modo === 'welcome' ? 'welcomeMedia' : 'goodbyeMedia';
        const campoLegacy = modo === 'welcome' ? 'welcomeImagePath' : 'goodbyeImagePath';
        g[campo] = { tipo, path: filepath };
        // Mantener legacy field solo cuando es imagen
        g[campoLegacy] = tipo === 'image' ? filepath : null;
        guardarGrupo(jid, g);
        const accion = modo === 'welcome' ? 'entre' : 'salga';
        const tipoTxt = tipo === 'image' ? 'imagen' : (tipo === 'gif' ? 'GIF' : 'video');
        await sock.sendMessage(jid, { text: `✅ *${tipoTxt} de ${modo === 'welcome' ? 'bienvenida' : 'despedida'} guardado.*\nSe enviará cuando alguien ${accion} al grupo.\n\n_Usa *#del${modo}image* para quitarlo._` });
    } catch (err) {
        await sock.sendMessage(jid, { text: `❌ No pude guardar la media: ${err.message}` });
    }
}

// ── Imagen / multimedia de bienvenida ────────────────────────────────────────
async function cmdSetWelcomeImage(sock, jid, groupMetadata, senderJid, msg) {
    return guardarMediaBG(sock, jid, groupMetadata, senderJid, msg, 'welcome', true);
}
async function cmdSetMultimediaWelcome(sock, jid, groupMetadata, senderJid, msg) {
    return guardarMediaBG(sock, jid, groupMetadata, senderJid, msg, 'welcome', false);
}

async function cmdDelWelcomeImage(sock, jid, groupMetadata, senderJid) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const g = getGrupo(jid);
    const media = g.welcomeMedia || (g.welcomeImagePath ? { tipo: 'image', path: g.welcomeImagePath } : null);
    if (!media) {
        await sock.sendMessage(jid, { text: '❌ No hay media de bienvenida configurada.' });
        return;
    }
    try { fs.removeSync(media.path); } catch {}
    g.welcomeMedia = null;
    g.welcomeImagePath = null;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: '✅ Media de bienvenida eliminada.' });
}

async function cmdSetGoodbyeImage(sock, jid, groupMetadata, senderJid, msg) {
    return guardarMediaBG(sock, jid, groupMetadata, senderJid, msg, 'goodbye', true);
}
async function cmdSetMultimediaGoodbye(sock, jid, groupMetadata, senderJid, msg) {
    return guardarMediaBG(sock, jid, groupMetadata, senderJid, msg, 'goodbye', false);
}

async function cmdDelGoodbyeImage(sock, jid, groupMetadata, senderJid) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const g = getGrupo(jid);
    const media = g.goodbyeMedia || (g.goodbyeImagePath ? { tipo: 'image', path: g.goodbyeImagePath } : null);
    if (!media) {
        await sock.sendMessage(jid, { text: '❌ No hay media de despedida configurada.' });
        return;
    }
    try { fs.removeSync(media.path); } catch {}
    g.goodbyeMedia = null;
    g.goodbyeImagePath = null;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: '✅ Media de despedida eliminada.' });
}

// ── Limpieza de usuarios ──────────────────────────────────────────────────────
async function cmdLimpiarUsuarios(sock, jid, groupMetadata, senderJid) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    const miembrosJids = new Set(groupMetadata.participants.map(p => p.id));
    const db = cargarUsuarios();
    let eliminados = 0;
    for (const uid of Object.keys(db)) {
        if (uid.endsWith('@s.whatsapp.net') && !miembrosJids.has(uid)) {
            delete db[uid];
            eliminados++;
        }
    }
    guardarUsuarios(db);
    await sock.sendMessage(jid, {
        text: `🧹 *Limpieza completada*\n\n✅ Se eliminaron *${eliminados}* usuario(s) que ya no están en el grupo de la base de datos.\n👥 Miembros activos conservados: *${miembrosJids.size}*`
    });
}

// ── Resto de comandos admin ──────────────────────────────────────────────────
async function cmdWelcome(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #welcome enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.bienvenida = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Bienvenida *${opcion === 'enable' || opcion === 'on' ? 'activada ✅' : 'desactivada ❌'}*` });
}

async function cmdGoodbye(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdminOOwner(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores u owner del bot pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #goodbye enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.despedida = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Despedida *${opcion === 'enable' || opcion === 'on' ? 'activada ✅' : 'desactivada ❌'}*` });
}

async function cmdOnlyadmin(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #onlyadmin enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.soloAdmin = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Modo solo admins *${opcion === 'enable' || opcion === 'on' ? 'activado ✅' : 'desactivado ❌'}*` });
}

async function cmdOpen(sock, jid, groupMetadata, senderJid) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    try {
        await sock.groupSettingUpdate(jid, 'not_announcement');
        await sock.sendMessage(jid, { text: '🔓 Grupo *abierto*. Todos pueden enviar mensajes.' });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude abrir el grupo. Asegúrate de que soy administrador.' });
    }
}

async function cmdClose(sock, jid, groupMetadata, senderJid) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    try {
        await sock.groupSettingUpdate(jid, 'announcement');
        await sock.sendMessage(jid, { text: '🔒 Grupo *cerrado*. Solo los administradores pueden enviar mensajes.' });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude cerrar el grupo. Asegúrate de que soy administrador.' });
    }
}

async function cmdWarn(sock, jid, groupMetadata, senderJid, mencionados, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #warn @usuario [razón]' });
        return;
    }
    const objetivo = mencionados[0];
    const razon = args.filter(a => !a.startsWith('@')).join(' ') || 'Sin razón especificada';
    const g = getGrupo(jid);
    const u = getUsuario(objetivo);
    u.advertencias = (u.advertencias || 0) + 1;
    guardarUsuario(objetivo, u);
    const limite = g.limiteAdvertencias || 3;
    await sock.sendMessage(jid, {
        text: `⚠️ *Advertencia* para @${objetivo.split('@')[0]}\n📝 Razón: ${razon}\n🔢 Advertencias: *${u.advertencias}/${limite}*`,
        mentions: [objetivo]
    });
    if (u.advertencias >= limite) {
        try {
            await sock.groupParticipantsUpdate(jid, [objetivo], 'remove');
            await sock.sendMessage(jid, {
                text: `🚫 @${objetivo.split('@')[0]} fue expulsado por alcanzar el límite de advertencias.`,
                mentions: [objetivo]
            });
            u.advertencias = 0;
            guardarUsuario(objetivo, u);
        } catch {
            await sock.sendMessage(jid, { text: '❌ No pude expulsar al usuario. Verifica mis permisos de administrador.' });
        }
    }
}

async function cmdDelwarn(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #delwarn @usuario' });
        return;
    }
    const objetivo = mencionados[0];
    const u = getUsuario(objetivo);
    if (!u.advertencias || u.advertencias === 0) {
        await sock.sendMessage(jid, { text: `ℹ️ @${objetivo.split('@')[0]} no tiene advertencias.`, mentions: [objetivo] });
        return;
    }
    u.advertencias = Math.max(0, u.advertencias - 1);
    guardarUsuario(objetivo, u);
    const g = getGrupo(jid);
    await sock.sendMessage(jid, {
        text: `✅ Se eliminó una advertencia de @${objetivo.split('@')[0]}\n🔢 Advertencias: *${u.advertencias}/${g.limiteAdvertencias || 3}*`,
        mentions: [objetivo]
    });
}

async function cmdWarns(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const objetivo = mencionados && mencionados.length > 0 ? mencionados[0] : senderJid;
    const u = getUsuario(objetivo);
    const g = getGrupo(jid);
    await sock.sendMessage(jid, {
        text: `⚠️ *Advertencias de @${objetivo.split('@')[0]}*\n🔢 Total: *${u.advertencias || 0}/${g.limiteAdvertencias || 3}*`,
        mentions: [objetivo]
    });
}

async function cmdSetwarnlimit(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const num = parseInt(args[0]);
    if (isNaN(num) || num < 1) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setwarnlimit <número>' });
        return;
    }
    const g = getGrupo(jid);
    g.limiteAdvertencias = num;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Límite de advertencias establecido en *${num}*` });
}

async function cmdTopmensajes(sock, jid) {
    const db = cargarUsuarios();
    const usuarios = Object.entries(db)
        .map(([jid, u]) => ({ jid, mensajes: u.mensajes || 0 }))
        .sort((a, b) => b.mensajes - a.mensajes)
        .slice(0, 10);
    let texto = '╔══════════════════╗\n║  💬 TOP MENSAJES   ║\n╚══════════════════╝\n\n';
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    for (let i = 0; i < usuarios.length; i++) {
        const u = usuarios[i];
        texto += `${medallas[i]} @${u.jid.split('@')[0]} — *${u.mensajes} mensajes*\n`;
    }
    const mentions = usuarios.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

async function cmdAlerts(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #alerts enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.alertas = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `🔔 Alertas de promote/demote *${g.alertas ? 'activadas ✅' : 'desactivadas ❌'}*` });
}

async function cmdToggleEconomy(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #economy enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.economyOn = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `💰 Economía *${g.economyOn ? 'activada ✅' : 'desactivada ❌'}*` });
}

async function cmdToggleGacha(sock, jid, groupMetadata, senderJid, args) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #gacha enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.gachaOn = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `🎴 Gacha *${g.gachaOn ? 'activado ✅' : 'desactivado ❌'}*` });
}

async function cmdToggleNsfw(sock, jid, groupMetadata, senderJid, args) {
    if (!isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner del bot puede activar/desactivar NSFW.' });
        return;
    }
    const opcion = args[0];
    if (!opcion || !['enable', 'disable', 'on', 'off'].includes(opcion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #nsfw enable | disable' });
        return;
    }
    const g = getGrupo(jid);
    g.nsfw = opcion === 'enable' || opcion === 'on';
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `🔞 NSFW *${g.nsfw ? 'activado ✅' : 'desactivado ❌'}*` });
}

async function cmdGroupImage(sock, jid, groupMetadata, senderJid, msg) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = msg.message?.imageMessage || quoted?.imageMessage;
    if (!imgMsg) {
        await sock.sendMessage(jid, { text: '❌ Envía o responde una imagen con *#groupimage*' });
        return;
    }
    try {
        const stream = await downloadContentFromMessage(imgMsg, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.updateProfilePicture(jid, buffer);
        await sock.sendMessage(jid, { text: '✅ Imagen del grupo actualizada.' });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude cambiar la imagen. Necesito ser administrador.' });
    }
}

async function cmdMsgCount(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    const objetivo = mencionados && mencionados.length > 0 ? mencionados[0] : senderJid;
    const u = getUsuario(objetivo);
    await sock.sendMessage(jid, {
        text: `📊 *Estadísticas de @${objetivo.split('@')[0]}*\n\n💬 Mensajes totales: *${u.mensajes || 0}*\n🎯 Nivel: *${u.nivel || 1}*\n⭐ XP: *${u.experiencia || 0}*`,
        mentions: [objetivo]
    });
}

async function cmdTopInactive(sock, jid) {
    const db = cargarUsuarios();
    const usuarios = Object.entries(db)
        .map(([jid, u]) => ({ jid, mensajes: u.mensajes || 0 }))
        .sort((a, b) => a.mensajes - b.mensajes)
        .slice(0, 10);
    let texto = '╔══════════════════╗\n║  😴 TOP INACTIVOS  ║\n╚══════════════════╝\n\n';
    for (let i = 0; i < usuarios.length; i++) {
        const u = usuarios[i];
        texto += `${i + 1}. @${u.jid.split('@')[0]} — *${u.mensajes} mensajes*\n`;
    }
    const mentions = usuarios.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

async function cmdSetPrimary(sock, jid, groupMetadata, senderJid, mencionados) {
    if (!esAdmin(groupMetadata, senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo los administradores pueden usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setprimary @bot' });
        return;
    }
    const g = getGrupo(jid);
    g.botPrimario = mencionados[0];
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, {
        text: `✅ Bot primario establecido: @${mencionados[0].split('@')[0]}`,
        mentions: mencionados
    });
}

// ── #setgpname / #setgpdesc / #setgpbaner ────────────────────────────────
async function cmdSetGpName(sock, jid, groupMetadata, senderJid, args) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    if (!esAdmin(groupMetadata, senderJid) && !isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores pueden cambiar el nombre del grupo.' });
        return;
    }
    const nombre = args.join(' ').trim();
    if (!nombre) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#setgpname [nuevo nombre]*' });
        return;
    }
    try {
        await sock.groupUpdateSubject(jid, nombre);
        await sock.sendMessage(jid, { text: `✅ Nombre del grupo cambiado a:\n*${nombre}*` });
    } catch (err) {
        await sock.sendMessage(jid, { text: `❌ No pude cambiar el nombre: ${err.message}` });
    }
}

async function cmdSetGpDesc(sock, jid, groupMetadata, senderJid, args) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    if (!esAdmin(groupMetadata, senderJid) && !isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: '❌ Solo administradores pueden cambiar la descripción del grupo.' });
        return;
    }
    const desc = args.join(' ').trim();
    if (!desc) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#setgpdesc [nueva descripción]*' });
        return;
    }
    try {
        await sock.groupUpdateDescription(jid, desc);
        await sock.sendMessage(jid, { text: `✅ Descripción del grupo actualizada.` });
    } catch (err) {
        await sock.sendMessage(jid, { text: `❌ No pude cambiar la descripción: ${err.message}` });
    }
}

module.exports = {
    esAdmin, esBotAdmin, verificarAntilink,
    cmdKick, cmdPromote, cmdDemote, cmdAntilink, cmdClose,
    cmdSetwelcome, cmdSetgoodbye, cmdWelcome, cmdGoodbye, cmdOnlyadmin,
    cmdOpen, cmdWarn, cmdDelwarn, cmdWarns, cmdSetwarnlimit, cmdTopmensajes,
    cmdAlerts, cmdToggleEconomy, cmdToggleGacha, cmdToggleNsfw,
    cmdGroupImage, cmdMsgCount, cmdTopInactive, cmdSetPrimary,
    cmdSetWelcomeImage, cmdDelWelcomeImage, cmdSetGoodbyeImage, cmdDelGoodbyeImage,
    cmdSetMultimediaWelcome, cmdSetMultimediaGoodbye,
    cmdLimpiarUsuarios, cmdSetGpName, cmdSetGpDesc, esAdminOOwner
};
