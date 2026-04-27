const fs = require('fs');
const axios = require('axios');

const { isOwner, addOwner, removeOwner, getOwners, SUPER_OWNER } = require('./owners');

const rutaEstado = './data/estado.json';
let botActivo;

if (fs.existsSync(rutaEstado)) {
    const data = JSON.parse(fs.readFileSync(rutaEstado));
    botActivo = data.activo;
} else {
    botActivo = true;
    fs.writeFileSync(rutaEstado, JSON.stringify({ activo: true }, null, 2));
}

function guardarEstado() {
    fs.writeFileSync(rutaEstado, JSON.stringify({ activo: botActivo }, null, 2));
}

// ── Módulos ────────────────────────────────────────────────────────────────
const { enviarMenu, enviarMenuNsfw, cmdSetMenuImage, cmdDelMenuImage, cmdSetMultimediaMenu, cmdSearchCmd } = require('./menu');
const { cmdGivechest, cmdClaimchest } = require('./chest');

const {
    cmdSaldo, cmdEconomyInfo, cmdDiario, cmdWork, cmdCrime, cmdSlut, cmdCoinflip,
    cmdDeposit, cmdWithdraw, cmdRoulette, cmdSteal, cmdTransferir,
    cmdBaltop, cmdTienda, cmdComprar, cmdInventario,
    cmdMinar, cmdAdventure, cmdCazar, cmdFish, cmdMazmorra
} = require('./economy');

const { cmdLogros, cmdListaLogros }                                = require('./logros');
const { cmdInventario: cmdInv2, cmdShop, cmdBuyItem, cmdUseItem }  = require('./items');
const { cmdInvertir, cmdInteres, cmdPrestamo, cmdPagarPrestamo, cmdBancoInfo, verificarDeudaVencida } = require('./banco');
const { cmdStats, cmdTrain, cmdFight }                             = require('./combate');
const { cmdTrivia, cmdMath, cmdGuess, cmdWordchain, cmdStopGame, cmdPpt, procesarRespuesta } = require('./minijuegos');
const { cmdMisiones, cmdClaimMision }                              = require('./misiones');
const { cmdDarRep, cmdVerRep, cmdTopRep }                          = require('./reputacion');
const { cmdPoll, cmdPollVote, cmdPollResults, cmdTruth, cmdDare, cmdTruthOrDare } = require('./social');
const { cmdBlackjack, cmdHit, cmdStand, cmdSlots, cmdJackpot }     = require('./casino');
const { cmdCrearClan, cmdUnirClan, cmdSalirClan, cmdInfoClan, cmdEditarClan, cmdGuerraClanes, cmdListaClanes } = require('./clanes');
const {
    cmdAfk, verificarAfk, notificarAfk,
    cmdAdoptar, cmdPetInfo, cmdPetFeed, cmdPetPlay, cmdCambiarMascota, cmdAbandonarMascota,
    cmdHack, cmdRankGlobal, cmdEvento, cmdLoot
} = require('./extras');
const { verificarYNotificar }                                      = require('./logros');
const { registrarMensajeGrupal }                                   = require('./ai');

const {
    cmdInteraccion, cmdNsfw, cmdNsfwAccion, cmdWaifu, cmdImageboard, cmdTopRandom,
    TODO_SFW, TODO_NSFW_IMG, TODO_NSFW_ACCION, TODO_IMAGEBOARDS, TODO_IMAGEBOARDS_VIDEO
} = require('./interactions');

const { cmdSticker, cmdStickerSearch, ssMap, lastSearch } = require('./sticker');

const {
    cmdYoutube, cmdYoutubeAudio, cmdYoutubeSearch, cmdYoutubeVideoSearch,
    cmdTiktok, cmdTiktokAudio, cmdFacebook,
    cmdTwitter, cmdInstagram, cmdPinterest, cmdImagen,
    buscarImagenPinterest, cmdDiagnosticoDescargas,
    cmdMediafire, cmdSpotify, cmdSoundcloud, cmdThreads, cmdApkpure, cmdDrive
} = require('./downloads');

const {
    cmdPing, cmdStatus, cmdEliminar, cmdFotoPerfil, cmdTagAll,
    cmdStickerAImagen, cmdSuggest, cmdReport, cmdBots, cmdInvite,
    cmdTestWelcome, cmdLeave, cmdHd, cmdRead
} = require('./utils');

const {
    cmdJoin, cmdLogout, cmdSetPrefix, cmdSetChannel, cmdSetLink,
    cmdSetPfp, cmdSetUsername
} = require('./sockets');

const {
    cmdPerfil, cmdSetbirth, cmdDelbirth, cmdSetdesc, cmdSetgenre, cmdDelgenre,
    cmdSetfav, cmdMarry, cmdDivorce, cmdLevel, cmdLeaderboard,
    cmdCumpleanos, cmdAllBirthdays, cmdGrupoInfo
} = require('./profile');

const {
    esAdmin, verificarAntilink, cmdKick, cmdPromote, cmdDemote,
    cmdAntilink, cmdClose, cmdSetwelcome, cmdSetgoodbye, cmdWelcome,
    cmdGoodbye, cmdOnlyadmin, cmdOpen, cmdWarn, cmdDelwarn, cmdWarns,
    cmdSetwarnlimit, cmdTopmensajes, cmdAlerts, cmdToggleEconomy, cmdToggleGacha,
    cmdToggleNsfw, cmdGroupImage, cmdMsgCount, cmdTopInactive, cmdSetPrimary,
    cmdSetWelcomeImage, cmdDelWelcomeImage, cmdSetGoodbyeImage, cmdDelGoodbyeImage,
    cmdSetMultimediaWelcome, cmdSetMultimediaGoodbye,
    cmdLimpiarUsuarios, cmdSetGpName, cmdSetGpDesc
} = require('./admin');

const { getUsuario, getGrupo, guardarGrupo, agregarExp, guardarUsuario } = require('./database');
const { cmdIA, cmdLimpiarMemoria } = require('./ai');
const { cmdShip, cmdMeme, cmdFrase } = require('./fun');

const cooldownGlobal = new Map();
const cooldownGlobalMs = 10 * 1000;

function checkCooldownGlobal(user, comando) {
    const key = `${user}:${comando}`;
    const now = Date.now();
    const last = cooldownGlobal.get(key) || 0;
    if (now - last < cooldownGlobalMs) return Math.ceil((cooldownGlobalMs - (now - last)) / 1000);
    cooldownGlobal.set(key, now);
    return 0;
}

// ── Unsplash (fallback para #pin) ──────────────────────────────────────────
async function buscarUnsplash(query, maxImages = 3) {
    const ACCESS_KEY = process.env.UNSPLASH_KEY;
    if (!ACCESS_KEY) return [];
    try {
        const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query, per_page: maxImages },
            headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
        });
        return response.data.results.map(img => ({
            url: img.urls.regular,
            desc: img.alt_description || 'Imagen relacionada'
        }));
    } catch { return []; }
}

// ── Mapa de queries para #pin (responder con 🔄) ───────────────────────────
const pinMap = new Map();

async function manejarPin(sock, msg, isReply = false) {
    const from = msg.key.remoteJid;
    let query;

    if (isReply) {
        const repliedMsgId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;
        if (!repliedMsgId || !pinMap.has(repliedMsgId)) return;
        query = pinMap.get(repliedMsgId);
    } else {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const args = text.slice(text.indexOf(' ') + 1).trim().split(' ').filter(Boolean);
        query = args.join(' ');
        if (!query) {
            await sock.sendMessage(from, { text: '❌ Uso: *#pin <búsqueda>*\nEjemplo: #pin anime wallpaper' });
            return;
        }
    }

    await sock.sendMessage(from, { text: `🔍 Buscando en Pinterest: *${query}*...` });

    let imgUrl = await buscarImagenPinterest(query);

    if (!imgUrl) {
        const results = await buscarUnsplash(query, 3);
        if (results.length > 0) {
            imgUrl = results[Math.floor(Math.random() * results.length)].url;
        }
    }

    if (!imgUrl) {
        await sock.sendMessage(from, { text: '❌ No encontré imágenes para esa búsqueda 😓' });
        return;
    }

    const sentMsg = await sock.sendMessage(from, {
        image: { url: imgUrl },
        caption: `📌 *Pinterest:* ${query}\n_Responde con 🔄 para otra imagen_`
    });

    if (sentMsg?.key?.id) pinMap.set(sentMsg.key.id, query);
}

// ── Comandos de Owner ──────────────────────────────────────────────────────
async function cmdAddOwner(sock, jid, senderJid, mencionados) {
    if (senderJid !== SUPER_OWNER) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner principal puede agregar owners.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#addowner @persona*' });
        return;
    }
    const target = mencionados[0];
    const ok = addOwner(target);
    if (ok) {
        await sock.sendMessage(jid, {
            text: `✅ *@${target.split('@')[0]}* fue agregado como owner del bot.`,
            mentions: [target]
        });
    } else {
        await sock.sendMessage(jid, {
            text: `ℹ️ *@${target.split('@')[0]}* ya es owner del bot.`,
            mentions: [target]
        });
    }
}

async function cmdDelOwner(sock, jid, senderJid, mencionados) {
    if (senderJid !== SUPER_OWNER) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner principal puede quitar owners.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: *#delowner @persona*' });
        return;
    }
    const target = mencionados[0];
    if (target === SUPER_OWNER) {
        await sock.sendMessage(jid, { text: '⛔ No puedes quitarte a ti mismo como owner principal.' });
        return;
    }
    const ok = removeOwner(target);
    if (ok) {
        await sock.sendMessage(jid, {
            text: `✅ *@${target.split('@')[0]}* fue removido como owner del bot.`,
            mentions: [target]
        });
    } else {
        await sock.sendMessage(jid, {
            text: `ℹ️ *@${target.split('@')[0]}* no era owner del bot.`,
            mentions: [target]
        });
    }
}

async function cmdOwners(sock, jid) {
    const owners = getOwners();
    if (!owners.length) {
        await sock.sendMessage(jid, { text: 'ℹ️ No hay owners registrados.' });
        return;
    }
    let texto = '╔══════════════════╗\n║    👑 OWNERS        ║\n╚══════════════════╝\n\n';
    owners.forEach((o, i) => {
        const num = o.split('@')[0];
        const badge = i === 0 ? '⭐ (Principal)' : '';
        texto += `${i + 1}. @${num} ${badge}\n`;
    });
    await sock.sendMessage(jid, { text: texto, mentions: owners });
}

async function cmdSetBotCurrency(sock, jid, senderJid, args) {
    if (!isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner puede usar este comando.' });
        return;
    }
    const moneda = args[0];
    if (!moneda) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setbotcurrency [símbolo]\nEjemplo: #setbotcurrency 💎' });
        return;
    }
    const g = getGrupo(jid);
    g.moneda = moneda;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Moneda del bot cambiada a: *${moneda}*` });
}

async function cmdSetBotOwner(sock, jid, senderJid, mencionados) {
    if (senderJid !== SUPER_OWNER) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner principal puede usar este comando.' });
        return;
    }
    if (!mencionados || mencionados.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Uso: #setbotowner @usuario' });
        return;
    }
    const nuevo = mencionados[0];
    addOwner(nuevo);
    await sock.sendMessage(jid, {
        text: `✅ *@${nuevo.split('@')[0]}* establecido como owner del bot.`,
        mentions: [nuevo]
    });
}

async function cmdAutoJoin(sock, jid, senderJid, args) {
    if (!isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner puede usar este comando.' });
        return;
    }
    const link = args[0];
    if (!link || !link.includes('chat.whatsapp.com')) {
        await sock.sendMessage(jid, { text: '❌ Uso: #autojoin [link del grupo]' });
        return;
    }
    const code = link.split('/').pop();
    try {
        await sock.groupAcceptInvite(code);
        await sock.sendMessage(jid, { text: '✅ ¡Me uní al grupo exitosamente!' });
    } catch {
        await sock.sendMessage(jid, { text: '❌ No pude unirme al grupo. Verifica el link.' });
    }
}

async function cmdReload(sock, jid, senderJid) {
    if (!isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: '⛔ Solo el owner puede recargar el bot.' });
        return;
    }
    await sock.sendMessage(jid, { text: '🔄 Recargando bot...' });
    setTimeout(() => process.exit(0), 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
async function manejarMensaje(sock, msg, groupMetadata) {
    if (!msg.message) return;

    const texto_previo = (
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ''
    ).trim();

    if (msg.key.fromMe && !texto_previo.startsWith('#')) return;

    const jid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const esGrupo = jid.endsWith('@g.us');
    const pushName = msg.pushName || null;

    const texto = texto_previo;

    // ── Guardar pushName del usuario ───────────────────────────────────────
    if (pushName) {
        try {
            const uPN = getUsuario(senderJid);
            if (uPN.pushName !== pushName) {
                uPN.pushName = pushName;
                guardarUsuario(senderJid, uPN);
            }
        } catch { }
    }

    // ── Control encendido/apagado ──────────────────────────────────────────
    if (texto.toLowerCase() === '#off') {
        if (!isOwner(senderJid)) {
            await sock.sendMessage(jid, { text: '⛔ No tienes permiso para usar este comando.' });
            return;
        }
        botActivo = false;
        guardarEstado();
        await sock.sendMessage(jid, { text: '😴 Bot desactivado.' });
        return;
    }

    if (texto.toLowerCase() === '#on') {
        if (!isOwner(senderJid)) {
            await sock.sendMessage(jid, { text: '⛔ No tienes permiso para usar este comando.' });
            return;
        }
        botActivo = true;
        guardarEstado();
        await sock.sendMessage(jid, { text: '⚡ Bot activado.' });
        return;
    }

    if (!botActivo) {
        if (texto.startsWith('#')) {
            await sock.sendMessage(jid, { text: '⚠️ El bot está apagado. Usa *#on* para activarlo.' });
        }
        return;
    }

    // ── EXP, level-up y antilink ───────────────────────────────────────────
    if (esGrupo && texto) {
        try {
            const expRes = agregarExp(senderJid, 5);
            if (expRes && expRes.leveledUp) {
                const nombre = pushName || senderJid.split('@')[0];
                const sep = '═'.repeat(28);
                await sock.sendMessage(jid, {
                    text:
`╔${sep}╗
   ⚡ *¡SUBISTE DE NIVEL!* ⚡
╚${sep}╝

🎉 *Felicidades* @${senderJid.split('@')[0]}
👤 Usuario   : *${nombre}*
⭐ Anterior  : Nv. *${expRes.nivelAnterior}*
🏆 Nuevo     : Nv. *${expRes.nivelNuevo}*
📊 XP actual : *${expRes.expActual}* / *${expRes.nivelNuevo * 100}*

_¡Sigue activo en el chat para seguir subiendo!_ 🚀
${sep}
🤖 Nexus•System — by Alejx_h`,
                    mentions: [senderJid]
                });
            }
        } catch {}
    }
    if (esGrupo && texto && !texto.startsWith('#')) {
        await verificarAntilink(sock, jid, msg, groupMetadata, senderJid);
    }

    // ── Verificar deuda vencida ────────────────────────────────────────────
    try {
        const deudaMsg = verificarDeudaVencida(senderJid);
        if (deudaMsg) await sock.sendMessage(jid, { text: deudaMsg });
    } catch { }

    // ── Verificar AFK del sender ────────────────────────────────────────────
    if (texto && !texto.startsWith('#')) {
        try { await verificarAfk(sock, jid, senderJid, pushName, texto); } catch { }
        const mencionadosEnMsg = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mencionadosEnMsg.length) {
            try { await notificarAfk(sock, jid, mencionadosEnMsg); } catch { }
        }
        if (esGrupo) {
            try { registrarMensajeGrupal(jid, texto); } catch { }
        }
        try {
            const handled = await procesarRespuesta(sock, jid, senderJid, texto, pushName);
            if (handled) return;
        } catch { }
    }

    if (!texto.startsWith('#') && texto !== '🔄') return;

    const [cmd, ...args] = texto.startsWith('#')
        ? texto.slice(1).toLowerCase().split(' ')
        : [texto];

    // ── Menciones: explícitas (@) + fallback al participante citado ────────
    // Esto permite usar todos los comandos que aceptan @usuario también
    // respondiendo a su mensaje (sin @).
    const ctxInfoMsg = msg.message.extendedTextMessage?.contextInfo || {};
    let mencionados = ctxInfoMsg.mentionedJid || [];
    if (!mencionados.length && ctxInfoMsg.participant) {
        mencionados = [ctxInfoMsg.participant];
    }
    const g = esGrupo ? getGrupo(jid) : null;

    // Owners NO se ven afectados por #onlyadmin (sí siguen afectados por bot off,
    // que se comprueba antes en este handler).
    if (g && g.soloAdmin && !esAdmin(groupMetadata, senderJid) && !isOwner(senderJid)) return;

    getUsuario(senderJid);

    const comandosConCooldownGlobal = new Set([
        'yt', 'mp4', 'ytmp4', 'play', 'ytaudio', 'mp3', 'ytsearch', 'search', 'buscarvideo',
        'ytv', 'ytvideo', 'ytdescargar', 'tiktok', 'tt', 'ttplay', 'tiktokmp3', 'ttaudio',
        'facebook', 'fb', 'fvideo', 'twitter', 'x', 'instagram', 'ig', 'reel', 'pin', 'pinterest',
        'img', 'downloaddiag', 'diagdescargas',
        ...TODO_IMAGEBOARDS, ...TODO_IMAGEBOARDS_VIDEO, ...TODO_NSFW_IMG, ...TODO_NSFW_ACCION
    ]);
    if (comandosConCooldownGlobal.has(cmd)) {
        const restante = checkCooldownGlobal(senderJid, cmd);
        if (restante > 0) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${restante}s* antes de volver a usar este comando para evitar bloqueos.` });
            return;
        }
    }

    // ── Proxy que agrega quoted: msg a todas las respuestas al grupo ─────────
    const sockR = new Proxy(sock, {
        get(target, prop) {
            if (prop === 'sendMessage') {
                return (tjid, content, opts = {}) => {
                    if (tjid === jid && !opts.quoted) {
                        return target.sendMessage(tjid, content, { quoted: msg, ...opts });
                    }
                    return target.sendMessage(tjid, content, opts);
                };
            }
            return target[prop];
        }
    });

    try {
        if (texto === '🔄' || cmd === 'again') {
            const repliedMsgId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;
            // Primero buscar en ssMap por ID del mensaje citado
            if (repliedMsgId && ssMap.has(repliedMsgId)) {
                await cmdStickerSearch(sockR, jid, [], repliedMsgId);
                return;
            }
            // Fallback: si no hay reply exacto pero hay búsqueda previa en el grupo
            if (cmd === 'again' && lastSearch.has(jid)) {
                await cmdStickerSearch(sockR, jid, [], repliedMsgId || '_fallback_');
                return;
            }
            // Intentar como pin
            if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                await manejarPin(sockR, msg, true);
                return;
            }
            await sockR.sendMessage(jid, { text: '❌ Responde a un sticker del bot o usa *#ss [búsqueda]* primero.' });
            return;
        }

        switch (cmd) {

            // ── MENÚ Y UTILIDADES ──────────────────────────────────────────
            case 'menu': case 'ayuda': case 'help': case 'commands': case 'comandos':
                await enviarMenu(sockR, jid, pushName, groupMetadata, senderJid); break;
            case 'searchcmd': case 'buscarcmd': case 'findcmd': case 'searchcommand': case 'busc':
                await cmdSearchCmd(sockR, jid, args); break;
            case 'ping': case 'p':
                await cmdPing(sockR, jid); break;
            case 'status': case 'botinfo': case 'infobot':
                await cmdStatus(sockR, jid); break;
            case 'del': case 'delete':
                await cmdEliminar(sockR, jid, msg); break;
            case 'pfp': case 'getpic':
                await cmdFotoPerfil(sockR, jid, senderJid, mencionados); break;
            case 'tagall': case 'tag': case 'hidetag': case 'tagsay':
                await cmdTagAll(sockR, jid, groupMetadata, args); break;
            case 'toimage': case 'toimg':
                await cmdStickerAImagen(sockR, jid, msg); break;
            case 'suggest': case 'sug': case 'add': case 'addanime':
                await cmdSuggest(sockR, jid, senderJid, args); break;
            case 'report': case 'reportar': case 'bug':
                await cmdReport(sockR, jid, senderJid, args); break;
            case 'hd': case 'enhance': case 'remini':
                await cmdHd(sockR, jid, msg); break;
            case 'read': case 'readviewonce': case 'rvo':
                await cmdRead(sockR, jid, msg); break;
            case 'bots': case 'sockets':
                await cmdBots(sockR, jid, groupMetadata); break;
            case 'invite':
                await cmdInvite(sockR, jid, groupMetadata); break;
            case 'testwelcome':
                await cmdTestWelcome(sockR, jid, groupMetadata, senderJid, 'welcome'); break;
            case 'testgoodbye':
                await cmdTestWelcome(sockR, jid, groupMetadata, senderJid, 'goodbye'); break;
            case 'leave': case 'salir':
                await cmdLeave(sockR, jid, groupMetadata, senderJid); break;

            // ── OWNER ─────────────────────────────────────────────────────
            case 'addowner':
                await cmdAddOwner(sockR, jid, senderJid, mencionados); break;
            case 'delowner':
                await cmdDelOwner(sockR, jid, senderJid, mencionados); break;
            case 'owners': case 'ownerlist':
                await cmdOwners(sockR, jid); break;
            case 'autojoin':
                await cmdAutoJoin(sockR, jid, senderJid, args); break;
            case 'reload':
                await cmdReload(sockR, jid, senderJid); break;
            case 'setbotcurrency':
                await cmdSetBotCurrency(sockR, jid, senderJid, args); break;
            case 'setbotowner':
                await cmdSetBotOwner(sockR, jid, senderJid, mencionados); break;

            // ── SOCKETS ───────────────────────────────────────────────────
            case 'join':
                await cmdJoin(sockR, jid, senderJid, args); break;
            case 'logout':
                await cmdLogout(sockR, jid, senderJid); break;
            case 'setprefix':
                await cmdSetPrefix(sockR, jid, senderJid, args); break;
            case 'setchannel':
                await cmdSetChannel(sockR, jid, senderJid, args); break;
            case 'setlink':
                await cmdSetLink(sockR, jid, senderJid, args); break;
            case 'setpfp': case 'setbotpic':
                await cmdSetPfp(sockR, jid, senderJid, msg); break;
            case 'setusername': case 'setbotname':
                await cmdSetUsername(sockR, jid, senderJid, args); break;

            // ── ECONOMÍA ──────────────────────────────────────────────────
            case 'saldo': case 'balance': case 'bal': case 'coins':
                await cmdSaldo(sockR, jid, senderJid); break;
            case 'economyinfo': case 'einfo':
                await cmdEconomyInfo(sockR, jid, senderJid); break;
            case 'diario': case 'daily':
                await cmdDiario(sockR, jid, senderJid); break;
            case 'work': case 'w': case 'trabajar':
                await cmdWork(sockR, jid, senderJid); break;
            case 'crime': case 'crimen':
                await cmdCrime(sockR, jid, senderJid, args); break;
            case 'slut':
                await cmdSlut(sockR, jid, senderJid); break;
            case 'coinflip': case 'flip': case 'cf':
                await cmdCoinflip(sockR, jid, senderJid, args); break;
            case 'depositar': case 'deposit': case 'dep': case 'd':
                await cmdDeposit(sockR, jid, senderJid, args); break;
            case 'retirar': case 'withdraw': case 'with':
                await cmdWithdraw(sockR, jid, senderJid, args); break;
            case 'ruleta': case 'roulette': case 'rt':
                await cmdRoulette(sockR, jid, senderJid, args); break;
            case 'robar': case 'steal': case 'rob':
                await cmdSteal(sockR, jid, senderJid, mencionados); break;
            case 'transferir': case 'givecoins': case 'pay': case 'coinsgive':
                await cmdTransferir(sockR, jid, senderJid, mencionados, args); break;
            case 'baltop': case 'economyboard': case 'eboard':
                await cmdBaltop(sockR, jid, groupMetadata); break;
            case 'tienda':
                await cmdTienda(sockR, jid); break;
            case 'comprar':
                await cmdComprar(sockR, jid, senderJid, args); break;
            case 'inventario':
                await cmdInventario(sockR, jid, senderJid); break;
            case 'minar': case 'mine':
                await cmdMinar(sockR, jid, senderJid); break;
            case 'adventure': case 'aventura':
                await cmdAdventure(sockR, jid, senderJid); break;
            case 'cazar': case 'hunt':
                await cmdCazar(sockR, jid, senderJid); break;
            case 'fish': case 'pescar':
                await cmdFish(sockR, jid, senderJid); break;
            case 'mazmorra': case 'dungeon':
                await cmdMazmorra(sockR, jid, senderJid); break;

            // ── MENÚ NSFW ─────────────────────────────────────────────────
            case 'menunsfw': case 'nsfwmenu': case 'menu18':
                await enviarMenuNsfw(sockR, jid, g); break;

            // ── INVENTARIO (nuevo sistema de ítems) ───────────────────────
            case 'inv': case 'inventory': case 'mochila': case 'items':
                await cmdInv2(sockR, jid, senderJid); break;
            case 'shop': case 'itemshop': case 'store': case 'tiendaitems':
                await cmdShop(sockR, jid); break;
            case 'buyitem': case 'compraritem': case 'buyi':
                await cmdBuyItem(sockR, jid, senderJid, args); break;
            case 'useitem': case 'usaritem': case 'usar': case 'usei':
                await cmdUseItem(sockR, jid, senderJid, args); break;

            // ── BANCO AVANZADO ────────────────────────────────────────────
            case 'invest': case 'invertir': case 'invert':
                await cmdInvertir(sockR, jid, senderJid, args); break;
            case 'interest': case 'interes': case 'cobrar': case 'reclamar':
                await cmdInteres(sockR, jid, senderJid); break;
            case 'loan': case 'prestamo': case 'pedir':
                await cmdPrestamo(sockR, jid, senderJid, args); break;
            case 'payloan': case 'pagarprestamo': case 'pagar':
                await cmdPagarPrestamo(sockR, jid, senderJid); break;
            case 'bankinfo': case 'bancovanzado': case 'banco': case 'bank':
                await cmdBancoInfo(sockR, jid, senderJid); break;

            // ── COMBATE PVP ───────────────────────────────────────────────
            case 'fight': case 'pelear': case 'pvp': case 'battle':
                await cmdFight(sockR, jid, senderJid, mencionados, pushName); break;
            case 'stats': case 'stat': case 'combate': case 'statscombate':
                await cmdStats(sockR, jid, senderJid, mencionados); break;
            case 'train': case 'entrenar': case 'entrenamiento':
                await cmdTrain(sockR, jid, senderJid); break;

            // ── MINIJUEGOS ────────────────────────────────────────────────
            case 'trivia': case 'quiz':
                await cmdTrivia(sockR, jid, senderJid); break;
            case 'math': case 'matematicas': case 'calculo':
                await cmdMath(sockR, jid, senderJid, args); break;
            case 'ppt': case 'rps': case 'piedrapapeltijera':
                await cmdPpt(sockR, jid, senderJid, args); break;
            case 'guess': case 'adivinar': case 'guessnumber':
                await cmdGuess(sockR, jid, senderJid); break;
            case 'wordchain': case 'palabras': case 'encadenada':
                await cmdWordchain(sockR, jid, senderJid); break;
            case 'stopgame': case 'parar': case 'endgame': case 'terminar':
                await cmdStopGame(sockR, jid, senderJid); break;

            // ── MISIONES ─────────────────────────────────────────────────
            case 'missions': case 'misiones': case 'quest': case 'quests':
                await cmdMisiones(sockR, jid, senderJid); break;
            case 'claimmission': case 'reclamar_mision': case 'claimmissions': case 'completar':
                await cmdClaimMision(sockR, jid, senderJid); break;

            // ── LOGROS ────────────────────────────────────────────────────
            case 'achievements': case 'logros': case 'achievement': case 'logro':
                await cmdLogros(sockR, jid, senderJid);
                await verificarYNotificar(sockR, jid, senderJid, getUsuario(senderJid)); break;
            case 'achievementlist': case 'listlogros': case 'logroslist': case 'todos_logros':
                await cmdListaLogros(sockR, jid); break;

            // ── REPUTACIÓN ────────────────────────────────────────────────
            case 'rep': case 'reputar': case 'dar_rep': case '+rep':
                await cmdDarRep(sockR, jid, senderJid, mencionados, pushName);
                await verificarYNotificar(sockR, jid, senderJid, getUsuario(senderJid)); break;
            case 'reputation': case 'reputacion': case 'misrep': case 'verep':
                await cmdVerRep(sockR, jid, senderJid, mencionados); break;
            case 'reptop': case 'toprep': case 'repleaderboard':
                await cmdTopRep(sockR, jid); break;

            // ── SOCIAL ────────────────────────────────────────────────────
            case 'poll': case 'encuesta': case 'votacion':
                await cmdPoll(sockR, jid, senderJid, args); break;
            case 'pollvote': case 'votar': case 'vote_encuesta': case 'voteenc':
                await cmdPollVote(sockR, jid, senderJid, args); break;
            case 'pollresults': case 'resultados': case 'encuesta_resultado':
                await cmdPollResults(sockR, jid); break;
            case 'truth': case 'verdad': case 'truth_dare':
                await cmdTruth(sockR, jid, senderJid, mencionados, pushName); break;
            case 'dare': case 'reto': case 'atrevete':
                await cmdDare(sockR, jid, senderJid, mencionados, pushName); break;
            case 'tod': case 'truthordare': case 'verdadoreto': case 'tof':
                await cmdTruthOrDare(sockR, jid, senderJid, mencionados, pushName); break;

            // ── CASINO ────────────────────────────────────────────────────
            case 'blackjack': case 'bj': case '21':
                await cmdBlackjack(sockR, jid, senderJid, args); break;
            case 'hit': case 'pedir_carta': case 'carta':
                await cmdHit(sockR, jid, senderJid); break;
            case 'stand': case 'plantarme': case 'plantar': case 'me_planto':
                await cmdStand(sockR, jid, senderJid); break;
            case 'slots': case 'tragamonedas': case 'slot': case 'maquina':
                await cmdSlots(sockR, jid, senderJid, args); break;
            case 'jackpot': case 'pozo': case 'jackpotinfo':
                await cmdJackpot(sockR, jid); break;

            // ── CLANES ────────────────────────────────────────────────────
            case 'createguild': case 'crearclan': case 'newclan': case 'nuevoclan':
                await cmdCrearClan(sockR, jid, senderJid, args); break;
            case 'joinguild': case 'unirclan': case 'entrar_clan':
                await cmdUnirClan(sockR, jid, senderJid, args); break;
            case 'leaveguild': case 'salirclan': case 'dejar_clan':
                await cmdSalirClan(sockR, jid, senderJid); break;
            case 'guildinfo': case 'infoclan': case 'clan': case 'miclan':
                await cmdInfoClan(sockR, jid, senderJid, args); break;
            case 'editguild': case 'editclan': case 'editarclan': case 'guildset':
                await cmdEditarClan(sockR, jid, senderJid, args, msg); break;
            case 'guildbattle': case 'guerraclan': case 'atacar': case 'guild_war':
                await cmdGuerraClanes(sockR, jid, senderJid, args); break;
            case 'guildtop': case 'topclanes': case 'clansranking': case 'clantop':
                await cmdListaClanes(sockR, jid); break;

            // ── EXTRAS ────────────────────────────────────────────────────
            case 'afk': case 'ausente': case 'ocupado':
                await cmdAfk(sockR, jid, senderJid, args, pushName); break;
            case 'adoptpet': case 'adoptar': case 'mascota': case 'pet':
            case 'adoptpokemon': case 'adoptp': case 'adoptarpokemon': case 'pokemon':
                await cmdAdoptar(sockR, jid, senderJid, args); break;
            case 'petinfo': case 'mimascota': case 'mipet': case 'vermasocta':
                await cmdPetInfo(sockR, jid, senderJid); break;
            case 'petfeed': case 'alimentar': case 'darcomida': case 'feed':
                await cmdPetFeed(sockR, jid, senderJid); break;
            case 'petplay': case 'jugarcon': case 'play_pet': case 'jugar':
                await cmdPetPlay(sockR, jid, senderJid); break;
            case 'changepet': case 'cambiarmascota': case 'newpet': case 'nuevamascota':
                await cmdCambiarMascota(sockR, jid, senderJid, args); break;
            case 'abandopet': case 'abandonarpet': case 'liberarmascota': case 'delpet':
                await cmdAbandonarMascota(sockR, jid, senderJid); break;
            case 'hack': case 'hackear': case 'hacker':
                await cmdHack(sockR, jid, senderJid, mencionados, pushName); break;
            case 'rankglobal': case 'globalrank': case 'topglobal': case 'rankingglobal':
                await cmdRankGlobal(sockR, jid); break;
            case 'event': case 'evento': case 'eventos': case 'temporada':
                await cmdEvento(sockR, jid); break;
            case 'loot': case 'recoger': case 'pickup':
                await cmdLoot(sockR, jid, senderJid, pushName); break;

            // ── PERFIL ────────────────────────────────────────────────────
            case 'perfil': case 'profile':
                await cmdPerfil(sockR, jid, senderJid, mencionados); break;
            case 'setbirth':
                await cmdSetbirth(sockR, jid, senderJid, args); break;
            case 'delbirth':
                await cmdDelbirth(sockR, jid, senderJid); break;
            case 'setdesc': case 'setdescription':
                await cmdSetdesc(sockR, jid, senderJid, args); break;
            case 'setgenre':
                await cmdSetgenre(sockR, jid, senderJid, args); break;
            case 'delgenre':
                await cmdDelgenre(sockR, jid, senderJid); break;
            case 'setfavourite': case 'setfav':
                await cmdSetfav(sockR, jid, senderJid, args); break;
            case 'marry': case 'casarse':
                await cmdMarry(sockR, jid, senderJid, mencionados); break;
            case 'divorce':
                await cmdDivorce(sockR, jid, senderJid); break;
            case 'level': case 'lvl':
                await cmdLevel(sockR, jid, senderJid, mencionados); break;
            case 'leaderboard': case 'lboard': case 'top':
                await cmdLeaderboard(sockR, jid); break;
            case 'cumpleanos': case 'cumpleaños': case 'birthdays':
                await cmdCumpleanos(sockR, jid); break;
            case 'allbirthdays': case 'allbirths':
                await cmdAllBirthdays(sockR, jid); break;
            case 'gp': case 'group': case 'groupinfo': case 'infogrupo':
                await cmdGrupoInfo(sockR, jid, groupMetadata); break;

            // ── STICKERS ──────────────────────────────────────────────────
            case 'sticker': case 's': case 'stickers':
                await cmdSticker(sockR, jid, msg, pushName); break;
            case 'stickersearch': case 'sticker_search': case 'stickerbus': case 'ss':
                await cmdStickerSearch(sockR, jid, args); break;

            // ── DESCARGAS ─────────────────────────────────────────────────
            case 'yt': case 'mp4': case 'ytmp4':
                await cmdYoutube(sockR, jid, args); break;
            case 'play': case 'ytaudio': case 'mp3':
                await cmdYoutubeAudio(sockR, jid, args); break;
            case 'ytsearch': case 'search': case 'buscarvideo':
                await cmdYoutubeSearch(sockR, jid, args); break;
            case 'ytv': case 'ytvideo': case 'ytdescargar':
                await cmdYoutubeVideoSearch(sockR, jid, args); break;
            case 'tiktok': case 'tt':
                await cmdTiktok(sockR, jid, args); break;
            case 'ttplay': case 'tiktokmp3': case 'ttaudio':
                await cmdTiktokAudio(sockR, jid, args); break;
            case 'facebook': case 'fb': case 'fvideo':
                await cmdFacebook(sockR, jid, args); break;
            case 'twitter': case 'x':
                await cmdTwitter(sockR, jid, args); break;
            case 'instagram': case 'ig': case 'reel':
                await cmdInstagram(sockR, jid, args); break;
            case 'pin': case 'pinterest':
                await manejarPin(sockR, msg); break;
            case 'img':
                await cmdImagen(sockR, jid, args); break;
            case 'downloaddiag': case 'diagdescargas':
                await cmdDiagnosticoDescargas(sockR, jid); break;
            case 'mediafire': case 'mf':
                await cmdMediafire(sockR, jid, args); break;
            case 'spotify': case 'sp':
                await cmdSpotify(sockR, jid, args); break;
            case 'soundcloud': case 'sc':
                await cmdSoundcloud(sockR, jid, args); break;
            case 'threads': case 'thread':
                await cmdThreads(sockR, jid, args); break;
            case 'apk': case 'apkpure':
                await cmdApkpure(sockR, jid, args); break;
            case 'drive': case 'gdrive':
                await cmdDrive(sockR, jid, args); break;
            case 'hitomi': case 'hitomila':
                await sockR.sendMessage(jid, { text: '📚 *Hitomi.la*\nUso: #hitomi <id o búsqueda>\n\n_Esta función está en desarrollo_ 🔧' }); break;
            case 'nhentai': case 'nh': case 'nhdl':
                await sockR.sendMessage(jid, { text: '📖 *NHentai*\nUso: #nhentai <código>\nEjemplo: #nhentai 177013\n\n_Esta función está en desarrollo_ 🔧' }); break;
            case 'vermangasporno': case 'vmp':
                await sockR.sendMessage(jid, { text: '📖 *VerMangasPorno*\nUso: #vmp <búsqueda>\n\n_Esta función está en desarrollo_ 🔧' }); break;

            // ── ADMIN ─────────────────────────────────────────────────────
            case 'setwelcome':
                await cmdSetwelcome(sockR, jid, groupMetadata, senderJid, args); break;
            case 'setgoodbye':
                await cmdSetgoodbye(sockR, jid, groupMetadata, senderJid, args); break;
            case 'setwelcomeimage': case 'welcomeimage': case 'welcomeimg':
                await cmdSetWelcomeImage(sockR, jid, groupMetadata, senderJid, msg); break;
            case 'setmultimediawelcome': case 'setwelcomemedia': case 'setwelcomevideo': case 'setwelcomegif':
                await cmdSetMultimediaWelcome(sockR, jid, groupMetadata, senderJid, msg); break;
            case 'delwelcomeimage': case 'removewelcomeimage': case 'delwelcomemedia':
                await cmdDelWelcomeImage(sockR, jid, groupMetadata, senderJid); break;
            case 'setgoodbyeimage': case 'goodbyeimage': case 'goodbyeimg':
                await cmdSetGoodbyeImage(sockR, jid, groupMetadata, senderJid, msg); break;
            case 'setmultimediagoodbye': case 'setgoodbyemedia': case 'setgoodbyevideo': case 'setgoodbyegif':
                await cmdSetMultimediaGoodbye(sockR, jid, groupMetadata, senderJid, msg); break;
            case 'delgoodbyeimage': case 'removegoodbyeimage': case 'delgoodbyemedia':
                await cmdDelGoodbyeImage(sockR, jid, groupMetadata, senderJid); break;
            case 'givechest': case 'darcofre': case 'dropcofre': case 'cofre':
                await cmdGivechest(sockR, jid, groupMetadata, senderJid, args); break;
            case 'claimchest': case 'reclamarcofre': case 'abrircofre':
                await cmdClaimchest(sockR, jid, senderJid); break;
            case 'welcome': case 'bienvenida':
                await cmdWelcome(sockR, jid, groupMetadata, senderJid, args); break;
            case 'goodbye': case 'despedida':
                await cmdGoodbye(sockR, jid, groupMetadata, senderJid, args); break;
            case 'onlyadmin': case 'onlyadmins':
                await cmdOnlyadmin(sockR, jid, groupMetadata, senderJid, args); break;
            case 'open':
                await cmdOpen(sockR, jid, groupMetadata, senderJid); break;
            case 'close':
                await cmdClose(sockR, jid, groupMetadata, senderJid); break;
            case 'kick':
                await cmdKick(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'promote':
                await cmdPromote(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'demote':
                await cmdDemote(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'antilink': case 'antienlace':
                await cmdAntilink(sockR, jid, groupMetadata, senderJid, args); break;
            case 'warn':
                await cmdWarn(sockR, jid, groupMetadata, senderJid, mencionados, args); break;
            case 'delwarn':
                await cmdDelwarn(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'warns':
                await cmdWarns(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'setwarnlimit':
                await cmdSetwarnlimit(sockR, jid, groupMetadata, senderJid, args); break;
            case 'topmensajes': case 'topcount': case 'topmessages': case 'topmsgcount':
                await cmdTopmensajes(sockR, jid); break;
            case 'alerts': case 'alertas':
                await cmdAlerts(sockR, jid, groupMetadata, senderJid, args); break;
            case 'economy': case 'economia':
                await cmdToggleEconomy(sockR, jid, groupMetadata, senderJid, args); break;
            case 'gacha':
                await cmdToggleGacha(sockR, jid, groupMetadata, senderJid, args); break;
            case 'nsfw':
                await cmdToggleNsfw(sockR, jid, groupMetadata, senderJid, args); break;
            case 'groupimage': case 'groupimg': case 'gpimg': case 'setgroupimage':
            case 'setgpbaner': case 'setgpbanner':
                await cmdGroupImage(sockR, jid, groupMetadata, senderJid, msg); break;
            case 'setgpname': case 'setgroupname': case 'setgpsubject':
                await cmdSetGpName(sockR, jid, groupMetadata, senderJid, args); break;
            case 'setgpdesc': case 'setgroupdesc': case 'setgpdescription':
                await cmdSetGpDesc(sockR, jid, groupMetadata, senderJid, args); break;
            case 'msgcount': case 'count': case 'messages': case 'mensajes':
                await cmdMsgCount(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'topinactive': case 'topinactivos': case 'topinactiveusers':
                await cmdTopInactive(sockR, jid); break;
            case 'setprimary':
                await cmdSetPrimary(sockR, jid, groupMetadata, senderJid, mencionados); break;
            case 'cleanup': case 'limpiar': case 'limpiarusuarios':
                await cmdLimpiarUsuarios(sockR, jid, groupMetadata, senderJid); break;

            // ── WAIFU ─────────────────────────────────────────────────────
            case 'waifu':
                await cmdWaifu(sockR, jid, args); break;

            // ── TOP RANDOM ────────────────────────────────────────────────
            case 'toprand': case 'toprandom': case 'rankrand': case 'rankrandom':
                await cmdTopRandom(sockR, jid, groupMetadata, args); break;

            // ── IA ────────────────────────────────────────────────────────
            case 'ai': case 'nexus': case 'gpt': case 'ask':
                await cmdIA(sockR, jid, senderJid, args, pushName); break;
            case 'clearmemory': case 'limpiarai': case 'resetai': case 'clearai': {
                const esAdminIA = isOwner(senderJid) || (esGrupo && esAdmin(groupMetadata, senderJid));
                if (!esAdminIA) {
                    await sockR.sendMessage(jid, { text: '⛔ Solo admins/owners pueden limpiar la memoria IA.' });
                } else {
                    await cmdLimpiarMemoria(sockR, jid, senderJid);
                }
                break;
            }

            // ── FUN ───────────────────────────────────────────────────────
            case 'ship':
                await cmdShip(sockR, jid, mencionados, pushName, senderJid); break;
            case 'meme': case 'memes':
                await cmdMeme(sockR, jid, args); break;
            case 'frase': case 'quote': case 'cita':
                await cmdFrase(sockR, jid, args); break;

            // ── MENU IMAGE (owner only) ────────────────────────────────────
            case 'setmenuimage': case 'setmenuimg': case 'menuimage':
                await cmdSetMenuImage(sockR, jid, senderJid, msg); break;
            case 'setmultimediamenu': case 'setmenumedia': case 'setmenuvideo': case 'setmenugif':
                await cmdSetMultimediaMenu(sockR, jid, senderJid, msg); break;
            case 'delmenuimage': case 'delmenuimg': case 'removemenuimage': case 'delmenumedia':
                await cmdDelMenuImage(sockR, jid, senderJid); break;

            // ── DEFAULT: acciones de anime / NSFW / imageboards ───────────
            default: {
                const esNsfwCmd = TODO_IMAGEBOARDS.includes(cmd) || TODO_IMAGEBOARDS_VIDEO.includes(cmd)
                    || TODO_NSFW_IMG.includes(cmd) || TODO_NSFW_ACCION.includes(cmd);

                if (esNsfwCmd) {
                    const nsfwPermitido = esGrupo
                        ? g?.nsfw === true
                        : isOwner(senderJid);

                    if (!nsfwPermitido) {
                        const texto_nsfw = esGrupo
                            ? '🔞 Los comandos *NSFW (+18)* están desactivados en este grupo.\n\n_El owner del bot puede activarlos con_ *#nsfw enable*'
                            : '🔞 Los comandos NSFW solo están disponibles en grupos con NSFW activado.';
                        await sockR.sendMessage(jid, { text: texto_nsfw });
                        break;
                    }
                }

                if (TODO_SFW.includes(cmd)) {
                    await cmdInteraccion(sockR, jid, senderJid, cmd, mencionados, pushName);
                } else if (TODO_IMAGEBOARDS_VIDEO.includes(cmd)) {
                    await cmdImageboard(sockR, jid, cmd, args, true);
                } else if (TODO_IMAGEBOARDS.includes(cmd)) {
                    await cmdImageboard(sockR, jid, cmd, args);
                } else if (TODO_NSFW_IMG.includes(cmd)) {
                    await cmdNsfw(sockR, jid, cmd);
                } else if (TODO_NSFW_ACCION.includes(cmd)) {
                    await cmdNsfwAccion(sockR, jid, senderJid, cmd, mencionados, pushName);
                }
            }
        }

        // ── Chequeo automático de logros ──────────────────────────────────
        const cmdsConLogros = ['work','w','trabajar','crime','crimen','daily','diario','steal','rob','robar',
            'coinflip','cf','roulette','rt','ruleta','fight','pvp','battle','pelear','train','entrenar',
            'rep','reputar','missions','misiones','claimmission','completar','blackjack','bj','slots','invest'];
        if (cmdsConLogros.includes(cmd)) {
            try {
                const uCheck = getUsuario(senderJid);
                await verificarYNotificar(sockR, jid, senderJid, uCheck);
            } catch { }
        }
    } catch (err) {
        console.error(`Error en comando #${cmd}:`, err.message);
        await sockR.sendMessage(jid, { text: `❌ Error al ejecutar el comando. Intenta de nuevo.` });
    }
}

module.exports = { manejarMensaje };
