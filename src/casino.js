const { getUsuario, guardarUsuario } = require('./database');

// ══════════════════════════════════════════
//  BLACKJACK
// ══════════════════════════════════════════
const PALOS = ['♠️', '♥️', '♦️', '♣️'];
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function crearBaraja() {
    const b = [];
    for (const p of PALOS) for (const v of VALORES) b.push({ p, v });
    return b.sort(() => Math.random() - 0.5);
}

function valorCarta(v) {
    if (['J', 'Q', 'K'].includes(v)) return 10;
    if (v === 'A') return 11;
    return parseInt(v);
}

function calcularMano(mano) {
    let total = mano.reduce((a, c) => a + valorCarta(c.v), 0);
    let ases = mano.filter(c => c.v === 'A').length;
    while (total > 21 && ases > 0) { total -= 10; ases--; }
    return total;
}

function mostrarMano(mano, ocultar = false) {
    if (ocultar) return `${mano[0].p}${mano[0].v} | ??`;
    return mano.map(c => `${c.p}${c.v}`).join(' ');
}

// Partidas activas de BJ
const partidas_bj = new Map();

async function cmdBlackjack(sock, jid, senderJid, args) {
    const apuesta = parseInt(args[0]);
    if (isNaN(apuesta) || apuesta < 10) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#blackjack [apuesta]*\nMínimo: 10 ⓃNexCoins\nEj: *#blackjack 200*' });
        return;
    }
    if (partidas_bj.has(senderJid)) {
        await sock.sendMessage(jid, { text: '⚠️ Ya tienes una partida activa.\nUsa *#hit* o *#stand*' });
        return;
    }
    const u = getUsuario(senderJid);
    if ((u.monedas || 0) < apuesta) {
        await sock.sendMessage(jid, { text: `❌ No tienes suficientes ⓃNexCoins. Tienes *${u.monedas}*.` });
        return;
    }
    u.monedas -= apuesta;
    guardarUsuario(senderJid, u);

    const baraja = crearBaraja();
    const jugador = [baraja.pop(), baraja.pop()];
    const dealer = [baraja.pop(), baraja.pop()];

    const timeout = setTimeout(async () => {
        if (partidas_bj.has(senderJid)) {
            const p = partidas_bj.get(senderJid);
            partidas_bj.delete(senderJid);
            const uu = getUsuario(senderJid);
            await sock.sendMessage(jid, { text: `⏰ *Tiempo agotado* en tu blackjack. Perdiste *${p.apuesta} ⓃNexCoins*.` }).catch(() => {});
        }
    }, 120000);

    partidas_bj.set(senderJid, { jugador, dealer, baraja, apuesta, jid, timeout });

    const pj = calcularMano(jugador);
    if (pj === 21) {
        partidas_bj.delete(senderJid);
        clearTimeout(timeout);
        const ganancia = Math.floor(apuesta * 2.5);
        const uu = getUsuario(senderJid);
        uu.monedas = (uu.monedas || 0) + ganancia;
        if (!uu.contadores) uu.contadores = {};
        uu.contadores.victoriasBJ = (uu.contadores.victoriasBJ || 0) + 1;
        guardarUsuario(senderJid, uu);
        await sock.sendMessage(jid, {
            text: `🃏 *BLACKJACK*\n\n🎉 *¡BLACKJACK NATURAL! ×2.5*\n\n🃏 Tu mano: ${mostrarMano(jugador)} = *21*\n\n💰 Ganaste *${ganancia} ⓃNexCoins*!`
        });
        return;
    }
    await sock.sendMessage(jid, {
        text: `🃏 *BLACKJACK* (apuesta: ${apuesta} ⓃNexCoins)\n\n🎰 Dealer: ${mostrarMano(dealer, true)}\n🃏 Tú: ${mostrarMano(jugador)} = *${pj}*\n\n_*#hit* para pedir carta | *#stand* para plantarte_`
    });
}

async function cmdHit(sock, jid, senderJid) {
    if (!partidas_bj.has(senderJid)) {
        await sock.sendMessage(jid, { text: '❌ No tienes una partida de blackjack activa. Usa *#blackjack [apuesta]*' });
        return;
    }
    const p = partidas_bj.get(senderJid);
    if (p.jid !== jid) return;
    p.jugador.push(p.baraja.pop());
    const pj = calcularMano(p.jugador);
    if (pj > 21) {
        clearTimeout(p.timeout);
        partidas_bj.delete(senderJid);
        await sock.sendMessage(jid, {
            text: `🃏 *BLACKJACK*\n\n🃏 Tú: ${mostrarMano(p.jugador)} = *${pj}*\n\n💀 *¡Te pasaste!* Perdiste *${p.apuesta} ⓃNexCoins*`
        });
        return;
    }
    if (pj === 21) {
        await cmdStand(sock, jid, senderJid);
        return;
    }
    await sock.sendMessage(jid, {
        text: `🃏 *BLACKJACK*\n\n🎰 Dealer: ${mostrarMano(p.dealer, true)}\n🃏 Tú: ${mostrarMano(p.jugador)} = *${pj}*\n\n_*#hit* para pedir | *#stand* para plantarte_`
    });
}

async function cmdStand(sock, jid, senderJid) {
    if (!partidas_bj.has(senderJid)) {
        await sock.sendMessage(jid, { text: '❌ No tienes una partida activa.' });
        return;
    }
    const p = partidas_bj.get(senderJid);
    if (p.jid !== jid) return;
    clearTimeout(p.timeout);
    partidas_bj.delete(senderJid);

    // Dealer saca hasta 17+
    while (calcularMano(p.dealer) < 17) p.dealer.push(p.baraja.pop());

    const pj = calcularMano(p.jugador);
    const pd = calcularMano(p.dealer);
    const u = getUsuario(senderJid);

    let resultado = '';
    let ganancia = 0;
    if (pd > 21 || pj > pd) {
        ganancia = p.apuesta * 2;
        u.monedas = (u.monedas || 0) + ganancia;
        if (!u.contadores) u.contadores = {};
        u.contadores.victoriasBJ = (u.contadores.victoriasBJ || 0) + 1;
        resultado = `🏆 *¡GANASTE!* +${ganancia} ⓃNexCoins`;
    } else if (pj === pd) {
        ganancia = p.apuesta;
        u.monedas = (u.monedas || 0) + ganancia;
        resultado = `🤝 *¡EMPATE!* Te devolvemos ${ganancia} ⓃNexCoins`;
    } else {
        resultado = `💀 *Dealer gana.* Perdiste ${p.apuesta} ⓃNexCoins`;
    }
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, {
        text: `🃏 *BLACKJACK - Resultado*\n\n🎰 Dealer: ${mostrarMano(p.dealer)} = *${pd > 21 ? 'BUST' : pd}*\n🃏 Tú: ${mostrarMano(p.jugador)} = *${pj}*\n\n${resultado}\n💰 Saldo: *${u.monedas}*`
    });
}

// ══════════════════════════════════════════
//  SLOTS
// ══════════════════════════════════════════
const SIMBOLOS = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣', '🎰'];
const JACKPOT_POOL = { monto: 5000 };

async function cmdSlots(sock, jid, senderJid, args) {
    const apuesta = parseInt(args[0]) || 100;
    if (apuesta < 50) {
        await sock.sendMessage(jid, { text: '❌ Apuesta mínima de slots: *50 ⓃNexCoins*\nEj: *#slots 200*' });
        return;
    }
    const u = getUsuario(senderJid);
    if ((u.monedas || 0) < apuesta) {
        await sock.sendMessage(jid, { text: `❌ No tienes suficientes ⓃNexCoins. Tienes *${u.monedas || 0}*.` });
        return;
    }
    u.monedas -= apuesta;
    JACKPOT_POOL.monto += Math.floor(apuesta * 0.1);
    if (!u.contadores) u.contadores = {};
    u.contadores.slotsJugados = (u.contadores.slotsJugados || 0) + 1;

    const s1 = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
    const s2 = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
    const s3 = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];

    let ganancia = 0;
    let msg = '';

    await sock.sendMessage(jid, { text: `🎰 *¡Girando...*\n\n┌──────────────┐\n│ 🎲 🎲 🎲 │\n└──────────────┘\n_Espera..._` });
    await new Promise(r => setTimeout(r, 1500));

    if (s1 === s2 && s2 === s3) {
        if (s1 === '7️⃣') {
            ganancia = JACKPOT_POOL.monto;
            u.contadores.jackpotsGanados = (u.contadores.jackpotsGanados || 0) + 1;
            JACKPOT_POOL.monto = 5000;
            msg = `🎉🎉🎉 *¡¡¡JACKPOT!!!* 🎉🎉🎉\n💰 ¡Ganaste *${ganancia} ⓃNexCoins*!`;
        } else if (s1 === '💎') {
            ganancia = apuesta * 10;
            msg = `💎 *¡TRIPLE DIAMANTE! ×10*\n💰 +*${ganancia} ⓃNexCoins*!`;
        } else if (s1 === '⭐') {
            ganancia = apuesta * 5;
            msg = `⭐ *¡TRIPLE ESTRELLA! ×5*\n💰 +*${ganancia} ⓃNexCoins*!`;
        } else {
            ganancia = apuesta * 3;
            msg = `🎰 *¡TRIPLE! ×3*\n💰 +*${ganancia} ⓃNexCoins*!`;
        }
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        ganancia = Math.floor(apuesta * 1.5);
        msg = `✨ *¡PAR! ×1.5*\n💰 +*${ganancia} ⓃNexCoins*`;
    } else {
        ganancia = 0;
        msg = `💀 *Sin suerte...*\nPerdiste *${apuesta} ⓃNexCoins*`;
    }

    u.monedas = (u.monedas || 0) + ganancia;
    guardarUsuario(senderJid, u);

    await sock.sendMessage(jid, {
        text: `🎰 *SLOTS*\n\n┌──────────────┐\n│  ${s1} ${s2} ${s3}  │\n└──────────────┘\n\n${msg}\n💰 Saldo: *${u.monedas}*\n🎰 Jackpot actual: *${JACKPOT_POOL.monto} ⓃNexCoins*`
    });
}

async function cmdJackpot(sock, jid) {
    await sock.sendMessage(jid, {
        text: `🎰 *Jackpot actual*\n\n💰 *${JACKPOT_POOL.monto} ⓃNexCoins*\n\n_Gana el jackpot sacando 7️⃣7️⃣7️⃣ en *#slots*_\n_El pozo crece un 10% con cada jugada_`
    });
}

module.exports = { cmdBlackjack, cmdHit, cmdStand, cmdSlots, cmdJackpot };
