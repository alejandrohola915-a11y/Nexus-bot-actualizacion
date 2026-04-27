const { getUsuario, guardarUsuario } = require('./database');
const { getGrupo, guardarGrupo } = require('./database');

// ══════════════════════════════════════════
//  ENCUESTA
// ══════════════════════════════════════════
async function cmdPoll(sock, jid, senderJid, args) {
    const full = args.join(' ');
    const partes = full.split('|').map(p => p.trim()).filter(Boolean);
    if (partes.length < 3) {
        await sock.sendMessage(jid, {
            text: '❌ Uso: *#poll [Pregunta] | [Opción1] | [Opción2] ...*\nEjemplo:\n*#poll ¿Mejor personaje? | Naruto | Goku | Luffy*'
        });
        return;
    }
    const pregunta = partes[0];
    const opciones = partes.slice(1, 7);
    const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

    const g = getGrupo(jid);
    g.encuesta = {
        pregunta,
        opciones,
        votos: {},
        autor: senderJid,
        fecha: Date.now()
    };
    guardarGrupo(jid, g);

    const lista = opciones.map((o, i) => `${nums[i]} ${o}`).join('\n');
    await sock.sendMessage(jid, {
        text: `📊 *¡ENCUESTA!*\n\n❓ *${pregunta}*\n\n${lista}\n\n_Vota con *#pollvote [número]*_\nUsa *#pollresults* para ver resultados.`
    });
}

async function cmdPollVote(sock, jid, senderJid, args) {
    const num = parseInt(args[0]) - 1;
    const g = getGrupo(jid);
    if (!g.encuesta || !g.encuesta.opciones) {
        await sock.sendMessage(jid, { text: '❌ No hay ninguna encuesta activa. Crea una con *#poll*' });
        return;
    }
    if (isNaN(num) || num < 0 || num >= g.encuesta.opciones.length) {
        await sock.sendMessage(jid, { text: `❌ Opción inválida. Vota del 1 al ${g.encuesta.opciones.length}` });
        return;
    }
    if (g.encuesta.votos[senderJid] !== undefined) {
        await sock.sendMessage(jid, { text: '⚠️ Ya votaste en esta encuesta.' });
        return;
    }
    g.encuesta.votos[senderJid] = num;
    guardarGrupo(jid, g);
    await sock.sendMessage(jid, { text: `✅ Voto registrado: *${g.encuesta.opciones[num]}*` });
}

async function cmdPollResults(sock, jid) {
    const g = getGrupo(jid);
    if (!g.encuesta || !g.encuesta.opciones) {
        await sock.sendMessage(jid, { text: '❌ No hay ninguna encuesta activa.' });
        return;
    }
    const conteo = g.encuesta.opciones.map((_, i) =>
        Object.values(g.encuesta.votos).filter(v => v === i).length
    );
    const total = conteo.reduce((a, b) => a + b, 0);
    const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    const lista = g.encuesta.opciones.map((o, i) => {
        const pct = total > 0 ? Math.round((conteo[i] / total) * 100) : 0;
        const barra = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
        return `${nums[i]} *${o}*\n   [${barra}] ${pct}% (${conteo[i]} votos)`;
    }).join('\n\n');
    await sock.sendMessage(jid, {
        text: `📊 *Resultados de la encuesta*\n\n❓ *${g.encuesta.pregunta}*\n\n${lista}\n\n📋 Total votos: *${total}*`
    });
}

// ══════════════════════════════════════════
//  TRUTH OR DARE
// ══════════════════════════════════════════
const TRUTHS = [
    '¿Quién es tu crush secreto del grupo?',
    '¿Cuál es tu mayor vergüenza?',
    '¿Alguna vez has mentido a alguien del grupo?',
    '¿Cuál es tu mayor miedo?',
    '¿Tienes celos de alguien del grupo?',
    '¿Cuál ha sido tu peor cita?',
    '¿Qué nunca le dirías a tu familia?',
    '¿Cuál fue tu mayor error?',
    '¿Has stalkedo el perfil de alguien del grupo?',
    '¿Cuál es tu hobbie más vergonzoso?',
    '¿Cuántos ex tienes?',
    '¿Qué personaje de anime te gusta más de forma "especial"?',
    '¿Prefieres ser rico sin amor o pobre con amor?',
    '¿Qué harías con 1 millón de pesos hoy?',
    '¿Cuál app nunca borrarías de tu cel?',
    '¿Has mandado un mensaje al destinatario equivocado?',
    '¿Cuál es tu película favorita que te da vergüenza admitir?',
    '¿Qué harías si tu crush te escribiera ahora mismo?',
];

const DARES = [
    'Escribe "soy un/a simp" en el grupo 😂',
    'Manda un selfie ahora mismo',
    'Escribe un poema corto para el grupo',
    'Menciona a 3 personas que te gustan del grupo',
    'Cambia tu foto de perfil por 10 minutos',
    'Escribe tu tipo ideal de persona',
    'Confiesa algo que nunca hayas dicho en el grupo',
    'Imita a alguien del grupo (solo con texto)',
    'Escribe los 3 defectos de tu mejor amigo/a',
    'Manda el último meme que guardaste',
    'Escribe cuánto te gustan las personas del grupo del 1 al 10',
    'Escribe una historia de 3 líneas con algún miembro del grupo',
    'Menciona tu momento más awkward del mes',
    'Escribe qué harías si te ganaras la lotería',
    'Admite cuántas horas al día pasas en WhatsApp',
    'Escribe el último mensaje de tu WhatsApp sin contexto',
    'Describe tu situación romántica actual sin mentir',
];

async function cmdTruth(sock, jid, senderJid, mencionados, pushName) {
    const target = mencionados?.length ? mencionados[0] : senderJid;
    const nombre = target === senderJid ? (pushName || senderJid.split('@')[0]) : `@${target.split('@')[0]}`;
    const q = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
    await sock.sendMessage(jid, {
        text: `🟢 *TRUTH para ${nombre}*\n\n❓ _"${q}"_`,
        mentions: [target]
    });
}

async function cmdDare(sock, jid, senderJid, mencionados, pushName) {
    const target = mencionados?.length ? mencionados[0] : senderJid;
    const nombre = target === senderJid ? (pushName || senderJid.split('@')[0]) : `@${target.split('@')[0]}`;
    const d = DARES[Math.floor(Math.random() * DARES.length)];
    await sock.sendMessage(jid, {
        text: `🔴 *DARE para ${nombre}*\n\n🎯 _"${d}"_`,
        mentions: [target]
    });
}

async function cmdTruthOrDare(sock, jid, senderJid, mencionados, pushName) {
    if (Math.random() < 0.5) {
        await cmdTruth(sock, jid, senderJid, mencionados, pushName);
    } else {
        await cmdDare(sock, jid, senderJid, mencionados, pushName);
    }
}

module.exports = { cmdPoll, cmdPollVote, cmdPollResults, cmdTruth, cmdDare, cmdTruthOrDare };
