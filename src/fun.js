const axios = require('axios');

// ══════════════════════════════════════════
//  SHIP
// ══════════════════════════════════════════
const mensajesShip = [
    { min: 0,  max: 20,  texto: 'Hmm... parece que no se llevan muy bien 😬 Quizás mejor como enemigos.' },
    { min: 21, max: 40,  texto: 'Hay algo de chispa, pero necesita trabajarse bastante 🤔' },
    { min: 41, max: 55,  texto: 'No está mal, tienen potencial si se esfuerzan 💫' },
    { min: 56, max: 70,  texto: 'Buena conexión, ¡esto puede funcionar! 😊' },
    { min: 71, max: 85,  texto: 'Relación estable… pero cuidado con los celos 😳' },
    { min: 86, max: 94,  texto: '¡Wow, casi perfectos el uno para el otro! ❤️🔥' },
    { min: 95, max: 100, texto: '¡SHIP PERFECTO! El destino los unió 💘✨ ¡Esta es la pareja del año!' },
];

async function cmdShip(sock, jid, mencionados, pushName, senderJid) {
    if (!mencionados || mencionados.length < 2) {
        await sock.sendMessage(jid, {
            text: '💘 *Ship*\nNecesitas mencionar a dos personas.\nUso: *#ship @persona1 @persona2*'
        });
        return;
    }
    const a = mencionados[0];
    const b = mencionados[1];
    const numA = a.split('@')[0];
    const numB = b.split('@')[0];
    const porcentaje = Math.floor(Math.random() * 101);
    const msg = mensajesShip.find(m => porcentaje >= m.min && porcentaje <= m.max);
    const barra = generarBarra(porcentaje);

    const texto = `💘 *Compatibilidad amorosa*\n\n👤 @${numA}\n❤️ + ❤️\n👤 @${numB}\n\n${barra} ${porcentaje}%\n\n_"${msg.texto}"_`;
    await sock.sendMessage(jid, { text: texto, mentions: [a, b] });
}

function generarBarra(porcentaje) {
    const total = 10;
    const llenas = Math.round((porcentaje / 100) * total);
    return '█'.repeat(llenas) + '░'.repeat(total - llenas);
}

// ══════════════════════════════════════════
//  MEME
// ══════════════════════════════════════════
const subreddits = {
    anime:    ['Animemes', 'AnimeIRL', 'animememes', 'animejfa'],
    shitpost: ['me_retraso_mental', 'MemesEnEspanol', 'Memes_de_actualidad', 'SpanishMemes'],
    dank:     ['me_retraso_mental', 'Memes_de_actualidad', 'MemesEnEspanol', 'SpanishMemes'],
    random:   ['me_retraso_mental', 'MemesEnEspanol', 'Memes_de_actualidad', 'SpanishMemes', 'Animemes', 'dankmemes'],
};

async function obtenerMeme(categoria) {
    const lista = subreddits[categoria] || subreddits.random;
    // Intentar varios subreddits hasta encontrar uno que funcione
    for (const sub of lista) {
        try {
            const res = await axios.get(`https://meme-api.com/gimme/${sub}`, { timeout: 15000 });
            if (res.data?.url && !res.data.nsfw) {
                return { url: res.data.url, titulo: res.data.title, sub: res.data.subreddit };
            }
        } catch { }
    }
    // Fallback: meme totalmente random
    try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 15000 });
        if (res.data?.url) {
            return { url: res.data.url, titulo: res.data.title, sub: res.data.subreddit };
        }
    } catch { }
    return null;
}

async function cmdMeme(sock, jid, args) {
    const cat = (args[0] || 'random').toLowerCase();
    const categorias = { anime: 'anime', shitpost: 'shitpost', dank: 'dank', random: 'random' };
    const categoria = categorias[cat] || 'random';

    await sock.sendMessage(jid, { text: '😂 _Buscando meme..._' });

    const meme = await obtenerMeme(categoria);
    if (!meme) {
        await sock.sendMessage(jid, { text: '❌ No pude encontrar un meme. Intenta de nuevo.' });
        return;
    }

    const caption = `😂 *${meme.titulo || 'Meme'}*\n📌 r/${meme.sub || 'memes'}\n\n_#meme anime | shitpost | dank | random_`;
    await sock.sendMessage(jid, { image: { url: meme.url }, caption });
}

// ══════════════════════════════════════════
//  FRASES RANDOM
// ══════════════════════════════════════════
const frases = {
    motivacional: [
        'No importa lo que los demás piensen, tú solo sigue adelante. 💪',
        'Cada día es una nueva oportunidad para ser mejor que ayer.',
        'Los sueños no tienen fecha de vencimiento. Nunca es tarde para empezar.',
        'La diferencia entre lo imposible y lo posible reside en la determinación.',
        'Cae siete veces, levántate ocho. Eso es todo lo que se necesita.',
        'No esperes el momento perfecto, toma el momento y hazlo perfecto.',
        'Tu único límite eres tú mismo. Rompe las barreras que te impones.',
        'El éxito no es el destino, es el camino que recorres cada día.',
        'Nunca subestimes el poder de creer en ti mismo.',
        'Haz hoy lo que otros no hacen, para mañana tener lo que otros no tienen.',
        'El fracaso es solo la oportunidad de comenzar de nuevo, esta vez con más inteligencia.',
        'No te rindas. Las grandes cosas llevan tiempo.',
        'Convierte tus heridas en sabiduría.',
        'La vida no te dará lo que deseas, sino lo que te mereces por tu esfuerzo.',
        'Si puedes soñarlo, puedes lograrlo. La mente es el límite.',
    ],
    sarcastica: [
        'Claro que tienes razón... y yo soy el Papa. 🙄',
        'Oh, ¡qué idea tan original! Como si nadie hubiera pensado en eso antes.',
        'Tranquilo, todos nacemos sin saber nada. Tú solo tardas más en aprenderlo.',
        'No te preocupes, el mundo gira más rápido cuando tú intentas pensar.',
        'Eres tan brillante que a veces apago el sol de lo innecesario que resulta.',
        'Sigo esperando que digas algo inteligente. No me voy a ningún lado.',
        'Gracias por tu opinión, la pondré justo aquí... con el resto de las que no pedí.',
        'Claro, porque tú siempre sabes más que Google y la Wikipedia juntos.',
        'Eso que dijiste fue tan profundo como un charco en verano.',
        'No te preocupes, algún día encontrarás tu cerebro. Ya llegará.',
        'Oh sí, eso tiene tanto sentido como bañarse con paraguas.',
        'Qué perspectiva tan fresca... para alguien que vive en el pasado.',
        'Sigue así y algún día serás mediocre. ¡Sí se puede!',
        'Claro, el universo conspiró para que dijeras eso. Qué desperdicio cósmico.',
        'Tu sabiduría me deja sin palabras. Lamentablemente, solo por un segundo.',
    ],
    filosofica: [
        'No tememos a la muerte, sino a no haber vivido lo suficiente.',
        'Somos polvo de estrellas que se pregunta a sí mismo qué es el universo.',
        'La vida no es el tiempo que tienes, sino lo que haces con él.',
        'El único absoluto es que no hay absolutos.',
        'Conocerse a uno mismo es el principio de toda sabiduría. — Aristóteles',
        'La existencia precede a la esencia. Tú defines lo que eres.',
        'No busques la felicidad, conviértete en alguien digno de ser feliz.',
        'El mayor enemigo del conocimiento no es la ignorancia, sino la ilusión del conocimiento.',
        'Todo lo que vemos podría ser de otra manera. Todo lo que describimos podría ser diferente.',
        'El hombre es la medida de todas las cosas. — Protágoras',
        'Pienso, luego existo. Pero ¿existe todo lo que pienso?',
        'La vida tiene el significado que tú decides darle.',
        'Actúa como si cada acto tuyo fuera a convertirse en ley universal. — Kant',
        'El tiempo es un río que fluye hacia la nada. Navégalo con propósito.',
        'No hay camino hacia la paz. La paz es el camino. — Gandhi',
    ],
};

async function cmdFrase(sock, jid, args) {
    const tipo = (args[0] || 'motivacional').toLowerCase();
    const lista = frases[tipo] || frases.motivacional;
    const frase = lista[Math.floor(Math.random() * lista.length)];

    const emojis = { motivacional: '✨', sarcastica: '😏', filosofica: '🧠' };
    const nombres = { motivacional: 'Motivacional', sarcastica: 'Sarcástica', filosofica: 'Filosófica' };
    const emoji = emojis[tipo] || '✨';
    const nombre = nombres[tipo] || 'Motivacional';

    await sock.sendMessage(jid, {
        text: `${emoji} *Frase ${nombre}*\n\n_"${frase}"_\n\n_Usa: #frase motivacional | sarcastica | filosofica_`
    });
}

module.exports = { cmdShip, cmdMeme, cmdFrase };
