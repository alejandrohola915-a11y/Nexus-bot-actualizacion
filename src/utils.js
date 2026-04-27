const { getGrupo } = require('./database');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');

async function cmdPing(sock, jid) {
    const inicio = Date.now();
    await sock.sendMessage(jid, { text: '🏓 Pong!' });
    const ms = Date.now() - inicio;
    await sock.sendMessage(jid, { text: `⚡ Latencia: *${ms}ms*` });
}

async function cmdStatus(sock, jid) {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const horas = Math.floor(uptime / 3600);
    const minutos = Math.floor((uptime % 3600) / 60);
    const texto = `╔══════════════════╗
║    🤖 ESTADO BOT    ║
╚══════════════════╝
✅ Estado: *Online*
⏱️ Uptime: *${horas}h ${minutos}m*
💾 RAM: *${Math.round(mem.heapUsed / 1024 / 1024)}MB*
🟢 Funcionando correctamente`;
    await sock.sendMessage(jid, { text: texto });
}

async function cmdEliminar(sock, jid, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted || !quoted.stanzaId) {
        await sock.sendMessage(jid, { text: '❌ Responde al mensaje que quieres eliminar.' });
        return;
    }
    try {
        await sock.sendMessage(jid, {
            delete: {
                remoteJid: jid,
                fromMe: false,
                id: quoted.stanzaId,
                participant: quoted.participant
            }
        });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude eliminar ese mensaje. Asegúrate de que soy administrador.' });
    }
}

async function cmdFotoPerfil(sock, jid, senderJid, mencionados) {
    const objetivo = mencionados && mencionados.length > 0 ? mencionados[0] : senderJid;
    try {
        const url = await sock.profilePictureUrl(objetivo, 'image');
        await sock.sendMessage(jid, {
            image: { url },
            caption: `🖼️ Foto de perfil de @${objetivo.split('@')[0]}`,
            mentions: [objetivo]
        });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude obtener la foto de perfil. Es posible que sea privada.' });
    }
}

// ── #tag / #tagall / #hidetag ─────────────────────────────────────────────
// Soporta mayús/minús: #tag mayus mensaje | #tag minus mensaje
// Las menciones son invisibles (no aparece el @número en pantalla) pero notifican.
async function cmdTagAll(sock, jid, groupMetadata, args) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    const participantes = groupMetadata.participants.map(p => p.id);

    let mensaje = args.join(' ');
    const primero = (args[0] || '').toLowerCase();
    if (['mayus', 'mayusculas', 'mayúsculas', 'upper', 'uppercase'].includes(primero)) {
        mensaje = args.slice(1).join(' ').toUpperCase();
    } else if (['minus', 'minusculas', 'minúsculas', 'lower', 'lowercase'].includes(primero)) {
        mensaje = args.slice(1).join(' ').toLowerCase();
    }
    if (!mensaje.trim()) mensaje = '📢 ¡Atención a todos!';

    // Truco: poner los @números en el campo de menciones SIN incluirlos en el texto
    // visible. WhatsApp/Baileys notifica a los JIDs en `mentions` aunque el texto
    // no contenga @número. Para asegurar disparo de notificación en todos los
    // clientes, anexamos los @números rodeados de caracteres invisibles
    // (separador U+2063) que no se renderizan pero sí se contabilizan.
    const cadena = participantes.map(p => `@${p.split('@')[0]}`).join('\u2063');
    const finalText = `${mensaje}\u2063${cadena}\u2063`;

    await sock.sendMessage(jid, {
        text: finalText,
        mentions: participantes
    });
}

// ── Helper: descargar buffer desde un message content ──────────────────────
async function descargarBuffer(mediaMsg, tipo) {
    const stream = await downloadContentFromMessage(mediaMsg, tipo);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// ── Convertir sticker / imagen de una vista / imagen citada a imagen ──────
async function cmdStickerAImagen(sock, jid, msg) {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;

    if (!quoted) {
        await sock.sendMessage(jid, {
            text: '❌ Responde a un sticker, imagen o foto de una vista con *#toimg*.'
        });
        return;
    }

    // Desenvuelve viewOnce si aplica
    const viewOnce = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension;
    const msgContent = viewOnce?.message || quoted;

    const sticker = msgContent.stickerMessage;
    const imagen  = msgContent.imageMessage;
    const video   = msgContent.videoMessage;

    if (!sticker && !imagen && !video) {
        await sock.sendMessage(jid, {
            text: '❌ Responde a un sticker, imagen o foto de una vista con *#toimg*.'
        });
        return;
    }

    try {
        let buffer;
        if (sticker)     buffer = await descargarBuffer(sticker, 'sticker');
        else if (imagen) buffer = await descargarBuffer(imagen, 'image');
        else if (video)  buffer = await descargarBuffer(video, 'video');

        if (!buffer || !buffer.length) throw new Error('buffer vacío');

        await sock.sendMessage(jid, {
            image: buffer,
            caption: '🖼️ ¡Aquí tienes la imagen!'
        });
    } catch (err) {
        console.error('toimg error:', err.message);
        await sock.sendMessage(jid, {
            text: '❌ No pude convertir. Responde directamente al sticker o imagen e inténtalo de nuevo.'
        });
    }
}

async function cmdSuggest(sock, jid, senderJid, args) {
    const nombre = args.join(' ');
    if (!nombre) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#suggest [texto]* o *#sug [texto]*\nEjemplo: #suggest agregar comando música' });
        return;
    }
    const logPath = path.join(__dirname, '../data/sugerencias.json');
    let log = [];
    try { if (fs.existsSync(logPath)) log = fs.readJsonSync(logPath); } catch {}
    log.push({ usuario: senderJid, texto: nombre, fecha: new Date().toISOString() });
    try { fs.writeJsonSync(logPath, log, { spaces: 2 }); } catch {}
    await sock.sendMessage(jid, {
        text: `✅ *Sugerencia registrada:* _${nombre}_\n\n¡Gracias por tu aporte! El owner la revisará pronto. 📋`
    });
}

async function cmdReport(sock, jid, senderJid, args) {
    const texto = args.join(' ');
    if (!texto) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#report [descripción del problema]*' });
        return;
    }
    const logPath = path.join(__dirname, '../data/reportes.json');
    let log = [];
    try { if (fs.existsSync(logPath)) log = fs.readJsonSync(logPath); } catch {}
    log.push({ usuario: senderJid, texto, fecha: new Date().toISOString() });
    try { fs.writeJsonSync(logPath, log, { spaces: 2 }); } catch {}
    await sock.sendMessage(jid, {
        text: `🚨 *Reporte enviado:* _${texto}_\n\nGracias por reportar. El owner lo revisará lo antes posible.`
    });
}

async function cmdBots(sock, jid, groupMetadata) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    const bots = groupMetadata.participants.filter(p =>
        p.id.endsWith('@s.whatsapp.net') && (p.id.includes('bot') || p.isBot)
    );
    await sock.sendMessage(jid, {
        text: `🤖 *Bots activos en el grupo:* ${bots.length > 0 ? bots.map(b => `@${b.id.split('@')[0]}`).join(', ') : 'No se detectaron bots'}\n👥 Total de miembros: ${groupMetadata.participants.length}`
    });
}

async function cmdInvite(sock, jid, groupMetadata) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    try {
        const code = await sock.groupInviteCode(jid);
        await sock.sendMessage(jid, {
            text: `🔗 *Link de invitación del grupo:*\nhttps://chat.whatsapp.com/${code}\n\n_Comparte este link para invitar al bot o a otros usuarios._`
        });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude obtener el link de invitación. Necesito ser administrador.' });
    }
}

// ── #testwelcome / #testgoodbye ──────────────────────────────────────────
// Envía el flujo REAL (texto + imagen si está configurada), no solo preview.
async function cmdTestWelcome(sock, jid, groupMetadata, senderJid, tipo) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    const g = getGrupo(jid);
    const nombre = `@${senderJid.split('@')[0]}`;

    const obtenerMedia = (modo) => {
        const campo = modo === 'welcome' ? 'welcomeMedia' : 'goodbyeMedia';
        const legacy = modo === 'welcome' ? 'welcomeImagePath' : 'goodbyeImagePath';
        if (g[campo] && g[campo].path) return g[campo];
        if (g[legacy]) return { tipo: 'image', path: g[legacy] };
        return null;
    };

    const enviarPrueba = async (caption, media) => {
        if (media && media.path && fs.existsSync(media.path)) {
            try {
                const buf = fs.readFileSync(media.path);
                if (media.tipo === 'image') {
                    await sock.sendMessage(jid, { image: buf, caption, mentions: [senderJid] });
                } else if (media.tipo === 'gif') {
                    await sock.sendMessage(jid, { video: buf, caption, mentions: [senderJid], gifPlayback: true });
                } else {
                    await sock.sendMessage(jid, { video: buf, caption, mentions: [senderJid] });
                }
                return true;
            } catch {}
        }
        return false;
    };

    if (tipo === 'welcome') {
        const texto = (g.mensajeBienvenida || '¡Bienvenido/a @usuario al grupo!').replace('@usuario', nombre);
        const media = obtenerMedia('welcome');
        const ok = await enviarPrueba(`🧪 _(Test bienvenida)_\n\n${texto}`, media);
        if (!ok) {
            await sock.sendMessage(jid, {
                text: `🧪 _(Test bienvenida)_\n\n${texto}\n\n_💡 Usa *#setwelcomeimage* (imagen) o *#setmultimediawelcome* (gif/video, máx 1 min)._`,
                mentions: [senderJid]
            });
        }
    } else {
        const texto = (g.mensajeDespedida || 'Hasta luego @usuario 👋').replace('@usuario', nombre);
        const media = obtenerMedia('goodbye');
        const ok = await enviarPrueba(`🧪 _(Test despedida)_\n\n${texto}`, media);
        if (!ok) {
            await sock.sendMessage(jid, {
                text: `🧪 _(Test despedida)_\n\n${texto}\n\n_💡 Usa *#setgoodbyeimage* (imagen) o *#setmultimediagoodbye* (gif/video, máx 1 min)._`,
                mentions: [senderJid]
            });
        }
    }
}

async function cmdLeave(sock, jid, groupMetadata, senderJid) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    // Cualquier miembro del grupo puede pedirle al bot que se vaya
    const esMiembro = (groupMetadata.participants || []).some(p => p.id === senderJid);
    if (!esMiembro) {
        await sock.sendMessage(jid, { text: '⛔ Solo miembros del grupo pueden usar este comando.' });
        return;
    }
    await sock.sendMessage(jid, {
        text: `👋 Hasta luego! Saliendo del grupo a petición de @${senderJid.split('@')[0]}.`,
        mentions: [senderJid]
    });
    try {
        await sock.groupLeave(jid);
    } catch (e) {
        console.error('Error al salir del grupo:', e.message);
    }
}

// ── #hd / #enhance / #remini — mejorar resolución de una imagen ──────────
// Usa sharp para upscale 2x + sharpen. Es local y gratis (sin API externa).
async function cmdHd(sock, jid, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = msg.message?.imageMessage || quoted?.imageMessage
        || quoted?.viewOnceMessage?.message?.imageMessage
        || quoted?.viewOnceMessageV2?.message?.imageMessage;
    if (!imgMsg) {
        await sock.sendMessage(jid, { text: '❌ Envía o responde a una imagen con *#hd*\nAlias: *#enhance*, *#remini*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⚙️ Mejorando imagen...' });
    try {
        const buffer = await descargarBuffer(imgMsg, 'image');
        const meta = await sharp(buffer).metadata();
        const w = meta.width || 512;
        const h = meta.height || 512;
        const factor = w < 1024 ? 2 : 1.5;
        const targetW = Math.min(Math.round(w * factor), 2048);
        const targetH = Math.min(Math.round(h * factor), 2048);

        const out = await sharp(buffer)
            .resize(targetW, targetH, { kernel: 'lanczos3', fit: 'fill' })
            .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7 })
            .modulate({ saturation: 1.1, brightness: 1.02 })
            .jpeg({ quality: 95 })
            .toBuffer();

        await sock.sendMessage(jid, {
            image: out,
            caption: `✅ *Imagen mejorada* (${w}×${h} → ${targetW}×${targetH})`
        });
    } catch (err) {
        console.error('cmdHd error:', err.message);
        await sock.sendMessage(jid, { text: `❌ No pude mejorar la imagen: ${err.message}` });
    }
}

// ── #read / #readviewonce — revelar mensaje de vista única ───────────────
async function cmdRead(sock, jid, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
        await sock.sendMessage(jid, { text: '❌ Responde al mensaje de *vista única* con *#read*' });
        return;
    }
    const vo = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension;
    const inner = vo?.message || quoted;
    const imgMsg = inner.imageMessage;
    const vidMsg = inner.videoMessage;
    const audMsg = inner.audioMessage;

    if (!imgMsg && !vidMsg && !audMsg) {
        await sock.sendMessage(jid, { text: '❌ El mensaje citado no es de vista única (imagen/video/audio).' });
        return;
    }
    try {
        if (imgMsg) {
            const buf = await descargarBuffer(imgMsg, 'image');
            await sock.sendMessage(jid, { image: buf, caption: imgMsg.caption || '👁️ Vista única revelada' });
        } else if (vidMsg) {
            const buf = await descargarBuffer(vidMsg, 'video');
            await sock.sendMessage(jid, { video: buf, caption: vidMsg.caption || '👁️ Vista única revelada' });
        } else if (audMsg) {
            const buf = await descargarBuffer(audMsg, 'audio');
            await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mp4', ptt: !!audMsg.ptt });
        }
    } catch (err) {
        await sock.sendMessage(jid, { text: `❌ No pude revelar el mensaje: ${err.message}` });
    }
}

module.exports = {
    cmdPing, cmdStatus, cmdEliminar, cmdFotoPerfil, cmdTagAll,
    cmdStickerAImagen, cmdSuggest, cmdReport, cmdBots, cmdInvite,
    cmdTestWelcome, cmdLeave, cmdHd, cmdRead
};
