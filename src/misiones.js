const { getUsuario, guardarUsuario } = require('./database');

const POOL_MISIONES = [
    { id: 'work3',     texto: 'Trabaja 3 veces con #work',          tipo: 'trabajos',       meta: 3,  premio: 500  },
    { id: 'work5',     texto: 'Trabaja 5 veces con #work',          tipo: 'trabajos',       meta: 5,  premio: 900  },
    { id: 'rob2',      texto: 'Roba exitosamente 2 veces',          tipo: 'robosExitosos',  meta: 2,  premio: 600  },
    { id: 'bet3',      texto: 'Gana 3 apuestas (coinflip/ruleta)',  tipo: 'apuestasGanadas',meta: 3,  premio: 700  },
    { id: 'trivia3',   texto: 'Responde 3 trivias correctamente',   tipo: 'ganadosTrivia',  meta: 3,  premio: 400  },
    { id: 'math3',     texto: 'Gana 3 partidas de matemáticas',     tipo: 'ganadosMath',    meta: 3,  premio: 400  },
    { id: 'fight2',    texto: 'Gana 2 combates PVP',                tipo: 'victorias',      meta: 2,  premio: 600  },
    { id: 'train3',    texto: 'Entrena 3 veces con #train',         tipo: 'entrenamientos', meta: 3,  premio: 350  },
    { id: 'crime3',    texto: 'Comete 3 crímenes exitosos',         tipo: 'crimenesOK',     meta: 3,  premio: 550  },
    { id: 'daily1',    texto: 'Reclama tu recompensa diaria',        tipo: 'diarios',        meta: 1,  premio: 200  },
    { id: 'bj1',       texto: 'Gana 1 partida de blackjack',        tipo: 'victoriasBJ',    meta: 1,  premio: 450  },
    { id: 'slots2',    texto: 'Juega slots 2 veces',                tipo: 'slotsJugados',   meta: 2,  premio: 300  },
];

function getDiaNombre() {
    return Math.floor(Date.now() / 86400000);
}

function generarMisiones(userId) {
    const u = getUsuario(userId);
    if (!u.misiones) u.misiones = { dia: 0, lista: [], progreso: {}, reclamadas: [] };
    const hoy = getDiaNombre();
    if (u.misiones.dia !== hoy) {
        // Generar 3 misiones nuevas
        const shuffled = [...POOL_MISIONES].sort(() => Math.random() - 0.5);
        u.misiones.dia = hoy;
        u.misiones.lista = shuffled.slice(0, 3).map(m => m.id);
        u.misiones.progreso = {};
        u.misiones.reclamadas = [];
        // Snapshot de contadores al inicio del día
        u.misiones.snapshot = {};
        const c = u.contadores || {};
        POOL_MISIONES.forEach(m => { u.misiones.snapshot[m.tipo] = c[m.tipo] || 0; });
        guardarUsuario(userId, u);
    }
    return u;
}

async function cmdMisiones(sock, jid, senderJid) {
    const u = generarMisiones(senderJid);
    const hoy = getDiaNombre();
    const c = u.contadores || {};
    const snap = u.misiones.snapshot || {};
    const lista = u.misiones.lista || [];
    const reclamadas = u.misiones.reclamadas || [];

    let txt = `🎯 *Misiones de hoy*\n\n`;
    lista.forEach((id, i) => {
        const m = POOL_MISIONES.find(x => x.id === id);
        if (!m) return;
        const progActual = Math.max(0, (c[m.tipo] || 0) - (snap[m.tipo] || 0));
        const progreso = Math.min(progActual, m.meta);
        const completada = progreso >= m.meta;
        const reclamada = reclamadas.includes(id);
        const estado = reclamada ? '✅' : completada ? '🎁 ¡Lista para reclamar!' : `[${progreso}/${m.meta}]`;
        txt += `${i + 1}. ${reclamada ? '~~' : ''}*${m.texto}*${reclamada ? '~~' : ''}\n`;
        txt += `   💰 Premio: *${m.premio} ⓃNexCoins* | ${estado}\n\n`;
    });
    txt += `_Usa *#claimmission* para reclamar misiones completadas._`;
    await sock.sendMessage(jid, { text: txt });
}

async function cmdClaimMision(sock, jid, senderJid) {
    const u = generarMisiones(senderJid);
    const c = u.contadores || {};
    const snap = u.misiones.snapshot || {};
    const lista = u.misiones.lista || [];
    const reclamadas = u.misiones.reclamadas || [];

    let totalGanado = 0;
    const nuevas = [];

    for (const id of lista) {
        if (reclamadas.includes(id)) continue;
        const m = POOL_MISIONES.find(x => x.id === id);
        if (!m) continue;
        const progActual = Math.max(0, (c[m.tipo] || 0) - (snap[m.tipo] || 0));
        if (progActual >= m.meta) {
            totalGanado += m.premio;
            reclamadas.push(id);
            nuevas.push(m.texto);
        }
    }

    if (!totalGanado) {
        await sock.sendMessage(jid, { text: '❌ No tienes misiones completadas para reclamar.\nUsa *#missions* para ver tu progreso.' });
        return;
    }

    u.misiones.reclamadas = reclamadas;
    u.monedas = (u.monedas || 0) + totalGanado;
    if (!u.contadores) u.contadores = {};
    u.contadores.misionesOK = (u.contadores.misionesOK || 0) + nuevas.length;
    guardarUsuario(senderJid, u);

    const lista_txt = nuevas.map(t => `✅ _${t}_`).join('\n');
    await sock.sendMessage(jid, {
        text: `🎯 *¡Misiones reclamadas!*\n\n${lista_txt}\n\n💰 Total ganado: *+${totalGanado} ⓃNexCoins*\n💳 Saldo: *${u.monedas}*`
    });
}

// Llamar desde otros módulos para trackear progreso
function trackearMision(userId, tipo, cantidad = 1) {
    try {
        const { getUsuario, guardarUsuario } = require('./database');
        const u = getUsuario(userId);
        if (!u.contadores) u.contadores = {};
        u.contadores[tipo] = (u.contadores[tipo] || 0) + cantidad;
        guardarUsuario(userId, u);
    } catch { }
}

module.exports = { cmdMisiones, cmdClaimMision, trackearMision, generarMisiones };
