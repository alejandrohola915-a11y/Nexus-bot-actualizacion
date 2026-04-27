const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    isJidBroadcast
} = require('@whiskeysockets/baileys');

const pino  = require('pino');
const readline = require('readline');
const fs    = require('fs');
const path  = require('path');
const http  = require('http');

const { manejarMensaje } = require('./src/handler');
const { getGrupo } = require('./src/database');
const { manejarMensajePersonajes } = require('./src/personajes');

// ── Logger silencioso ────────────────────────────────────────────────────
const logger = pino({ level: 'silent' });

// ── Archivo de bloqueo: garantiza una sola instancia activa ─────────────
const PID_FILE = path.join(__dirname, '.bot.pid');

function registrarPID() {
    // Si hay un proceso anterior corriendo, matarlo
    if (fs.existsSync(PID_FILE)) {
        const pidAnterior = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        if (!isNaN(pidAnterior) && pidAnterior !== process.pid) {
            try {
                process.kill(pidAnterior, 'SIGTERM');
                console.log(`🔫 Proceso anterior (PID ${pidAnterior}) terminado.`);
            } catch (_) {}
        }
    }
    fs.writeFileSync(PID_FILE, String(process.pid));
}

function limpiarPID() {
    try {
        if (fs.existsSync(PID_FILE)) {
            const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
            if (pid === process.pid) fs.unlinkSync(PID_FILE);
        }
    } catch (_) {}
}

// Limpiar PID al salir
process.on('exit',    limpiarPID);
process.on('SIGINT',  () => { limpiarPID(); process.exit(0); });
process.on('SIGTERM', () => { limpiarPID(); process.exit(0); });

// Registrar esta instancia y matar la anterior si existe
registrarPID();

// ── Control de instancia única ───────────────────────────────────────────
let corriendo = false;
let intentosReconexion = 0;

function preguntarNumero() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('📱 Número (con código de país, sin + ni espacios, ej: 521234567890): ', (n) => {
            rl.close();
            resolve(n.trim());
        });
    });
}

function esperar(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function iniciarBot() {
    if (corriendo) return;
    corriendo = true;

    try {
        // ── Credenciales con cache de claves de señal ──────────────────
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version, isLatest } = await fetchLatestBaileysVersion();

        // ── Crear socket con configuración estable ─────────────────────
        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                // El CacheableSignalKeyStore reduce errores de descifrado
                // que provocan desconexiones inesperadas
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            // Identificarse como WhatsApp Web en Chrome (sesión más estable)
            browser: Browsers.ubuntu('Chrome'),
            logger,
            printQRInTerminal: false,

            // Keepalive agresivo para mantener la conexión viva
            keepAliveIntervalMs: 10_000,
            connectTimeoutMs:    60_000,
            defaultQueryTimeoutMs: 60_000,

            // No cargar historial completo (reduce carga y errores)
            syncFullHistory: false,

            // Función requerida para descifrar mensajes correctamente
            getMessage: async () => ({ conversation: '' }),

            // Ignorar mensajes de broadcast para evitar errores
            shouldIgnoreJid: jid => isJidBroadcast(jid),

            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5,
        });

        sock.ev.on('creds.update', saveCreds);

        // ── Solicitar código de emparejamiento si no está registrado ───
        let codigoSolicitado = false;

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
            if (connection === 'connecting' && !sock.authState.creds.registered && !codigoSolicitado) {
                codigoSolicitado = true;
                try {
                    await esperar(2000);
                    const numero = process.env.PHONE_NUMBER || await preguntarNumero();
                    const limpio = numero.replace(/\D/g, '');
                    const codigo = await sock.requestPairingCode(limpio);
                    console.log(`\n╔══════════════════════════════╗`);
                    console.log(`║  CÓDIGO: ${codigo.padEnd(20)}║`);
                    console.log(`╚══════════════════════════════╝`);
                    console.log('👉 WhatsApp > Dispositivos vinculados > Vincular con número\n');
                } catch (e) {
                    console.error('⚠️ Error al pedir código:', e.message);
                    codigoSolicitado = false;
                }
            }

            if (connection === 'open') {
                intentosReconexion = 0;
                console.log('✅ Bot conectado.');
            }

            if (connection === 'close') {
                corriendo = false;
                const code = lastDisconnect?.error?.output?.statusCode;

                // Sesión cerrada permanentemente → no reconectar
                if (code === DisconnectReason.loggedOut || code === 401 || code === 403) {
                    console.log('❌ Sesión cerrada definitivamente. Borra auth_info y reinicia.');
                    process.exit(1);
                }

                // Backoff exponencial: espera más tiempo en cada reintento
                intentosReconexion++;
                const base    = code === 440 ? 8000 : 3000;
                const demora  = Math.min(base * intentosReconexion, 30_000);
                const razon   = DisconnectReason[code] || `código ${code}`;
                console.log(`🔄 Desconectado (${razon}). Reconectando en ${demora / 1000}s... (intento ${intentosReconexion})`);

                await esperar(demora);
                iniciarBot();
            }
        });

        // ── Bienvenida / Despedida de grupos ──────────────────────────
        const enviarMediaBG = async (id, texto, p, media) => {
            try {
                if (!media || !media.path || !fs.existsSync(media.path)) {
                    await sock.sendMessage(id, { text: texto, mentions: [p] });
                    return;
                }
                const buf = fs.readFileSync(media.path);
                if (media.tipo === 'image') {
                    await sock.sendMessage(id, { image: buf, caption: texto, mentions: [p] });
                } else if (media.tipo === 'gif') {
                    await sock.sendMessage(id, { video: buf, caption: texto, mentions: [p], gifPlayback: true });
                } else if (media.tipo === 'video') {
                    await sock.sendMessage(id, { video: buf, caption: texto, mentions: [p] });
                } else {
                    await sock.sendMessage(id, { text: texto, mentions: [p] });
                }
            } catch (err) {
                console.error('Error enviando media BG:', err.message);
                await sock.sendMessage(id, { text: texto, mentions: [p] });
            }
        };

        const obtenerMediaBG = (g, modo) => {
            const campo = modo === 'welcome' ? 'welcomeMedia' : 'goodbyeMedia';
            const legacy = modo === 'welcome' ? 'welcomeImagePath' : 'goodbyeImagePath';
            if (g[campo] && g[campo].path) return g[campo];
            if (g[legacy]) return { tipo: 'image', path: g[legacy] };
            return null;
        };

        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            try {
                const g = getGrupo(id);
                if (action === 'add' && g.bienvenida) {
                    const media = obtenerMediaBG(g, 'welcome');
                    for (const p of participants) {
                        const texto = (g.mensajeBienvenida || '¡Bienvenido/a @usuario al grupo!')
                            .replace('@usuario', `@${p.split('@')[0]}`);
                        await enviarMediaBG(id, texto, p, media);
                    }
                }
                if (action === 'remove' && g.despedida) {
                    const media = obtenerMediaBG(g, 'goodbye');
                    for (const p of participants) {
                        const texto = (g.mensajeDespedida || 'Hasta luego @usuario 👋')
                            .replace('@usuario', `@${p.split('@')[0]}`);
                        await enviarMediaBG(id, texto, p, media);
                    }
                }
            } catch (err) {
                console.error('Error grupo:', err.message);
            }
        });

        // ── Mensajes entrantes ─────────────────────────────────────────
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    // Ignorar mensajes de estado
                    if (msg.key.remoteJid === 'status@broadcast') continue;

                    // Permitir mensajes propios solo si son comandos (#)
                    if (msg.key.fromMe) {
                        const textoPropio = (
                            msg.message?.conversation ||
                            msg.message?.extendedTextMessage?.text || ''
                        ).trim();
                        if (!textoPropio.startsWith('#')) continue;
                    }

                    let groupMetadata = null;
                    if (msg.key.remoteJid?.endsWith('@g.us')) {
                        try {
                            groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
                        } catch {}
                    }

                    const texto = (
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text || ''
                    ).trim();

                    const comando = texto.startsWith('#')
                        ? texto.slice(1).split(' ')[0].toLowerCase()
                        : '';

                    const comandosPersonajes = [
                        'roll', 'rw', 'rollwaifu',
                        'buychar', 'buyc', 'buycharacter',
                        'harem', 'waifus', 'claims',
                        'deletewaifu', 'delwaifu', 'delchar',
                        'givechar', 'givewaifu', 'regalar',
                        'giveallharem',
                        'sell', 'vender',
                        'removesale', 'removerventa',
                        'haremshop', 'tiendawaifus', 'wshop',
                        'trade', 'intercambiar',
                        'gachainfo', 'ginfo', 'infogacha',
                        'charimage', 'waifuimage', 'cimage', 'wimage',
                        'charinfo', 'winfo', 'waifuinfo',
                        'charvideo', 'waifuvideo', 'cvideo', 'wvideo',
                        'waifusboard', 'waifustop', 'topwaifus', 'wtop',
                        'favoritetop', 'favtop',
                        'serieinfo', 'ainfo', 'animeinfo',
                        'serielist', 'slist', 'animelist',
                        'vote', 'votar',
                        'setclaimmsg', 'setclaim',
                        'delclaimmsg',
                        'claim', 'c', 'reclamar',
                        'charvideo', 'waifuvideo', 'cvideo', 'wvideo'
                    ];

                    if (comandosPersonajes.includes(comando)) {
                        await manejarMensajePersonajes(sock, msg);
                    } else {
                        await manejarMensaje(sock, msg, groupMetadata);
                    }
                } catch (err) {
                    console.error('Error procesando mensaje:', err.message);
                }
            }
        });

    } catch (err) {
        corriendo = false;
        intentosReconexion++;
        const demora = Math.min(3000 * intentosReconexion, 30_000);
        console.error(`Error iniciando bot (intento ${intentosReconexion}):`, err.message);
        await esperar(demora);
        iniciarBot();
    }
}

// ── Servidor keep-alive ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const _botStart = new Date().toISOString();

const _server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'online',
        bot: 'Nexus-Bot',
        uptime: process.uptime().toFixed(0) + 's',
        started: _botStart,
        hora: new Date().toISOString()
    }));
});

function iniciarServidor(puerto) {
    _server.listen(puerto, () => {
        console.log(`🌐 Servidor keep-alive activo en el puerto ${puerto}`);

        // Auto-ping interno cada 4 minutos
        const urlPropia = process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : `http://localhost:${puerto}`;

        setInterval(() => {
            const mod = urlPropia.startsWith('https') ? require('https') : http;
            mod.get(urlPropia, (r) => {
                console.log(`🔄 Auto-ping OK [${new Date().toLocaleTimeString()}] — uptime: ${process.uptime().toFixed(0)}s`);
                r.resume();
            }).on('error', () => {});
        }, 4 * 60 * 1000);
    });

    _server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️  Puerto ${puerto} ocupado, reintentando en ${puerto + 1}...`);
            setTimeout(() => iniciarServidor(puerto + 1), 1000);
        } else {
            console.error('❌ Error servidor keep-alive:', err.message);
        }
    });
}

iniciarServidor(PORT);

// ── Manejo de errores globales para evitar caídas silenciosas ─────────────
process.on('uncaughtException', (err) => {
    console.error('❌ Error no capturado:', err.message);
    // No dejar morir el proceso; Baileys tiene su propia reconexión
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa rechazada:', reason?.message || reason);
});

iniciarBot();
