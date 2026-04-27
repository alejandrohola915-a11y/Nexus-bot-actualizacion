const { getUsuario, guardarUsuario } = require('./database');

const COOLDOWN_REP = 24 * 60 * 60 * 1000; // 1 rep por persona por día

async function cmdDarRep(sock, jid, senderJid, mencionados, pushName) {
    if (!mencionados || !mencionados.length) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#rep @usuario*\nDa +1 de reputación a alguien.' });
        return;
    }
    const targetId = mencionados[0];
    if (targetId === senderJid) {
        await sock.sendMessage(jid, { text: '❌ No puedes darte reputación a ti mismo.' });
        return;
    }
    const u = getUsuario(senderJid);
    if (!u.repDado) u.repDado = {};
    const ahora = Date.now();
    if (u.repDado[targetId] && ahora - u.repDado[targetId] < COOLDOWN_REP) {
        const restante = COOLDOWN_REP - (ahora - u.repDado[targetId]);
        const h = Math.floor(restante / 3600000);
        const m = Math.floor((restante % 3600000) / 60000);
        await sock.sendMessage(jid, { text: `⏳ Ya le diste rep a este usuario hoy.\nVuelve en *${h}h ${m}m*` });
        return;
    }
    const uTarget = getUsuario(targetId);
    uTarget.reputacion = (uTarget.reputacion || 0) + 1;
    guardarUsuario(targetId, uTarget);
    u.repDado[targetId] = ahora;
    guardarUsuario(senderJid, u);
    const nombre = pushName || senderJid.split('@')[0];
    const nombreTarget = targetId.split('@')[0];
    await sock.sendMessage(jid, {
        text: `🎭 *¡+1 Reputación!*\n\n*${nombre}* le dio reputación a *@${nombreTarget}*\n\n📊 Reputación de @${nombreTarget}: *${uTarget.reputacion}*`,
        mentions: [targetId]
    });
}

async function cmdVerRep(sock, jid, senderJid, mencionados) {
    const targetId = (mencionados && mencionados.length) ? mencionados[0] : senderJid;
    const u = getUsuario(targetId);
    const rep = u.reputacion || 0;
    let rango = '🆕 Novato';
    if (rep >= 200) rango = '👑 VIP';
    else if (rep >= 100) rango = '⭐ Estrella';
    else if (rep >= 50) rango = '🎭 Respetado';
    else if (rep >= 20) rango = '👍 Conocido';
    else if (rep >= 5) rango = '🙂 Nuevo';

    const barMax = 20;
    const capRep = Math.min(rep, 200);
    const barLen = Math.round((capRep / 200) * barMax);
    const barra = '█'.repeat(barLen) + '░'.repeat(barMax - barLen);

    await sock.sendMessage(jid, {
        text: `🎭 *Reputación de @${targetId.split('@')[0]}*\n\n📊 Puntos: *${rep}*\n🏅 Rango: *${rango}*\n\n[${barra}] ${rep}/200`,
        mentions: [targetId]
    });
}

async function cmdTopRep(sock, jid) {
    const { cargarUsuarios } = require('./database');
    const db = cargarUsuarios();
    const ranking = Object.entries(db)
        .map(([id, u]) => ({ id, rep: u.reputacion || 0 }))
        .filter(x => x.rep > 0)
        .sort((a, b) => b.rep - a.rep)
        .slice(0, 10);
    if (!ranking.length) {
        await sock.sendMessage(jid, { text: '🎭 Nadie tiene reputación todavía.' });
        return;
    }
    const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const txt = ranking.map((x, i) => `${emojis[i]} @${x.id.split('@')[0]} — *${x.rep} rep*`).join('\n');
    await sock.sendMessage(jid, {
        text: `🎭 *Top 10 Reputación*\n\n${txt}`,
        mentions: ranking.map(x => x.id)
    });
}

module.exports = { cmdDarRep, cmdVerRep, cmdTopRep };
