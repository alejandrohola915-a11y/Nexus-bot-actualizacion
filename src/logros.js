const { getUsuario, guardarUsuario } = require('./database');

// ══════════════════════════════════════════
//  BASE DE DATOS DE LOGROS
// ══════════════════════════════════════════
const LOGROS_DB = {
    // Economía
    primer_saldo:    { nombre: '💰 Primer NexCoin',      desc: 'Ganaste tu primera moneda',                  icono: '💰', secreto: false },
    rico:            { nombre: '🤑 Rico',                 desc: 'Acumula 10,000 NexCoins',                   icono: '🤑', secreto: false },
    millonario:      { nombre: '💎 Millonario',           desc: 'Acumula 100,000 NexCoins',                  icono: '💎', secreto: true  },
    primer_trabajo:  { nombre: '💼 Empleado',             desc: 'Trabajaste por primera vez',                icono: '💼', secreto: false },
    empleado_mes:    { nombre: '🏅 Empleado del mes',     desc: 'Trabaja 20 veces',                          icono: '🏅', secreto: false },
    primer_crimen:   { nombre: '🦹 Criminal debutante',   desc: 'Cometiste tu primer crimen',                icono: '🦹', secreto: false },
    primer_robo:     { nombre: '🧤 Ladrón',               desc: 'Robaste exitosamente por primera vez',      icono: '🧤', secreto: false },
    maestro_ladron:  { nombre: '🎭 Maestro ladrón',       desc: 'Roba 10 veces exitosamente',                icono: '🎭', secreto: false },
    apostador:       { nombre: '🎲 Apostador',            desc: 'Ganaste tu primera apuesta',                icono: '🎲', secreto: false },
    lo_perdio_todo:  { nombre: '💀 Todo o nada... nada',  desc: 'Perdiste todo en la ruleta (secreto)',      icono: '💀', secreto: true  },
    // Gacha
    primer_waifu:    { nombre: '💖 Primer Waifu',         desc: 'Conseguiste tu primer personaje',           icono: '💖', secreto: false },
    coleccionista:   { nombre: '📚 Coleccionista',        desc: 'Tiene 10 personajes en el harem',           icono: '📚', secreto: false },
    harem_master:    { nombre: '👑 Harem Master',         desc: 'Tiene 25 personajes en el harem',           icono: '👑', secreto: true  },
    // Combate
    primer_combate:  { nombre: '⚔️ Primer combate',       desc: 'Participaste en un PVP',                    icono: '⚔️', secreto: false },
    campeon:         { nombre: '🏆 Campeón',              desc: 'Gana 5 combates PVP',                       icono: '🏆', secreto: false },
    leyenda:         { nombre: '⭐ Leyenda',              desc: 'Gana 20 combates PVP',                      icono: '⭐', secreto: true  },
    // Social
    reputado:        { nombre: '🎭 Respetado',            desc: 'Alcanza 50 de reputación',                  icono: '🎭', secreto: false },
    vip:             { nombre: '👑 VIP',                  desc: 'Alcanza 200 de reputación',                 icono: '👑', secreto: true  },
    // Minijuegos
    matematico:      { nombre: '🧮 Matemático',           desc: 'Gana 5 partidas de matemáticas',            icono: '🧮', secreto: false },
    sabio:           { nombre: '📖 Sabio del trivia',     desc: 'Responde 5 trivias correctamente',          icono: '📖', secreto: false },
    // Misiones
    misionero:       { nombre: '🎯 Misionero',            desc: 'Completa 10 misiones',                      icono: '🎯', secreto: false },
    // Casino
    jackpot_win:     { nombre: '🎰 ¡JACKPOT!',           desc: 'Ganaste el jackpot en slots (secreto)',     icono: '🎰', secreto: true  },
    bj_pro:          { nombre: '🃏 Blackjack Pro',        desc: 'Gana 5 partidas de blackjack',              icono: '🃏', secreto: false },
    // Banco
    inversor:        { nombre: '📈 Inversor',             desc: 'Realizaste tu primera inversión',           icono: '📈', secreto: false },
    prestamista:     { nombre: '💸 Deudor pagado',        desc: 'Pagaste un préstamo a tiempo',              icono: '💸', secreto: false },
    // Clanes
    fundador:        { nombre: '🏰 Fundador',             desc: 'Creaste un clan',                           icono: '🏰', secreto: false },
    // Mascota
    dueño:           { nombre: '🐾 Dueño de mascota',     desc: 'Adoptaste una mascota',                     icono: '🐾', secreto: false },
    // Primero
    primer_logro:    { nombre: '🌟 ¡Primeros pasos!',     desc: 'Desbloqueaste tu primer logro',             icono: '🌟', secreto: false },
};

// ══════════════════════════════════════════
//  VERIFICAR LOGROS
// ══════════════════════════════════════════
function verificarLogros(u, filtro = null) {
    const nuevos = [];
    if (!u.logros) u.logros = [];
    if (!u.contadores) u.contadores = {};

    const check = (id) => {
        if (filtro && !filtro.includes(id)) return;
        if (!u.logros.includes(id) && LOGROS_DB[id]) {
            u.logros.push(id);
            nuevos.push(id);
        }
    };

    const total = (u.monedas || 0) + (u.banco || 0);
    const c = u.contadores;

    if (total >= 1)       check('primer_saldo');
    if (total >= 10000)   check('rico');
    if (total >= 100000)  check('millonario');
    if (u.ultimoTrabajo)  check('primer_trabajo');
    if ((c.trabajos || 0) >= 20)           check('empleado_mes');
    if ((c.crimenes || 0) >= 1)            check('primer_crimen');
    if ((c.robosExitosos || 0) >= 1)       check('primer_robo');
    if ((c.robosExitosos || 0) >= 10)      check('maestro_ladron');
    if ((c.apuestasGanadas || 0) >= 1)     check('apostador');
    if ((c.ruletaPerdidas || 0) >= 1 && (u.monedas || 0) === 0) check('lo_perdio_todo');

    if ((u.harem || []).length >= 1)  check('primer_waifu');
    if ((u.harem || []).length >= 10) check('coleccionista');
    if ((u.harem || []).length >= 25) check('harem_master');

    if ((c.combates || 0) >= 1)     check('primer_combate');
    if ((c.victorias || 0) >= 5)    check('campeon');
    if ((c.victorias || 0) >= 20)   check('leyenda');

    if ((u.reputacion || 0) >= 50)  check('reputado');
    if ((u.reputacion || 0) >= 200) check('vip');

    if ((c.ganadosMath || 0) >= 5)   check('matematico');
    if ((c.ganadosTrivia || 0) >= 5) check('sabio');
    if ((c.misionesOK || 0) >= 10)   check('misionero');
    if ((c.jackpotsGanados || 0) >= 1)  check('jackpot_win');
    if ((c.victoriasBJ || 0) >= 5)   check('bj_pro');
    if ((c.inversiones || 0) >= 1)   check('inversor');
    if ((c.prestamosOK || 0) >= 1)   check('prestamista');
    if (c.clanFundado)               check('fundador');
    if (u.mascota)                   check('dueño');

    if (nuevos.length > 0 && !u.logros.includes('primer_logro')) {
        u.logros.push('primer_logro');
        nuevos.push('primer_logro');
    }
    return nuevos;
}

// Mapa de contextos a los logros que se deben verificar
const CONTEXTO_LOGROS = {
    work:       ['primer_trabajo', 'empleado_mes', 'primer_saldo', 'rico', 'millonario'],
    crime:      ['primer_crimen', 'primer_saldo', 'rico', 'millonario'],
    steal:      ['primer_robo', 'maestro_ladron'],
    coinflip:   ['apostador'],
    roulette:   ['apostador', 'lo_perdio_todo'],
    fight:      ['primer_combate', 'campeon', 'leyenda'],
    train:      [],
    rep:        ['reputado', 'vip'],
    missions:   [],
    claimmission: ['misionero'],
    blackjack:  ['bj_pro'],
    slots:      ['jackpot_win'],
    invest:     ['inversor'],
    gacha:      ['primer_waifu', 'coleccionista', 'harem_master'],
    pet:        ['dueño'],
    clan:       ['fundador'],
    daily:      ['primer_saldo', 'rico'],
    general:    Object.keys(LOGROS_DB),
};

async function verificarYNotificar(sock, jid, userId, u, contexto = 'general') {
    const filtro = CONTEXTO_LOGROS[contexto] || CONTEXTO_LOGROS.general;
    const nuevos = verificarLogros(u, filtro);
    if (nuevos.length) {
        guardarUsuario(userId, u);
        const textos = nuevos.map(id => `${LOGROS_DB[id].icono} *${LOGROS_DB[id].nombre}*\n_${LOGROS_DB[id].desc}_`).join('\n\n');
        await sock.sendMessage(jid, { text: `🏆 *¡LOGRO DESBLOQUEADO!*\n\n${textos}` });
    }
}

// ══════════════════════════════════════════
//  COMANDOS
// ══════════════════════════════════════════
async function cmdLogros(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const logros = u.logros || [];
    const total = Object.keys(LOGROS_DB).length;
    if (!logros.length) {
        await sock.sendMessage(jid, { text: `🏆 *Mis logros (0/${total})*\n\nAún no tienes logros.\n_¡Juega, trabaja, roba y combate para desbloquearlos!_` });
        return;
    }
    const texto = logros.map(id => {
        const l = LOGROS_DB[id];
        return l ? `${l.icono} *${l.nombre}*` : null;
    }).filter(Boolean).join('\n');
    await sock.sendMessage(jid, { text: `🏆 *Mis logros (${logros.length}/${total})*\n\n${texto}` });
}

async function cmdListaLogros(sock, jid) {
    const publicos = Object.entries(LOGROS_DB).filter(([, l]) => !l.secreto);
    const secretos = Object.entries(LOGROS_DB).filter(([, l]) => l.secreto);
    const texto = publicos.map(([, l]) => `${l.icono} *${l.nombre}* — _${l.desc}_`).join('\n') +
        `\n\n🔒 *${secretos.length} logros secretos* — Descúbrelos tú mismo...`;
    await sock.sendMessage(jid, { text: `🏆 *Lista de logros (${publicos.length} visibles)*\n\n${texto}` });
}

module.exports = { verificarYNotificar, verificarLogros, cmdLogros, cmdListaLogros, LOGROS_DB };
