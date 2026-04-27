const { getUsuario, guardarUsuario } = require('./database');

// ══════════════════════════════════════════
//  CATÁLOGO DE ÍTEMS
// ══════════════════════════════════════════
const ITEMS_DB = {
    escudo: {
        nombre: '🛡️ Escudo',
        desc: 'Bloquea el próximo robo que recibas (1 uso)',
        precio: 500,
        tipo: 'defensa'
    },
    boost_trabajo: {
        nombre: '💊 Boost de trabajo',
        desc: 'Duplica la ganancia del próximo #work',
        precio: 800,
        tipo: 'boost'
    },
    dado_suerte: {
        nombre: '🎲 Dado de la suerte',
        desc: 'Multiplica ×1.5 la ganancia de tu próxima apuesta',
        precio: 1000,
        tipo: 'suerte'
    },
    detector: {
        nombre: '🕵️ Detector',
        desc: 'Sube el éxito del próximo #rob al 85%',
        precio: 1200,
        tipo: 'ataque'
    },
    pocion_exp: {
        nombre: '⚗️ Poción de EXP',
        desc: 'Otorga +50 XP de combate al instante',
        precio: 600,
        tipo: 'combate'
    },
    caja_misteriosa: {
        nombre: '🎁 Caja misteriosa',
        desc: 'Contiene una recompensa aleatoria (puede ser buena... o mala 😈)',
        precio: 300,
        tipo: 'especial'
    },
    fianza: {
        nombre: '⚖️ Fianza',
        desc: 'Sale de la cárcel inmediatamente (1 uso)',
        precio: 500,
        tipo: 'especial'
    },
};

// ── Normaliza el inventario al formato objeto ────────────────────────────────
function getInventario(u) {
    // Si es un array (formato viejo), convertir a objeto
    if (Array.isArray(u.inventario)) {
        const nuevo = {};
        // Preservar propiedades nombradas del array (items comprados con #buyitem)
        for (const key of Object.keys(u.inventario)) {
            if (isNaN(key) && u.inventario[key] > 0) {
                nuevo[key] = u.inventario[key];
            }
        }
        u.inventario = nuevo;
    } else if (!u.inventario || typeof u.inventario !== 'object') {
        u.inventario = {};
    }
    return u.inventario;
}

function tieneItem(u, itemId) {
    const inv = getInventario(u);
    return (inv[itemId] || 0) > 0;
}

function consumirItem(u, itemId) {
    const inv = getInventario(u);
    if ((inv[itemId] || 0) > 0) {
        inv[itemId]--;
        u.inventario = inv;
        return true;
    }
    return false;
}

// ══════════════════════════════════════════
//  COMANDOS
// ══════════════════════════════════════════
async function cmdInventario(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    const inv = getInventario(u);
    const items = Object.entries(inv).filter(([, qty]) => qty > 0);
    const activos = u.itemsActivos || {};

    if (!items.length) {
        await sock.sendMessage(jid, { text: '🎒 *Inventario vacío*\n\nVisita la tienda con *#shop* y compra ítems con *#buyitem [id]*' });
        return;
    }

    let texto = `🎒 *Tu inventario*\n\n`;
    texto += items.map(([id, qty]) => {
        const item = ITEMS_DB[id];
        if (!item) return null;
        const activo = activos[id] ? ' _(activo ✅)_' : '';
        return `${item.nombre} ×${qty}${activo}\n_${item.desc}_`;
    }).filter(Boolean).join('\n\n');

    await sock.sendMessage(jid, { text: texto });
}

async function cmdShop(sock, jid) {
    const lista = Object.entries(ITEMS_DB).map(([id, item]) =>
        `${item.nombre}\n💰 *${item.precio} ⓃNexCoins*\n_${item.desc}_\n🔑 \`${id}\``
    ).join('\n───────────\n');
    await sock.sendMessage(jid, { text: `🏪 *Tienda de ítems*\n\n${lista}\n\n_Compra con *#buyitem [id]* · Usa con *#useitem [id]*_` });
}

async function cmdBuyItem(sock, jid, senderJid, args) {
    const itemId = args[0]?.toLowerCase().replace(/[\s-]/g, '_');
    if (!itemId || !ITEMS_DB[itemId]) {
        const ids = Object.keys(ITEMS_DB).join(', ');
        await sock.sendMessage(jid, { text: `❌ Ítem no encontrado.\nIDs válidos: ${ids}\n\nUsa *#shop* para ver la tienda.` });
        return;
    }
    const item = ITEMS_DB[itemId];
    const u = getUsuario(senderJid);

    // Verificar si está en la cárcel
    if (u.encarcelado && Date.now() < u.encarcelado) {
        const min = Math.ceil((u.encarcelado - Date.now()) / 60000);
        await sock.sendMessage(jid, { text: `⛓️ Estás en la cárcel. No puedes comprar nada por *${min} minutos*.\n_Usa *#buyitem fianza* para salir si tienes coins suficientes._` });
        return;
    }

    if (u.monedas < item.precio) {
        await sock.sendMessage(jid, { text: `❌ No tienes suficientes ⓃNexCoins.\nNecesitas *${item.precio}* y tienes *${u.monedas}*.` });
        return;
    }

    // Caso especial: fianza (sale de la cárcel)
    if (itemId === 'fianza') {
        if (!u.encarcelado || Date.now() >= u.encarcelado) {
            await sock.sendMessage(jid, { text: '❌ No estás en la cárcel. No necesitas una fianza.' });
            return;
        }
        u.monedas -= item.precio;
        u.encarcelado = null;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, { text: `⚖️ *¡Saliste de la cárcel!* Pagaste *${item.precio} ⓃNexCoins* de fianza.\n💰 Saldo restante: *${u.monedas}*` });
        return;
    }

    u.monedas -= item.precio;
    const inv = getInventario(u);
    inv[itemId] = (inv[itemId] || 0) + 1;
    u.inventario = inv;
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, { text: `✅ Compraste *${item.nombre}* por *${item.precio} ⓃNexCoins*!\n💰 Saldo restante: *${u.monedas}*\n\n_Úsalo con *#useitem ${itemId}*_` });
}

async function cmdUseItem(sock, jid, senderJid, args) {
    const itemId = args[0]?.toLowerCase().replace(/[\s-]/g, '_');
    if (!itemId) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#useitem [id]*\nEjemplo: *#useitem escudo*\n\nVe tu inventario con *#inv*' });
        return;
    }
    const item = ITEMS_DB[itemId];
    if (!item) {
        await sock.sendMessage(jid, { text: `❌ Ítem desconocido: *${itemId}*` });
        return;
    }
    const u = getUsuario(senderJid);
    const inv = getInventario(u);
    if ((inv[itemId] || 0) <= 0) {
        await sock.sendMessage(jid, { text: `❌ No tienes *${item.nombre}* en tu inventario.` });
        return;
    }
    if (!u.itemsActivos) u.itemsActivos = {};

    switch (itemId) {
        case 'escudo':
            inv[itemId]--;
            u.itemsActivos.escudo = true;
            u.inventario = inv;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, { text: `🛡️ *¡Escudo activado!*\nEl próximo robo que intenten hacerte será bloqueado automáticamente.` });
            break;
        case 'boost_trabajo':
            inv[itemId]--;
            u.itemsActivos.boost_trabajo = true;
            u.inventario = inv;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, { text: `💊 *¡Boost de trabajo activado!*\nTu próximo *#work* dará el doble de coins.` });
            break;
        case 'dado_suerte':
            inv[itemId]--;
            u.itemsActivos.dado_suerte = true;
            u.inventario = inv;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, { text: `🎲 *¡Dado de la suerte activado!*\nTu próxima apuesta (#coinflip o #ruleta) dará ×1.5 coins.` });
            break;
        case 'detector':
            inv[itemId]--;
            u.itemsActivos.detector = true;
            u.inventario = inv;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, { text: `🕵️ *¡Detector activado!*\nTu próximo *#rob* tendrá un 85% de éxito.` });
            break;
        case 'pocion_exp': {
            inv[itemId]--;
            u.inventario = inv;
            if (!u.stats) u.stats = { fuerza: 10, defensa: 10, suerte: 10, xp: 0, nivel: 1 };
            u.stats.xp = (u.stats.xp || 0) + 50;
            const xpNecesaria = (u.stats.nivel || 1) * 100;
            if (u.stats.xp >= xpNecesaria) {
                u.stats.xp -= xpNecesaria;
                u.stats.nivel = (u.stats.nivel || 1) + 1;
                guardarUsuario(senderJid, u);
                await sock.sendMessage(jid, { text: `⚗️ *¡Poción de EXP usada!* +50 XP de combate\n🎉 *¡Subiste al nivel de combate ${u.stats.nivel}!*` });
            } else {
                guardarUsuario(senderJid, u);
                await sock.sendMessage(jid, { text: `⚗️ *¡Poción de EXP usada!* +50 XP de combate\n📊 XP: ${u.stats.xp}/${xpNecesaria}` });
            }
            break;
        }
        case 'caja_misteriosa': {
            inv[itemId]--;
            u.inventario = inv;
            const rand = Math.random();
            let resultado;
            if (rand < 0.4) {
                const coins = Math.floor(Math.random() * 800) + 200;
                u.monedas += coins;
                resultado = `💰 ¡Encontraste *${coins} ⓃNexCoins*!`;
            } else if (rand < 0.6) {
                const itemsBonus = ['escudo', 'boost_trabajo', 'dado_suerte'];
                const itemBonus = itemsBonus[Math.floor(Math.random() * itemsBonus.length)];
                inv[itemBonus] = (inv[itemBonus] || 0) + 1;
                resultado = `🎁 ¡Encontraste un *${ITEMS_DB[itemBonus].nombre}*!`;
            } else if (rand < 0.75) {
                if (!u.stats) u.stats = { fuerza: 10, defensa: 10, suerte: 10, xp: 0, nivel: 1 };
                u.stats.xp = (u.stats.xp || 0) + 100;
                resultado = `⚗️ ¡Encontraste *+100 XP* de combate!`;
            } else {
                const perdida = Math.floor(Math.random() * 300) + 100;
                u.monedas = Math.max(0, u.monedas - perdida);
                resultado = `💸 ¡Estaba maldita! Perdiste *${perdida} ⓃNexCoins*`;
            }
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, { text: `🎁 *¡Abriste la caja misteriosa!*\n\n${resultado}\n💰 Coins: *${u.monedas}*` });
            break;
        }
        case 'fianza':
            if (!u.encarcelado || Date.now() >= u.encarcelado) {
                await sock.sendMessage(jid, { text: '❌ No estás en la cárcel.' });
                return;
            }
            inv[itemId]--;
            u.inventario = inv;
            u.encarcelado = null;
            guardarUsuario(senderJid, u);
            await sock.sendMessage(jid, { text: `⚖️ *¡Saliste de la cárcel usando tu fianza!*` });
            break;
        default:
            await sock.sendMessage(jid, { text: `❌ Este ítem no se puede usar manualmente.` });
    }
}

module.exports = { cmdInventario, cmdShop, cmdBuyItem, cmdUseItem, ITEMS_DB, getInventario, tieneItem, consumirItem };
