const fs = require('fs');
const path = require('path');
const axios = require('axios');

const usersPath = path.join(__dirname, '../data/users.json');
const personajesPath = path.join(__dirname, '../src/personajes.json');

// ── Cache en memoria para no leer JSON en cada comando ──────────────────────
let _cache = null;
function getPersonajes() {
    if (_cache) return _cache;
    if (!fs.existsSync(personajesPath)) return [];
    _cache = JSON.parse(fs.readFileSync(personajesPath)).personajes || [];
    return _cache;
}

function invalidarCache() { _cache = null; }

function cargarJSON(ruta) {
    if (!fs.existsSync(ruta)) return {};
    return JSON.parse(fs.readFileSync(ruta));
}

function guardarJSON(ruta, data) {
    fs.writeFileSync(ruta, JSON.stringify(data, null, 2));
}

function encodeBooruTags(tags) {
    return encodeURIComponent(String(tags || '').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim());
}

function msToTime(ms) {
    const minutos = Math.floor((ms / (1000 * 60)) % 60);
    const segundos = Math.floor((ms / 1000) % 60);
    return `${minutos}m ${segundos}s`;
}

function barraCooldown(restante, total) {
    const totalBars = 10;
    const llenos = Math.round(((total - restante) / total) * totalBars);
    return '🟩'.repeat(llenos) + '⬜'.repeat(totalBars - llenos);
}

// Expiración del personaje rolleado y cooldown del claim
const ROLL_EXPIRACION = 90 * 1000;       // 90s para reclamar el personaje
const CLAIM_COOLDOWN  = 3 * 60 * 1000;   // 3min de cooldown entre claims

// Buscar GIF/video animado de personaje (para #cvideo)
async function buscarVideoPersonaje(tag) {
    if (!tag) return null;
    const tagLimpio = tag.trim().replace(/\s+/g, '_');
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
    const filtros = ['+animated+rating:general', '+animated+rating:safe', '+animated', '+gif'];
    for (const filtro of filtros) {
        // Gelbooru animados
        try {
            const pid = Math.floor(Math.random() * 3);
            const res = await axios.get(
                `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=60&tags=${encodeBooruTags(tagLimpio + filtro)}&pid=${pid}`,
                { timeout: 12000, headers }
            );
            const data = res.data;
            const posts = Array.isArray(data) ? data : (Array.isArray(data?.post) ? data.post : []);
            const animados = posts.filter(p => p.file_url && /\.(gif|mp4|webm)$/i.test(p.file_url));
            if (animados.length) return animados[Math.floor(Math.random() * animados.length)].file_url;
        } catch { }
        // Safebooru animados
        try {
            const pid = Math.floor(Math.random() * 3);
            const res = await axios.get(
                `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=60&tags=${encodeBooruTags(tagLimpio + filtro)}&pid=${pid}`,
                { timeout: 12000, headers }
            );
            const posts = Array.isArray(res.data) ? res.data : [];
            const animados = posts.filter(p => p.file_url && /\.(gif|mp4|webm)$/i.test(p.file_url));
            if (animados.length) return animados[Math.floor(Math.random() * animados.length)].file_url;
        } catch { }
    }
    // Tenor (gifs públicos) — intenta nombre limpio
    try {
        const consulta = encodeURIComponent(tagLimpio.replace(/_/g, ' ') + ' anime');
        const res = await axios.get(
            `https://g.tenor.com/v1/search?q=${consulta}&limit=20&media_filter=minimal&contentfilter=high`,
            { timeout: 10000, headers }
        );
        const results = res.data?.results || [];
        const urls = results
            .map(r => r.media?.[0]?.gif?.url || r.media?.[0]?.mp4?.url)
            .filter(Boolean);
        if (urls.length) return urls[Math.floor(Math.random() * urls.length)];
    } catch { }
    return null;
}

// Usa el JID completo como clave (ej: 123456789@s.whatsapp.net o @lid)
function asegurarUsuario(usuarios, jid) {
    if (!usuarios[jid]) {
        usuarios[jid] = { monedas: 10000, harem: [], cooldowns: {}, claimMsg: null, ventas: [], votosPersonaje: {} };
    }
    const u = usuarios[jid];
    if (!u.harem) u.harem = [];
    if (!u.cooldowns) u.cooldowns = {};
    if (u.monedas === undefined) u.monedas = 0;
    if (!u.claimMsg) u.claimMsg = null;
    if (!u.ventas) u.ventas = [];
    if (!u.votosPersonaje) u.votosPersonaje = {};
    return u;
}

function getUsuarioPersonajes(senderJid) {
    const usuarios = cargarJSON(usersPath);
    const u = asegurarUsuario(usuarios, senderJid);
    return { usuarios, u };
}

// ── Obtener imagen de un personaje ──────────────────────────────────────────
// Estrategia: pruebas con varios filtros (general, safe, sin filtro) y
// múltiples backends. Filtros estrictos hacen que muchos personajes no
// devuelvan nada — por eso se afloja gradualmente.
async function buscarImagenPersonaje(tag) {
    if (!tag) return null;
    const tagLimpio = tag.trim().replace(/\s+/g, '_');
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

    // Listas de filtros a probar en orden
    const filtros = ['+rating:general', '+rating:safe', '+rating:s', ''];

    for (const filtro of filtros) {
        // 1. Safebooru
        try {
            const pid = Math.floor(Math.random() * 5);
            const res = await axios.get(
                `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=60&tags=${encodeBooruTags(tagLimpio + filtro)}&pid=${pid}`,
                { timeout: 12000, headers }
            );
            const posts = Array.isArray(res.data) ? res.data : [];
            const validos = posts.filter(p => p.file_url || p.image);
            if (validos.length) {
                const p = validos[Math.floor(Math.random() * validos.length)];
                const url = p.file_url || `https://safebooru.org//images/${p.directory}/${p.image}`;
                if (/\.(jpg|jpeg|png|webp)$/i.test(url)) return url;
            }
        } catch { }

        // 2. Gelbooru
        try {
            const pid = Math.floor(Math.random() * 5);
            const res = await axios.get(
                `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=60&tags=${encodeBooruTags(tagLimpio + filtro)}&pid=${pid}`,
                { timeout: 12000, headers }
            );
            const data = res.data;
            const posts = Array.isArray(data) ? data : (Array.isArray(data?.post) ? data.post : []);
            const validos = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url));
            if (validos.length) return validos[Math.floor(Math.random() * validos.length)].file_url;
        } catch { }

        // 3. Danbooru (usa 'g' o 's' como código corto)
        try {
            const pid = Math.floor(Math.random() * 5) + 1;
            const dbFiltro = filtro.includes('general') ? '+rating:g' : filtro.includes('safe') ? '+rating:s' : filtro;
            const res = await axios.get(
                `https://danbooru.donmai.us/posts.json?tags=${encodeBooruTags(tagLimpio + dbFiltro)}&limit=40&page=${pid}`,
                { timeout: 12000, headers }
            );
            const posts = (res.data || []).filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url));
            if (posts.length) return posts[Math.floor(Math.random() * posts.length)].file_url;
        } catch { }
    }

    // 4. Yande.re — buena para personajes anime
    try {
        const res = await axios.get(
            `https://yande.re/post.json?tags=${encodeBooruTags(tagLimpio)}&limit=40`,
            { timeout: 12000, headers }
        );
        const posts = (res.data || []).filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url));
        if (posts.length) return posts[Math.floor(Math.random() * posts.length)].file_url;
    } catch { }

    // 5. Konachan — otra DB de anime
    try {
        const res = await axios.get(
            `https://konachan.net/post.json?tags=${encodeBooruTags(tagLimpio)}&limit=40`,
            { timeout: 12000, headers }
        );
        const posts = (res.data || []).filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url));
        if (posts.length) return posts[Math.floor(Math.random() * posts.length)].file_url;
    } catch { }

    // 6. Fallback final: imagen anime aleatoria de waifu.pics
    try {
        const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 8000 });
        if (res.data?.url) return res.data.url;
    } catch { }

    return null;
}

// ── Estado del personaje (Libre / Reclamado) ────────────────────────────────
function obtenerEstado(nombre) {
    const usuarios = cargarJSON(usersPath);
    for (const [, ud] of Object.entries(usuarios)) {
        const harem = ud.harem || [];
        if (harem.some(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === nombre.toLowerCase())) {
            return 'Reclamado';
        }
    }
    return 'Libre';
}

function obtenerDuenoPersonaje(nombre) {
    const usuarios = cargarJSON(usersPath);
    for (const [uid, ud] of Object.entries(usuarios)) {
        const harem = ud.harem || [];
        if (harem.some(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === nombre.toLowerCase())) {
            return uid;
        }
    }
    return null;
}

function normalizarPersonajeHarem(personaje) {
    return {
        nombre: personaje.nombre,
        serie: personaje.serie,
        genero: personaje.genero,
        valor: personaje.valor,
        favorito: false
    };
}

function extraerNombreCitado(msg) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const texto = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.videoMessage?.caption || '';
    if (!texto) return null;
    return texto.match(/\*Nombre »\*\s*([^\n]+)/)?.[1]?.trim()
        || texto.match(/Nombre:\s*\*?([^\n*]+)/)?.[1]?.trim()
        || texto.match(/Compraste a \*([^*]+)\*/)?.[1]?.trim()
        || null;
}

// ── Formato de caption como en la referencia ───────────────────────────────
function formatCaption(p) {
    const generoIcon = p.genero?.toLowerCase() === 'femenino' ? '♀' : p.genero?.toLowerCase() === 'masculino' ? '♂' : '⚧';
    const estado = obtenerEstado(p.nombre);
    return `🌸 *Nombre »* ${p.nombre}\n${generoIcon} *Género »* ${p.genero}\n☆ *Valor »* ${p.valor}\n♡ *Estado »* ${estado}\n❖ *Fuente »* ${p.serie}\n\n🛒 Usa *#buychar ${p.nombre}* para comprarlo`;
}

// ── Handler principal ──────────────────────────────────────────────────────
async function manejarMensajePersonajes(sock, msg) {
    const texto = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
    if (!texto.startsWith('#')) return;

    const jid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || senderJid.split('@')[0];

    const parts = texto.slice(1).trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const lista = getPersonajes();
    const cooldownTiempo = 5 * 60 * 1000;
    const ahora = Date.now();
    const { usuarios, u } = getUsuarioPersonajes(senderJid);

    switch (cmd) {

        // 🎲 ROLL WAIFU
        case 'rw':
        case 'roll':
        case 'rollwaifu': {
            const ultimo = u.cooldowns.rw || 0;
            if (ahora - ultimo < cooldownTiempo) {
                const restante = cooldownTiempo - (ahora - ultimo);
                return sock.sendMessage(jid, {
                    text: `⏳ Espera *${msToTime(restante)}*\n${barraCooldown(restante, cooldownTiempo)}`
                });
            }

            if (!lista.length) return sock.sendMessage(jid, { text: '❌ No hay personajes disponibles.' });

            const personaje = lista[Math.floor(Math.random() * lista.length)];
            u.cooldowns.rw = ahora;
            u.lastRoll = personaje.nombre;
            u.lastRollTime = ahora;
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);

            const caption = formatCaption(personaje);

            // Intentar imagen local primero
            const imgPath = path.join(__dirname, 'img', personaje.imagen || '');
            if (personaje.imagen && fs.existsSync(imgPath)) {
                return sock.sendMessage(jid, { image: fs.readFileSync(imgPath), caption });
            }

            // Intentar imagen por API
            await sock.sendMessage(jid, { text: '🎴 Buscando personaje...' });
            const imgUrl = await buscarImagenPersonaje(personaje.tag);
            if (imgUrl) {
                return sock.sendMessage(jid, { image: { url: imgUrl }, caption });
            }

            return sock.sendMessage(jid, { text: caption });
        }

        // 🎯 CLAIM
        case 'claim':
        case 'c':
        case 'reclamar': {
            // Cooldown de claim
            const ultimoClaim = u.cooldowns.claim || 0;
            if (ahora - ultimoClaim < CLAIM_COOLDOWN) {
                const restante = CLAIM_COOLDOWN - (ahora - ultimoClaim);
                return sock.sendMessage(jid, {
                    text: `⏳ Debes esperar *${msToTime(restante)}* para reclamar otro personaje.\n${barraCooldown(restante, CLAIM_COOLDOWN)}`
                });
            }

            const nombreCitado = args.join(' ').trim() || extraerNombreCitado(msg);
            const usandoLastRoll = !nombreCitado && !!u.lastRoll;
            const nombre = nombreCitado || u.lastRoll;
            if (!nombre) {
                return sock.sendMessage(jid, { text: '❌ Uso: responde al roll con *#claim* o usa *#claim [nombre]*.' });
            }

            // Verificar expiración del personaje rolleado
            if (usandoLastRoll && u.lastRollTime && (ahora - u.lastRollTime) > ROLL_EXPIRACION) {
                u.lastRoll = null;
                u.lastRollTime = null;
                usuarios[senderJid] = u;
                guardarJSON(usersPath, usuarios);
                return sock.sendMessage(jid, { text: `⌛ El personaje expiró. Usa *#rw* para rollear otro.` });
            }

            const personaje = lista.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() || p.nombre.toLowerCase().includes(nombre.toLowerCase()));
            if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombre}* no encontrado.` });
            const dueno = obtenerDuenoPersonaje(personaje.nombre);
            if (dueno && dueno !== senderJid) {
                return sock.sendMessage(jid, { text: `⚠️ *${personaje.nombre}* ya fue reclamado por @${dueno.split('@')[0]}.`, mentions: [dueno] });
            }
            if (u.harem.some(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === personaje.nombre.toLowerCase())) {
                return sock.sendMessage(jid, { text: `⚠️ Ya tienes a *${personaje.nombre}* en tu harem.` });
            }
            if (u.monedas < personaje.valor) {
                return sock.sendMessage(jid, { text: `💸 Necesitas *${personaje.valor} coins* y tienes *${u.monedas}*.` });
            }
            u.monedas -= personaje.valor;
            u.harem.push(normalizarPersonajeHarem(personaje));
            u.cooldowns.claim = ahora;
            if (usandoLastRoll) { u.lastRoll = null; u.lastRollTime = null; }
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            const claimMsg = u.claimMsg
                ? u.claimMsg.replace('{nombre}', personaje.nombre)
                : `✅ Reclamaste a *${personaje.nombre}* por *${personaje.valor} coins*.\n💰 Te quedan: *${u.monedas} coins*`;
            return sock.sendMessage(jid, { text: claimMsg });
        }

        // 🛒 COMPRAR PERSONAJE (del pool general)
        case 'buychar':
        case 'buyc':
        case 'buycharacter': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #buychar [nombre]\nEjemplo: #buychar Rem' });

            const personaje = lista.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
            if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombre}* no encontrado. Usa #rw para descubrir personajes.` });
            if (u.harem.some(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === nombre.toLowerCase())) {
                return sock.sendMessage(jid, { text: '⚠️ Ya tienes este personaje en tu harem' });
            }
            if (u.monedas < personaje.valor) {
                return sock.sendMessage(jid, { text: `💸 Necesitas *${personaje.valor} coins* y tienes *${u.monedas}*` });
            }

            // Verificar si hay en la tienda (precio especial)
            let precioFinal = personaje.valor;
            let vendedorJid = null;
            const todosUsers = cargarJSON(usersPath);
            for (const [uid, ud] of Object.entries(todosUsers)) {
                if (ud.ventas) {
                    const vIdx = ud.ventas.findIndex(v => (typeof v.personaje === 'string' ? v.personaje : v.personaje?.nombre)?.toLowerCase() === nombre.toLowerCase());
                    if (vIdx !== -1) {
                        precioFinal = ud.ventas[vIdx].precio;
                        vendedorJid = uid;
                        break;
                    }
                }
            }

            u.monedas -= precioFinal;
            u.harem.push(normalizarPersonajeHarem(personaje));
            usuarios[senderJid] = u;

            // Si se compró de la tienda, transferir coins al vendedor y quitar de ventas
            if (vendedorJid && vendedorJid !== senderJid) {
                const vd = todosUsers[vendedorJid];
                vd.ventas = vd.ventas.filter(v => (typeof v.personaje === 'string' ? v.personaje : v.personaje?.nombre)?.toLowerCase() !== nombre.toLowerCase());
                if (vd.monedas !== undefined) vd.monedas += precioFinal;
                usuarios[vendedorJid] = vd;
            }

            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, {
                text: `✅ ¡Compraste a *${personaje.nombre}* por *${precioFinal} coins*! 🎉\n💰 Te quedan: ${u.monedas} coins`
            });
            break;
        }

        // 🎴 VER HAREM
        case 'harem':
        case 'waifus':
        case 'claims': {
            const mencionados = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const objetivoJid = mencionados[0] || senderJid;
            const { u: objetivo } = getUsuarioPersonajes(objetivoJid);
            const harem = objetivo.harem;
            const nombreMostrar = objetivoJid === senderJid ? pushName : `@${objetivoJid.split('@')[0]}`;
            if (!harem || harem.length === 0) {
                return sock.sendMessage(jid, { text: objetivoJid === senderJid ? '💔 No tienes personajes... usa *#rw* para obtener uno 😏' : `💔 ${nombreMostrar} no tiene personajes.`, mentions: mencionados });
            }
            let textoHarem = `🎴 *HAREM DE ${nombreMostrar.toUpperCase()}*\n\n`;
            harem.slice(0, 50).forEach((p, i) => {
                const nombre = typeof p === 'string' ? p : p.nombre;
                const fav = typeof p === 'object' && p.favorito ? ' ⭐' : '';
                const serie = typeof p === 'object' ? ` _(${p.serie || '?'})_` : '';
                textoHarem += `${i + 1}. *${nombre}*${fav}${serie}\n`;
            });
            if (harem.length > 50) textoHarem += `\n_...y ${harem.length - 50} más_`;
            textoHarem += `\n💎 Total: *${harem.length}* personajes`;
            await sock.sendMessage(jid, { text: textoHarem, mentions: mencionados });
            break;
        }

        // 🗑️ ELIMINAR PERSONAJE
        case 'deletewaifu':
        case 'delwaifu':
        case 'delchar': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #delchar [nombre]' });
            const idx = u.harem.findIndex(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === nombre.toLowerCase());
            if (idx === -1) return sock.sendMessage(jid, { text: `❌ No tienes a *${nombre}* en tu harem` });
            u.harem.splice(idx, 1);
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, { text: `✅ *${nombre}* fue eliminado de tu harem.` });
            break;
        }

        // 🎁 REGALAR PERSONAJE
        case 'givechar':
        case 'givewaifu':
        case 'regalar': {
            const mencionados = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mencionados.length || !args.length) {
                return sock.sendMessage(jid, { text: '❌ Uso: #givechar @usuario [nombre]' });
            }
            const objetivoJid = mencionados[0];
            const nombre = args.filter(a => !a.startsWith('@')).join(' ');
            const idx = u.harem.findIndex(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === nombre.toLowerCase());
            if (idx === -1) return sock.sendMessage(jid, { text: `❌ No tienes a *${nombre}* en tu harem` });

            const personajeData = u.harem.splice(idx, 1)[0];
            const u2 = asegurarUsuario(usuarios, objetivoJid);
            u2.harem.push(personajeData);
            usuarios[senderJid] = u;
            usuarios[objetivoJid] = u2;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, {
                text: `🎁 *${pushName}* regaló a *${nombre}* a *@${objetivoJid.split('@')[0]}*! 💝`,
                mentions: mencionados
            });
            break;
        }

        // 🎁 REGALAR TODO EL HAREM
        case 'giveallharem': {
            const mencionados = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mencionados.length) return sock.sendMessage(jid, { text: '❌ Uso: #giveallharem @usuario' });
            if (!u.harem.length) return sock.sendMessage(jid, { text: '❌ Tu harem está vacío.' });

            const objetivoJid = mencionados[0];
            const u2 = asegurarUsuario(usuarios, objetivoJid);
            u2.harem.push(...u.harem);
            const total = u.harem.length;
            u.harem = [];
            usuarios[senderJid] = u;
            usuarios[objetivoJid] = u2;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, {
                text: `🎁 *${pushName}* regaló todos sus personajes (${total}) a *@${objetivoJid.split('@')[0]}*! 💝`,
                mentions: mencionados
            });
            break;
        }

        // 💰 PONER A LA VENTA
        case 'sell':
        case 'vender': {
            const precio = parseInt(args[0]);
            const nombre = args.slice(1).join(' ');
            if (isNaN(precio) || precio <= 0 || !nombre) {
                return sock.sendMessage(jid, { text: '❌ Uso: #sell [precio] [nombre]\nEjemplo: #sell 500 Rem' });
            }
            const idx = u.harem.findIndex(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === nombre.toLowerCase());
            if (idx === -1) return sock.sendMessage(jid, { text: `❌ No tienes a *${nombre}* en tu harem` });
            const personajeData = u.harem.splice(idx, 1)[0];
            u.ventas.push({ personaje: personajeData, precio, vendedor: senderJid });
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            const pNombre = typeof personajeData === 'string' ? personajeData : personajeData.nombre;
            await sock.sendMessage(jid, { text: `🏪 *${pNombre}* fue puesto a la venta por *${precio} coins*!\n\nCualquiera puede comprarlo con *#buychar ${pNombre}*` });
            break;
        }

        // ❌ RETIRAR DE VENTA
        case 'removesale':
        case 'removerventa': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #removesale [nombre]' });
            if (!u.ventas || !u.ventas.length) return sock.sendMessage(jid, { text: '❌ No tienes personajes en venta.' });
            const idx = u.ventas.findIndex(v => (typeof v.personaje === 'string' ? v.personaje : v.personaje?.nombre)?.toLowerCase() === nombre.toLowerCase());
            if (idx === -1) return sock.sendMessage(jid, { text: `❌ No tienes *${nombre}* en venta.` });
            const venta = u.ventas.splice(idx, 1)[0];
            u.harem.push(venta.personaje);
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, { text: `✅ *${nombre}* fue retirado de la venta y devuelto a tu harem.` });
            break;
        }

        // 🏪 TIENDA DE PERSONAJES
        case 'haremshop':
        case 'tiendawaifus':
        case 'wshop': {
            const todos = cargarJSON(usersPath);
            const ventas = [];
            for (const [uid, ud] of Object.entries(todos)) {
                if (ud.ventas && ud.ventas.length) {
                    for (const v of ud.ventas) {
                        ventas.push({ ...v, vendedorId: uid });
                    }
                }
            }
            if (!ventas.length) return sock.sendMessage(jid, { text: '🏪 La tienda de personajes está vacía.\n\nUsa *#sell [precio] [nombre]* para vender tus personajes.' });
            let texto = '╔══════════════════╗\n║  🏪 TIENDA WAIFUS  ║\n╚══════════════════╝\n\n';
            ventas.slice(0, 15).forEach((v, i) => {
                const nombre = typeof v.personaje === 'string' ? v.personaje : v.personaje?.nombre || '?';
                const serie = typeof v.personaje === 'object' ? v.personaje.serie || '?' : '?';
                const vendedorId = v.vendedor || v.vendedorId;
                const vendedorData = vendedorId ? todos[vendedorId] : null;
                const vendedorNombre = vendedorData?.pushName || vendedorData?.nombre || (vendedorId ? vendedorId.split('@')[0] : '?');
                texto += `${i + 1}. *${nombre}* _(${serie})_\n   💰 *${v.precio} coins* — ${vendedorNombre}\n\n`;
            });
            texto += '👉 Usa *#buychar [nombre]* para comprar';
            await sock.sendMessage(jid, { text: texto });
            break;
        }

        // 🔄 INTERCAMBIAR
        case 'trade':
        case 'intercambiar': {
            const mencionados = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const partes = args.join(' ').split('/').map(s => s.trim());
            if (!mencionados.length || partes.length < 2 || !partes[0] || !partes[1]) {
                return sock.sendMessage(jid, { text: '❌ Uso: #trade @usuario [tu personaje] / [personaje que quieres]\nEjemplo: #trade @amigo Rem / Nezuko' });
            }
            const miPersonaje = partes[0];
            const suPersonaje = partes[1];
            const objetivoJid = mencionados[0];

            const miIdx = u.harem.findIndex(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === miPersonaje.toLowerCase());
            if (miIdx === -1) return sock.sendMessage(jid, { text: `❌ No tienes a *${miPersonaje}* en tu harem` });

            const u2 = asegurarUsuario(usuarios, objetivoJid);
            const suIdx = u2.harem.findIndex(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === suPersonaje.toLowerCase());
            if (suIdx === -1) return sock.sendMessage(jid, { text: `❌ *@${objetivoJid.split('@')[0]}* no tiene a *${suPersonaje}*`, mentions: mencionados });

            const miData = u.harem.splice(miIdx, 1)[0];
            const suData = u2.harem.splice(suIdx, 1)[0];
            u.harem.push(suData);
            u2.harem.push(miData);
            usuarios[senderJid] = u;
            usuarios[objetivoJid] = u2;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, {
                text: `🔄 ¡Intercambio completado!\n*${pushName}* dio *${miPersonaje}* y recibió *${suPersonaje}* de @${objetivoJid.split('@')[0]} 🎉`,
                mentions: mencionados
            });
            break;
        }

        // 📊 GACHA INFO
        case 'gachainfo':
        case 'ginfo':
        case 'infogacha': {
            const enVenta = Object.values(cargarJSON(usersPath)).reduce((acc, ud) => acc + (ud.ventas?.length || 0), 0);
            await sock.sendMessage(jid, {
                text: `╔══════════════════╗\n║   🎴 GACHA INFO    ║\n╚══════════════════╝\n\n🎴 Personajes en el bot: *${lista.length}*\n💰 Tus monedas: *${u.monedas}*\n🃏 Tu harem: *${u.harem.length}* personajes\n🏪 En tienda: *${enVenta}*\n⏳ Roll cooldown: ${ahora - (u.cooldowns.rw || 0) < cooldownTiempo ? msToTime(cooldownTiempo - (ahora - (u.cooldowns.rw || 0))) : '¡Listo!'}`
            });
            break;
        }

        // 🖼️ VER IMAGEN DE PERSONAJE
        case 'charimage':
        case 'waifuimage':
        case 'cimage':
        case 'wimage': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #charimage [nombre]' });
            const personaje = lista.find(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()));
            if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombre}* no encontrado` });

            const imgPath = path.join(__dirname, 'img', personaje.imagen || '');
            if (personaje.imagen && fs.existsSync(imgPath)) {
                return sock.sendMessage(jid, { image: fs.readFileSync(imgPath), caption: `🖼️ *${personaje.nombre}* — ${personaje.serie}` });
            }

            await sock.sendMessage(jid, { text: `🔍 Buscando imagen de *${personaje.nombre}*...` });
            const imgUrl = await buscarImagenPersonaje(personaje.tag);
            if (imgUrl) return sock.sendMessage(jid, { image: { url: imgUrl }, caption: `🖼️ *${personaje.nombre}* — ${personaje.serie}` });
            await sock.sendMessage(jid, { text: `❌ No encontré imagen para *${personaje.nombre}*` });
            break;
        }

        // ℹ️ INFO DE PERSONAJE
        case 'charinfo':
        case 'winfo':
        case 'waifuinfo': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #charinfo [nombre]' });
            const personaje = lista.find(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()));
            if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombre}* no encontrado` });
            const todos = cargarJSON(usersPath);
            let duenoTxt = 'Nadie';
            let duenoJid = null;
            for (const [uid, ud] of Object.entries(todos)) {
                if ((ud.harem || []).some(h => (typeof h === 'string' ? h : h.nombre)?.toLowerCase() === personaje.nombre.toLowerCase())) {
                    duenoJid = uid;
                    const nombreDueno = ud.pushName || ud.nombre || uid.split('@')[0];
                    duenoTxt = `@${uid.split('@')[0]} (${nombreDueno})`;
                    break;
                }
            }
            const generoIcon = personaje.genero?.toLowerCase() === 'femenino' ? '♀' : '♂';
            const caption = `╔══════════════════╗\n║  📋 CHAR INFO      ║\n╚══════════════════╝\n\n🌸 Nombre: *${personaje.nombre}*\n${generoIcon} Género: *${personaje.genero}*\n❖ Serie: *${personaje.serie}*\n☆ Valor: *${personaje.valor} coins*\n♡ Estado: *${duenoJid ? 'Reclamado' : 'Libre'}*\n👤 Dueño: ${duenoTxt}`;
            const mentions = duenoJid ? [duenoJid] : [];

            // Intentar imagen local primero
            const imgPath = path.join(__dirname, 'img', personaje.imagen || '');
            if (personaje.imagen && fs.existsSync(imgPath)) {
                return sock.sendMessage(jid, { image: fs.readFileSync(imgPath), caption, mentions });
            }
            // Buscar imagen via API
            const imgUrl = await buscarImagenPersonaje(personaje.tag);
            if (imgUrl) {
                return sock.sendMessage(jid, { image: { url: imgUrl }, caption, mentions });
            }
            await sock.sendMessage(jid, { text: caption, mentions });
            break;
        }

        // 🏆 TOP PERSONAJES POR VALOR
        case 'waifusboard':
        case 'waifustop':
        case 'topwaifus':
        case 'wtop': {
            const top = [...lista].sort((a, b) => (b.valor || 0) - (a.valor || 0)).slice(0, 15);
            let texto = '╔══════════════════╗\n║  🏆 TOP PERSONAJES ║\n╚══════════════════╝\n\n';
            top.forEach((p, i) => {
                const genIco = p.genero?.toLowerCase() === 'femenino' ? '♀' : '♂';
                texto += `${i + 1}. *${p.nombre}* ${genIco} _(${p.serie})_ — ☆ ${p.valor}\n`;
            });
            await sock.sendMessage(jid, { text: texto });
            break;
        }

        // ❤️ TOP FAVORITOS
        case 'favoritetop':
        case 'favtop': {
            const nombreFav = args.join(' ').trim();
            if (nombreFav) {
                const personaje = lista.find(p => p.nombre.toLowerCase().includes(nombreFav.toLowerCase()));
                if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombreFav}* no encontrado.` });
                u.favorito = personaje.nombre;
                usuarios[senderJid] = u;
                guardarJSON(usersPath, usuarios);
                return sock.sendMessage(jid, { text: `❤️ Tu personaje favorito ahora es *${personaje.nombre}*.` });
            }
            const todos = cargarJSON(usersPath);
            const conteo = {};
            for (const ud of Object.values(todos)) {
                if (ud.favorito) conteo[ud.favorito] = (conteo[ud.favorito] || 0) + 1;
            }
            const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 10);
            if (!top.length) return sock.sendMessage(jid, { text: '❌ Nadie ha establecido un favorito aún.' });
            let texto = '╔══════════════════╗\n║  ❤️ TOP FAVORITOS  ║\n╚══════════════════╝\n\n';
            top.forEach(([nombre, votos], i) => {
                texto += `${i + 1}. *${nombre}* — ❤️ ${votos} votos\n`;
            });
            await sock.sendMessage(jid, { text: texto });
            break;
        }

        // 📺 INFO DE SERIE
        case 'serieinfo':
        case 'ainfo':
        case 'animeinfo': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #serieinfo [nombre de la serie]' });
            const personajesSerie = lista.filter(p => p.serie.toLowerCase().includes(nombre.toLowerCase()));
            if (!personajesSerie.length) return sock.sendMessage(jid, { text: `❌ No se encontraron personajes de *${nombre}*` });
            const serie = personajesSerie[0].serie;
            let texto = `╔══════════════════╗\n║  📺 SERIE INFO     ║\n╚══════════════════╝\n\n📺 *${serie}*\n👥 Personajes: *${personajesSerie.length}*\n\n`;
            personajesSerie.slice(0, 15).forEach(p => {
                const genIco = p.genero?.toLowerCase() === 'femenino' ? '♀' : '♂';
                texto += `${genIco} *${p.nombre}* — ☆ ${p.valor}\n`;
            });
            if (personajesSerie.length > 15) texto += `\n_...y ${personajesSerie.length - 15} más_`;
            await sock.sendMessage(jid, { text: texto });
            break;
        }

        // 📋 LISTA DE SERIES
        case 'serielist':
        case 'slist':
        case 'animelist': {
            const series = [...new Set(lista.map(p => p.serie))].sort();
            let texto = `╔══════════════════╗\n║  📋 LISTA SERIES   ║\n╚══════════════════╝\n\n`;
            series.slice(0, 40).forEach((s, i) => {
                const count = lista.filter(p => p.serie === s).length;
                texto += `${i + 1}. *${s}* (${count})\n`;
            });
            if (series.length > 40) texto += `\n_...y ${series.length - 40} series más_`;
            texto += `\n📊 Total: *${lista.length}* personajes en *${series.length}* series`;
            await sock.sendMessage(jid, { text: texto });
            break;
        }

        // 🗳️ VOTAR POR PERSONAJE
        case 'vote':
        case 'votar': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #vote [nombre]' });
            const data = JSON.parse(fs.readFileSync(personajesPath));
            const personaje = data.personajes.find(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()));
            if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombre}* no encontrado` });
            if (!u.votosPersonaje) u.votosPersonaje = {};
            const ultimoVoto = u.votosPersonaje[personaje.nombre] || 0;
            if (ahora - ultimoVoto < 24 * 60 * 60 * 1000) {
                return sock.sendMessage(jid, { text: `⏳ Ya votaste por *${personaje.nombre}* hoy. Vuelve mañana.` });
            }
            personaje.valor = (personaje.valor || 0) + 10;
            u.votosPersonaje[personaje.nombre] = ahora;
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            guardarJSON(personajesPath, data);
            invalidarCache();
            await sock.sendMessage(jid, { text: `🗳️ ¡Votaste por *${personaje.nombre}*! Su valor aumentó a *${personaje.valor} coins*` });
            break;
        }

        // 💬 SETEAR MENSAJE DE CLAIM
        case 'setclaimmsg':
        case 'setclaim': {
            const mensaje = args.join(' ');
            if (!mensaje) return sock.sendMessage(jid, { text: '❌ Uso: #setclaim [mensaje]\nUsa {nombre} para el nombre del personaje' });
            u.claimMsg = mensaje;
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, { text: `✅ Mensaje de claim establecido:\n_${mensaje}_` });
            break;
        }

        // 🔄 RESETEAR MENSAJE DE CLAIM
        case 'delclaimmsg': {
            u.claimMsg = null;
            usuarios[senderJid] = u;
            guardarJSON(usersPath, usuarios);
            await sock.sendMessage(jid, { text: '✅ Mensaje de claim restablecido al predeterminado.' });
            break;
        }

        // 🎬 VIDEO DE PERSONAJE
        case 'charvideo':
        case 'waifuvideo':
        case 'cvideo':
        case 'wvideo': {
            const nombre = args.join(' ');
            if (!nombre) return sock.sendMessage(jid, { text: '❌ Uso: #charvideo [nombre]' });
            const personaje = lista.find(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()));
            if (!personaje) return sock.sendMessage(jid, { text: `❌ Personaje *${nombre}* no encontrado` });

            await sock.sendMessage(jid, { text: `🎬 Buscando video/gif de *${personaje.nombre}*...` });
            const mediaUrl = await buscarVideoPersonaje(personaje.tag);
            if (!mediaUrl) {
                return sock.sendMessage(jid, {
                    text: `❌ No encontré video/gif para *${personaje.nombre}* (${personaje.serie}).`
                });
            }
            const caption = `🎬 *${personaje.nombre}*\n❖ Serie: ${personaje.serie}`;
            const esMp4 = /\.(mp4|webm)$/i.test(mediaUrl);
            if (esMp4) {
                await sock.sendMessage(jid, { video: { url: mediaUrl }, caption, gifPlayback: true });
            } else {
                // GIF como video con gifPlayback
                await sock.sendMessage(jid, { video: { url: mediaUrl }, caption, gifPlayback: true })
                    .catch(async () => {
                        await sock.sendMessage(jid, { image: { url: mediaUrl }, caption });
                    });
            }
            break;
        }
    }
}

module.exports = { manejarMensajePersonajes };
