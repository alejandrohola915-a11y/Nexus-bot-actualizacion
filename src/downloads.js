const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const YTDLP = 'yt-dlp';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const HUMAN_HEADERS = {
    'User-Agent': UA,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
};
const axiosOpts = { timeout: 25000, headers: HUMAN_HEADERS };
axios.defaults.headers.common = { ...axios.defaults.headers.common, ...HUMAN_HEADERS };

function logRequestError(contexto, err) {
    console.log('ERROR:', contexto, err.response?.data || err.message);
}

async function descargarBuffer(url, headers = {}) {
    const res = await axios.get(url, {
        headers: { ...axiosOpts.headers, ...headers },
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 10
    });
    return Buffer.from(res.data);
}

async function ytdlpEjecutar(args, timeout = 60000) {
    return execFileAsync(YTDLP, args, { timeout, maxBuffer: 200 * 1024 * 1024 });
}

function ytdlpHeadersArgs(referer = 'https://www.google.com/') {
    return [
        '--add-header', `User-Agent:${UA}`,
        '--add-header', 'Accept-Language:en-US,en;q=0.9'
    ];
}

function extraerErrorYtdlp(err) {
    const txt = (err.stderr || err.stdout || err.message || '').toString();
    const linea = txt.split('\n').find(l => l.includes('ERROR:'));
    if (linea) return linea.replace('ERROR:', '').replace(/\[.*?\]/g, '').trim();
    return 'No se pudo descargar el video.';
}

function esUrlYoutube(t) {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(t);
}

function formatearSegundos(seg) {
    if (!seg || isNaN(seg)) return null;
    const m = Math.floor(seg / 60), s = Math.floor(seg % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatearBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return null;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function formatearVistas(n) {
    if (!n || isNaN(n)) return null;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
}

function extraerUrlsMedia(obj) {
    const urls = [];
    const visitar = (valor) => {
        if (!valor) return;
        if (typeof valor === 'string') {
            if (/^https?:\/\/.+\.(mp4|jpg|jpeg|png|webp)(\?|$)/i.test(valor)) urls.push(valor);
            return;
        }
        if (Array.isArray(valor)) {
            valor.forEach(visitar);
            return;
        }
        if (typeof valor === 'object') {
            Object.values(valor).forEach(visitar);
        }
    };
    visitar(obj);
    return [...new Set(urls)];
}

function construirCaption(plataforma, titulo, duracion, tamano, extras = {}) {
    const emoji = { TikTok: '🎵', Instagram: '📸', Facebook: '📘', 'Twitter/X': '𝕏', YouTube: '🎬' }[plataforma] || '📹';
    let cap = `${emoji} *${titulo || plataforma}*\n`;
    const lineas = [];
    if (duracion) lineas.push(`✘ Duración: ${duracion}`);
    if (tamano) lineas.push(`📦 Tamaño: ${tamano}`);
    if (extras.canal) lineas.push(`📝 Canal: ${extras.canal}`);
    if (extras.vistas) lineas.push(`👁️ Vistas: ${extras.vistas}`);
    if (extras.autor) lineas.push(`✒️ Autor: ${extras.autor}`);
    lineas.push(`🔗 Fuente: ${plataforma}`);
    return cap + '\n' + lineas.join('\n');
}

// ── Obtener info completa del video ───────────────────────────────────────
async function ytdlpInfo(url) {
    try {
        const { stdout } = await ytdlpEjecutar([
            url,
            '--print', '%(title)s\t%(duration)s\t%(filesize_approx)s\t%(uploader)s\t%(view_count)s\t%(thumbnail)s',
            '--no-playlist', '--no-warnings', '--quiet',
            ...ytdlpHeadersArgs()
        ], 30000);
        const [titulo, durStr, sizeStr, autor, viewsStr, thumbnail] = stdout.trim().split('\t');
        return {
            titulo:   titulo   && titulo   !== 'NA' && titulo   !== 'None' ? titulo   : null,
            duracion: parseInt(durStr) || 0,
            tamano:   formatearBytes(parseInt(sizeStr)),
            autor:    autor    && autor    !== 'NA' && autor    !== 'None' ? autor    : null,
            vistas:   viewsStr && viewsStr !== 'NA' && viewsStr !== 'None' ? formatearVistas(parseInt(viewsStr)) : null,
            thumbnail: thumbnail && thumbnail !== 'NA' && thumbnail !== 'None' ? thumbnail.trim() : null
        };
    } catch (err) {
        logRequestError('ytdlpInfo', err);
        return { titulo: null, duracion: 0, tamano: null, autor: null, vistas: null, thumbnail: null };
    }
}

// ── Enviar tarjeta de info del video (thumbnail + datos) ──────────────────
async function enviarInfoCard(sock, jid, info, url, tipo = 'video') {
    const durStr = formatearSegundos(info.duracion);
    const accion = tipo === 'audio' ? '🎵 Descargando audio...' : '🎬 Descargando video...';

    const captionCard = [
        info.titulo ? `*${info.titulo}*` : '*Sin título*',
        '',
        durStr   ? `✘ Duración: ${durStr}` : null,
        info.autor ? `📝 Canal: ${info.autor}` : null,
        info.vistas ? `👁️ Vistas: ${info.vistas}` : null,
        url ? `🔗 Link: ${url}` : null,
        '',
        accion
    ].filter(l => l !== null).join('\n');

    try {
        if (info.thumbnail) {
            await sock.sendMessage(jid, {
                image: { url: info.thumbnail },
                caption: captionCard
            });
            return;
        }
    } catch { }

    await sock.sendMessage(jid, { text: captionCard });
}

// ── CORE: descargar con yt-dlp ────────────────────────────────────────────
async function ytdlpDescargarBuffer(url, { formato = null, merge = false } = {}) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tmpBase = path.join(os.tmpdir(), `ytdlp_${id}`);
    const outputTemplate = `${tmpBase}.%(ext)s`;

    const args = [
        url,
        '-o', outputTemplate,
        '--no-playlist',
        '--no-part',
        '--no-check-certificates',
        ...ytdlpHeadersArgs()
    ];

    if (formato) {
        args.push('-f', formato);
    } else {
        args.push('-f', 'b');
    }

    if (merge) {
        args.push('--merge-output-format', 'mp4');
    }

    try {
        await ytdlpEjecutar(args, 150000);

        const tmpDir = os.tmpdir();
        const baseNombre = path.basename(tmpBase);
        const archivos = fs.readdirSync(tmpDir)
            .filter(f => f.startsWith(baseNombre) && !f.endsWith('.part') && !f.endsWith('.ytdl'));

        if (!archivos.length) throw new Error('No se generó ningún archivo de video.');

        const archivoFinal = path.join(tmpDir, archivos[0]);
        const stat = await fs.stat(archivoFinal);
        const buffer = await fs.readFile(archivoFinal);
        await fs.remove(archivoFinal).catch(() => {});

        return { buffer, tamano: formatearBytes(stat.size) };
    } catch (err) {
        try {
            const base = path.basename(tmpBase);
            const archivos = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(base));
            await Promise.all(archivos.map(f => fs.remove(path.join(os.tmpdir(), f)).catch(() => {})));
        } catch { }
        throw err;
    }
}

async function ytdlpDirectMedia(url, formato = 'best[ext=mp4][height<=720]/best[height<=720]/best') {
    const { stdout } = await ytdlpEjecutar([
        url,
        '-J',
        '-f', formato,
        '--no-playlist',
        '--no-warnings',
        '--quiet',
        ...ytdlpHeadersArgs()
    ], 60000);
    const info = JSON.parse(stdout);
    const formatos = Array.isArray(info.formats) ? info.formats : [];
    const conVideo = formatos
        .filter(f => f.url && f.vcodec !== 'none' && /\.(mp4|m3u8|webm)(\?|$)/i.test(f.url))
        .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0));
    const elegido = conVideo[0] || formatos.find(f => f.url && f.vcodec !== 'none') || (info.url ? info : null);
    if (!elegido?.url) throw new Error('No se encontró enlace directo de video.');
    return {
        url: elegido.url,
        titulo: info.title,
        duracion: info.duration,
        autor: info.uploader,
        vistas: formatearVistas(info.view_count),
        thumbnail: info.thumbnail
    };
}

async function descargarDirectoConYtdlp(url, plataforma) {
    const info = await ytdlpDirectMedia(url);
    const buffer = await descargarBuffer(info.url);
    return {
        buffer,
        tamano: formatearBytes(buffer.length),
        info
    };
}

async function tiktokFallbackTikwm(url) {
    const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
        ...axiosOpts,
        timeout: 25000
    });
    const data = res.data?.data;
    const videoUrl = data?.hdplay || data?.play || data?.wmplay;
    if (!videoUrl) throw new Error(res.data?.msg || 'TikWM no devolvió video.');
    const buffer = await descargarBuffer(videoUrl, { Referer: 'https://www.tikwm.com/' });
    return {
        buffer,
        tamano: formatearBytes(buffer.length),
        info: {
            titulo: data.title || 'Video de TikTok',
            duracion: data.duration || 0,
            autor: data.author?.nickname || data.author?.unique_id || null
        }
    };
}

// ── Buscar video en YouTube ───────────────────────────────────────────────
async function ytdlpBuscarUrl(query) {
    const { stdout } = await ytdlpEjecutar([
        `ytsearch1:${query}`,
        '--print', '%(webpage_url)s\t%(title)s\t%(duration)s',
        '--no-playlist', '--quiet', '--no-warnings'
    ], 30000);
    const linea = stdout.trim().split('\n')[0];
    if (!linea) throw new Error('No se encontraron resultados.');
    const [url, titulo, duracion] = linea.split('\t');
    return { url, titulo: titulo || 'Sin título', duracion: parseInt(duracion) || 0 };
}

// ════════════════════════════════════════════════════
//  YOUTUBE - VIDEO (link directo)
// ════════════════════════════════════════════════════
async function cmdYoutube(sock, jid, args) {
    const url = args[0];
    if (!url || !esUrlYoutube(url)) {
        await sock.sendMessage(jid, { text: '❌ Ingresa un link válido de YouTube.\n📌 Uso: *#yt <link>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Obteniendo información...' });
    try {
        const info = await ytdlpInfo(url);
        if (info.duracion > 1200) {
            await sock.sendMessage(jid, { text: '❌ El video es muy largo. Máximo 20 minutos.\nUsa *#ytv <nombre>* para buscar.' });
            return;
        }
        await enviarInfoCard(sock, jid, info, url, 'video');
        const formato = 'bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best';
        const { buffer, tamano } = await ytdlpDescargarBuffer(url, { formato, merge: true });
        const caption = construirCaption('YouTube', info.titulo || 'Video de YouTube', formatearSegundos(info.duracion), info.tamano || tamano, { canal: info.autor, vistas: info.vistas });
        await sock.sendMessage(jid, { video: buffer, caption });
    } catch (err) {
        logRequestError('cmdYoutube', err);
        await sock.sendMessage(jid, { text: `❌ Error YouTube: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  YOUTUBE - AUDIO (#play)
// ════════════════════════════════════════════════════
async function cmdYoutubeAudio(sock, jid, args) {
    let consulta = args.join(' ');
    if (!consulta) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#play <link o canción>*' });
        return;
    }

    let urlFinal = consulta, infoFinal = null;

    if (!esUrlYoutube(consulta)) {
        await sock.sendMessage(jid, { text: `🔍 Buscando: *${consulta}*...` });
        try {
            const r = await ytdlpBuscarUrl(consulta);
            urlFinal = r.url;
        } catch (err) {
            logRequestError('cmdYoutubeAudio search', err);
            await sock.sendMessage(jid, { text: `❌ No encontré resultados para: *${consulta}*` });
            return;
        }
    }

    infoFinal = await ytdlpInfo(urlFinal);
    await enviarInfoCard(sock, jid, infoFinal, urlFinal, 'audio');

    const tmpBase = path.join(os.tmpdir(), `yta_${Date.now()}`);
    const tmpMp3 = `${tmpBase}.mp3`;
    try {
        await ytdlpEjecutar([
            urlFinal, '-x', '--audio-format', 'mp3', '--audio-quality', '5',
            '-o', `${tmpBase}.%(ext)s`, '--no-playlist', '--quiet', '--no-warnings',
            ...ytdlpHeadersArgs()
        ], 120000);
        const buffer = await fs.readFile(tmpMp3);
        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false
        });
        await fs.remove(tmpMp3).catch(() => {});
    } catch (err) {
        logRequestError('cmdYoutubeAudio', err);
        await fs.remove(tmpMp3).catch(() => {});
        await sock.sendMessage(jid, { text: `❌ Error al descargar audio: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  YOUTUBE - BUSCAR
// ════════════════════════════════════════════════════
async function cmdYoutubeSearch(sock, jid, args) {
    const query = args.join(' ');
    if (!query) { await sock.sendMessage(jid, { text: '❌ Uso: *#ytsearch <búsqueda>*' }); return; }
    await sock.sendMessage(jid, { text: `🔍 Buscando en YouTube: *${query}*...` });
    try {
        const { stdout } = await ytdlpEjecutar([
            `ytsearch5:${query}`, '--print', '%(webpage_url)s\t%(title)s\t%(duration_string)s',
            '--no-playlist', '--quiet', '--no-warnings'
        ], 30000);
        const lineas = stdout.trim().split('\n').filter(Boolean);
        if (!lineas.length) { await sock.sendMessage(jid, { text: '❌ No se encontraron resultados.' }); return; }
        let texto = `🎬 *Resultados para:* _${query}_\n\n`;
        lineas.forEach((linea, i) => {
            const [url, titulo, dur] = linea.split('\t');
            texto += `*${i + 1}.* ${titulo || 'Sin título'} _(${dur || ''})_\n🔗 ${url}\n\n`;
        });
        texto += '▶️ Video: *#yt <link>* | 🎵 Audio: *#play <link>*';
        await sock.sendMessage(jid, { text: texto });
    } catch (err) {
        logRequestError('cmdYoutubeSearch', err);
        await sock.sendMessage(jid, { text: `❌ Error en la búsqueda: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  YOUTUBE - BUSCAR Y DESCARGAR VIDEO (#ytv)
// ════════════════════════════════════════════════════
async function cmdYoutubeVideoSearch(sock, jid, args) {
    const query = args.join(' ');
    if (!query) { await sock.sendMessage(jid, { text: '❌ Uso: *#ytv <nombre del video>*' }); return; }
    await sock.sendMessage(jid, { text: `🔍 Buscando: *${query}*...` });
    try {
        const resultado = await ytdlpBuscarUrl(query);
        if (resultado.duracion > 1200) {
            await sock.sendMessage(jid, { text: `❌ El video _${resultado.titulo}_ supera los 20 minutos.\n_Intenta buscar un video más corto._` });
            return;
        }
        // Obtener info completa (thumbnail, vistas, etc.)
        const info = await ytdlpInfo(resultado.url);
        await enviarInfoCard(sock, jid, { ...info, titulo: resultado.titulo }, resultado.url, 'video');
        const formato = 'bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best';
        const { buffer, tamano } = await ytdlpDescargarBuffer(resultado.url, { formato, merge: true });
        const caption = construirCaption('YouTube', resultado.titulo, formatearSegundos(resultado.duracion), tamano, { canal: info.autor, vistas: info.vistas });
        await sock.sendMessage(jid, { video: buffer, caption });
    } catch (err) {
        logRequestError('cmdYoutubeVideoSearch', err);
        await sock.sendMessage(jid, { text: `❌ Error al descargar: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  TIKTOK - VIDEO
// ════════════════════════════════════════════════════
async function cmdTiktok(sock, jid, args) {
    const url = args[0];
    if (!url || (!url.includes('tiktok.com') && !url.includes('vt.tiktok') && !url.includes('vm.tiktok'))) {
        await sock.sendMessage(jid, { text: '❌ Ingresa un link válido de TikTok.\n📌 Uso: *#tiktok <link>*\n_Acepta links cortos (vt.tiktok.com) y largos_' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando video de TikTok...' });
    try {
        let buffer, tamano, info;
        try {
            const fallback = await tiktokFallbackTikwm(url);
            buffer = fallback.buffer;
            tamano = fallback.tamano;
            info = fallback.info;
        } catch (fallbackErr) {
            logRequestError('tiktok tikwm fallback', fallbackErr);
            info = await ytdlpInfo(url);
            const dl = await ytdlpDescargarBuffer(url);
            buffer = dl.buffer;
            tamano = dl.tamano;
        }

        const caption = construirCaption('TikTok',
            info.titulo || 'Video de TikTok',
            formatearSegundos(info.duracion),
            info.tamano || tamano,
            { autor: info.autor }
        );
        await sock.sendMessage(jid, { video: buffer, caption });
    } catch (err) {
        logRequestError('cmdTiktok', err);
        await sock.sendMessage(jid, { text: `❌ Error TikTok: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  TIKTOK - AUDIO
// ════════════════════════════════════════════════════
async function cmdTiktokAudio(sock, jid, args) {
    const url = args[0];
    if (!url || (!url.includes('tiktok.com') && !url.includes('vt.tiktok') && !url.includes('vm.tiktok'))) {
        await sock.sendMessage(jid, { text: '❌ Ingresa un link válido de TikTok.\n📌 Uso: *#ttplay <link>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Extrayendo audio de TikTok...' });
    const tmpBase = path.join(os.tmpdir(), `ttaudio_${Date.now()}`);
    const tmpMp3 = `${tmpBase}.mp3`;
    try {
        await ytdlpEjecutar([
            url, '-x', '--audio-format', 'mp3', '--audio-quality', '5',
            '-o', `${tmpBase}.%(ext)s`, '--no-playlist', '--no-part',
            ...ytdlpHeadersArgs()
        ], 90000);
        const buffer = await fs.readFile(tmpMp3);
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false });
        await fs.remove(tmpMp3).catch(() => {});
    } catch (err) {
        logRequestError('cmdTiktokAudio', err);
        await fs.remove(tmpMp3).catch(() => {});
        await sock.sendMessage(jid, { text: `❌ Error al extraer audio: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  FACEBOOK - VIDEO
// ════════════════════════════════════════════════════
async function cmdFacebook(sock, jid, args) {
    const url = args[0];
    if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.com'))) {
        await sock.sendMessage(jid, { text: '❌ Ingresa un link válido de Facebook.\n📌 Uso: *#facebook <link>*\n_El video debe ser público_' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando video de Facebook...' });
    try {
        const info = await ytdlpInfo(url);
        if (info.duracion > 1200) {
            await sock.sendMessage(jid, { text: '❌ El video es muy largo. Máximo 20 minutos.' });
            return;
        }
        const { buffer, tamano } = await ytdlpDescargarBuffer(url);
        const caption = construirCaption('Facebook', info.titulo, formatearSegundos(info.duracion), info.tamano || tamano, { autor: info.autor });
        await sock.sendMessage(jid, { video: buffer, caption });
    } catch (err) {
        logRequestError('cmdFacebook', err);
        try {
            const { buffer, tamano, info } = await descargarDirectoConYtdlp(url, 'Facebook');
            const caption = construirCaption('Facebook', info.titulo || 'Video de Facebook', formatearSegundos(info.duracion), tamano, { autor: info.autor, vistas: info.vistas });
            await sock.sendMessage(jid, { video: buffer, caption });
        } catch (fallbackErr) {
            logRequestError('cmdFacebook fallback', fallbackErr);
            await sock.sendMessage(jid, { text: `❌ Error Facebook: ${extraerErrorYtdlp(err)}\n_Asegúrate de que el video sea público_` });
        }
    }
}

// ════════════════════════════════════════════════════
//  TWITTER/X - VIDEO
// ════════════════════════════════════════════════════
async function twitterObtenerVideoUrl(url) {
    const tweetId = url.match(/status\/(\d+)/)?.[1];
    if (!tweetId) throw new Error('URL inválida de Twitter/X.');

    try {
        const res = await axios.get(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, { ...axiosOpts, timeout: 15000 });
        const media = res.data?.media_extended;
        if (media?.length) {
            const video = media.find(m => m.type === 'video');
            if (video?.url) return video.url;
            const conVariants = media.find(m => m.variants?.length);
            if (conVariants) {
                const best = conVariants.variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
                if (best?.url) return best.url;
            }
        }
        if (res.data?.mediaURLs?.length) return res.data.mediaURLs[0];
    } catch (err) { logRequestError('twitter vxtwitter', err); }

    try {
        const res = await axios.get(`https://api.fxtwitter.com/i/status/${tweetId}`, { ...axiosOpts, timeout: 15000 });
        const v = res.data?.tweet?.media?.videos?.[0];
        if (v?.url) return v.url;
        const allVideos = res.data?.tweet?.media?.all?.filter(m => m.type === 'video' && m.url) || [];
        if (allVideos.length) return allVideos[0].url;
    } catch (err) { logRequestError('twitter fxtwitter', err); }

    return null;
}

async function cmdTwitter(sock, jid, args) {
    const url = args[0];
    if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) {
        await sock.sendMessage(jid, { text: '❌ Ingresa un link válido de Twitter/X.\n📌 Uso: *#x <link>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando video de Twitter/X...' });
    try {
        let buffer, tamano;
        const videoUrl = await twitterObtenerVideoUrl(url);
        if (videoUrl) {
            buffer = await descargarBuffer(videoUrl, { Referer: 'https://twitter.com/' });
            tamano = formatearBytes(buffer.length);
        } else {
            const dl = await ytdlpDescargarBuffer(url);
            buffer = dl.buffer;
            tamano = dl.tamano;
        }
        const caption = construirCaption('Twitter/X', 'Video de Twitter/X', null, tamano);
        await sock.sendMessage(jid, { video: buffer, caption });
    } catch (err) {
        logRequestError('cmdTwitter', err);
        await sock.sendMessage(jid, { text: `❌ Error Twitter/X: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  INSTAGRAM - VIDEO/REEL
// ════════════════════════════════════════════════════
async function instagramObtenerUrl(url) {
    try {
        const res = await axios.get(`https://api.snapinsta.app/v1/media?url=${encodeURIComponent(url)}`, { ...axiosOpts, timeout: 20000 });
        const item = res.data?.data?.find(d => d.type === 'video') || res.data?.data?.[0];
        if (item?.url) return item.url;
    } catch (err) { logRequestError('instagram snapinsta', err); }

    try {
        const res = await axios.post('https://www.saveinsta.app/action.php',
            new URLSearchParams({ url }).toString(),
            { headers: { ...HUMAN_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
        );
        const match = res.data?.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
        if (match) return match[0];
    } catch (err) { logRequestError('instagram saveinsta', err); }

    try {
        const res = await axios.get(`https://instagram.com/oembed/?url=${encodeURIComponent(url)}&format=json`, { ...axiosOpts, timeout: 10000 });
        if (res.data?.thumbnail_url) return res.data.thumbnail_url;
    } catch (err) { logRequestError('instagram oembed', err); }

    const apis = [
        `https://api.vreden.my.id/api/download/ig?url=${encodeURIComponent(url)}`,
        `https://api.vreden.my.id/api/downloader/instagram?url=${encodeURIComponent(url)}`,
        `https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(url)}`,
        `https://api.agatz.xyz/api/igdl?url=${encodeURIComponent(url)}`
    ];

    for (const apiUrl of apis) {
        try {
            const res = await axios.get(apiUrl, { ...axiosOpts, timeout: 20000, validateStatus: () => true });
            if (typeof res.data === 'string' && res.data.includes('redirect_link')) {
                const redirect = res.data.match(/redirect_link = '([^']+)'/)?.[1];
                if (redirect) {
                    const r2 = await axios.get(`${redirect}fp=-7`, { ...axiosOpts, timeout: 20000, validateStatus: () => true });
                    const urls = extraerUrlsMedia(r2.data);
                    const video = urls.find(u => /\.mp4(\?|$)/i.test(u));
                    if (video || urls[0]) return video || urls[0];
                }
            } else {
                const urls = extraerUrlsMedia(res.data);
                const video = urls.find(u => /\.mp4(\?|$)/i.test(u));
                if (video || urls[0]) return video || urls[0];
            }
        } catch (err) { logRequestError('instagram api fallback', err); }
    }

    return null;
}

async function cmdInstagram(sock, jid, args) {
    const url = args[0];
    if (!url || (!url.includes('instagram.com') && !url.includes('instagr.am'))) {
        await sock.sendMessage(jid, { text: '❌ Ingresa un link válido de Instagram.\n📌 Uso: *#ig <link>*\n_El contenido debe ser público_' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando de Instagram...' });
    try {
        let mediaUrl = null;
        try {
            const direct = await ytdlpDirectMedia(url);
            mediaUrl = direct.url;
        } catch (ytdlpErr) {
            logRequestError('instagram ytdlp direct', ytdlpErr);
        }
        if (!mediaUrl) mediaUrl = await instagramObtenerUrl(url);
        if (!mediaUrl) {
            await sock.sendMessage(jid, { text: '❌ No pude acceder a este post de Instagram.\n\n_Instagram requiere que el contenido sea público y no requiera inicio de sesión._' });
            return;
        }
        const buffer = await descargarBuffer(mediaUrl);
        const tamano = formatearBytes(buffer.length);
        const esVideo = mediaUrl.includes('.mp4') || buffer.length > 500 * 1024;
        if (esVideo) {
            await sock.sendMessage(jid, { video: buffer, caption: construirCaption('Instagram', 'Reel de Instagram', null, tamano) });
        } else {
            await sock.sendMessage(jid, { image: buffer, caption: construirCaption('Instagram', 'Imagen de Instagram', null, tamano) });
        }
    } catch (err) {
        logRequestError('cmdInstagram', err);
        await sock.sendMessage(jid, { text: `❌ Error Instagram: ${err.response?.status || err.message.split('\n')[0]}` });
    }
}

// ════════════════════════════════════════════════════
//  PINTEREST
// ════════════════════════════════════════════════════
async function buscarImagenPinterest(query) {
    try {
        const res = await axios.get(
            `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' site:pinterest.com')}&count=10`,
            { ...axiosOpts, timeout: 15000 }
        );
        const regex = /murl&quot;:&quot;(https?:\/\/i\.pinimg\.com[^&"]+\.(?:jpg|jpeg|png|webp))/gi;
        const matches = [...res.data.matchAll(regex)].map(m => m[1]);
        if (matches.length > 0) return matches[Math.floor(Math.random() * matches.length)];
    } catch (err) { logRequestError('buscarImagenPinterest', err); }
    return null;
}

// ════════════════════════════════════════════════════
//  IMAGEN GENERAL
// ════════════════════════════════════════════════════
async function cmdImagen(sock, jid, args) {
    const query = args.join(' ');
    if (!query) { await sock.sendMessage(jid, { text: '❌ Uso: *#img <búsqueda>*' }); return; }
    await sock.sendMessage(jid, { text: `🔍 Buscando imagen: *${query}*...` });
    try {
        const res = await axios.get(
            `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&count=10`,
            { ...axiosOpts, timeout: 15000 }
        );
        const regex = /murl&quot;:&quot;(https?:\/\/[^&"]+\.(?:jpg|jpeg|png|webp))/gi;
        const matches = [...res.data.matchAll(regex)].map(m => m[1]).filter(u => !u.includes('bing.com'));
        if (!matches.length) { await sock.sendMessage(jid, { text: '❌ No encontré imágenes.' }); return; }
        const url = matches[Math.floor(Math.random() * Math.min(matches.length, 5))];
        await sock.sendMessage(jid, { image: { url }, caption: `🖼️ *${query}*` });
    } catch (err) {
        logRequestError('cmdImagen', err);
        await sock.sendMessage(jid, { text: `❌ Error buscando imagen: ${err.message}` });
    }
}

async function cmdDiagnosticoDescargas(sock, jid) {
    const pruebas = [
        ['YouTube', 'https://www.youtube.com/'],
        ['TikTok', 'https://www.tiktok.com/'],
        ['Facebook', 'https://www.facebook.com/'],
        ['Instagram', 'https://www.instagram.com/'],
        ['Rule34', 'https://rule34.xxx/']
    ];
    const resultados = [];
    for (const [nombre, url] of pruebas) {
        try {
            const res = await axios.get(url, { ...axiosOpts, timeout: 10000, validateStatus: () => true });
            resultados.push(`${nombre}: ${res.status}`);
        } catch (err) {
            logRequestError(`diag ${nombre}`, err);
            resultados.push(`${nombre}: ERROR ${err.response?.status || err.message}`);
        }
    }
    await sock.sendMessage(jid, {
        text: `🧪 *Diagnóstico de descargas desde Replit*\n\n${resultados.join('\n')}\n\nSi aquí marca 403/429 y en PC/Termux funciona, el bloqueo probablemente es por IP/hosting.`
    });
}

// ════════════════════════════════════════════════════
//  MEDIAFIRE
// ════════════════════════════════════════════════════
async function cmdMediafire(sock, jid, args) {
    const url = args[0];
    if (!url || !url.includes('mediafire.com')) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#mediafire <link>*\nEjemplo: #mediafire https://www.mediafire.com/file/...' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Procesando link de MediaFire...' });
    const apis = [
        () => axios.get(`https://api.dorratz.com/mediafire?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
        () => axios.get(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
        () => axios.get(`https://api.agatz.xyz/api/mediafire?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
    ];
    for (const fn of apis) {
        try {
            const data = await fn();
            const link = data?.url || data?.download || data?.data?.url || data?.data?.download || data?.result?.download || data?.result?.url;
            const nombre = data?.filename || data?.name || data?.data?.filename || data?.result?.filename || 'archivo';
            const tamano = data?.size || data?.data?.size || data?.result?.size || '';
            if (link) {
                await sock.sendMessage(jid, { text: `📦 *MediaFire*\n📄 ${nombre}\n${tamano ? `📏 ${tamano}\n` : ''}🔗 ${link}` });
                try {
                    await sock.sendMessage(jid, { document: { url: link }, fileName: nombre, mimetype: 'application/octet-stream' });
                } catch (e) { logRequestError('mediafire send', e); }
                return;
            }
        } catch (e) { logRequestError('mediafire api', e); }
    }
    await sock.sendMessage(jid, { text: '❌ No pude procesar el link de MediaFire ahora.' });
}

// ════════════════════════════════════════════════════
//  SPOTIFY
// ════════════════════════════════════════════════════
async function cmdSpotify(sock, jid, args) {
    const url = args[0];
    if (!url || !url.includes('spotify.com')) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#spotify <link de canción>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando de Spotify...' });
    const apis = [
        () => axios.get(`https://api.dorratz.com/v2/spotify-dl?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
        () => axios.get(`https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
        () => axios.get(`https://api.agatz.xyz/api/spotifydl?message=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
    ];
    for (const fn of apis) {
        try {
            const data = await fn();
            const link = data?.data?.download || data?.data?.url || data?.result?.url || data?.url || data?.download;
            const titulo = data?.data?.title || data?.result?.title || data?.title || 'Canción';
            const artista = data?.data?.artist || data?.result?.artist || data?.artist || '';
            if (link) {
                await sock.sendMessage(jid, { audio: { url: link }, mimetype: 'audio/mpeg' });
                await sock.sendMessage(jid, { text: `🎵 *${titulo}*${artista ? `\n🎤 ${artista}` : ''}` });
                return;
            }
        } catch (e) { logRequestError('spotify api', e); }
    }
    await sock.sendMessage(jid, { text: '❌ No pude descargar de Spotify ahora.' });
}

// ════════════════════════════════════════════════════
//  SOUNDCLOUD
// ════════════════════════════════════════════════════
async function cmdSoundcloud(sock, jid, args) {
    const url = args[0];
    if (!url || !url.includes('soundcloud.com')) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#soundcloud <link>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando de SoundCloud...' });
    try {
        const info = await ytdlpInfo(url);
        const tmpBase = path.join(os.tmpdir(), `sc_${Date.now()}`);
        const tmpMp3 = `${tmpBase}.mp3`;
        await ytdlpEjecutar([
            url, '-x', '--audio-format', 'mp3', '--audio-quality', '5',
            '-o', `${tmpBase}.%(ext)s`, '--no-playlist', '--quiet', '--no-warnings',
            ...ytdlpHeadersArgs()
        ], 120000);
        const buffer = await fs.readFile(tmpMp3);
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg' });
        if (info.titulo) await sock.sendMessage(jid, { text: `🎧 *${info.titulo}*${info.autor ? `\n🎤 ${info.autor}` : ''}` });
        await fs.remove(tmpMp3).catch(() => {});
    } catch (err) {
        logRequestError('cmdSoundcloud', err);
        await sock.sendMessage(jid, { text: `❌ Error SoundCloud: ${extraerErrorYtdlp(err)}` });
    }
}

// ════════════════════════════════════════════════════
//  THREADS
// ════════════════════════════════════════════════════
async function cmdThreads(sock, jid, args) {
    const url = args[0];
    if (!url || (!url.includes('threads.net') && !url.includes('threads.com'))) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#threads <link>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Descargando de Threads...' });
    const apis = [
        () => axios.get(`https://api.siputzx.my.id/api/d/threads?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
        () => axios.get(`https://api.dorratz.com/threads?url=${encodeURIComponent(url)}`, axiosOpts).then(r => r.data),
    ];
    for (const fn of apis) {
        try {
            const data = await fn();
            const items = data?.data?.video_urls || data?.data?.image_urls || data?.video_urls || data?.image_urls || data?.result?.media || [];
            const lista = Array.isArray(items) ? items : (items ? [items] : []);
            if (lista.length) {
                for (const item of lista.slice(0, 4)) {
                    const u = typeof item === 'string' ? item : (item.url || item.video || item.image);
                    if (!u) continue;
                    if (/\.mp4($|\?)/i.test(u)) {
                        await sock.sendMessage(jid, { video: { url: u }, caption: '🧵 Threads' });
                    } else {
                        await sock.sendMessage(jid, { image: { url: u }, caption: '🧵 Threads' });
                    }
                }
                return;
            }
        } catch (e) { logRequestError('threads api', e); }
    }
    await sock.sendMessage(jid, { text: '❌ No pude descargar de Threads ahora.' });
}

// ════════════════════════════════════════════════════
//  APKPURE
// ════════════════════════════════════════════════════
async function cmdApkpure(sock, jid, args) {
    const query = args.join(' ');
    if (!query) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#apk <nombre de la app>*' });
        return;
    }
    await sock.sendMessage(jid, { text: `⏳ Buscando *${query}* en APKPure...` });
    const apis = [
        () => axios.get(`https://api.siputzx.my.id/api/d/apkpure?search=${encodeURIComponent(query)}`, axiosOpts).then(r => r.data),
        () => axios.get(`https://api.dorratz.com/apkpure?search=${encodeURIComponent(query)}`, axiosOpts).then(r => r.data),
    ];
    for (const fn of apis) {
        try {
            const data = await fn();
            const item = data?.data?.[0] || data?.result?.[0] || data?.data || data?.result;
            const link = item?.download || item?.url || item?.dl;
            const nombre = item?.name || item?.title || query;
            if (link) {
                await sock.sendMessage(jid, { text: `📱 *${nombre}*\n🔗 ${link}` });
                try {
                    await sock.sendMessage(jid, { document: { url: link }, fileName: `${nombre}.apk`, mimetype: 'application/vnd.android.package-archive' });
                } catch (e) { logRequestError('apkpure send', e); }
                return;
            }
        } catch (e) { logRequestError('apkpure api', e); }
    }
    await sock.sendMessage(jid, { text: '❌ No encontré la app o las APIs están caídas.' });
}

// ════════════════════════════════════════════════════
//  GOOGLE DRIVE
// ════════════════════════════════════════════════════
async function cmdDrive(sock, jid, args) {
    const url = args[0];
    if (!url || !url.includes('drive.google.com')) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#drive <link público>*' });
        return;
    }
    await sock.sendMessage(jid, { text: '⏳ Procesando link de Drive...' });
    const idMatch = url.match(/[-\w]{25,}/);
    if (!idMatch) {
        await sock.sendMessage(jid, { text: '❌ No pude extraer el ID del archivo del link.' });
        return;
    }
    const id = idMatch[0];
    const direct = `https://drive.google.com/uc?export=download&id=${id}`;
    try {
        await sock.sendMessage(jid, { document: { url: direct }, fileName: `drive_${id}`, mimetype: 'application/octet-stream' });
        await sock.sendMessage(jid, { text: `📁 *Google Drive*\n🔗 ${direct}` });
    } catch (e) {
        logRequestError('drive', e);
        await sock.sendMessage(jid, { text: `📁 *Google Drive*\n🔗 ${direct}\n\n_Si el archivo es muy grande o privado, descargalo del link directamente._` });
    }
}

module.exports = {
    cmdYoutube, cmdYoutubeAudio, cmdYoutubeSearch, cmdYoutubeVideoSearch,
    cmdTiktok, cmdTiktokAudio, cmdFacebook,
    cmdTwitter, cmdInstagram, cmdPinterest: async () => {}, cmdImagen,
    buscarImagenPinterest, cmdDiagnosticoDescargas,
    cmdMediafire, cmdSpotify, cmdSoundcloud, cmdThreads, cmdApkpure, cmdDrive
};
