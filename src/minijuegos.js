const { getUsuario, guardarUsuario } = require('./database');

// Partidas activas por grupo: { jid: { tipo, respuesta, jugador, timeout, ... } }
const partidas = new Map();

// ══════════════════════════════════════════
//  BANCO DE PREGUNTAS TRIVIA
// ══════════════════════════════════════════
const TRIVIAS = [
    { p: '¿Cuántos lados tiene un hexágono?',               r: '6' },
    { p: '¿De qué anime es el personaje Goku?',             r: 'dragon ball' },
    { p: '¿Cuál es el país más grande del mundo?',          r: 'rusia' },
    { p: '¿Cuántos colores tiene el arcoíris?',             r: '7' },
    { p: '¿En qué año llegó el hombre a la luna?',          r: '1969' },
    { p: '¿Cuántos continentes hay en la Tierra?',          r: '7' },
    { p: '¿De qué anime es Naruto Uzumaki?',                r: 'naruto' },
    { p: '¿Cuál es el planeta más grande del sistema solar?', r: 'jupiter' },
    { p: '¿Cuántos huesos tiene el cuerpo humano adulto?',  r: '206' },
    { p: '¿De qué anime es Monkey D. Luffy?',               r: 'one piece' },
    { p: '¿Cuál es el elemento químico con símbolo Au?',    r: 'oro' },
    { p: '¿En qué país se inventó el manga?',               r: 'japon' },
    { p: '¿Cuántos jugadores tiene un equipo de fútbol?',   r: '11' },
    { p: '¿De qué anime es Ichigo Kurosaki?',               r: 'bleach' },
    { p: '¿Cuál es la capital de Japón?',                   r: 'tokio' },
    { p: '¿Quién escribió "Don Quijote de la Mancha"?',     r: 'cervantes' },
    { p: '¿Cuántos segundos tiene un minuto?',              r: '60' },
    { p: '¿De qué anime es Levi Ackerman?',                 r: 'attack on titan' },
    { p: '¿Cuál es el metal más liviano?',                  r: 'litio' },
    { p: '¿Cuántas patas tiene una araña?',                 r: '8' },
    { p: '¿De qué anime es Edward Elric?',                  r: 'fullmetal alchemist' },
    { p: '¿Cuál es el océano más grande del mundo?',        r: 'pacifico' },
    { p: '¿Cuántos planetas tiene el sistema solar?',       r: '8' },
    { p: '¿De qué anime es Tanjiro Kamado?',                r: 'demon slayer' },
    { p: '¿En qué continente está Brasil?',                 r: 'america' },
];

// ══════════════════════════════════════════
//  TRIVIA
// ══════════════════════════════════════════
async function cmdTrivia(sock, jid, senderJid) {
    if (partidas.has(jid)) {
        await sock.sendMessage(jid, { text: '⚠️ Ya hay un minijuego activo. Respóndelo primero.' });
        return;
    }
    const q = TRIVIAS[Math.floor(Math.random() * TRIVIAS.length)];
    const premio = Math.floor(Math.random() * 200) + 100;

    const timeout = setTimeout(async () => {
        if (partidas.get(jid)?.tipo === 'trivia') {
            partidas.delete(jid);
            await sock.sendMessage(jid, { text: `⏰ *¡Tiempo agotado!*\nLa respuesta era: *${q.r}*` }).catch(() => {});
        }
    }, 30000);

    partidas.set(jid, { tipo: 'trivia', respuesta: q.r, premio, timeout });

    await sock.sendMessage(jid, {
        text: `🧠 *¡TRIVIA!*\n\n❓ *${q.p}*\n\n💰 Premio: *${premio} ⓃNexCoins*\n⏳ Tienes *30 segundos* para responder.`
    });
}

// ══════════════════════════════════════════
//  MATEMÁTICAS
// ══════════════════════════════════════════
async function cmdMath(sock, jid, senderJid, args = []) {
    if (partidas.has(jid)) {
        await sock.sendMessage(jid, { text: '⚠️ Ya hay un minijuego activo. Termínalo primero.' });
        return;
    }

    // Dificultad: #math facil | normal | dificil
    const dif = (args[0] || 'normal').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let a, b, op, respuesta, segundos, premioBase;

    if (['facil', 'easy', 'f'].includes(dif)) {
        op = ['+', '-'][Math.floor(Math.random() * 2)];
        if (op === '+') { a = Math.floor(Math.random() * 50) + 1; b = Math.floor(Math.random() * 50) + 1; respuesta = a + b; }
        else { a = Math.floor(Math.random() * 50) + 20; b = Math.floor(Math.random() * a); respuesta = a - b; }
        segundos = 25;
        premioBase = 60;
    } else if (['dificil', 'difícil', 'hard', 'd'].includes(dif)) {
        const ops = ['+', '-', '*', '/'];
        op = ops[Math.floor(Math.random() * ops.length)];
        if (op === '+') { a = Math.floor(Math.random() * 5000) + 1000; b = Math.floor(Math.random() * 5000) + 1000; respuesta = a + b; }
        else if (op === '-') { a = Math.floor(Math.random() * 5000) + 1000; b = Math.floor(Math.random() * a); respuesta = a - b; }
        else if (op === '*') { a = Math.floor(Math.random() * 80) + 20; b = Math.floor(Math.random() * 80) + 20; respuesta = a * b; }
        else { b = Math.floor(Math.random() * 20) + 2; respuesta = Math.floor(Math.random() * 50) + 5; a = b * respuesta; }
        segundos = 25;
        premioBase = 250;
    } else {
        // normal (igual al original)
        const ops = ['+', '-', '*'];
        op = ops[Math.floor(Math.random() * ops.length)];
        if (op === '+') { a = Math.floor(Math.random() * 500) + 1; b = Math.floor(Math.random() * 500) + 1; respuesta = a + b; }
        else if (op === '-') { a = Math.floor(Math.random() * 500) + 100; b = Math.floor(Math.random() * a); respuesta = a - b; }
        else { a = Math.floor(Math.random() * 30) + 1; b = Math.floor(Math.random() * 30) + 1; respuesta = a * b; }
        segundos = 20;
        premioBase = 100;
    }

    const opSym = op === '*' ? '×' : op === '/' ? '÷' : op;
    const premio = premioBase + Math.floor(Math.random() * 80);
    const difLabel = ['facil', 'easy', 'f'].includes(dif) ? '🟢 Fácil'
        : ['dificil', 'difícil', 'hard', 'd'].includes(dif) ? '🔴 Difícil' : '🟡 Normal';

    const timeout = setTimeout(async () => {
        if (partidas.get(jid)?.tipo === 'math') {
            partidas.delete(jid);
            await sock.sendMessage(jid, { text: `⏰ *¡Tiempo!*\nLa respuesta era: *${respuesta}*` }).catch(() => {});
        }
    }, segundos * 1000);

    partidas.set(jid, { tipo: 'math', respuesta: String(respuesta), premio, timeout });

    await sock.sendMessage(jid, {
        text: `🧮 *¡MATEMÁTICAS!* — ${difLabel}\n\n🔢 *¿Cuánto es ${a} ${opSym} ${b}?*\n\n💰 Premio: *${premio} ⓃNexCoins*\n⏳ Tienes *${segundos} segundos*\n\n_Modos: #math facil | normal | dificil_`
    });
}

// ══════════════════════════════════════════
//  PIEDRA · PAPEL · TIJERA (#ppt)
// ══════════════════════════════════════════
async function cmdPpt(sock, jid, senderJid, args = []) {
    const eleccion = (args[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const opciones = {
        piedra: '🪨', roca: '🪨', rock: '🪨', r: '🪨',
        papel: '📄', paper: '📄', p: '📄',
        tijera: '✂️', tijeras: '✂️', scissors: '✂️', t: '✂️', s: '✂️'
    };
    if (!opciones[eleccion]) {
        await sock.sendMessage(jid, {
            text: '❌ Uso: *#ppt [piedra | papel | tijera]*\nEjemplo: *#ppt piedra*'
        });
        return;
    }

    const normalizar = e => {
        if (['piedra', 'roca', 'rock', 'r'].includes(e)) return 'piedra';
        if (['papel', 'paper', 'p'].includes(e)) return 'papel';
        return 'tijera';
    };
    const eleccionUsuario = normalizar(eleccion);
    const elecciones = ['piedra', 'papel', 'tijera'];
    const eleccionBot = elecciones[Math.floor(Math.random() * 3)];
    const emojiUser = opciones[eleccion];
    const emojiBot = opciones[eleccionBot];

    const u = getUsuario(senderJid);
    let resultado, premio = 0;

    if (eleccionUsuario === eleccionBot) {
        resultado = '🤝 *¡EMPATE!*';
    } else if (
        (eleccionUsuario === 'piedra' && eleccionBot === 'tijera') ||
        (eleccionUsuario === 'papel' && eleccionBot === 'piedra') ||
        (eleccionUsuario === 'tijera' && eleccionBot === 'papel')
    ) {
        premio = Math.floor(Math.random() * 100) + 50;
        u.monedas = (u.monedas || 0) + premio;
        if (!u.contadores) u.contadores = {};
        u.contadores.ganadosPpt = (u.contadores.ganadosPpt || 0) + 1;
        guardarUsuario(senderJid, u);
        resultado = `🎉 *¡GANASTE!* +*${premio} ⓃNexCoins*`;
    } else {
        const perdida = Math.floor(Math.random() * 50) + 20;
        const real = Math.min(perdida, u.monedas || 0);
        u.monedas = (u.monedas || 0) - real;
        guardarUsuario(senderJid, u);
        resultado = `😢 *Perdiste* —*${real} ⓃNexCoins*`;
    }

    await sock.sendMessage(jid, {
        text: `✊✋✌️ *PIEDRA · PAPEL · TIJERA*\n\n👤 Tú: ${emojiUser} _${eleccionUsuario}_\n🤖 Bot: ${emojiBot} _${eleccionBot}_\n\n${resultado}\n💰 Saldo: *${u.monedas} ⓃNexCoins*`
    });
}

// ══════════════════════════════════════════
//  ADIVINAR NÚMERO
// ══════════════════════════════════════════
async function cmdGuess(sock, jid, senderJid) {
    if (partidas.has(jid)) {
        await sock.sendMessage(jid, { text: '⚠️ Ya hay un minijuego activo.' });
        return;
    }
    const numero = Math.floor(Math.random() * 100) + 1;
    const premio = Math.floor(Math.random() * 300) + 150;

    const timeout = setTimeout(async () => {
        if (partidas.get(jid)?.tipo === 'guess') {
            partidas.delete(jid);
            await sock.sendMessage(jid, { text: `⏰ *¡Tiempo!*\nEl número era: *${numero}*` }).catch(() => {});
        }
    }, 60000);

    partidas.set(jid, { tipo: 'guess', numero, intentos: 0, premio, timeout });

    await sock.sendMessage(jid, {
        text: `🎯 *¡ADIVINA EL NÚMERO!*\n\nPienso en un número del *1 al 100*.\n¡Tienes *5 intentos* para adivinarlo!\n\n💰 Premio: *${premio} ⓃNexCoins*\n⏳ Tiempo: *60 segundos*\n\n_Escribe solo el número._`
    });
}

// ══════════════════════════════════════════
//  CADENA DE PALABRAS
// ══════════════════════════════════════════
async function cmdWordchain(sock, jid, senderJid) {
    if (partidas.has(jid)) {
        await sock.sendMessage(jid, { text: '⚠️ Ya hay un minijuego activo.' });
        return;
    }
    const palabrasInicio = ['gato', 'amor', 'roca', 'luna', 'cielo', 'plato', 'naranja', 'anime', 'espada', 'dragon'];
    const primera = palabrasInicio[Math.floor(Math.random() * palabrasInicio.length)];
    const usadas = new Set([primera]);
    const ultima = primera.slice(-1);

    partidas.set(jid, {
        tipo: 'wordchain',
        ultimaLetra: ultima,
        usadas,
        participantes: new Map(),
        ronda: 1,
    });

    await sock.sendMessage(jid, {
        text: `🔤 *¡CADENA DE PALABRAS!*\n\nRegla: la siguiente palabra debe comenzar con la última letra de la anterior.\n\n🟢 Palabra inicial: *${primera.toUpperCase()}*\n➡️ Siguiente debe empezar con: *${ultima.toUpperCase()}*\n\n💰 Cada palabra vale *50 ⓃNexCoins*\n_Escribe una palabra para jugar. Usa #stopgame para terminar._`
    });
}

// ══════════════════════════════════════════
//  PROCESAR RESPUESTAS (llamar desde handler)
// ══════════════════════════════════════════
async function procesarRespuesta(sock, jid, senderJid, texto, pushName) {
    const partida = partidas.get(jid);
    if (!partida) return false;

    const respuestaLimpia = texto.trim().toLowerCase();

    // WORDCHAIN - cooldown por usuario
    if (partida.tipo === 'wordchain') {
        const ahora = Date.now();
        const cooldownWC = 3000; // 3 segundos entre palabras por usuario
        const ultimoWC = partida.ultimosUsuarios?.get(senderJid) || 0;
        if (ahora - ultimoWC < cooldownWC) return false; // silencioso, ignorar
    }

    // TRIVIA
    if (partida.tipo === 'trivia') {
        const normalize = s => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
        if (normalize(respuestaLimpia).includes(normalize(partida.respuesta))) {
            clearTimeout(partida.timeout);
            partidas.delete(jid);
            const u = getUsuario(senderJid);
            u.monedas = (u.monedas || 0) + partida.premio;
            if (!u.contadores) u.contadores = {};
            u.contadores.ganadosTrivia = (u.contadores.ganadosTrivia || 0) + 1;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, {
                text: `✅ *¡CORRECTO, @${senderJid.split('@')[0]}!*\n\n🎉 Respuesta: *${partida.respuesta}*\n💰 Ganaste *${partida.premio} ⓃNexCoins*!`,
                mentions: [senderJid]
            });
            return true;
        }
        return false;
    }

    // MATH
    if (partida.tipo === 'math') {
        if (respuestaLimpia === partida.respuesta) {
            clearTimeout(partida.timeout);
            partidas.delete(jid);
            const u = getUsuario(senderJid);
            u.monedas = (u.monedas || 0) + partida.premio;
            if (!u.contadores) u.contadores = {};
            u.contadores.ganadosMath = (u.contadores.ganadosMath || 0) + 1;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, {
                text: `✅ *¡CORRECTO, @${senderJid.split('@')[0]}!*\n\n💰 Ganaste *${partida.premio} ⓃNexCoins*!`,
                mentions: [senderJid]
            });
            return true;
        }
        return false;
    }

    // GUESS
    if (partida.tipo === 'guess') {
        const num = parseInt(respuestaLimpia);
        if (isNaN(num) || num < 1 || num > 100) return false;
        partida.intentos++;
        if (num === partida.numero) {
            clearTimeout(partida.timeout);
            partidas.delete(jid);
            const u = getUsuario(senderJid);
            u.monedas = (u.monedas || 0) + partida.premio;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, {
                text: `🎯 *¡ADIVINASTE, @${senderJid.split('@')[0]}!*\n\nEl número era *${num}* ✅\n💰 Ganaste *${partida.premio} ⓃNexCoins*!`,
                mentions: [senderJid]
            });
            return true;
        }
        if (partida.intentos >= 5) {
            clearTimeout(partida.timeout);
            partidas.delete(jid);
            await sock.sendMessage(jid, { text: `❌ Sin más intentos. El número era *${partida.numero}*` });
            return true;
        }
        const pista = num < partida.numero ? '📈 ¡Más alto!' : '📉 ¡Más bajo!';
        await sock.sendMessage(jid, {
            text: `${pista} Intento *${partida.intentos}/5*`
        });
        return true;
    }

    // WORDCHAIN
    if (partida.tipo === 'wordchain') {
        const ahora = Date.now();
        const palabra = respuestaLimpia.replace(/[^a-záéíóúüñ]/gi, '').toLowerCase();
        if (!palabra || palabra.length < 2) return false;
        if (!palabra.startsWith(partida.ultimaLetra)) return false;
        if (partida.usadas.has(palabra)) {
            await sock.sendMessage(jid, { text: `❌ "*${palabra}*" ya fue usada. Elige otra.` });
            return true;
        }
        // Registrar cooldown del usuario
        if (!partida.ultimosUsuarios) partida.ultimosUsuarios = new Map();
        partida.ultimosUsuarios.set(senderJid, ahora);
        partida.usadas.add(palabra);
        partida.ultimaLetra = palabra.slice(-1);
        partida.ronda++;
        const u = getUsuario(senderJid);
        u.monedas = (u.monedas || 0) + 50;
        guardarUsuario(senderJid, u);
        if (!partida.participantes) partida.participantes = new Map();
        partida.participantes.set(senderJid, (partida.participantes.get(senderJid) || 0) + 1);
        // Máximo 150 palabras por sesión
        const MAX_PALABRAS = 150;
        if (partida.ronda > MAX_PALABRAS) {
            clearTimeout(partida.timeout);
            partidas.delete(jid);
            let top = `🏆 *¡Cadena de ${MAX_PALABRAS} palabras completada!*\n\n`;
            partida.participantes.forEach((puntos, uid) => {
                top += `@${uid.split('@')[0]}: *${puntos}* palabras (+${puntos * 50} ⓃNC)\n`;
            });
            await sock.sendMessage(jid, { text: top, mentions: [...partida.participantes.keys()] });
            return true;
        }
        await sock.sendMessage(jid, {
            text: `✅ *${palabra.toUpperCase()}* — +50 ⓃNC a @${senderJid.split('@')[0]}\n➡️ Siguiente: empieza con *${partida.ultimaLetra.toUpperCase()}* | Ronda *${partida.ronda}/${MAX_PALABRAS}*`,
            mentions: [senderJid]
        });
        return true;
    }

    return false;
}

async function cmdStopGame(sock, jid, senderJid) {
    const partida = partidas.get(jid);
    if (!partida) {
        await sock.sendMessage(jid, { text: '❌ No hay ningún minijuego activo.' });
        return;
    }
    if (partida.timeout) clearTimeout(partida.timeout);
    if (partida.tipo === 'wordchain' && partida.participantes?.size > 0) {
        let top = '🏆 *Resultados de la cadena:*\n';
        partida.participantes.forEach((puntos, uid) => {
            top += `\n@${uid.split('@')[0]}: *${puntos}* palabras (+${puntos * 50} ⓃNexCoins)`;
        });
        partidas.delete(jid);
        await sock.sendMessage(jid, { text: top, mentions: [...partida.participantes.keys()] });
        return;
    }
    partidas.delete(jid);
    await sock.sendMessage(jid, { text: '🛑 Minijuego terminado.' });
}

module.exports = { cmdTrivia, cmdMath, cmdGuess, cmdWordchain, cmdStopGame, cmdPpt, procesarRespuesta };
