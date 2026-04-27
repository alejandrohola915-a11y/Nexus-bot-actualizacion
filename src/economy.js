const { getUsuario, guardarUsuario, agregarMonedas, quitarMonedas, cargarUsuarios } = require('./database');
const { getInventario } = require('./items');
const fs = require('fs-extra');
const path = require('path');

function trackear(u, tipo, n = 1) {
    if (!u.contadores) u.contadores = {};
    u.contadores[tipo] = (u.contadores[tipo] || 0) + n;
}

// Verifica si el usuario está en la cárcel
function verificarCarcel(u) {
    if (u.encarcelado && Date.now() < u.encarcelado) {
        const min = Math.ceil((u.encarcelado - Date.now()) / 60000);
        return `⛓️ *¡Estás en la cárcel!* No puedes usar comandos de economía por *${min} minuto(s)*.\n_Paga tu fianza con *#buyitem fianza* (500 coins) o espera._`;
    }
    return null;
}

async function cmdSaldo(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    await sock.sendMessage(jid, {
        text: `💰 *Tus monedas*\n\n👛 Cartera: *${u.monedas} ⓃNexCoins*\n🏦 Banco: *${u.banco || 0} ⓃNexCoins*\n💎 Total: *${u.monedas + (u.banco || 0)} ⓃNexCoins*`
    });
}

async function cmdEconomyInfo(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const db = cargarUsuarios();
    const todos = Object.values(db).map(u2 => (u2.monedas || 0) + (u2.banco || 0)).sort((a, b) => b - a);
    const total = u.monedas + (u.banco || 0);
    const posicion = todos.indexOf(total) + 1;
    const enCarcel = u.encarcelado && Date.now() < u.encarcelado
        ? `⛓️ En la cárcel: *${Math.ceil((u.encarcelado - Date.now()) / 60000)} min*`
        : '🆓 En libertad';
    const texto = `╔══════════════════╗
║   📊 ECONOMY INFO  ║
╚══════════════════╝
👛 Cartera: *${u.monedas} ⓃNexCoins*
🏦 Banco: *${u.banco || 0} ⓃNexCoins*
💎 Total: *${total} ⓃNexCoins*
🏆 Posición: *#${posicion}* de ${todos.length} usuarios
💼 Trabajo: cooldown restante ${u.ultimoTrabajo ? Math.max(0, Math.ceil((2 * 3600000 - (Date.now() - u.ultimoTrabajo)) / 60000)) + 'min' : '¡Listo!'}
🎁 Daily: ${u.ultimoDiario && Date.now() - u.ultimoDiario < 86400000 ? 'Ya reclamado' : '¡Disponible!'}
🦹 Crime: cooldown ${u.ultimoCrimen ? Math.max(0, Math.ceil((1800000 - (Date.now() - u.ultimoCrimen)) / 60000)) + 'min' : '¡Listo!'}
${enCarcel}`;
    await sock.sendMessage(jid, { text: texto });
}

async function cmdDiario(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const un_dia = 24 * 60 * 60 * 1000;
    if (u.ultimoDiario && ahora - u.ultimoDiario < un_dia) {
        const restante = un_dia - (ahora - u.ultimoDiario);
        const horas = Math.floor(restante / 3600000);
        const minutos = Math.floor((restante % 3600000) / 60000);
        await sock.sendMessage(jid, { text: `⏳ Ya recogiste tu diario. Vuelve en *${horas}h ${minutos}m*` });
        return;
    }
    let ganadas = Math.floor(Math.random() * 200) + 100;
    // Verificar evento activo (fin de semana = doble)
    const hoy = new Date();
    if (hoy.getDay() === 0 || hoy.getDay() === 6) ganadas *= 2;
    u.monedas += ganadas;
    u.ultimoDiario = ahora;
    guardarUsuario(senderJid, u);
    const eventoMsg = (hoy.getDay() === 0 || hoy.getDay() === 6) ? '\n🎉 *¡Fin de semana doble!* Recompensa ×2' : '';
    await sock.sendMessage(jid, { text: `🎁 ¡Recibiste *${ganadas} ⓃNexCoins* de tu recompensa diaria!${eventoMsg}\n💰 Total: *${u.monedas} ⓃNexCoins*` });
}

async function cmdWork(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 2 * 60 * 60 * 1000;
    if (u.ultimoTrabajo && ahora - u.ultimoTrabajo < espera) {
        const restante = espera - (ahora - u.ultimoTrabajo);
        const horas = Math.floor(restante / 3600000);
        const minutos = Math.floor((restante % 3600000) / 60000);
        await sock.sendMessage(jid, { text: `⏳ Ya trabajaste. Descansa y vuelve en *${horas}h ${minutos}m*` });
        return;
    }
    const trabajos = [
        { trabajo: 'programador', ganancia: Math.floor(Math.random() * 150) + 100 },
        { trabajo: 'chef', ganancia: Math.floor(Math.random() * 120) + 80 },
        { trabajo: 'médico', ganancia: Math.floor(Math.random() * 200) + 150 },
        { trabajo: 'maestro', ganancia: Math.floor(Math.random() * 100) + 70 },
        { trabajo: 'diseñador', ganancia: Math.floor(Math.random() * 130) + 90 },
        { trabajo: 'streamer', ganancia: Math.floor(Math.random() * 180) + 50 },
        { trabajo: 'agricultor', ganancia: Math.floor(Math.random() * 90) + 60 },
        { trabajo: 'mecánico', ganancia: Math.floor(Math.random() * 110) + 75 },
        { trabajo: 'youtuber', ganancia: Math.floor(Math.random() * 160) + 40 },
        { trabajo: 'abogado', ganancia: Math.floor(Math.random() * 220) + 130 },
        { trabajo: 'futbolista', ganancia: Math.floor(Math.random() * 250) + 100 },
        { trabajo: 'carpintero', ganancia: Math.floor(Math.random() * 100) + 60 },
    ];
    const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
    let ganancia = trabajo.ganancia;
    let boostMsg = '';
    if (u.itemsActivos?.boost_trabajo) {
        ganancia *= 2;
        delete u.itemsActivos.boost_trabajo;
        boostMsg = '\n💊 *¡Boost activo! Ganancia x2*';
    }
    // Evento fin de semana
    const hoy = new Date();
    if (hoy.getDay() === 0 || hoy.getDay() === 6) {
        ganancia *= 2;
        boostMsg += '\n🎉 *¡Fin de semana! Ganancias x2*';
    }
    u.monedas += ganancia;
    u.ultimoTrabajo = ahora;
    trackear(u, 'trabajos');
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, {
        text: `💼 Trabajaste como *${trabajo.trabajo}* y ganaste *${ganancia} ⓃNexCoins*!${boostMsg}\n💰 Total: *${u.monedas} ⓃNexCoins*`
    });
}

async function cmdCrime(sock, jid, senderJid, args) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();

    // Niveles de crimen
    const nivel = (args[0] || 'simple').toLowerCase();
    const configs = {
        simple: { espera: 30 * 60 * 1000, exito: 0.60, recompensaMin: 150, recompensaMax: 450, multaMax: 200, crimenes: ['asaltaste una tienda', 'robaste a un transeúnte', 'vendiste mercancía robada', 'estafaste a un turista', 'robaste una bicicleta'] },
        banco: { espera: 45 * 60 * 1000, exito: 0.40, recompensaMin: 600, recompensaMax: 1200, multaMax: 400, crimenes: ['asaltaste un banco', 'hackeaste cuentas bancarias', 'robaste una caja fuerte', 'interceptaste transferencias bancarias'] },
        mafia: { espera: 60 * 60 * 1000, exito: 0.25, recompensaMin: 1500, recompensaMax: 3000, multaMax: 800, crimenes: ['dirigiste una operación de la mafia', 'controlaste una ruta de drogas', 'ejecutaste un atraco internacional', 'hackeaste el banco central'] },
    };

    if (!configs[nivel]) {
        await sock.sendMessage(jid, { text: '❌ Nivel inválido. Usa:\n*#crime simple* — Crimen menor (60% éxito)\n*#crime banco* — Robo bancario (40% éxito)\n*#crime mafia* — Operación mafia (25% éxito)\n\nMás riesgo = más recompensa.' });
        return;
    }

    const cfg = configs[nivel];

    if (u.ultimoCrimen && ahora - u.ultimoCrimen < cfg.espera) {
        const restante = cfg.espera - (ahora - u.ultimoCrimen);
        const minutos = Math.floor(restante / 60000);
        const segundos = Math.floor((restante % 60000) / 1000);
        await sock.sendMessage(jid, { text: `⏳ La policía te sigue buscando. Espera *${minutos}m ${segundos}s*` });
        return;
    }

    // Modificadores por reputación e historial
    let tasaExito = cfg.exito;
    const rep = u.reputacion || 0;
    if (rep >= 20) tasaExito += 0.05;
    if (rep <= -10) tasaExito -= 0.05;

    // Evento de redada (aumenta riesgo)
    const eventoActivo = obtenerEventoActivo();
    let eventoMsg = '';
    if (eventoActivo?.tipo === 'redada') {
        tasaExito -= 0.15;
        eventoMsg = '\n🚔 *¡Redada policial activa!* Riesgo aumentado.';
    } else if (eventoActivo?.tipo === 'golpe_grande') {
        tasaExito += 0.10;
        eventoMsg = '\n💰 *¡Evento especial!* Mayor probabilidad de éxito.';
    }

    const exito = Math.random() < tasaExito;
    u.ultimoCrimen = ahora;

    const emojis = { simple: '🦹', banco: '🏦', mafia: '🎩' };
    const emoji = emojis[nivel];

    if (exito) {
        const ganancia = Math.floor(Math.random() * (cfg.recompensaMax - cfg.recompensaMin)) + cfg.recompensaMin;
        const crimen = cfg.crimenes[Math.floor(Math.random() * cfg.crimenes.length)];
        u.monedas += ganancia;
        trackear(u, 'crimenesOK');
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `${emoji} ¡Éxito! *${crimen}*${eventoMsg}\n✅ Ganaste *${ganancia} ⓃNexCoins*!\n💰 Total: *${u.monedas} ⓃNexCoins*`
        });
    } else {
        const multa = Math.floor(Math.random() * cfg.multaMax) + 50;
        const motivos = ['te atrapó la policía', 'un testigo te delató', 'fallaste en el intento', 'las cámaras te grabaron'];
        const motivo = motivos[Math.floor(Math.random() * motivos.length)];
        u.monedas = Math.max(0, u.monedas - multa);

        // Sistema de cárcel: si fallas en banco o mafia, vas a la cárcel
        let carcelMsg = '';
        if (nivel === 'banco' || nivel === 'mafia') {
            const tiempoCarcel = nivel === 'mafia' ? 15 : 8; // minutos en la cárcel
            u.encarcelado = ahora + tiempoCarcel * 60 * 1000;
            carcelMsg = `\n⛓️ *¡Estás en la cárcel por ${tiempoCarcel} minutos!*\n_Usa *#buyitem fianza* (500 coins) para salir antes._`;
        }

        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🚨 *¡Te atraparon!* ${motivo}${eventoMsg}\n❌ Perdiste *${multa} ⓃNexCoins*\n💰 Total: *${u.monedas} ⓃNexCoins*${carcelMsg}`
        });
    }
}

// Helper para obtener evento activo (para bonificaciones)
function obtenerEventoActivo() {
    const EVENT_PATH = path.join(__dirname, '../data/evento_activo.json');
    try {
        if (fs.existsSync(EVENT_PATH)) {
            const ev = fs.readJsonSync(EVENT_PATH);
            if (ev && ev.expira && Date.now() < ev.expira) return ev;
        }
    } catch { }
    return null;
}

async function cmdSlut(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 45 * 60 * 1000;
    if (u.ultimoSlut && ahora - u.ultimoSlut < espera) {
        const restante = espera - (ahora - u.ultimoSlut);
        const minutos = Math.floor(restante / 60000);
        await sock.sendMessage(jid, { text: `⏳ Necesitas descansar. Vuelve en *${minutos}m*` });
        return;
    }
    const exito = Math.random() < 0.7;
    u.ultimoSlut = ahora;
    if (exito) {
        const ganancia = Math.floor(Math.random() * 300) + 100;
        const acciones = [
            `te ganaste *${ganancia} ⓃNexCoins* en una noche loca`,
            `un cliente generoso te dio *${ganancia} ⓃNexCoins* de propina`,
            `hiciste un show privado y te pagaron *${ganancia} ⓃNexCoins*`,
        ];
        const accion = acciones[Math.floor(Math.random() * acciones.length)];
        u.monedas += ganancia;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, { text: `💃 ¡${accion}!\n💰 Total: *${u.monedas} ⓃNexCoins*` });
    } else {
        const perdida = Math.floor(Math.random() * 100) + 20;
        u.monedas = Math.max(0, u.monedas - perdida);
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, { text: `😞 No hubo clientes hoy y perdiste *${perdida} ⓃNexCoins* en gastos\n💰 Total: *${u.monedas} ⓃNexCoins*` });
    }
}

async function cmdCoinflip(sock, jid, senderJid, args) {
    const cantidad = parseInt(args[0]);
    const eleccion = args[1]?.toLowerCase();
    if (isNaN(cantidad) || cantidad <= 0 || !['cara', 'cruz', 'heads', 'tails'].includes(eleccion)) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#coinflip [cantidad] [cara/cruz]*\nEjemplo: #coinflip 100 cara' });
        return;
    }
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    if (u.monedas < cantidad) {
        await sock.sendMessage(jid, { text: '❌ No tienes suficientes ⓃNexCoins.' });
        return;
    }
    const esCara = ['cara', 'heads'].includes(eleccion);
    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
    const gano = (esCara && resultado === 'cara') || (!esCara && resultado === 'cruz');
    let dadoMsg = '';
    if (gano) {
        let ganar = cantidad;
        if (u.itemsActivos?.dado_suerte) {
            ganar = Math.floor(ganar * 1.5);
            delete u.itemsActivos.dado_suerte;
            dadoMsg = '\n🎲 *¡Dado de la suerte! ×1.5*';
        }
        u.monedas += ganar;
        trackear(u, 'apuestasGanadas');
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🪙 La moneda cayó en *${resultado}* ${resultado === 'cara' ? '😎' : '🔄'}\n✅ ¡Ganaste *${ganar} ⓃNexCoins*!${dadoMsg}\n💰 Total: *${u.monedas}*`
        });
    } else {
        u.monedas -= cantidad;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🪙 La moneda cayó en *${resultado}* ${resultado === 'cara' ? '😎' : '🔄'}\n❌ Perdiste *${cantidad} ⓃNexCoins*\n💰 Total: *${u.monedas}*`
        });
    }
}

async function cmdDeposit(sock, jid, senderJid, args) {
    const u = getUsuario(senderJid);
    let cantidad;
    if (args[0] === 'all') {
        cantidad = u.monedas;
    } else {
        cantidad = parseInt(args[0]);
    }
    if (isNaN(cantidad) || cantidad <= 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #depositar [cantidad | all]' });
        return;
    }
    if (u.monedas < cantidad) {
        await sock.sendMessage(jid, { text: '❌ No tienes suficientes ⓃNexCoins en tu cartera.' });
        return;
    }
    u.monedas -= cantidad;
    u.banco = (u.banco || 0) + cantidad;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `🏦 Depositaste *${cantidad} ⓃNexCoins* en el banco.\n💰 Cartera: *${u.monedas}* | 🏦 Banco: *${u.banco}*` });
}

async function cmdWithdraw(sock, jid, senderJid, args) {
    const u = getUsuario(senderJid);
    let cantidad;
    if (args[0] === 'all') {
        cantidad = u.banco || 0;
    } else {
        cantidad = parseInt(args[0]);
    }
    if (isNaN(cantidad) || cantidad <= 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #retirar [cantidad | all]' });
        return;
    }
    if ((u.banco || 0) < cantidad) {
        await sock.sendMessage(jid, { text: '❌ No tienes suficientes ⓃNexCoins en el banco.' });
        return;
    }
    u.banco -= cantidad;
    u.monedas += cantidad;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `💸 Retiraste *${cantidad} ⓃNexCoins* del banco.\n💰 Cartera: *${u.monedas}* | 🏦 Banco: *${u.banco}*` });
}

async function cmdRoulette(sock, jid, senderJid, args) {
    const color = args[0]?.toLowerCase();
    const cantidad = parseInt(args[1]);
    if (!color || !['rojo', 'negro', 'red', 'black'].includes(color) || isNaN(cantidad) || cantidad <= 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #ruleta [rojo|negro] [cantidad]\nEjemplo: #ruleta rojo 100' });
        return;
    }
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    if (u.monedas < cantidad) {
        await sock.sendMessage(jid, { text: '❌ No tienes suficientes ⓃNexCoins.' });
        return;
    }
    const esRojo = ['rojo', 'red'].includes(color);
    const resultado = Math.random() < 0.5 ? 'rojo' : 'negro';
    const gano = (esRojo && resultado === 'rojo') || (!esRojo && resultado === 'negro');
    if (gano) {
        let ganar = cantidad;
        let dadoMsg = '';
        if (u.itemsActivos?.dado_suerte) {
            ganar = Math.floor(ganar * 1.5);
            delete u.itemsActivos.dado_suerte;
            dadoMsg = '\n🎲 *¡Dado de la suerte! ×1.5*';
        }
        u.monedas += ganar;
        trackear(u, 'apuestasGanadas');
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, { text: `🎰 La ruleta cayó en *${resultado}* ${resultado === 'rojo' ? '🔴' : '⚫'}\n✅ ¡Ganaste *${ganar} ⓃNexCoins*!${dadoMsg}\n💰 Total: *${u.monedas}*` });
    } else {
        u.monedas -= cantidad;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, { text: `🎰 La ruleta cayó en *${resultado}* ${resultado === 'rojo' ? '🔴' : '⚫'}\n❌ Perdiste *${cantidad} ⓃNexCoins*\n💰 Total: *${u.monedas}*` });
    }
}

async function cmdSteal(sock, jid, senderJid, mencionados) {
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #robar @usuario' });
        return;
    }
    const objetivo = mencionados[0];
    if (objetivo === senderJid) {
        await sock.sendMessage(jid, { text: '❌ No puedes robarte a ti mismo.' });
        return;
    }

    const uSender = getUsuario(senderJid);
    const jail = verificarCarcel(uSender);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }

    const ahora = Date.now();
    const cooldownSteal = 30 * 60 * 1000;

    if (!uSender.cooldowns) uSender.cooldowns = {};
    const ultimoRobo = uSender.cooldowns.steal || 0;
    if (ahora - ultimoRobo < cooldownSteal) {
        const restante = cooldownSteal - (ahora - ultimoRobo);
        const minutos = Math.floor(restante / 60000);
        const segundos = Math.floor((restante % 60000) / 1000);
        await sock.sendMessage(jid, {
            text: `⏳ Tienes que esperar antes de volver a robar.\nCooldown: *${minutos}m ${segundos}s*`
        });
        return;
    }

    const uObjetivo = getUsuario(objetivo);
    if (uObjetivo.monedas < 50) {
        await sock.sendMessage(jid, { text: `❌ @${objetivo.split('@')[0]} no tiene suficientes coins para robar.`, mentions: [objetivo] });
        return;
    }

    uSender.cooldowns.steal = ahora;

    if (uObjetivo.itemsActivos?.escudo) {
        delete uObjetivo.itemsActivos.escudo;
        guardarUsuario(objetivo, uObjetivo);
        await sock.sendMessage(jid, {
            text: `🛡️ *¡El escudo de @${objetivo.split('@')[0]} bloqueó tu robo!*\nNo pudiste robarle nada esta vez.`,
            mentions: [objetivo]
        });
        return;
    }

    let tasaExito = 0.45;
    let detectorMsg = '';
    if (uSender.itemsActivos?.detector) {
        tasaExito = 0.85;
        delete uSender.itemsActivos.detector;
        detectorMsg = '\n🕵️ *¡Detector activo!*';
    }

    const exito = Math.random() < tasaExito;

    if (exito) {
        const robado = Math.floor(Math.random() * Math.min(uObjetivo.monedas * 0.3, 300)) + 20;
        uSender.monedas += robado;
        uObjetivo.monedas -= robado;
        trackear(uSender, 'robosExitosos');
        guardarUsuario(senderJid, uSender);
        guardarUsuario(objetivo, uObjetivo);
        await sock.sendMessage(jid, {
            text: `🦹 ¡Robaste *${robado} ⓃNexCoins* a @${objetivo.split('@')[0]}!${detectorMsg}\n💰 Tus coins: *${uSender.monedas}*\n\n⏳ Próximo robo disponible en *30 minutos*`,
            mentions: [objetivo]
        });
    } else {
        const multa = Math.floor(Math.random() * 100) + 30;
        uSender.monedas = Math.max(0, uSender.monedas - multa);
        guardarUsuario(senderJid, uSender);
        await sock.sendMessage(jid, {
            text: `🚨 ¡Te atraparon intentando robar a @${objetivo.split('@')[0]}!\n❌ Pagaste una multa de *${multa} ⓃNexCoins*\n💰 Tus coins: *${uSender.monedas}*\n\n⏳ Próximo robo disponible en *30 minutos*`,
            mentions: [objetivo]
        });
    }
}

async function cmdTransferir(sock, jid, senderJid, mencionados, args) {
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #pay @usuario cantidad' });
        return;
    }
    const destinoJid = mencionados[0];
    const cantidad = parseInt(args.find(a => !isNaN(parseInt(a))));
    if (isNaN(cantidad) || cantidad <= 0) {
        await sock.sendMessage(jid, { text: '❌ Ingresa una cantidad válida.' });
        return;
    }
    if (!quitarMonedas(senderJid, cantidad)) {
        await sock.sendMessage(jid, { text: '❌ No tienes suficientes ⓃNexCoins.' });
        return;
    }
    agregarMonedas(destinoJid, cantidad);
    await sock.sendMessage(jid, {
        text: `✅ Enviaste *${cantidad} ⓃNexCoins* a @${destinoJid.split('@')[0]}`,
        mentions: [destinoJid]
    });
}

async function cmdBaltop(sock, jid, groupMetadata) {
    const db = cargarUsuarios();
    let entries = Object.entries(db).filter(([key]) => key.includes('@') && !key.endsWith('@g.us'));

    // Si hay metadata de grupo, filtrar solo miembros del grupo
    if (groupMetadata?.participants?.length) {
        const memberIds = new Set(groupMetadata.participants.map(p => p.id));
        entries = entries.filter(([key]) => memberIds.has(key));
    }

    if (!entries.length) {
        await sock.sendMessage(jid, { text: '❌ No hay usuarios registrados en este grupo.' });
        return;
    }

    const usuarios = entries
        .map(([ujid, u]) => ({ jid: ujid, total: (u.monedas || 0) + (u.banco || 0), nombre: u.pushName || ujid.split('@')[0] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    let texto = '╔══════════════════════╗\n║   💰 TOP RIQUEZA     ║\n╚══════════════════════╝\n\n';
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    for (let i = 0; i < usuarios.length; i++) {
        const u = usuarios[i];
        texto += `${medallas[i]} @${u.jid.split('@')[0]} — *${u.total.toLocaleString()} ⓃNC*\n`;
    }
    if (groupMetadata) texto += `\n_Solo miembros de este grupo_`;
    const mentions = usuarios.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

// ── TIENDA LEGACY (data/tienda.json) ─────────────────────────────────────────
const TIENDA_PATH = path.join(__dirname, '../data/tienda.json');
function getTienda() { return fs.readJsonSync(TIENDA_PATH); }

async function cmdTienda(sock, jid) {
    const items = getTienda();
    let texto = '╔══════════════════╗\n║      🛒 TIENDA      ║\n╚══════════════════╝\n\n';
    for (const item of items) {
        texto += `${item.emoji} *${item.nombre}* (ID: ${item.id})\n`;
        texto += `   📝 ${item.descripcion}\n`;
        texto += `   💰 Precio: ${item.precio} coins\n\n`;
    }
    texto += '👉 Usa *#comprar <id>* para adquirir un artículo\n_Para ítems con efectos usa *#shop* y *#buyitem*_';
    await sock.sendMessage(jid, { text: texto });
}

async function cmdComprar(sock, jid, senderJid, args) {
    const id = parseInt(args[0]);
    const items = getTienda();
    const item = items.find(i => i.id === id);
    if (!item) {
        await sock.sendMessage(jid, { text: '❌ Artículo no encontrado. Usa *#tienda* para ver los artículos disponibles.' });
        return;
    }
    const u = getUsuario(senderJid);
    if (u.monedas < item.precio) {
        await sock.sendMessage(jid, { text: `❌ No tienes suficientes ⓃNexCoins. Necesitas *${item.precio}* y tienes *${u.monedas}*` });
        return;
    }
    // Normalizar inventario a array para la tienda legacy
    if (!Array.isArray(u.inventarioTienda)) u.inventarioTienda = [];
    if (u.inventarioTienda.find(i => i.id === id)) {
        await sock.sendMessage(jid, { text: '❌ Ya tienes este artículo en tu inventario.' });
        return;
    }
    u.monedas -= item.precio;
    u.inventarioTienda.push({ id: item.id, nombre: item.nombre, emoji: item.emoji, tipo: item.tipo });
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `✅ ¡Compraste *${item.emoji} ${item.nombre}* por *${item.precio} ⓃNexCoins*!\n💰 Saldo restante: *${u.monedas} ⓃNexCoins*` });
}

async function cmdInventario(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const tiendaInv = u.inventarioTienda || [];
    if (tiendaInv.length === 0) {
        await sock.sendMessage(jid, { text: '🎒 Tu inventario de tienda está vacío. Usa *#tienda* para comprar artículos.\n\n_Para ítems con efectos usa *#inv*_' });
        return;
    }
    let texto = '╔══════════════════╗\n║    🎒 INVENTARIO    ║\n╚══════════════════╝\n\n';
    for (const item of tiendaInv) {
        texto += `${item.emoji} *${item.nombre}* (${item.tipo})\n`;
    }
    await sock.sendMessage(jid, { text: texto });
}

// ══════════════════════════════════════════
//  ⛏️  MINAR (#minar / #mine)
// ══════════════════════════════════════════
async function cmdMinar(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 30 * 60 * 1000;
    if (u.ultimoMinar && ahora - u.ultimoMinar < espera) {
        const r = espera - (ahora - u.ultimoMinar);
        await sock.sendMessage(jid, { text: `⏳ Tu pico está roto. Espera *${Math.ceil(r / 60000)} min*` });
        return;
    }
    const minerales = [
        { nombre: '🪨 Piedra', valor: 30, prob: 0.45 },
        { nombre: '🔩 Hierro', valor: 80, prob: 0.25 },
        { nombre: '🪙 Oro', valor: 200, prob: 0.15 },
        { nombre: '💎 Diamante', valor: 500, prob: 0.10 },
        { nombre: '✨ Esmeralda', valor: 800, prob: 0.04 },
        { nombre: '🌟 Mineral Cósmico', valor: 1500, prob: 0.01 },
    ];
    const r = Math.random();
    let acc = 0, mineral;
    for (const m of minerales) { acc += m.prob; if (r <= acc) { mineral = m; break; } }
    if (!mineral) mineral = minerales[0];
    u.monedas += mineral.valor;
    u.ultimoMinar = ahora;
    trackear(u, 'minados');
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, {
        text: `⛏️ *¡A picar la roca!*\n\nEncontraste *${mineral.nombre}*\n💰 +*${mineral.valor} ⓃNexCoins*\n\n💎 Saldo: *${u.monedas} ⓃNexCoins*`
    });
}

// ══════════════════════════════════════════
//  🗺️ AVENTURA (#adventure / #aventura)
// ══════════════════════════════════════════
async function cmdAdventure(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 60 * 60 * 1000;
    if (u.ultimoAdventure && ahora - u.ultimoAdventure < espera) {
        const r = espera - (ahora - u.ultimoAdventure);
        await sock.sendMessage(jid, { text: `🛌 Aún descansas de tu última aventura. Espera *${Math.ceil(r / 60000)} min*` });
        return;
    }
    const aventuras = [
        { txt: 'Exploraste un castillo abandonado y encontraste un cofre.', min: 200, max: 500 },
        { txt: 'Salvaste a una aldea de bandidos. Te recompensaron con monedas.', min: 300, max: 700 },
        { txt: 'Cruzaste el desierto y descubriste un oasis con tesoros.', min: 250, max: 600 },
        { txt: 'Resolviste el acertijo de una esfinge. Te dejó pasar con un premio.', min: 400, max: 900 },
        { txt: 'Encontraste una caja mágica flotando en el río.', min: 150, max: 800 },
    ];
    const ev = aventuras[Math.floor(Math.random() * aventuras.length)];
    const exito = Math.random() < 0.75;
    if (exito) {
        const ganancia = Math.floor(Math.random() * (ev.max - ev.min)) + ev.min;
        u.monedas += ganancia;
        trackear(u, 'aventurasOK');
        u.ultimoAdventure = ahora;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🗺️ *¡AVENTURA EXITOSA!*\n\n${ev.txt}\n💰 Ganaste *${ganancia} ⓃNexCoins*!\n\n💎 Saldo: *${u.monedas} ⓃNexCoins*`
        });
    } else {
        const perdida = Math.floor(Math.random() * 200) + 50;
        u.monedas = Math.max(0, u.monedas - perdida);
        u.ultimoAdventure = ahora;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `💥 *¡Aventura fallida!*\n\nTe emboscaron y perdiste *${perdida} ⓃNexCoins*.\n💰 Saldo: *${u.monedas} ⓃNexCoins*`
        });
    }
}

// ══════════════════════════════════════════
//  🏹 CAZAR (#cazar / #hunt)
// ══════════════════════════════════════════
async function cmdCazar(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 25 * 60 * 1000;
    if (u.ultimoCazar && ahora - u.ultimoCazar < espera) {
        const r = espera - (ahora - u.ultimoCazar);
        await sock.sendMessage(jid, { text: `🏹 Tu arco se enfría. Espera *${Math.ceil(r / 60000)} min*` });
        return;
    }
    const presas = [
        { nombre: '🐰 Conejo', valor: 50, prob: 0.4 },
        { nombre: '🦌 Ciervo', valor: 180, prob: 0.25 },
        { nombre: '🐗 Jabalí', valor: 280, prob: 0.15 },
        { nombre: '🐺 Lobo', valor: 400, prob: 0.10 },
        { nombre: '🐻 Oso', valor: 700, prob: 0.07 },
        { nombre: '🦄 Unicornio legendario', valor: 1800, prob: 0.03 },
    ];
    const r = Math.random();
    let acc = 0, presa;
    for (const p of presas) { acc += p.prob; if (r <= acc) { presa = p; break; } }
    if (!presa) presa = presas[0];
    u.monedas += presa.valor;
    u.ultimoCazar = ahora;
    trackear(u, 'cazados');
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, {
        text: `🏹 *¡Cacería!*\n\nCazaste un *${presa.nombre}*\n💰 +*${presa.valor} ⓃNexCoins*\n\n💎 Saldo: *${u.monedas} ⓃNexCoins*`
    });
}

// ══════════════════════════════════════════
//  🎣 PESCAR (#fish / #pescar)
// ══════════════════════════════════════════
async function cmdFish(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 20 * 60 * 1000;
    if (u.ultimoFish && ahora - u.ultimoFish < espera) {
        const r = espera - (ahora - u.ultimoFish);
        await sock.sendMessage(jid, { text: `🎣 Aún hay peces que se escapan. Espera *${Math.ceil(r / 60000)} min*` });
        return;
    }
    const peces = [
        { nombre: '🐟 Sardina', valor: 25, prob: 0.40 },
        { nombre: '🐠 Pez tropical', valor: 80, prob: 0.25 },
        { nombre: '🐡 Pez globo', valor: 150, prob: 0.15 },
        { nombre: '🦑 Calamar gigante', valor: 300, prob: 0.10 },
        { nombre: '🦈 Tiburón', valor: 600, prob: 0.07 },
        { nombre: '🐋 Ballena dorada', valor: 1500, prob: 0.03 },
    ];
    const r = Math.random();
    let acc = 0, pez;
    for (const p of peces) { acc += p.prob; if (r <= acc) { pez = p; break; } }
    if (!pez) pez = peces[0];
    u.monedas += pez.valor;
    u.ultimoFish = ahora;
    trackear(u, 'pescados');
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, {
        text: `🎣 *¡Pesca exitosa!*\n\nAtrapaste un *${pez.nombre}*\n💰 +*${pez.valor} ⓃNexCoins*\n\n💎 Saldo: *${u.monedas} ⓃNexCoins*`
    });
}

// ══════════════════════════════════════════
//  🏰 MAZMORRA (#mazmorra / #dungeon)
// ══════════════════════════════════════════
async function cmdMazmorra(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const jail = verificarCarcel(u);
    if (jail) { await sock.sendMessage(jid, { text: jail }); return; }
    const ahora = Date.now();
    const espera = 90 * 60 * 1000;
    if (u.ultimoMazmorra && ahora - u.ultimoMazmorra < espera) {
        const r = espera - (ahora - u.ultimoMazmorra);
        await sock.sendMessage(jid, { text: `🏰 Tu héroe se cura las heridas. Espera *${Math.ceil(r / 60000)} min*` });
        return;
    }
    const monstruos = [
        { nombre: '👹 Goblin', dificultad: 0.85, recompensa: 350 },
        { nombre: '🧌 Troll', dificultad: 0.65, recompensa: 700 },
        { nombre: '🐲 Dragón Joven', dificultad: 0.45, recompensa: 1400 },
        { nombre: '👿 Demonio', dificultad: 0.30, recompensa: 2500 },
        { nombre: '💀 Lich Eterno', dificultad: 0.15, recompensa: 5000 },
    ];
    const m = monstruos[Math.floor(Math.random() * monstruos.length)];
    const exito = Math.random() < m.dificultad;
    u.ultimoMazmorra = ahora;
    if (exito) {
        u.monedas += m.recompensa;
        trackear(u, 'mazmorrasOK');
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🏰 *¡VICTORIA EN LA MAZMORRA!*\n\nDerrotaste a un *${m.nombre}* 🗡️\n💰 Botín: *${m.recompensa} ⓃNexCoins*\n\n💎 Saldo: *${u.monedas} ⓃNexCoins*`
        });
    } else {
        const perdida = Math.floor(m.recompensa * 0.25);
        u.monedas = Math.max(0, u.monedas - perdida);
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `💀 *¡DERROTA EN LA MAZMORRA!*\n\nFuiste vencido por un *${m.nombre}*.\n❌ Perdiste *${perdida} ⓃNexCoins* en pociones y reparaciones.\n💰 Saldo: *${u.monedas} ⓃNexCoins*`
        });
    }
}

module.exports = {
    cmdSaldo, cmdEconomyInfo, cmdDiario, cmdWork, cmdCrime, cmdSlut, cmdCoinflip,
    cmdDeposit, cmdWithdraw, cmdRoulette, cmdSteal, cmdTransferir,
    cmdBaltop, cmdTienda, cmdComprar, cmdInventario, verificarCarcel, obtenerEventoActivo,
    cmdMinar, cmdAdventure, cmdCazar, cmdFish, cmdMazmorra
};
