const { getUsuario, guardarUsuario } = require('./database');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const CLANES_PATH = path.join(__dirname, '../data/clanes.json');

function cargarClanes() {
    fs.ensureDirSync(path.dirname(CLANES_PATH));
    if (!fs.existsSync(CLANES_PATH)) fs.writeJsonSync(CLANES_PATH, {});
    try { return fs.readJsonSync(CLANES_PATH); } catch { return {}; }
}

function guardarClanes(data) {
    fs.ensureDirSync(path.dirname(CLANES_PATH));
    fs.writeJsonSync(CLANES_PATH, data, { spaces: 2 });
}

async function cmdCrearClan(sock, jid, senderJid, args) {
    const nombre = args.join(' ').trim();
    if (!nombre || nombre.length < 3 || nombre.length > 20) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#createguild [nombre]*\nEl nombre debe tener entre 3 y 20 caracteres.' });
        return;
    }
    const u = getUsuario(senderJid);
    if (u.clanId) {
        await sock.sendMessage(jid, { text: `❌ Ya perteneces al clan *${u.clanId}*. Usa *#leaveguild* para salir primero.` });
        return;
    }
    const clanes = cargarClanes();
    const clanIdNorm = nombre.toLowerCase().replace(/\s+/g, '_');
    if (clanes[clanIdNorm]) {
        await sock.sendMessage(jid, { text: `❌ Ya existe un clan con ese nombre.` });
        return;
    }
    const costoCrear = 1000;
    if ((u.monedas || 0) < costoCrear) {
        await sock.sendMessage(jid, { text: `❌ Crear un clan cuesta *${costoCrear} ⓃNexCoins*. Tienes *${u.monedas || 0}*.` });
        return;
    }
    u.monedas -= costoCrear;
    u.clanId = clanIdNorm;
    if (!u.contadores) u.contadores = {};
    u.contadores.clanFundado = true;
    guardarUsuario(senderJid, u);
    clanes[clanIdNorm] = {
        nombre,
        lider: senderJid,
        miembros: [senderJid],
        xp: 0,
        nivel: 1,
        descripcion: null,
        fotoUrl: null,
        creado: Date.now()
    };
    guardarClanes(clanes);
    await sock.sendMessage(jid, {
        text: `🏰 *¡Clan creado exitosamente!*\n\n⚔️ Nombre: *${nombre}*\n👑 Líder: @${senderJid.split('@')[0]}\n💰 Costo: *${costoCrear} ⓃNexCoins*\n\n💡 Tip: Personalízalo con *#editguild desc [texto]* o *#editguild foto* (responde imagen)\n_Invita miembros con *#joinguild ${nombre}*_`,
        mentions: [senderJid]
    });
}

async function cmdUnirClan(sock, jid, senderJid, args) {
    const nombre = args.join(' ').trim();
    if (!nombre) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#joinguild [nombre del clan]*' });
        return;
    }
    const u = getUsuario(senderJid);
    if (u.clanId) {
        await sock.sendMessage(jid, { text: `❌ Ya eres miembro del clan *${u.clanId}*. Sal primero con *#leaveguild*` });
        return;
    }
    const clanes = cargarClanes();
    const clanId = nombre.toLowerCase().replace(/\s+/g, '_');
    if (!clanes[clanId]) {
        await sock.sendMessage(jid, { text: `❌ El clan *${nombre}* no existe.` });
        return;
    }
    const clan = clanes[clanId];
    if (clan.miembros.length >= 20) {
        await sock.sendMessage(jid, { text: `❌ El clan *${clan.nombre}* está lleno (máx 20 miembros).` });
        return;
    }
    clan.miembros.push(senderJid);
    u.clanId = clanId;
    guardarUsuario(senderJid, u);
    guardarClanes(clanes);
    await sock.sendMessage(jid, {
        text: `⚔️ *¡Te uniste a ${clan.nombre}!*\n\n👥 Miembros: *${clan.miembros.length}/20*\n👑 Líder: @${clan.lider.split('@')[0]}`,
        mentions: [clan.lider]
    });
}

async function cmdSalirClan(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    if (!u.clanId) {
        await sock.sendMessage(jid, { text: '❌ No perteneces a ningún clan.' });
        return;
    }
    const clanes = cargarClanes();
    const clan = clanes[u.clanId];
    if (clan) {
        if (clan.lider === senderJid && clan.miembros.length > 1) {
            await sock.sendMessage(jid, { text: '❌ Eres el líder. Transfiere el liderazgo primero o disuelve el clan con *#disbandguild*.' });
            return;
        }
        clan.miembros = clan.miembros.filter(m => m !== senderJid);
        if (clan.miembros.length === 0) {
            delete clanes[u.clanId];
        }
        guardarClanes(clanes);
    }
    const nombre = u.clanId;
    u.clanId = null;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `✅ Saliste del clan *${nombre}*.` });
}

async function cmdInfoClan(sock, jid, senderJid, args) {
    const clanes = cargarClanes();
    const u = getUsuario(senderJid);
    const nombre = args.join(' ').trim();
    const clanId = nombre ? nombre.toLowerCase().replace(/\s+/g, '_') : u.clanId;
    if (!clanId) {
        await sock.sendMessage(jid, { text: '❌ No perteneces a ningún clan. Usa *#guildinfo [nombre]* para buscar uno.' });
        return;
    }
    const clan = clanes[clanId];
    if (!clan) {
        await sock.sendMessage(jid, { text: `❌ El clan no existe.` });
        return;
    }
    const descText = clan.descripcion ? `\n📝 _${clan.descripcion}_` : '';
    const txt = `🏰 *${clan.nombre}*${descText}\n\n` +
        `👑 Líder: @${clan.lider.split('@')[0]}\n` +
        `👥 Miembros: *${clan.miembros.length}/20*\n` +
        `⭐ XP: *${clan.xp}* | Nivel: *${clan.nivel}*\n` +
        `📅 Fundado: ${new Date(clan.creado).toLocaleDateString()}\n\n` +
        `👤 *Miembros:*\n` +
        clan.miembros.map(m => `• @${m.split('@')[0]}`).join('\n');

    if (clan.fotoUrl) {
        try {
            await sock.sendMessage(jid, { image: { url: clan.fotoUrl }, caption: txt, mentions: clan.miembros });
            return;
        } catch { }
    }
    await sock.sendMessage(jid, { text: txt, mentions: clan.miembros });
}

async function cmdEditarClan(sock, jid, senderJid, args, msg) {
    const u = getUsuario(senderJid);
    if (!u.clanId) {
        await sock.sendMessage(jid, { text: '❌ No perteneces a ningún clan.' });
        return;
    }
    const clanes = cargarClanes();
    const clan = clanes[u.clanId];
    if (!clan) {
        await sock.sendMessage(jid, { text: '❌ Tu clan no existe.' });
        return;
    }
    if (clan.lider !== senderJid) {
        await sock.sendMessage(jid, { text: '❌ Solo el *líder* del clan puede editarlo.' });
        return;
    }
    const sub = args[0]?.toLowerCase();
    if (sub === 'desc' || sub === 'descripcion' || sub === 'description') {
        const desc = args.slice(1).join(' ').trim();
        if (!desc) {
            await sock.sendMessage(jid, { text: '❌ Uso: *#editguild desc [descripción]*' });
            return;
        }
        if (desc.length > 100) {
            await sock.sendMessage(jid, { text: '❌ La descripción no puede superar 100 caracteres.' });
            return;
        }
        clan.descripcion = desc;
        guardarClanes(clanes);
        await sock.sendMessage(jid, { text: `✅ Descripción del clan actualizada:\n_"${desc}"_` });
        return;
    }
    if (sub === 'foto' || sub === 'foto' || sub === 'imagen') {
        const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = msg?.message?.imageMessage || quoted?.imageMessage;
        if (!imgMsg) {
            await sock.sendMessage(jid, { text: '❌ Responde a una imagen con *#editguild foto* para establecer la foto del clan.' });
            return;
        }
        try {
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            const stream = await downloadContentFromMessage(imgMsg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            // Guardar imagen en disco
            const fotoDir = path.join(__dirname, '../data/clan_fotos');
            fs.ensureDirSync(fotoDir);
            const fotoPath = path.join(fotoDir, `${u.clanId}.jpg`);
            fs.writeFileSync(fotoPath, buffer);
            clan.fotoUrl = fotoPath;
            guardarClanes(clanes);
            await sock.sendMessage(jid, { text: '✅ Foto del clan actualizada.' });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Error guardando la foto: ${err.message}` });
        }
        return;
    }
    await sock.sendMessage(jid, {
        text: `❌ Sub-comandos disponibles:\n• *#editguild desc [texto]* — Cambiar descripción\n• *#editguild foto* — Cambiar foto (responde imagen)`
    });
}

async function cmdGuerraClanes(sock, jid, senderJid, args) {
    const clanes = cargarClanes();
    const u = getUsuario(senderJid);
    if (!u.clanId || !clanes[u.clanId]) {
        await sock.sendMessage(jid, { text: '❌ Necesitas pertenecer a un clan para declarar guerra.' });
        return;
    }
    const nombre = args.join(' ').trim();
    if (!nombre) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#guildbattle [nombre del clan enemigo]*' });
        return;
    }
    const clanEnemigoId = nombre.toLowerCase().replace(/\s+/g, '_');
    if (!clanes[clanEnemigoId]) {
        await sock.sendMessage(jid, { text: `❌ El clan *${nombre}* no existe.` });
        return;
    }
    if (clanEnemigoId === u.clanId) {
        await sock.sendMessage(jid, { text: '❌ No puedes luchar contra tu propio clan.' });
        return;
    }
    const clanA = clanes[u.clanId];
    const clanB = clanes[clanEnemigoId];

    let poderA = clanA.miembros.reduce((acc, uid) => {
        const s = getUsuario(uid).stats || { fuerza: 10, defensa: 10, nivel: 1 };
        return acc + s.fuerza + s.defensa + s.nivel * 5;
    }, 0) + Math.random() * 100;

    let poderB = clanB.miembros.reduce((acc, uid) => {
        const s = getUsuario(uid).stats || { fuerza: 10, defensa: 10, nivel: 1 };
        return acc + s.fuerza + s.defensa + s.nivel * 5;
    }, 0) + Math.random() * 100;

    const ganoA = poderA > poderB;
    const ganador = ganoA ? clanA : clanB;
    const perdedor = ganoA ? clanB : clanA;

    const xpGanancia = 50 * ganador.miembros.length;
    ganador.xp = (ganador.xp || 0) + xpGanancia;
    while (ganador.xp >= ganador.nivel * 1000) {
        ganador.xp -= ganador.nivel * 1000;
        ganador.nivel++;
    }
    guardarClanes(clanes);

    const premioPorMiembro = 200;
    ganador.miembros.forEach(uid => {
        const uu = getUsuario(uid);
        uu.monedas = (uu.monedas || 0) + premioPorMiembro;
        guardarUsuario(uid, uu);
    });

    await sock.sendMessage(jid, {
        text: `⚔️ *¡GUERRA DE CLANES!*\n\n` +
            `🔴 *${clanA.nombre}* (poder: ${Math.round(poderA)})\n` +
            `⚡ VS ⚡\n` +
            `🔵 *${clanB.nombre}* (poder: ${Math.round(poderB)})\n\n` +
            `${'━'.repeat(20)}\n` +
            `🏆 *¡${ganador.nombre} GANA!*\n` +
            `💰 Cada miembro gana *${premioPorMiembro} ⓃNexCoins*\n` +
            `⭐ +${xpGanancia} XP → Clan Nv.*${ganador.nivel}*`
    });
}

async function cmdListaClanes(sock, jid) {
    const clanes = cargarClanes();
    const lista = Object.values(clanes).sort((a, b) => (b.nivel * 1000 + b.xp) - (a.nivel * 1000 + a.xp));
    if (!lista.length) {
        await sock.sendMessage(jid, { text: '🏰 No hay clanes registrados.\n_Crea uno con *#createguild [nombre]*_' });
        return;
    }
    const txt = lista.slice(0, 10).map((c, i) => {
        const desc = c.descripcion ? ` — _${c.descripcion.slice(0, 30)}${c.descripcion.length > 30 ? '...' : ''}_` : '';
        return `${i + 1}. *${c.nombre}* Nv.${c.nivel} | ${c.miembros.length} miembros${desc}`;
    }).join('\n');
    await sock.sendMessage(jid, { text: `🏰 *Top Clanes*\n${'─'.repeat(24)}\n\n${txt}` });
}

module.exports = { cmdCrearClan, cmdUnirClan, cmdSalirClan, cmdInfoClan, cmdEditarClan, cmdGuerraClanes, cmdListaClanes };
