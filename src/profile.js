const { getUsuario, guardarUsuario, cargarUsuarios } = require('./database');

const axios = require('axios');

async function cmdPerfil(sock, jid, senderJid, mencionados) {
    const objetivo = mencionados && mencionados.length > 0 ? mencionados[0] : senderJid;
    const u = getUsuario(objetivo);
    const generoEmoji = u.genero === 'hombre' ? '♂️' : u.genero === 'mujer' ? '♀️' : '⚧️';

    let parejaText = '💔 _Soltero/a_';
    if (u.pareja) {
        const uPareja = getUsuario(u.pareja);
        const nombrePareja = uPareja.pushName || u.parejaNombre || u.pareja.split('@')[0];
        parejaText = `💑 *${nombrePareja}*`;
    }

    const favText = u.favorito ? `_${u.favorito}_` : '_Sin definir_';
    const logrosCount = (u.logros || []).length;
    const clanText = u.clanId ? `⚔️ *${u.clanId}*` : '_Sin clan_';
    const mascotaText = u.mascota ? `${u.mascota.emoji} *${u.mascota.nombre}* (Nv.${u.mascota.nivel})` : '_Sin mascota_';
    const repText = u.reputacion ?? 0;

    const expSig = (u.nivel || 1) * 100;
    const progreso = Math.min(Math.floor(((u.experiencia || 0) / expSig) * 12), 12);
    const barra = '█'.repeat(progreso) + '░'.repeat(12 - progreso);
    const sep = '═'.repeat(28);
    const nombre = u.pushName || objetivo.split('@')[0];

    const texto =
`╔${sep}╗
   ✦ P E R F I L ✦
╚${sep}╝

👤 *Usuario*    : @${objetivo.split('@')[0]}
📛 Nombre       : *${nombre}*
${generoEmoji} Género        : ${u.genero ? `*${u.genero}*` : '_No definido_'}
🎂 Cumpleaños   : ${u.cumpleanos ? `*${u.cumpleanos}*` : '_No definido_'}
💬 Bio          : ${u.descripcion ? `_"${u.descripcion}"_` : '_Sin descripción_'}

${sep}
   ⚡ E S T A D Í S T I C A S
${sep}
🎯 Nivel        : *${u.nivel}*
📊 XP           : *${u.experiencia || 0}* / *${expSig}*
       [${barra}]
💬 Mensajes     : *${u.mensajes || 0}*
🏆 Logros       : *${logrosCount}*
⭐ Reputación   : *${repText}*

${sep}
   💰 E C O N O M Í A
${sep}
💵 Cartera      : *${(u.monedas || 0).toLocaleString()} ⓃNC*
🏦 Banco        : *${(u.banco || 0).toLocaleString()} ⓃNC*

${sep}
   💞 S O C I A L
${sep}
💍 Pareja       : ${parejaText}
🏰 Clan         : ${clanText}
⭐ Favorito     : ${favText}
🐾 Mascota      : ${mascotaText}

${sep}
🤖 _Nexus•System ⚡ by Alejx_h_`;

    // Intentar enviar con foto de perfil
    let pfpUrl = null;
    try { pfpUrl = await sock.profilePictureUrl(objetivo, 'image'); } catch {}

    if (pfpUrl) {
        try {
            const img = await axios.get(pfpUrl, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(jid, {
                image: Buffer.from(img.data),
                caption: texto,
                mentions: [objetivo]
            });
            return;
        } catch {}
    }
    await sock.sendMessage(jid, { text: texto, mentions: [objetivo] });
}

async function cmdSetbirth(sock, jid, senderJid, args) {
    const fecha = args[0];
    if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setbirth DD/MM/AAAA\nEjemplo: #setbirth 15/03/2000' });
        return;
    }
    const u = getUsuario(senderJid);
    u.cumpleanos = fecha;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `🎂 Cumpleaños establecido: *${fecha}*` });
}

async function cmdDelbirth(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    u.cumpleanos = null;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: '✅ Tu fecha de cumpleaños fue eliminada.' });
}

async function cmdSetdesc(sock, jid, senderJid, args) {
    const desc = args.join(' ');
    if (!desc) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setdesc [descripción]' });
        return;
    }
    const u = getUsuario(senderJid);
    u.descripcion = desc;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `✅ Descripción actualizada: _${desc}_` });
}

async function cmdSetgenre(sock, jid, senderJid, args) {
    const genero = args[0]?.toLowerCase();
    if (!genero || !['hombre', 'mujer'].includes(genero)) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setgenre hombre | mujer' });
        return;
    }
    const u = getUsuario(senderJid);
    u.genero = genero;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `✅ Género establecido: *${genero}*` });
}

async function cmdDelgenre(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    u.genero = null;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: '✅ Tu género fue eliminado.' });
}

async function cmdSetfav(sock, jid, senderJid, args) {
    const personaje = args.join(' ');
    if (!personaje) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setfav [nombre del personaje]' });
        return;
    }
    const u = getUsuario(senderJid);
    u.favorito = personaje;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `⭐ Personaje favorito establecido: *${personaje}*` });
}

async function cmdMarry(sock, jid, senderJid, mencionados) {
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #marry @usuario' });
        return;
    }
    const objetivo = mencionados[0];
    if (objetivo === senderJid) {
        await sock.sendMessage(jid, { text: '❌ No puedes casarte contigo mismo.' });
        return;
    }
    const uSender = getUsuario(senderJid);
    const uObjetivo = getUsuario(objetivo);
    if (uSender.pareja) {
        await sock.sendMessage(jid, { text: `❌ Ya estás casado/a con @${uSender.pareja.split('@')[0]}. Usa #divorce primero.`, mentions: [uSender.pareja] });
        return;
    }
    if (uObjetivo.pareja) {
        await sock.sendMessage(jid, { text: `❌ @${objetivo.split('@')[0]} ya está casado/a.`, mentions: [objetivo] });
        return;
    }
    uSender.pareja = objetivo;
    uSender.parejaNombre = uObjetivo.pushName || objetivo.split('@')[0];
    uObjetivo.pareja = senderJid;
    uObjetivo.parejaNombre = uSender.pushName || senderJid.split('@')[0];
    guardarUsuario(senderJid, uSender);
    guardarUsuario(objetivo, uObjetivo);
    await sock.sendMessage(jid, {
        text: `💍 ¡@${senderJid.split('@')[0]} y @${objetivo.split('@')[0]} ahora están casados! 🎊\n\n_¡Que sean muy felices!_ 💑`,
        mentions: [senderJid, objetivo]
    });
}

async function cmdDivorce(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    if (!u.pareja) {
        await sock.sendMessage(jid, { text: '❌ No estás casado/a.' });
        return;
    }
    const exPareja = u.pareja;
    const uEx = getUsuario(exPareja);
    u.pareja = null;
    uEx.pareja = null;
    guardarUsuario(senderJid, u);
    guardarUsuario(exPareja, uEx);
    await sock.sendMessage(jid, {
        text: `💔 @${senderJid.split('@')[0]} se divorció de @${exPareja.split('@')[0]}`,
        mentions: [senderJid, exPareja]
    });
}

async function cmdLevel(sock, jid, senderJid, mencionados) {
    const objetivo = mencionados && mencionados.length > 0 ? mencionados[0] : senderJid;
    const u = getUsuario(objetivo);
    const expParaSiguiente = u.nivel * 100;
    const progreso = Math.min(Math.floor((u.experiencia / expParaSiguiente) * 10), 10);
    const barra = '█'.repeat(progreso) + '░'.repeat(10 - progreso);
    await sock.sendMessage(jid, {
        text: `⭐ *Nivel de @${objetivo.split('@')[0]}*\n\n🎯 Nivel: *${u.nivel}*\n📊 XP: ${u.experiencia}/${expParaSiguiente}\n[${barra}]`,
        mentions: [objetivo]
    });
}

async function cmdLeaderboard(sock, jid) {
    const db = cargarUsuarios();
    const usuarios = Object.entries(db)
        .map(([jid, u]) => ({ jid, nivel: u.nivel || 1, exp: u.experiencia || 0 }))
        .sort((a, b) => b.nivel !== a.nivel ? b.nivel - a.nivel : b.exp - a.exp)
        .slice(0, 10);
    let texto = '╔══════════════════╗\n║   🏆 LEADERBOARD   ║\n╚══════════════════╝\n\n';
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    for (let i = 0; i < usuarios.length; i++) {
        const u = usuarios[i];
        texto += `${medallas[i]} @${u.jid.split('@')[0]} — Nivel *${u.nivel}*\n`;
    }
    const mentions = usuarios.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

async function cmdCumpleanos(sock, jid) {
    const db = cargarUsuarios();
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const proximos = Object.entries(db)
        .filter(([, u]) => u.cumpleanos)
        .map(([jid, u]) => {
            const [d, m] = u.cumpleanos.split('/');
            return { jid, dia: d, mes: m, cumpleanos: u.cumpleanos };
        })
        .filter(u => u.mes === mes);
    if (proximos.length === 0) {
        await sock.sendMessage(jid, { text: '🎂 No hay cumpleaños este mes.' });
        return;
    }
    let texto = `╔══════════════════╗\n║  🎂 CUMPLEAÑOS    ║\n╚══════════════════╝\n\n`;
    for (const u of proximos) {
        const esHoy = u.dia === dia ? ' ← ¡HOY! 🎉' : '';
        texto += `🎂 @${u.jid.split('@')[0]} — ${u.cumpleanos}${esHoy}\n`;
    }
    const mentions = proximos.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

async function cmdAllBirthdays(sock, jid) {
    const db = cargarUsuarios();
    const todos = Object.entries(db)
        .filter(([, u]) => u.cumpleanos)
        .map(([jid, u]) => ({ jid, cumpleanos: u.cumpleanos }))
        .sort((a, b) => {
            const [da, ma] = a.cumpleanos.split('/').map(Number);
            const [db2, mb] = b.cumpleanos.split('/').map(Number);
            return ma !== mb ? ma - mb : da - db2;
        });
    if (todos.length === 0) {
        await sock.sendMessage(jid, { text: '🎂 Nadie ha registrado su cumpleaños aún.' });
        return;
    }
    let texto = `╔══════════════════╗\n║  🎂 TODOS LOS CUMPLEAÑOS ║\n╚══════════════════╝\n\n`;
    for (const u of todos) {
        texto += `🎂 @${u.jid.split('@')[0]} — ${u.cumpleanos}\n`;
    }
    const mentions = todos.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

async function cmdGrupoInfo(sock, jid, groupMetadata) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    const admins = groupMetadata.participants.filter(p => p.admin).length;
    const texto = `╔══════════════════╗
║   📊 INFO GRUPO    ║
╚══════════════════╝
📛 Nombre: *${groupMetadata.subject}*
👥 Miembros: *${groupMetadata.participants.length}*
👑 Admins: *${admins}*
🆔 ID: \`${jid}\`
📅 Creado: *${new Date(groupMetadata.creation * 1000).toLocaleDateString('es-ES')}*
📝 Descripción: _${groupMetadata.desc || 'Sin descripción'}_`;
    await sock.sendMessage(jid, { text: texto });
}

module.exports = {
    cmdPerfil, cmdSetbirth, cmdDelbirth, cmdSetdesc, cmdSetgenre, cmdDelgenre,
    cmdSetfav, cmdMarry, cmdDivorce, cmdLevel, cmdLeaderboard,
    cmdCumpleanos, cmdAllBirthdays, cmdGrupoInfo
};
