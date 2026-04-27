const { getUsuario, guardarUsuario, cargarUsuarios } = require('./database');
const fs = require('fs-extra');
const path = require('path');

const EVENT_PATH = path.join(__dirname, '../data/evento_activo.json');
const LOOT_PATH = path.join(__dirname, '../data/loot_activo.json');

// ══════════════════════════════════════════
//  AFK
// ══════════════════════════════════════════
const FRASES_AFK = [
    'ha entrado en modo zen 🧘',
    'se ausentó del mundo digital 🌙',
    'fue a cargar energías ⚡',
    'está en otro plano de existencia ✨',
    'desapareció en el vacío 🌌',
    'tomó un descanso merecido 💤',
    'se fue a buscar señal wifi 📡',
    'entró en modo hibernación 🐻',
    'salió a tomar aire fresco 🍃',
    'está ocupado siendo productivo (o eso dice) 📚',
];

const FRASES_VUELTA = [
    '¡ha regresado de su aventura!',
    'volvió del reino de los ausentes.',
    '¡de vuelta en la realidad!',
    'regresó cargado de energía.',
    'ha vuelto del más allá.',
    'retornó a la civilización.',
    '¡sobrevivió a su ausencia!',
];

async function cmdAfk(sock, jid, senderJid, args, pushName) {
    const u = getUsuario(senderJid);
    const mensaje = args.join(' ').trim() || 'sin razón especificada';
    u.afk = { activo: true, mensaje, desde: Date.now() };
    guardarUsuario(senderJid, u);
    const nombre = pushName || senderJid.split('@')[0];
    const frase = FRASES_AFK[Math.floor(Math.random() * FRASES_AFK.length)];
    await sock.sendMessage(jid, {
        text: `💤 *${nombre}* ${frase}\n\n📝 _"${mensaje}"_`
    });
}

async function verificarAfk(sock, jid, senderJid, pushName, texto) {
    const u = getUsuario(senderJid);
    if (u.afk?.activo) {
        u.afk.activo = false;
        const elapsed = Date.now() - (u.afk.desde || Date.now());
        const mins = Math.floor(elapsed / 60000);
        const hours = Math.floor(mins / 60);
        const tiempoStr = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
        guardarUsuario(senderJid, u);
        const frase = FRASES_VUELTA[Math.floor(Math.random() * FRASES_VUELTA.length)];
        await sock.sendMessage(jid, {
            text: `🌟 *${pushName || senderJid.split('@')[0]}* ${frase}\n⏱️ _Estuvo ausente ${tiempoStr}_`
        });
    }
}

async function notificarAfk(sock, jid, mencionados) {
    if (!mencionados?.length) return;
    for (const uid of mencionados) {
        const u = getUsuario(uid);
        if (u.afk?.activo) {
            const elapsed = Date.now() - (u.afk.desde || Date.now());
            const mins = Math.floor(elapsed / 60000);
            const tiempoStr = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
            await sock.sendMessage(jid, {
                text: `💤 *@${uid.split('@')[0]}* está AFK hace *${tiempoStr}*.\n📝 _"${u.afk.mensaje}"_`,
                mentions: [uid]
            });
        }
    }
}

// ══════════════════════════════════════════
//  MASCOTAS — 100 ESPECIES CON RAREZA
// ══════════════════════════════════════════
const RAREZA = {
    comun:      { nombre: 'Común',       color: '⬜', prob: 50 },
    poco_comun: { nombre: 'Poco común',  color: '🟩', prob: 25 },
    raro:       { nombre: 'Raro',        color: '🟦', prob: 15 },
    epico:      { nombre: 'Épico',       color: '🟪', prob: 8  },
    legendario: { nombre: 'Legendario',  color: '🟨', prob: 2  },
};

const TIPOS_MASCOTAS = [
    // ── Común (50%) ─────────────────────────────────────────────────────────
    { nombre: 'Gatito',          emoji: '🐱', rareza: 'comun'      },
    { nombre: 'Perrito',         emoji: '🐶', rareza: 'comun'      },
    { nombre: 'Conejo',          emoji: '🐰', rareza: 'comun'      },
    { nombre: 'Pollito',         emoji: '🐤', rareza: 'comun'      },
    { nombre: 'Hamster',         emoji: '🐹', rareza: 'comun'      },
    { nombre: 'Pez dorado',      emoji: '🐠', rareza: 'comun'      },
    { nombre: 'Tortuga',         emoji: '🐢', rareza: 'comun'      },
    { nombre: 'Paloma',          emoji: '🕊️',  rareza: 'comun'      },
    { nombre: 'Ratón',           emoji: '🐭', rareza: 'comun'      },
    { nombre: 'Lagarto',         emoji: '🦎', rareza: 'comun'      },
    { nombre: 'Pato',            emoji: '🦆', rareza: 'comun'      },
    { nombre: 'Gallina',         emoji: '🐔', rareza: 'comun'      },
    { nombre: 'Cerdo',           emoji: '🐷', rareza: 'comun'      },
    { nombre: 'Vaca',            emoji: '🐮', rareza: 'comun'      },
    { nombre: 'Oveja',           emoji: '🐑', rareza: 'comun'      },
    { nombre: 'Cabra',           emoji: '🐐', rareza: 'comun'      },
    { nombre: 'Pájaro',          emoji: '🐦', rareza: 'comun'      },
    { nombre: 'Mariposa',        emoji: '🦋', rareza: 'comun'      },
    { nombre: 'Caracol',         emoji: '🐌', rareza: 'comun'      },
    { nombre: 'Cangrejo',        emoji: '🦀', rareza: 'comun'      },
    { nombre: 'Rana',            emoji: '🐸', rareza: 'comun'      },
    { nombre: 'Insecto',         emoji: '🪲', rareza: 'comun'      },
    { nombre: 'Lombriz',         emoji: '🪱', rareza: 'comun'      },
    { nombre: 'Abeja',           emoji: '🐝', rareza: 'comun'      },
    { nombre: 'Araña',           emoji: '🕷️',  rareza: 'comun'      },
    // ── Poco Común (25%) ────────────────────────────────────────────────────
    { nombre: 'Zorro',           emoji: '🦊', rareza: 'poco_comun' },
    { nombre: 'Panda',           emoji: '🐼', rareza: 'poco_comun' },
    { nombre: 'Pingüino',        emoji: '🐧', rareza: 'poco_comun' },
    { nombre: 'Lobo',            emoji: '🐺', rareza: 'poco_comun' },
    { nombre: 'Ciervo',          emoji: '🦌', rareza: 'poco_comun' },
    { nombre: 'Mono',            emoji: '🐒', rareza: 'poco_comun' },
    { nombre: 'Caballo',         emoji: '🐴', rareza: 'poco_comun' },
    { nombre: 'Tigre',           emoji: '🐯', rareza: 'poco_comun' },
    { nombre: 'León',            emoji: '🦁', rareza: 'poco_comun' },
    { nombre: 'Elefante',        emoji: '🐘', rareza: 'poco_comun' },
    { nombre: 'Delfín',          emoji: '🐬', rareza: 'poco_comun' },
    { nombre: 'Koala',           emoji: '🐨', rareza: 'poco_comun' },
    { nombre: 'Camello',         emoji: '🐫', rareza: 'poco_comun' },
    { nombre: 'Mapache',         emoji: '🦝', rareza: 'poco_comun' },
    { nombre: 'Nutria',          emoji: '🦦', rareza: 'poco_comun' },
    { nombre: 'Erizo',           emoji: '🦔', rareza: 'poco_comun' },
    { nombre: 'Murciélago',      emoji: '🦇', rareza: 'poco_comun' },
    { nombre: 'Canguro',         emoji: '🦘', rareza: 'poco_comun' },
    { nombre: 'Oso polar',       emoji: '🐻‍❄️', rareza: 'poco_comun' },
    { nombre: 'Búho',            emoji: '🦉', rareza: 'poco_comun' },
    { nombre: 'Flamenco',        emoji: '🦩', rareza: 'poco_comun' },
    { nombre: 'Loro',            emoji: '🦜', rareza: 'poco_comun' },
    { nombre: 'Cocodrilo',       emoji: '🐊', rareza: 'poco_comun' },
    { nombre: 'Hipopótamo',      emoji: '🦛', rareza: 'poco_comun' },
    { nombre: 'Rinoceronte',     emoji: '🦏', rareza: 'poco_comun' },
    // ── Raro (15%) ──────────────────────────────────────────────────────────
    { nombre: 'Gato negro',      emoji: '🐈‍⬛', rareza: 'raro'       },
    { nombre: 'Oso grizzly',     emoji: '🐻', rareza: 'raro'       },
    { nombre: 'Gorila',          emoji: '🦍', rareza: 'raro'       },
    { nombre: 'Orangután',       emoji: '🦧', rareza: 'raro'       },
    { nombre: 'Tiburón',         emoji: '🦈', rareza: 'raro'       },
    { nombre: 'Pulpo',           emoji: '🐙', rareza: 'raro'       },
    { nombre: 'Ballena',         emoji: '🐳', rareza: 'raro'       },
    { nombre: 'Calamar',         emoji: '🦑', rareza: 'raro'       },
    { nombre: 'Caballo de mar',  emoji: '🦭', rareza: 'raro'       },
    { nombre: 'Águila',          emoji: '🦅', rareza: 'raro'       },
    { nombre: 'Pavo real',       emoji: '🦚', rareza: 'raro'       },
    { nombre: 'Gato siamés',     emoji: '🐈', rareza: 'raro'       },
    { nombre: 'Tortuga marina',  emoji: '🐢', rareza: 'raro'       },
    { nombre: 'Anaconda',        emoji: '🐍', rareza: 'raro'       },
    { nombre: 'Leopardo',        emoji: '🐆', rareza: 'raro'       },
    // ── Épico (8%) ──────────────────────────────────────────────────────────
    { nombre: 'Dragón de Komodo',emoji: '🦎', rareza: 'epico'      },
    { nombre: 'Pantera negra',   emoji: '🐈‍⬛', rareza: 'epico'      },
    { nombre: 'Lince',           emoji: '🐱', rareza: 'epico'      },
    { nombre: 'Lobo ártico',     emoji: '🐺', rareza: 'epico'      },
    { nombre: 'Caballo alado',   emoji: '🦄', rareza: 'epico'      },
    { nombre: 'Jaguar',          emoji: '🐆', rareza: 'epico'      },
    { nombre: 'Cóndor',          emoji: '🦅', rareza: 'epico'      },
    { nombre: 'Fénix bebé',      emoji: '🔥', rareza: 'epico'      },
    { nombre: 'Kirin',           emoji: '🦄', rareza: 'epico'      },
    { nombre: 'Manticora',       emoji: '🦁', rareza: 'epico'      },
    // ── Legendario (2%) ─────────────────────────────────────────────────────
    { nombre: 'Dragón',          emoji: '🐲', rareza: 'legendario' },
    { nombre: 'Fénix',           emoji: '🦅', rareza: 'legendario' },
    { nombre: 'Unicornio',       emoji: '🦄', rareza: 'legendario' },
    { nombre: 'Kraken',          emoji: '🐙', rareza: 'legendario' },
    { nombre: 'Basilisco',       emoji: '🐍', rareza: 'legendario' },
    { nombre: 'Behemoth',        emoji: '🐘', rareza: 'legendario' },
    { nombre: 'Leviatán',        emoji: '🐋', rareza: 'legendario' },
    { nombre: 'Dragón de sombra',emoji: '🐉', rareza: 'legendario' },
    { nombre: 'Simurgh',         emoji: '🦅', rareza: 'legendario' },
    { nombre: 'Celestial',       emoji: '⭐', rareza: 'legendario' },
];

function obtenerMascotaAleatoria() {
    // Ruleta ponderada por rareza
    const rand = Math.random() * 100;
    let acum = 0;
    let rarezaSeleccionada;
    for (const [key, val] of Object.entries(RAREZA)) {
        acum += val.prob;
        if (rand < acum) { rarezaSeleccionada = key; break; }
    }
    const pool = TIPOS_MASCOTAS.filter(m => m.rareza === rarezaSeleccionada);
    return pool[Math.floor(Math.random() * pool.length)];
}

const COOLDOWN_ADOPTAR = 60 * 60 * 1000; // 1 hora

// ── Pokémon: rareza basada en clasificación oficial ─────────────────────────
const POKEMON_LEGENDARIOS = [144,145,146,150,243,244,245,249,250,377,378,379,380,381,382,383,384,480,481,482,483,484,485,486,487,488,638,639,640,641,642,643,644,645,646,716,717,718,772,773,785,786,787,788,789,790,791,792,800,888,889,890,891,892,894,895,896,897,898,1001,1002,1003,1004,1007,1008,1014,1015,1016,1017];
const POKEMON_MITICOS = [151,251,385,386,489,490,491,492,493,494,647,648,649,719,720,721,801,802,807,808,809,893];

async function _fetchPokemonAleatorio() {
    // Pesos por rareza (mantienen escala anterior aproximada)
    const r = Math.random() * 100;
    let pool;
    if (r < 5) pool = POKEMON_LEGENDARIOS;
    else if (r < 15) pool = POKEMON_MITICOS;
    else pool = null; // cualquiera

    let id;
    if (pool) {
        id = pool[Math.floor(Math.random() * pool.length)];
    } else {
        id = 1 + Math.floor(Math.random() * 898);
    }

    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!resp.ok) throw new Error(`PokeAPI error ${resp.status}`);
    const data = await resp.json();
    const sprite = data.sprites?.other?.['official-artwork']?.front_default
        || data.sprites?.other?.['home']?.front_default
        || data.sprites?.front_default;
    return {
        id: data.id,
        nombre: data.name,
        tipos: (data.types || []).map(t => t.type.name),
        sprite,
        legendario: POKEMON_LEGENDARIOS.includes(data.id),
        mitico: POKEMON_MITICOS.includes(data.id)
    };
}

async function cmdAdoptar(sock, jid, senderJid, args) {
    const u = getUsuario(senderJid);
    if (u.mascota) {
        await sock.sendMessage(jid, {
            text: `❌ Ya tienes un Pokémon: *${u.mascota.emoji} ${u.mascota.nombre}* (${u.mascota.rareza})\nUsa *#petinfo* para verlo o *#changepet* para cambiarlo (800 coins).`
        });
        return;
    }
    if (u.ultimoAdoptar && Date.now() - u.ultimoAdoptar < COOLDOWN_ADOPTAR) {
        const min = Math.ceil((COOLDOWN_ADOPTAR - (Date.now() - u.ultimoAdoptar)) / 60000);
        await sock.sendMessage(jid, { text: `⏳ Debes esperar *${min} minuto(s)* antes de adoptar otro Pokémon.` });
        return;
    }
    const costo = 800;
    if ((u.monedas || 0) < costo) {
        await sock.sendMessage(jid, { text: `❌ Adoptar un Pokémon cuesta *${costo} ⓃNexCoins*. Tienes *${u.monedas || 0}*.` });
        return;
    }

    let poke;
    try {
        poke = await _fetchPokemonAleatorio();
    } catch (e) {
        await sock.sendMessage(jid, { text: `❌ No pude conectar con la Pokédex: ${e.message}` });
        return;
    }

    // Determinar rareza visual
    let rarezaKey, rarInfo;
    if (poke.mitico) { rarezaKey = 'legendario'; rarInfo = { color: '🟡', nombre: 'Mítico ✨' }; }
    else if (poke.legendario) { rarezaKey = 'legendario'; rarInfo = RAREZA.legendario; }
    else if (poke.id <= 151) { rarezaKey = 'epico'; rarInfo = RAREZA.epico; }
    else if (poke.id <= 386) { rarezaKey = 'raro'; rarInfo = RAREZA.raro; }
    else if (poke.id <= 649) { rarezaKey = 'comun'; rarInfo = RAREZA.comun; }
    else { rarezaKey = 'comun'; rarInfo = RAREZA.comun; }

    const nombreInput = args.join(' ').trim();
    const nombreCapitalizado = poke.nombre.charAt(0).toUpperCase() + poke.nombre.slice(1);
    const nombreMascota = nombreInput || nombreCapitalizado;
    u.monedas -= costo;
    u.ultimoAdoptar = Date.now();
    u.mascota = {
        nombre: nombreMascota,
        especie: nombreCapitalizado,
        especiePokeId: poke.id,
        tipos: poke.tipos,
        rareza: rarInfo.nombre,
        rarezaColor: rarInfo.color,
        emoji: '⚡',
        sprite: poke.sprite,
        nivel: 1,
        exp: 0,
        felicidad: 100,
        hambre: 100,
        ultimoAlimento: Date.now(),
        ultimoJuego: Date.now()
    };
    guardarUsuario(senderJid, u);

    const tiposTxt = poke.tipos.join(' / ');
    const caption =
`⚡ *¡Adoptaste un Pokémon!*

${rarInfo.color} Rareza: *${rarInfo.nombre}*
🐾 Especie: *${nombreCapitalizado}* (#${poke.id})
🎨 Tipo(s): *${tiposTxt}*
✏️ Apodo: *${nombreMascota}*
⭐ Nivel: *1*

_Usa *#petfeed* para alimentarlo, *#petplay* para jugar y *#petinfo* para ver sus stats._`;

    if (poke.sprite) {
        try {
            const r = await fetch(poke.sprite);
            const buf = Buffer.from(await r.arrayBuffer());
            await sock.sendMessage(jid, { image: buf, caption });
            return;
        } catch {}
    }
    await sock.sendMessage(jid, { text: caption });
}

async function cmdPetInfo(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    if (!u.mascota) {
        await sock.sendMessage(jid, { text: '❌ No tienes Pokémon. Adopta uno con *#adoptpokemon [apodo]* o *#adoptp*' });
        return;
    }
    const m = u.mascota;
    const horasSinAlimento = (Date.now() - m.ultimoAlimento) / 3600000;
    const hambre = Math.max(0, Math.round((m.hambre || 100) - horasSinAlimento * 5));
    const felicidad = Math.max(0, Math.round((m.felicidad || 100) - horasSinAlimento * 3));
    m.hambre = hambre;
    m.felicidad = felicidad;
    guardarUsuario(senderJid, u);

    const xpNext = m.nivel * 100;
    const barHam = '█'.repeat(Math.round(hambre / 10)) + '░'.repeat(10 - Math.round(hambre / 10));
    const barFel = '█'.repeat(Math.round(felicidad / 10)) + '░'.repeat(10 - Math.round(felicidad / 10));
    const rarColor = m.rarezaColor || '⬜';
    const tiposTxt = (m.tipos && m.tipos.length) ? `\n🎨 Tipo(s): *${m.tipos.join(' / ')}*` : '';
    const idTxt = m.especiePokeId ? ` (#${m.especiePokeId})` : '';

    const caption =
`${m.emoji} *${m.nombre}* — @${senderJid.split('@')[0]}
${rarColor} Rareza: *${m.rareza || 'Común'}* | Especie: *${m.especie || m.emoji}*${idTxt}${tiposTxt}

⭐ Nivel: *${m.nivel}* (${m.exp}/${xpNext} XP)
🍖 Hambre:    [${barHam}] ${hambre}%
😊 Felicidad: [${barFel}] ${felicidad}%

_Alimenta con *#petfeed* · Juega con *#petplay*_`;

    if (m.sprite) {
        try {
            const r = await fetch(m.sprite);
            const buf = Buffer.from(await r.arrayBuffer());
            await sock.sendMessage(jid, { image: buf, caption, mentions: [senderJid] });
            return;
        } catch {}
    }
    await sock.sendMessage(jid, { text: caption, mentions: [senderJid] });
}

async function cmdPetFeed(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    if (!u.mascota) {
        await sock.sendMessage(jid, { text: '❌ No tienes mascota.' });
        return;
    }
    const costo = 30;
    if ((u.monedas || 0) < costo) {
        await sock.sendMessage(jid, { text: `❌ Alimentar cuesta *${costo} ⓃNexCoins*.` });
        return;
    }
    const ahora = Date.now();
    const cooldown = 30 * 60 * 1000;
    if (u.mascota.ultimoAlimento && ahora - u.mascota.ultimoAlimento < cooldown) {
        const m = Math.ceil((cooldown - (ahora - u.mascota.ultimoAlimento)) / 60000);
        await sock.sendMessage(jid, { text: `⏳ Tu mascota no tiene hambre todavía. Aliméntala en *${m} minutos*.` });
        return;
    }
    u.monedas -= costo;
    u.mascota.hambre = Math.min(100, (u.mascota.hambre || 0) + 30);
    u.mascota.exp = (u.mascota.exp || 0) + 10;
    u.mascota.ultimoAlimento = ahora;
    if (u.mascota.exp >= u.mascota.nivel * 100) {
        u.mascota.exp -= u.mascota.nivel * 100;
        u.mascota.nivel++;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `${u.mascota.emoji} *¡${u.mascota.nombre}* subió al nivel *${u.mascota.nivel}!* 🎉\n🍖 +30% hambre | 🏅 ¡Nivel arriba!`
        });
    } else {
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🍖 Alimentaste a *${u.mascota.nombre}* (−${costo} ⓃNC)\n📊 Hambre: *${u.mascota.hambre}%* | XP: *${u.mascota.exp}/${u.mascota.nivel * 100}*`
        });
    }
}

async function cmdPetPlay(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    if (!u.mascota) {
        await sock.sendMessage(jid, { text: '❌ No tienes mascota.' });
        return;
    }
    const ahora = Date.now();
    const cooldown = 60 * 60 * 1000;
    if (u.mascota.ultimoJuego && ahora - u.mascota.ultimoJuego < cooldown) {
        const m = Math.ceil((cooldown - (ahora - u.mascota.ultimoJuego)) / 60000);
        await sock.sendMessage(jid, { text: `⏳ Tu mascota está cansada. Vuelve en *${m} minutos*.` });
        return;
    }
    u.mascota.felicidad = Math.min(100, (u.mascota.felicidad || 0) + 25);
    u.mascota.exp = (u.mascota.exp || 0) + 15;
    u.mascota.ultimoJuego = ahora;
    const msgs = [
        `¡${u.mascota.nombre} se divirtió mucho jugando! 🎾`,
        `${u.mascota.nombre} corrió por todos lados y está feliz. 🏃`,
        `¡Jugaste con ${u.mascota.nombre} hasta que se cansó! 😄`,
        `${u.mascota.nombre} te mordisqueó de cariño mientras jugaban. 💕`,
    ];
    if (u.mascota.exp >= u.mascota.nivel * 100) {
        u.mascota.exp -= u.mascota.nivel * 100;
        u.mascota.nivel++;
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `${u.mascota.emoji} *¡Nivel arriba!* 🎉 ${u.mascota.nombre} → Nv.*${u.mascota.nivel}*\n😊 +25% felicidad | +15 XP`
        });
    } else {
        guardarUsuario(senderJid, u);
        await sock.sendMessage(jid, {
            text: `🎮 ${msgs[Math.floor(Math.random() * msgs.length)]}\n😊 Felicidad: *${u.mascota.felicidad}%* | XP: *${u.mascota.exp}/${u.mascota.nivel * 100}*`
        });
    }
}

async function cmdCambiarMascota(sock, jid, senderJid, args) {
    const u = getUsuario(senderJid);
    const costo = 800;
    if ((u.monedas || 0) < costo) {
        await sock.sendMessage(jid, { text: `❌ Cambiar de Pokémon cuesta *${costo} ⓃNexCoins*. Tienes *${u.monedas || 0}*.` });
        return;
    }

    let poke;
    try {
        poke = await _fetchPokemonAleatorio();
    } catch (e) {
        await sock.sendMessage(jid, { text: `❌ No pude conectar con la Pokédex: ${e.message}` });
        return;
    }

    let rarInfo;
    if (poke.mitico) rarInfo = { color: '🟡', nombre: 'Mítico ✨' };
    else if (poke.legendario) rarInfo = RAREZA.legendario;
    else if (poke.id <= 151) rarInfo = RAREZA.epico;
    else if (poke.id <= 386) rarInfo = RAREZA.raro;
    else rarInfo = RAREZA.comun;

    const nombreInput = args.join(' ').trim();
    const nombreCapitalizado = poke.nombre.charAt(0).toUpperCase() + poke.nombre.slice(1);
    const nombreMascota = nombreInput || nombreCapitalizado;
    const anteriorNombre = u.mascota?.nombre || '???';
    u.monedas -= costo;
    u.ultimoAdoptar = Date.now();
    u.mascota = {
        nombre: nombreMascota,
        especie: nombreCapitalizado,
        especiePokeId: poke.id,
        tipos: poke.tipos,
        rareza: rarInfo.nombre,
        rarezaColor: rarInfo.color,
        emoji: '⚡',
        sprite: poke.sprite,
        nivel: 1,
        exp: 0,
        felicidad: 100,
        hambre: 100,
        ultimoAlimento: Date.now(),
        ultimoJuego: Date.now()
    };
    guardarUsuario(senderJid, u);
    const tiposTxt = poke.tipos.join(' / ');
    const caption =
`🔄 *Cambiaste tu Pokémon*

❌ Anterior: *${anteriorNombre}*
⚡ Nuevo: *${nombreMascota}* (${nombreCapitalizado} #${poke.id})
🎨 Tipo(s): *${tiposTxt}*
${rarInfo.color} Rareza: *${rarInfo.nombre}*

_¡Cuida bien a tu nuevo compañero!_`;

    if (poke.sprite) {
        try {
            const r = await fetch(poke.sprite);
            const buf = Buffer.from(await r.arrayBuffer());
            await sock.sendMessage(jid, { image: buf, caption });
            return;
        } catch {}
    }
    await sock.sendMessage(jid, { text: caption });
}

async function cmdAbandonarMascota(sock, jid, senderJid) {
    const u = getUsuario(senderJid);
    if (!u.mascota) {
        await sock.sendMessage(jid, { text: '❌ No tienes mascota para abandonar.' });
        return;
    }
    const nombre = u.mascota.nombre;
    const emoji = u.mascota.emoji;
    u.mascota = null;
    u.ultimoAdoptar = Date.now(); // cooldown antes de poder adoptar de nuevo
    guardarUsuario(senderJid, u);
    await sock.sendMessage(jid, {
        text: `💔 *${emoji} ${nombre}* fue liberado/a...\n\n_Espera 1 hora para adoptar una nueva mascota._`
    });
}

// ══════════════════════════════════════════
//  HACK (troll)
// ══════════════════════════════════════════
async function cmdHack(sock, jid, senderJid, mencionados, pushName) {
    const objetivo = mencionados?.length ? mencionados[0] : null;
    const nombre = pushName || senderJid.split('@')[0];
    const victima = objetivo ? `@${objetivo.split('@')[0]}` : 'alguien del grupo';
    const fases = [
        `💻 *${nombre}* inició un ataque...\n🔍 Escaneando IP de ${victima}...`,
        `⚡ *${nombre}* encontró vulnerabilidades...\n🔓 Intentando acceso remoto...`,
        `✅ *${nombre}* hackeó a ${victima} exitosamente! 🎉\n\n💡 _Contraseña: 1234_\n📧 _Email: usuario@example.com_\n🔐 _Tarjeta: **** **** **** 4242_\n\n😂 _¡Es broma! Nadie fue hackeado._`
    ];
    for (const fase of fases) {
        await sock.sendMessage(jid, { text: fase, mentions: objetivo ? [objetivo] : [] });
        await new Promise(r => setTimeout(r, 1500));
    }
}

// ══════════════════════════════════════════
//  RANK GLOBAL
// ══════════════════════════════════════════
async function cmdRankGlobal(sock, jid) {
    const db = cargarUsuarios();
    const todos = Object.entries(db)
        .filter(([k]) => k.includes('@') && !k.endsWith('@g.us'))
        .map(([ujid, u]) => ({ jid: ujid, nivel: u.nivel || 1, exp: u.experiencia || 0 }))
        .sort((a, b) => b.nivel !== a.nivel ? b.nivel - a.nivel : b.exp - a.exp)
        .slice(0, 10);
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let texto = '🌍 *Ranking Global — Niveles*\n' + '─'.repeat(24) + '\n\n';
    todos.forEach((u, i) => {
        texto += `${medallas[i]} @${u.jid.split('@')[0]} — Nv.*${u.nivel}*\n`;
    });
    const mentions = todos.map(u => u.jid);
    await sock.sendMessage(jid, { text: texto, mentions });
}

// ══════════════════════════════════════════
//  EVENTOS
// ══════════════════════════════════════════
function obtenerEventoActivo() {
    try {
        if (!fs.existsSync(EVENT_PATH)) return null;
        const data = fs.readJsonSync(EVENT_PATH);
        if (data?.fin && Date.now() > data.fin) return null;
        return data;
    } catch { return null; }
}

async function cmdEvento(sock, jid) {
    const evento = obtenerEventoActivo();
    if (!evento) {
        const ahora = new Date();
        const esfds = ahora.getDay() === 0 || ahora.getDay() === 6;
        if (esfds) {
            await sock.sendMessage(jid, { text: '🎉 *Evento activo: ¡Fin de semana doble!*\n\n💰 Todas las recompensas de #daily se duplican hoy.\n📅 Termina mañana a medianoche.' });
        } else {
            await sock.sendMessage(jid, { text: '📅 *No hay eventos activos ahora.*\n\n_Los fines de semana se activa automáticamente el evento de doble recompensa._' });
        }
        return;
    }
    const fin = evento.fin ? `\n⏰ Termina: ${new Date(evento.fin).toLocaleString()}` : '';
    await sock.sendMessage(jid, { text: `🎉 *Evento activo: ${evento.nombre}*\n\n${evento.descripcion}${fin}` });
}

async function cmdLoot(sock, jid, senderJid, pushName) {
    try {
        if (!fs.existsSync(LOOT_PATH)) {
            await sock.sendMessage(jid, { text: '❌ No hay loot disponible en este momento.' });
            return;
        }
        const lootData = fs.readJsonSync(LOOT_PATH);
        if (!lootData?.activo) {
            await sock.sendMessage(jid, { text: '❌ No hay loot disponible ahora. ¡Espera el próximo evento!' });
            return;
        }
        const recogidos = lootData.recogidos || {};
        if (recogidos[senderJid]) {
            await sock.sendMessage(jid, { text: '❌ Ya recogiste este loot. ¡Espera el próximo!' });
            return;
        }
        const u = getUsuario(senderJid);
        const premio = Math.floor(Math.random() * 500) + 100;
        u.monedas = (u.monedas || 0) + premio;
        guardarUsuario(senderJid, u);
        recogidos[senderJid] = Date.now();
        lootData.recogidos = recogidos;
        fs.writeJsonSync(LOOT_PATH, lootData);
        const nombre = pushName || senderJid.split('@')[0];
        await sock.sendMessage(jid, { text: `🎁 *${nombre}* recogió el loot y obtuvo *${premio} ⓃNexCoins*!` });
    } catch {
        await sock.sendMessage(jid, { text: '❌ Error recogiendo el loot.' });
    }
}

module.exports = {
    cmdAfk, verificarAfk, notificarAfk,
    cmdAdoptar, cmdPetInfo, cmdPetFeed, cmdPetPlay, cmdCambiarMascota, cmdAbandonarMascota,
    cmdHack, cmdRankGlobal, cmdEvento, cmdLoot, obtenerEventoActivo,
    TIPOS_MASCOTAS, RAREZA
};
