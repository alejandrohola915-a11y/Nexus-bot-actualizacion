## Cambios recientes (Abril 2026 — paquete v2)
- **Economía**: nuevos #minar/#mine, #adventure/#aventura, #cazar/#hunt, #fish/#pescar, #mazmorra/#dungeon (cada uno con cooldowns, jail check y tracking).
- **Minijuegos**: #math acepta dificultad (facil|normal|dificil); nuevo #ppt (piedra/papel/tijera) con apuesta opcional.
- **SOCKETS** (owner-gated, persiste en data/bot_config.json): #join, #logout, #setprefix, #setchannel, #setlink, #setpfp, #setusername. #botinfo/#leave/#reload reorganizados en sección SOCKETS del menú.
- **Utilidades nuevas**: #report/#bug, #sug separado de #suggest, #hd/#enhance (sharp ×2 + sharpen), #read/#rvo (extrae viewOnce).
- **Admin**: #setgpname, #setgpdesc, #setgpbaner (alias de #groupimage). #count/#gacha movidos al menú ADMINISTRACIÓN.
- **#tag**: ahora soporta `mayus`/`minus` para forzar mayúsculas/minúsculas, y por defecto usa menciones invisibles (zero-width \u2063) que sí notifican a todos.
- **Owners**: bypass de #onlyadmin (siguen sujetos a #off).
- **@-commands por reply**: si no hay @ pero el mensaje cita a alguien, se usa el participant citado como mención automática.
- **#rw / personajes**: buscarImagenPersonaje ahora intenta múltiples filtros (general/safe/sin filtro), Safebooru, Gelbooru, Danbooru, Yande.re, Konachan y waifu.pics como fallback final.
- **#ss (sticker search)**: buscarGifUrl ahora acumula candidatos de Giphy + Tenor v2 + Tenor v1 + nekos.best + waifu.pics y elige al azar entre todos para máxima variedad.
- **r34**: buscarRule34 ahora prueba múltiples pids, filtra por extensiones de video válidas, hace fallback a gelbooru video, y cae a paheal/gelbooru para imágenes si rule34 está caído.
- **Bienvenidas/despedidas**: #testwelcome y #testgoodbye ya invocan el flujo real con imagen del grupo, mejorando la fidelidad del test.

## Cambios recientes (Abril 2026)
- Encabezado del menú reemplazado por plantilla NEXUS•SYSTEM con vars (@usuario, hora, totalusers, dev=Alejx_h, canal).
- Sección "OTROS COMANDOS" agregada al menú con todos los comandos antes ocultos.
- `#downloaddiag` removido del menú principal de descargas (sigue funcional, ahora listado en OTROS).
- Mensaje de subida de nivel automático cuando un usuario sube de nivel chateando en grupos.
- IA (#ai/#nexus): se añadió `referrer=nexusbot` para evitar avisos de deprecación de Pollinations, se filtran respuestas con avisos de deprecación, y se agregaron 2 fallbacks libres adicionales (Kaiz y Samir).
- `#perfil` rediseñado con foto de perfil del usuario, barra de progreso de XP y secciones bien delimitadas.
- Comandos NSFW de imageboards (`#r34`, `#gelbooru`, etc.) ahora traducen el nombre del personaje al tag canónico vía waifuDB antes de buscar (e.g., "miku" → "hatsune_miku").
- Stickers creados por usuarios incluyen metadata EXIF: pack="Nexus Bot", autor="Info: <canal> | Usuario: <pushName>" (vía wa-sticker-formatter).

# Nexus-Bot — WhatsApp

Bot de WhatsApp completo construido con Node.js + @whiskeysockets/baileys.  
Prefijo de comandos: `#`  Moneda: ⓃNexCoins

## Cómo iniciar

1. Ejecuta el proyecto
2. Si no hay sesión guardada, ingresa tu número con código de país (ej: 521234567890)
3. Ingresa el código en WhatsApp → Dispositivos vinculados → Vincular con número de teléfono
4. Escribe `#menu` en WhatsApp para ver todos los comandos

---

## Cambios recientes

- IA Nexus reescrita: ahora prioriza el endpoint `text.pollinations.ai/openai` (estilo OpenAI) con cuatro proveedores de respaldo en cadena, mejor extracción de texto y nuevo subcomando `#ai status` para diagnosticar caídas.
- Nuevos comandos de descarga inspirados en GataBot-MD: `#mediafire`, `#spotify`, `#soundcloud`, `#threads`, `#apk` y `#drive`, todos con cadena multi-API (dorratz, siputzx, agatz) y fallback a yt-dlp donde aplica.
- Menú actualizado con la sección de descargas extendida.
- Descargas SFW/NSFW endurecidas con headers tipo navegador en requests HTTP y yt-dlp.
- Manejo de errores más visible: las fallas de APIs/descargas imprimen `ERROR:` con status/respuesta cuando está disponible.
- Cooldown global de 10 segundos para descargas, imageboards y comandos NSFW para reducir spam y bloqueos.
- Nuevo diagnóstico `#downloaddiag` / `#diagdescargas` para comprobar desde Replit si plataformas responden 403/429.
- Menú actualizado con el set completo de comandos gacha y separación visual extra entre títulos de secciones y comandos.
- Gacha ajustado: `#claim` / `#c` reclama/comprar por nombre, por mensaje citado o por el último `#rw`; `#waifus @usuario` muestra personajes de otra persona.
- Fallbacks de descargas sociales: TikTok usa proveedor alterno cuando `yt-dlp` redirige mal; Facebook reintenta con extracción directa; Twitter/X lee más formatos de vxtwitter/fxtwitter; Instagram prueba `yt-dlp` y varias rutas públicas antes de mostrar error.
- Imageboards NSFW corregidos: Rule34/Gelbooru/Danbooru ya no codifican mal los tags con `+` y tienen fallback a Rule34 Paheal cuando las APIs públicas piden autenticación.
- `#tag` / `#hidetag` etiqueta a todos sin imprimir la lista visible de `@`.
- `#rw` ya no usa una waifu aleatoria como imagen de respaldo; si no hay coincidencia exacta, manda texto para evitar imagen que no corresponda al personaje.
- Menú y menú NSFW ahora incluyen mini descripciones por sección y muestran interacciones en lista vertical.

## Módulos y comandos

### Economía (`src/economy.js`)
`#saldo` `#diario` `#work` `#crime` `#slutwork` `#coinflip` `#deposit` `#withdraw` `#roulette` `#steal` `#rob` `#transferir` `#baltop` `#tienda` `#comprar` `#inventario`

### Ítems (`src/items.js`)
`#inv` `#shop` `#buyitem <id>` `#useitem <id>`  
Ítems: boost_trabajo, dado_suerte, escudo_robo, detector_victimas

### Banco Avanzado (`src/banco.js`)
`#invest <cantidad>` `#interes` `#prestamo <cantidad>` `#payloan` `#bankinfo`  
Inversiones (interés 10% / 6h) y préstamos (interés 20% / 12h)

### Combate PvP (`src/combate.js`)
`#stats` `#train` `#fight @user`  
Stats: fuerza / defensa / suerte / XP / nivel. Cooldown 2h para fight, 30 min para train.

### Minijuegos (`src/minijuegos.js`)
`#trivia` `#math` `#guess` `#wordchain` `#stopgame`  
Partidas en grupos con cooldown de 30 s entre juegos.

### Misiones (`src/misiones.js`)
`#misiones` `#claimmission`  
4 misiones diarias con XP/monedas de recompensa.

### Logros (`src/logros.js`)
`#logros` `#listlogros`  
Sistema de 15+ achievements con notificación automática.

### Reputación (`src/reputacion.js`)
`#rep @user` `#reputacion` `#toprep`  
+1 rep por usuario cada 24h.

### Casino (`src/casino.js`)
`#blackjack <apuesta>` `#hit` `#stand` `#slots <apuesta>` `#jackpot`  
Jackpot global acumulado; slots tiene probabilidad de jackpot.

### Gacha (`src/personajes.js`)
`#roll` `#rw` `#claim` `#c` `#harem` `#waifus @usuario` `#givechar` `#regalar` `#sell` `#vender` `#haremshop` `#wshop` `#trade` `#intercambiar` `#favtop` `#delwaifu` `#delchar` `#charinfo` `#winfo` `#charimage` `#cimage` `#charvideo` `#cvideo` `#gachainfo` `#ginfo` `#waifusboard` `#wtop` `#favoritetop` `#vote` `#votar` `#serieinfo` `#ainfo` `#serielist` `#slist`

### Descargas (`src/downloads.js`)
`#yt` `#play` `#ytsearch` `#ytv` `#tiktok` `#ttplay` `#facebook` `#instagram` `#twitter` `#pin` `#img` `#downloaddiag`

### Clanes (`src/clanes.js`)
`#crearclan <nombre> <tag>` `#unirclan <tag>` `#salirclan` `#infoclan` `#guerraclan <tag>` `#topclanes`  
Persistido en `data/clanes.json`.

### Social (`src/social.js`)
`#confesion <texto>` `#poll <pregunta>` `#vote <opcion>` `#pollresults` `#truth @user` `#dare @user` `#tod @user`

### Extras (`src/extras.js`)
`#afk [motivo]` — marca como ausente, avisa al volver/mencionar  
`#adoptar <nombre>` `#petinfo` `#petfeed` `#petplay`  
`#hack @user` `#rankglobal` `#event`

### IA Mejorada (`src/ai.js`)
`#ai <pregunta>` — con personas: nexus/sarcastico/sabio/troll/tsundere  
`#ai persona <nombre>` `#ai memoria on/off` `#ai reset` `#ai roast @user`

### Grupos (`src/admin.js`)
`#ban` `#unban` `#kick` `#add` `#promote` `#demote` `#antilink` `#warn` `#warns` `#nsfw enable/disable` `#economy on/off` etc.

### NSFW / Anime (`src/interactions.js`)
`#menunsfw` — muestra menú +18 solo si `#nsfw enable` está activo en el grupo  
Imageboards, acciones NSFW, waifus e interacciones SFW.

### Fun / Misceláneos (`src/fun.js`)
`#ship @u1 @u2` `#meme` `#frase`

---

## Arquitectura

```
src/
  handler.js       — Router principal (switch-case para todos los comandos)
  database.js      — getUsuario / guardarUsuario / getGrupo / guardarGrupo (JSON plano)
  economy.js       — Economía base + integración de ítems + tracking de misiones
  items.js         — Sistema de ítems/inventario
  banco.js         — Inversiones y préstamos
  combate.js       — PvP, stats, entrenamiento
  minijuegos.js    — Trivia, math, guess, wordchain + procesarRespuesta
  misiones.js      — Misiones diarias
  logros.js        — Achievements + verificarYNotificar
  reputacion.js    — Sistema de reputación
  social.js        — Confesiones, encuestas, truth-or-dare
  casino.js        — Blackjack, slots, jackpot global
  clanes.js        — Clanes con guerras
  extras.js        — AFK, mascotas, hack, rank global, eventos
  ai.js            — IA con personas, memoria grupal, roast
  menu.js          — #menu y #menunsfw
  interactions.js  — Interacciones SFW, NSFW e imageboards
  downloads.js     — Descargas y diagnóstico de bloqueos
  personajes.js    — Sistema gacha/personajes
  fun.js           — Comandos de diversión

data/
  usuarios.json    — Todos los datos de usuario
  grupos.json      — Configuración de grupos
  clanes.json      — Datos de clanes (auto-creado)
```

## Dependencias clave
- `@whiskeysockets/baileys` — Conexión WhatsApp
- `axios` — Peticiones HTTP y APIs externas
- `yt-dlp` — Descargas multimedia externas
- `ytdl-core` — Soporte YouTube heredado
- `http` de Node.js — Servidor keep-alive en puerto 3000
