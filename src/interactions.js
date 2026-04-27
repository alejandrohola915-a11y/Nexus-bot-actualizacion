const axios = require('axios');

const HUMAN_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
};

axios.defaults.headers.common = { ...axios.defaults.headers.common, ...HUMAN_HEADERS };

function logRequestError(contexto, err) {
    console.log('ERROR:', contexto, err.response?.data || err.message);
}

// ══════════════════════════════════════════
//  BASE DE DATOS WAIFUS
// ══════════════════════════════════════════
const waifuDB = [
    // Re:Zero
    { key: 'rem', tag: 'rem_(re_zero)' }, { key: 'ram', tag: 'ram_(re_zero)' },
    { key: 'emilia', tag: 'emilia_(re_zero)' }, { key: 'beatrice', tag: 'beatrice_(re_zero)' },
    { key: 'echidna', tag: 'echidna_(re_zero)' }, { key: 'satella', tag: 'satella_(re_zero)' },
    // SAO
    { key: 'asuna', tag: 'asuna_(sao)' }, { key: 'suguha', tag: 'suguha_kirigaya' },
    { key: 'silica', tag: 'silica_(sao)' }, { key: 'sinon', tag: 'asada_shino' },
    { key: 'alice', tag: 'alice_schuberg' }, { key: 'yuuki', tag: 'yuuki_(sao)' },
    // AOT
    { key: 'mikasa', tag: 'mikasa_ackerman' }, { key: 'historia', tag: 'historia_reiss' },
    { key: 'annie', tag: 'annie_leonhardt' }, { key: 'sasha', tag: 'blouse_sasha' },
    { key: 'hange', tag: 'hange_zoe' }, { key: 'pieck', tag: 'pieck_finger' },
    // Naruto
    { key: 'hinata', tag: 'hyuuga_hinata' }, { key: 'sakura', tag: 'haruno_sakura' },
    { key: 'tsunade', tag: 'tsunade' }, { key: 'temari', tag: 'temari_(naruto)' },
    { key: 'konan', tag: 'konan_(naruto)' }, { key: 'kushina', tag: 'uzumaki_kushina' },
    // Demon Slayer
    { key: 'nezuko', tag: 'kamado_nezuko' }, { key: 'shinobu', tag: 'kochou_shinobu' },
    { key: 'mitsuri', tag: 'kanroji_mitsuri' }, { key: 'kanao', tag: 'tsuyuri_kanao' },
    { key: 'daki', tag: 'daki_(kimetsu)' },
    // JJK
    { key: 'nobara', tag: 'kugisaki_nobara' }, { key: 'maki', tag: 'zenin_maki' },
    { key: 'mai', tag: 'zenin_mai' }, { key: 'mei mei', tag: 'mei_mei_(jujutsu)' },
    { key: 'miwa', tag: 'miwa_kasumi' },
    // MHA
    { key: 'ochako', tag: 'uraraka_ochako' }, { key: 'tsuyu', tag: 'asui_tsuyu' },
    { key: 'momo', tag: 'yaoyorozu_momo' }, { key: 'toga', tag: 'toga_himiko' },
    { key: 'mirko', tag: 'usagiyama_rumi' }, { key: 'jirou', tag: 'jirou_kyouka' },
    { key: 'mina', tag: 'ashido_mina' }, { key: 'nejire', tag: 'hado_nejire' },
    // One Piece
    { key: 'nami', tag: 'nami_(one_piece)' }, { key: 'robin', tag: 'nico_robin' },
    { key: 'hancock', tag: 'boa_hancock' }, { key: 'yamato', tag: 'yamato_(one_piece)' },
    { key: 'carrot', tag: 'carrot_(one_piece)' },
    // Dragon Ball
    { key: 'bulma', tag: 'bulma' }, { key: 'android 18', tag: 'android_18' },
    { key: 'caulifla', tag: 'caulifla' }, { key: 'kale', tag: 'kale_(dragon_ball)' },
    { key: 'videl', tag: 'videl' },
    // Fate
    { key: 'saber', tag: 'saber_(fate)' }, { key: 'rin', tag: 'tohsaka_rin' },
    { key: 'illya', tag: 'illyasviel_von_einzbern' }, { key: 'artoria', tag: 'artoria_pendragon' },
    { key: 'tamamo', tag: 'tamamo_no_mae_(fate)' }, { key: 'scathach', tag: 'scathach_(fate)' },
    { key: 'nero', tag: 'nero_claudius_(fate)' }, { key: 'medusa', tag: 'medusa_(fate)' },
    { key: 'morgan', tag: 'morgan_le_fay_(fate)' },
    // Konosuba
    { key: 'aqua', tag: 'aqua_(konosuba)' }, { key: 'megumin', tag: 'megumin_(konosuba)' },
    { key: 'darkness', tag: 'lalatina_dustiness_ford' }, { key: 'yunyun', tag: 'yunyun_(konosuba)' },
    { key: 'wiz', tag: 'wiz_(konosuba)' }, { key: 'eris', tag: 'eris_(konosuba)' },
    // Spy x Family
    { key: 'yor', tag: 'yor_forger' }, { key: 'anya', tag: 'anya_forger' },
    // Date A Live
    { key: 'tohka', tag: 'yatogami_tohka' }, { key: 'kurumi', tag: 'tokisaki_kurumi' },
    { key: 'kotori', tag: 'itsuka_kotori' }, { key: 'yoshino', tag: 'yoshino_(date_a_live)' },
    { key: 'origami', tag: 'tobiichi_origami' }, { key: 'miku date', tag: 'izayoi_miku' },
    // Overlord
    { key: 'albedo', tag: 'albedo_(overlord)' }, { key: 'shalltear', tag: 'shalltear_bloodfallen' },
    // DITF
    { key: 'zero two', tag: 'zero_two_(darling_in_the_franxx)' }, { key: '02', tag: 'zero_two_(darling_in_the_franxx)' },
    { key: 'ichigo ditf', tag: 'ichigo_(darling_in_the_franxx)' },
    // Dragon Maid
    { key: 'tohru', tag: 'tohru_(kobayashi_dragon_maid)' }, { key: 'kanna', tag: 'kanna_kamui' },
    { key: 'lucoa', tag: 'quetzalcoatl_(dragon_maid)' }, { key: 'ilulu', tag: 'ilulu_(dragon_maid)' },
    // Quintuplets
    { key: 'nino', tag: 'nakano_nino' }, { key: 'miku nino', tag: 'nakano_miku' },
    { key: 'ichika', tag: 'nakano_ichika' }, { key: 'yotsuba', tag: 'nakano_yotsuba' },
    { key: 'itsuki', tag: 'nakano_itsuki' },
    // Genshin
    { key: 'lumine', tag: 'lumine_(genshin_impact)' }, { key: 'ganyu', tag: 'ganyu_(genshin_impact)' },
    { key: 'hu tao', tag: 'hu_tao_(genshin_impact)' }, { key: 'hutao', tag: 'hu_tao_(genshin_impact)' },
    { key: 'raiden', tag: 'raiden_shogun' },
    { key: 'raiden shogun', tag: 'raiden_shogun' }, { key: 'yae miko', tag: 'yae_miko' },
    { key: 'kokomi', tag: 'sangonomiya_kokomi' }, { key: 'fischl', tag: 'fischl_(genshin_impact)' },
    { key: 'eula', tag: 'eula_(genshin_impact)' }, { key: 'nahida', tag: 'nahida_(genshin_impact)' },
    { key: 'furina', tag: 'furina_(genshin_impact)' }, { key: 'nilou', tag: 'nilou_(genshin_impact)' },
    { key: 'shenhe', tag: 'shenhe_(genshin_impact)' }, { key: 'yelan', tag: 'yelan_(genshin_impact)' },
    { key: 'keqing', tag: 'keqing_(genshin_impact)' }, { key: 'ningguang', tag: 'ningguang_(genshin_impact)' },
    // Bleach
    { key: 'rukia', tag: 'kuchiki_rukia' }, { key: 'orihime', tag: 'inoue_orihime' },
    { key: 'yoruichi', tag: 'shihouin_yoruichi' }, { key: 'rangiku', tag: 'matsumoto_rangiku' },
    { key: 'nell', tag: 'nelliel_tu_odelschwanck' }, { key: 'unohana', tag: 'unohana_retsu' },
    // Fairy Tail
    { key: 'erza', tag: 'scarlet_erza' }, { key: 'lucy ft', tag: 'heartfilia_lucy' },
    { key: 'mirajane', tag: 'strauss_mirajane' }, { key: 'juvia', tag: 'lockser_juvia' },
    // Chainsaw Man
    { key: 'makima', tag: 'makima_(chainsaw_man)' }, { key: 'power', tag: 'power_(chainsaw_man)' },
    { key: 'reze', tag: 'reze_(chainsaw_man)' }, { key: 'himeno', tag: 'himeno_(chainsaw_man)' },
    { key: 'kobeni', tag: 'kobeni_higashiyama' }, { key: 'asa', tag: 'mitaka_asa' },
    // Lycoris Recoil
    { key: 'chisato', tag: 'nishikigi_chisato' }, { key: 'takina', tag: 'inoue_takina' },
    // Pokemon
    { key: 'misty', tag: 'kasumi_(pokemon)' }, { key: 'dawn', tag: 'hikari_(pokemon)' },
    { key: 'serena', tag: 'serena_(pokemon)' }, { key: 'may', tag: 'haruka_(pokemon)' },
    { key: 'cynthia', tag: 'shirona_(pokemon)' }, { key: 'nessa', tag: 'rurina_(pokemon)' },
    { key: 'marnie', tag: 'maril_(pokemon)' },
    // Vocaloid
    { key: 'miku', tag: 'hatsune_miku' }, { key: 'luka', tag: 'megurine_luka' },
    { key: 'gumi', tag: 'gumi_(vocaloid)' }, { key: 'rin vocaloid', tag: 'kagamine_rin' },
    // Honkai / Star Rail
    { key: 'kiana', tag: 'kiana_kaslana' }, { key: 'bronya', tag: 'bronya_zaychik' },
    { key: 'elysia', tag: 'elysia_(honkai)' }, { key: 'kafka', tag: 'kafka_(star_rail)' },
    { key: 'seele star', tag: 'seele_(star_rail)' },
    // Black Clover
    { key: 'noelle', tag: 'noelle_silva' }, { key: 'mimosa', tag: 'vermillion_mimosa' },
    // Goblin Slayer
    { key: 'priestess', tag: 'priestess_(goblin_slayer)' },
    // DxD
    { key: 'rias', tag: 'rias_gremory' }, { key: 'akeno', tag: 'himejima_akeno' },
    { key: 'koneko', tag: 'toujou_koneko' }, { key: 'xenovia', tag: 'quarta_xenovia' },
    // NGNL
    { key: 'shiro', tag: 'shiro_(no_game_no_life)' }, { key: 'jibril', tag: 'jibril_(no_game_no_life)' },
    // Toradora
    { key: 'taiga', tag: 'aisaka_taiga' },
    // Rent a GF
    { key: 'chizuru', tag: 'mizuhara_chizuru' }, { key: 'ruka', tag: 'sarashina_ruka' },
    // Kaguya
    { key: 'kaguya', tag: 'shinomiya_kaguya' }, { key: 'chika', tag: 'fujiwara_chika' },
    // Madoka
    { key: 'madoka', tag: 'kaname_madoka' }, { key: 'homura', tag: 'akemi_homura' },
    { key: 'mami', tag: 'tomoe_mami' },
    // Evangelion
    { key: 'rei', tag: 'ayanami_rei' }, { key: 'asuka', tag: 'souryuu_asuka_langley' },
    { key: 'mari', tag: 'illustrious_makinami' }, { key: 'misato', tag: 'katsuragi_misato' },
    // Oregairu
    { key: 'yukino', tag: 'yukinoshita_yukino' }, { key: 'yui', tag: 'yuigahama_yui' },
    { key: 'iroha', tag: 'isshiki_iroha' },
    // Sailor Moon
    { key: 'usagi', tag: 'tsukino_usagi' }, { key: 'sailor moon', tag: 'tsukino_usagi' },
    { key: 'rei sailor', tag: 'hino_rei' }, { key: 'chibiusa', tag: 'chibiusa' },
    // Love Live
    { key: 'maki', tag: 'nishikino_maki' }, { key: 'honoka', tag: 'kousaka_honoka' },
    { key: 'nico', tag: 'yazawa_nico' }, { key: 'eli', tag: 'ayase_eli' },
    // Bocchi
    { key: 'bocchi', tag: 'gotou_hitori' }, { key: 'hitori', tag: 'gotou_hitori' },
    { key: 'nijika', tag: 'ijichi_nijika' }, { key: 'ryou', tag: 'yamada_ryou' },
    { key: 'ikuyo', tag: 'kita_ikuyo' },
    // Dungeon Meshi
    { key: 'marcille', tag: 'donato_marcille' }, { key: 'falin', tag: 'touden_falin' },
    // Oshi no Ko
    { key: 'ai', tag: 'hoshino_ai' }, { key: 'ruby', tag: 'hoshino_ruby' },
    { key: 'kana', tag: 'arima_kana' },
    // Tensura
    { key: 'shion', tag: 'shion_(tensura)' }, { key: 'milim', tag: 'nava_milim' },
    { key: 'shuna', tag: 'shuna_(tensura)' },
    // Kakegurui
    { key: 'yumeko', tag: 'jabami_yumeko' }, { key: 'mary', tag: 'saotome_mary' },
    { key: 'kirari', tag: 'momobami_kirari' }, { key: 'midari', tag: 'ikishima_midari' },
    // Mushoku Tensei
    { key: 'roxy', tag: 'migurdia_roxy' },
    { key: 'sylphie', tag: 'sylphiette_(mushoku_tensei)' },
    { key: 'sylphiette', tag: 'sylphiette_(mushoku_tensei)' },
    { key: 'eris mushoku', tag: 'eris_(mushoku_tensei)' },
    // Angel Beats
    { key: 'kanade', tag: 'tachibana_kanade' }, { key: 'angel beats', tag: 'tachibana_kanade' },
    // FMA
    { key: 'winry', tag: 'rockbell_winry' }, { key: 'riza', tag: 'hawkeye_riza' },
    { key: 'olivier', tag: 'armstrong_olivier' },
    // Toaru
    { key: 'misaka', tag: 'misaka_mikoto' }, { key: 'mikoto', tag: 'misaka_mikoto' },
    { key: 'index', tag: 'index_librorum_prohibitorum' }, { key: 'shokuhou', tag: 'shokuhou_misaki' },
    // Danganronpa
    { key: 'kyoko', tag: 'kirigiri_kyouko' }, { key: 'junko', tag: 'enoshima_junko' },
    { key: 'chiaki', tag: 'nanami_chiaki' }, { key: 'sayaka', tag: 'maizono_sayaka' },
    // Extra popular
    { key: 'neco arc', tag: 'neco-arc' }, { key: 'neco-arc', tag: 'neco-arc' },
    { key: 'necoarc', tag: 'neco-arc' }, { key: 'neco arc chaos', tag: 'neco-arc_chaos' },
    { key: 'marin', tag: 'kitagawa_marin' }, { key: 'nagatoro', tag: 'nagatoro_hayase' },
    { key: 'touka', tag: 'kirishima_touka' }, { key: 'bishamon', tag: 'bishamonten_(noragami)' },
    { key: 'raphtalia', tag: 'raphtalia' }, { key: 'filo', tag: 'filo_(tate_no_yuusha)' },
    { key: 'reina', tag: 'reina_(myriad_colors)' }, { key: 'shouko', tag: 'nishimiya_shouko' },
    { key: 'lucy', tag: 'lucy_(cyberpunk_edgerunners)' },
    { key: 'power csm', tag: 'power_(chainsaw_man)' },
    { key: 'komi', tag: 'komi_shouko' },
    { key: 'yashahime', tag: 'moroha_(yashahime)' },
    { key: 'nezuko chan', tag: 'kamado_nezuko' },
    // Más personajes populares
    { key: 'power brs', tag: 'black_rock_shooter' },
    { key: 'holo', tag: 'holo_(spice_and_wolf)' },
    { key: 'spice wolf', tag: 'holo_(spice_and_wolf)' },
    { key: 'remu', tag: 'rem_(re_zero)' },
    { key: 'rezero rem', tag: 'rem_(re_zero)' },
    // Nier Automata
    { key: '2b', tag: 'yorha_no.2_type_b' }, { key: 'yorha 2b', tag: 'yorha_no.2_type_b' },
    { key: 'yorha2b', tag: 'yorha_no.2_type_b' }, { key: 'a2 nier', tag: 'yorha_a2_type_a' },
    // UTAU / Kasane Teto
    { key: 'teto', tag: 'kasane_teto' }, { key: 'kasane teto', tag: 'kasane_teto' },
    { key: 'kasane', tag: 'kasane_teto' }, { key: 'tetoo', tag: 'kasane_teto' },
    // Mushoku Tensei aliases extras
    { key: 'roxy migurdia', tag: 'migurdia_roxy' }, { key: 'roxymigurdia', tag: 'migurdia_roxy' },
    // Sword Art Online alias
    { key: 'asada shino', tag: 'asada_shino' },
    // Más populares
    { key: 'chitoge', tag: 'kirisaki_chitoge' }, { key: 'onodera', tag: 'onodera_kosaki' },
    { key: 'raku', tag: 'kirisaki_chitoge' },
    { key: 'violet evergarden', tag: 'violet_evergarden' }, { key: 'violet', tag: 'violet_evergarden' },
    { key: 'frieren', tag: 'frieren_(sousou_no_frieren)' }, { key: 'fern', tag: 'fern_(sousou_no_frieren)' },
    { key: 'ai hayasaka', tag: 'hayasaka_ai' }, { key: 'hayasaka', tag: 'hayasaka_ai' },
    { key: 'ishtar fate', tag: 'ishtar_(fate)' }, { key: 'ereshkigal', tag: 'ereshkigal_(fate)' },
    { key: 'abigail fate', tag: 'abigail_williams_(fate)' },
    { key: 'himari', tag: 'himari_(blue_archive)' }, { key: 'hoshino blue', tag: 'hoshino_(blue_archive)' },
    { key: 'shizuku', tag: 'shizuku_(blue_archive)' },
    // KonoSuba alias
    { key: 'kazuma', tag: 'satou_kazuma' },
    // Más Re:Zero
    { key: 'frederica', tag: 'baumann_frederica' }, { key: 'petra', tag: 'leyte_petra' },
    // Más MHA
    { key: 'midnight', tag: 'kayama_nemuri' }, { key: 'mt lady', tag: 'mt._lady' },
    // Más One Piece
    { key: 'vivi', tag: 'nefertari_vivi' }, { key: 'nefertari', tag: 'nefertari_vivi' },
    // ── Adiciones populares (extra) ──────────────────────────────────────
    // Genshin extra
    { key: 'mona', tag: 'mona_(genshin_impact)' }, { key: 'amber', tag: 'amber_(genshin_impact)' },
    { key: 'jean', tag: 'jean_(genshin_impact)' }, { key: 'lisa', tag: 'lisa_(genshin_impact)' },
    { key: 'rosaria', tag: 'rosaria_(genshin_impact)' }, { key: 'beidou', tag: 'beidou_(genshin_impact)' },
    { key: 'xiangling', tag: 'xiangling_(genshin_impact)' }, { key: 'kazuha', tag: 'kaedehara_kazuha' },
    { key: 'xiao', tag: 'xiao_(genshin_impact)' }, { key: 'venti', tag: 'venti_(genshin_impact)' },
    { key: 'zhongli', tag: 'zhongli_(genshin_impact)' }, { key: 'ayaka', tag: 'kamisato_ayaka' },
    { key: 'ayato', tag: 'kamisato_ayato' }, { key: 'wanderer', tag: 'wanderer_(genshin_impact)' },
    { key: 'tighnari', tag: 'tighnari_(genshin_impact)' }, { key: 'lyney', tag: 'lyney_(genshin_impact)' },
    { key: 'navia', tag: 'navia_(genshin_impact)' }, { key: 'clorinde', tag: 'clorinde_(genshin_impact)' },
    // Honkai Star Rail extra
    { key: 'march 7th', tag: 'march_7th_(star_rail)' }, { key: 'march7', tag: 'march_7th_(star_rail)' },
    { key: 'silver wolf', tag: 'silver_wolf_(star_rail)' }, { key: 'fu xuan', tag: 'fu_xuan_(star_rail)' },
    { key: 'jingliu', tag: 'jingliu_(star_rail)' }, { key: 'topaz', tag: 'topaz_(star_rail)' },
    { key: 'firefly', tag: 'firefly_(star_rail)' }, { key: 'acheron', tag: 'acheron_(star_rail)' },
    { key: 'black swan', tag: 'black_swan_(star_rail)' }, { key: 'bronya star', tag: 'bronya_(star_rail)' },
    { key: 'tingyun', tag: 'tingyun_(star_rail)' }, { key: 'sparkle', tag: 'sparkle_(star_rail)' },
    // Blue Archive
    { key: 'aru', tag: 'aru_(blue_archive)' }, { key: 'mika', tag: 'mika_(blue_archive)' },
    { key: 'arona', tag: 'arona_(blue_archive)' }, { key: 'hina', tag: 'hina_(blue_archive)' },
    { key: 'iori', tag: 'iori_(blue_archive)' }, { key: 'asuna ba', tag: 'asuna_(blue_archive)' },
    { key: 'shiroko', tag: 'shiroko_(blue_archive)' }, { key: 'yuuka', tag: 'yuuka_(blue_archive)' },
    { key: 'noa', tag: 'noa_(blue_archive)' }, { key: 'koharu', tag: 'koharu_(blue_archive)' },
    { key: 'plana', tag: 'plana_(blue_archive)' },
    // Azur Lane
    { key: 'enterprise', tag: 'enterprise_(azur_lane)' }, { key: 'belfast', tag: 'belfast_(azur_lane)' },
    { key: 'taihou', tag: 'taihou_(azur_lane)' }, { key: 'azuma', tag: 'azuma_(azur_lane)' },
    { key: 'akagi', tag: 'akagi_(azur_lane)' }, { key: 'kaga', tag: 'kaga_(azur_lane)' },
    { key: 'shimakaze', tag: 'shimakaze_(azur_lane)' },
    // Nikke
    { key: 'rapi', tag: 'rapi_(nikke)' }, { key: 'modernia', tag: 'modernia_(nikke)' },
    { key: 'scarlet', tag: 'scarlet_(nikke)' }, { key: 'helm', tag: 'helm_(nikke)' },
    { key: 'dorothy', tag: 'dorothy_(nikke)' }, { key: 'red hood', tag: 'red_hood_(nikke)' },
    // Arknights
    { key: 'amiya', tag: 'amiya_(arknights)' }, { key: 'skadi', tag: 'skadi_(arknights)' },
    { key: 'mostima', tag: 'mostima_(arknights)' }, { key: 'eyjafjalla', tag: 'eyjafjalla_(arknights)' },
    { key: 'angelina', tag: 'angelina_(arknights)' }, { key: 'texas', tag: 'texas_(arknights)' },
    { key: 'lappland', tag: 'lappland_(arknights)' }, { key: 'surtr', tag: 'surtr_(arknights)' },
    { key: 'nian', tag: 'nian_(arknights)' }, { key: 'ch\'en', tag: 'ch\'en_(arknights)' },
    // FGO/Fate extras
    { key: 'jeanne fate', tag: 'jeanne_d\'arc_(fate)' }, { key: 'mash', tag: 'mash_kyrielight' },
    { key: 'shielder', tag: 'mash_kyrielight' }, { key: 'mordred', tag: 'mordred_(fate)' },
    { key: 'jalter', tag: 'jeanne_d\'arc_alter_(fate)' }, { key: 'okita', tag: 'okita_souji_(fate)' },
    { key: 'kama', tag: 'kama_(fate)' }, { key: 'kiara', tag: 'sessyoin_kiara' },
    { key: 'parvati', tag: 'parvati_(fate)' }, { key: 'durga', tag: 'durga_(fate)' },
    // Touhou
    { key: 'reimu', tag: 'hakurei_reimu' }, { key: 'marisa', tag: 'kirisame_marisa' },
    { key: 'sakuya', tag: 'izayoi_sakuya' }, { key: 'remilia', tag: 'remilia_scarlet' },
    { key: 'flandre', tag: 'flandre_scarlet' }, { key: 'patchouli', tag: 'patchouli_knowledge' },
    { key: 'youmu', tag: 'konpaku_youmu' }, { key: 'yuyuko', tag: 'saigyouji_yuyuko' },
    // K-On
    { key: 'mio', tag: 'akiyama_mio' }, { key: 'yui kon', tag: 'hirasawa_yui' },
    { key: 'azusa', tag: 'nakano_azusa' },
    // Idolmaster / Hololive
    { key: 'haruka', tag: 'amami_haruka' }, { key: 'pekora', tag: 'usada_pekora' },
    { key: 'marine', tag: 'houshou_marine' }, { key: 'aqua hololive', tag: 'minato_aqua' },
    { key: 'gura', tag: 'gawr_gura' }, { key: 'calliope', tag: 'mori_calliope' },
    { key: 'kronii', tag: 'ouro_kronii' }, { key: 'fauna', tag: 'ceres_fauna' },
    { key: 'noel', tag: 'shirogane_noel' }, { key: 'rushia', tag: 'uruha_rushia' },
    { key: 'korone', tag: 'inugami_korone' }, { key: 'okayu', tag: 'nekomata_okayu' },
    // Chainsaw Man extras
    { key: 'quanxi', tag: 'quanxi_(chainsaw_man)' }, { key: 'fami', tag: 'fami_(chainsaw_man)' },
    // Helltaker
    { key: 'modeus', tag: 'modeus_(helltaker)' }, { key: 'azazel', tag: 'azazel_(helltaker)' },
    { key: 'cerberus', tag: 'cerberus_(helltaker)' }, { key: 'lucifer', tag: 'lucifer_(helltaker)' },
    // Jujutsu Kaisen extras
    { key: 'gojo', tag: 'gojou_satoru' }, { key: 'sukuna', tag: 'ryoumen_sukuna' },
    // Re:Zero extras
    { key: 'crusch', tag: 'crusch_karsten' }, { key: 'priscilla', tag: 'priscilla_barielle' },
    // Sword Art Online extras
    { key: 'lisbeth', tag: 'shinozaki_rika' }, { key: 'leafa', tag: 'suguha_kirigaya' },
    // Konosuba extras
    { key: 'iris', tag: 'iris_(konosuba)' },
    // Tensura extras
    { key: 'rimuru', tag: 'rimuru_tempest' },
    // Spy x Family extras
    { key: 'fiona', tag: 'fiona_frost' },
    // High School DxD extras
    { key: 'irina', tag: 'shidou_irina' }, { key: 'kuroka', tag: 'kuroka_(dxd)' },
    // Tate no Yuusha extras
    { key: 'sadina', tag: 'sadina_(tate_no_yuusha)' },
    // Eminence in Shadow
    { key: 'alpha', tag: 'alpha_(eminence_in_shadow)' }, { key: 'beta', tag: 'beta_(eminence_in_shadow)' },
    { key: 'delta', tag: 'delta_(eminence_in_shadow)' },
    // Mushoku Tensei extras
    { key: 'eris', tag: 'eris_(mushoku_tensei)' }, { key: 'rudeus', tag: 'rudeus_greyrat' },
    // Generales
    { key: 'waifu', tag: '1girl' }, { key: 'girl', tag: '1girl' },
    { key: 'anime girl', tag: '1girl' }, { key: 'kawaii', tag: '1girl+kawaii' },
    { key: 'loli', tag: '1girl+chibi' }, { key: 'kemonomimi', tag: 'kemonomimi_mode' },
    { key: 'neko', tag: 'cat_girl' }, { key: 'nekogirl', tag: 'cat_girl' },
    { key: 'elf', tag: 'elf_(fantasy)' }, { key: 'maid', tag: 'maid' },
    { key: 'nurse', tag: 'nurse' }, { key: 'school', tag: 'school_uniform' },
    { key: 'bunny', tag: 'bunny_girl' }, { key: 'bunnygirl', tag: 'bunny_girl' },
    { key: 'fox girl', tag: 'fox_girl' }, { key: 'kitsune', tag: 'fox_girl' },
    { key: 'angel', tag: 'angel_girl' }, { key: 'demon', tag: 'demon_girl' },
    { key: 'femboy', tag: 'femboy' }, { key: 'trap', tag: 'trap' },
    { key: 'futa', tag: 'futanari' }, { key: 'tomboy', tag: 'tomboy' },
    { key: 'thicc', tag: 'thick_thighs' }, { key: 'milf', tag: 'milf' },
    { key: 'bikini', tag: 'bikini+1girl' }, { key: 'swimsuit', tag: 'swimsuit+1girl' },
    { key: 'lingerie', tag: 'lingerie+1girl' }, { key: 'gym', tag: 'gym_uniform+1girl' },
    { key: 'kimono', tag: 'kimono+1girl' }, { key: 'witch', tag: 'witch+1girl' },
    { key: 'office', tag: 'office_lady' }, { key: 'goth', tag: 'goth+1girl' },
];

// ── Distancia de Levenshtein para fuzzy matching ───────────────────────────
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function normalizar(s) {
    return s.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

function encontrarWaifu(input) {
    if (!input) return null;
    const q = normalizar(input);
    const qSinEsp = q.replace(/\s/g, '');

    // 1. Coincidencia exacta (normalizada)
    const exacta = waifuDB.find(w => normalizar(w.key) === q);
    if (exacta) return exacta;

    // 2. Sin espacios
    const sinEsp = waifuDB.find(w => normalizar(w.key).replace(/\s/g, '') === qSinEsp);
    if (sinEsp) return sinEsp;

    // 3. La query contiene la key o viceversa
    const parcial = waifuDB.find(w => normalizar(w.key).includes(q) || q.includes(normalizar(w.key)));
    if (parcial) return parcial;

    // 4. Por palabras individuales (mín 3 caracteres)
    const palabras = q.split(' ').filter(p => p.length >= 3);
    if (palabras.length > 0) {
        const porPalabra = waifuDB.find(w => {
            const norm = normalizar(w.key);
            return palabras.some(p => norm.includes(p) || p.includes(norm.replace(/\s/g, '')));
        });
        if (porPalabra) return porPalabra;
    }

    // 5. Fuzzy matching con Levenshtein (tolerancia según longitud)
    let mejorMatch = null;
    let mejorDist = Infinity;
    for (const w of waifuDB) {
        const norm = normalizar(w.key);
        const dist = levenshtein(q, norm);
        const tolerancia = Math.max(2, Math.floor(q.length * 0.35));
        if (dist < mejorDist && dist <= tolerancia) {
            mejorDist = dist;
            mejorMatch = w;
        }
        // También comparar sin espacios
        const distSinEsp = levenshtein(qSinEsp, norm.replace(/\s/g, ''));
        if (distSinEsp < mejorDist && distSinEsp <= tolerancia) {
            mejorDist = distSinEsp;
            mejorMatch = w;
        }
    }
    if (mejorMatch) return mejorMatch;

    return null;
}

// ══════════════════════════════════════════
//  ACCIONES SFW - ANIME
//  Cada acción tiene:
//  - emoji, nekos, mensaje (con destinatario), msgSolo (sin destinatario)
// ══════════════════════════════════════════
const SFW_ACCIONES = {
    abrazar:    { emoji: '🤗', nekos: 'hug',       mensaje: 'abrazó a',                    msgSolo: 'quiere abrazar a alguien' },
    hug:        { emoji: '🤗', nekos: 'hug',       mensaje: 'abrazó a',                    msgSolo: 'quiere abrazar a alguien' },
    besar:      { emoji: '💋', nekos: 'kiss',      mensaje: 'besó a',                      msgSolo: 'lanzó un beso al aire 💋' },
    kiss:       { emoji: '💋', nekos: 'kiss',      mensaje: 'besó a',                      msgSolo: 'lanzó un beso al aire 💋' },
    muak:       { emoji: '💋', nekos: 'kiss',      mensaje: 'besó a',                      msgSolo: 'lanzó un beso al aire 💋' },
    kisscheek:  { emoji: '😘', nekos: 'kiss',      mensaje: 'le dio un beso en la mejilla a', msgSolo: 'lanzó un beso al aire 😘' },
    beso:       { emoji: '😘', nekos: 'kiss',      mensaje: 'le dio un beso en la mejilla a', msgSolo: 'lanzó un beso al aire 😘' },
    golpear:    { emoji: '👋', nekos: 'slap',      mensaje: 'golpeó a',                    msgSolo: 'golpeó al aire 👋' },
    slap:       { emoji: '👋', nekos: 'slap',      mensaje: 'golpeó a',                    msgSolo: 'golpeó al aire 👋' },
    acariciar:  { emoji: '🥰', nekos: 'pat',       mensaje: 'acarició a',                  msgSolo: 'acarició al aire 🥰' },
    pat:        { emoji: '🥰', nekos: 'pat',       mensaje: 'acarició a',                  msgSolo: 'acarició al aire 🥰' },
    bailar:     { emoji: '💃', nekos: 'dance',     mensaje: 'bailó con',                   msgSolo: 'bailó solo/a 💃' },
    dance:      { emoji: '💃', nekos: 'dance',     mensaje: 'bailó con',                   msgSolo: 'bailó solo/a 💃' },
    llorar:     { emoji: '😢', nekos: 'cry',       mensaje: 'llora',                       msgSolo: 'llora 😢' },
    cry:        { emoji: '😢', nekos: 'cry',       mensaje: 'llora',                       msgSolo: 'llora 😢' },
    morder:     { emoji: '😬', nekos: 'bite',      mensaje: 'mordió a',                    msgSolo: 'mordió al aire 😬' },
    bite:       { emoji: '😬', nekos: 'bite',      mensaje: 'mordió a',                    msgSolo: 'mordió al aire 😬' },
    sonrojar:   { emoji: '😳', nekos: 'blush',     mensaje: 'se sonrojó',                  msgSolo: 'se sonrojó 😳' },
    blush:      { emoji: '😳', nekos: 'blush',     mensaje: 'se sonrojó',                  msgSolo: 'se sonrojó 😳' },
    acurrucar:  { emoji: '🫂', nekos: 'cuddle',    mensaje: 'se acurrucó con',             msgSolo: 'se acurrucó solo/a 🫂' },
    cuddle:     { emoji: '🫂', nekos: 'cuddle',    mensaje: 'se acurrucó con',             msgSolo: 'se acurrucó solo/a 🫂' },
    picar:      { emoji: '👉', nekos: 'poke',      mensaje: 'picó a',                      msgSolo: 'picó al aire 👉' },
    poke:       { emoji: '👉', nekos: 'poke',      mensaje: 'picó a',                      msgSolo: 'picó al aire 👉' },
    punetazo:   { emoji: '👊', nekos: 'punch',     mensaje: 'le dio un puñetazo a',        msgSolo: 'lanzó un puñetazo al aire 👊' },
    punch:      { emoji: '👊', nekos: 'punch',     mensaje: 'le dio un puñetazo a',        msgSolo: 'lanzó un puñetazo al aire 👊' },
    reir:       { emoji: '😂', nekos: 'laugh',     mensaje: 'se ríe',                      msgSolo: 'se ríe solo/a 😂' },
    laugh:      { emoji: '😂', nekos: 'laugh',     mensaje: 'se ríe',                      msgSolo: 'se ríe solo/a 😂' },
    correr:     { emoji: '🏃', nekos: 'run',       mensaje: 'corrió',                      msgSolo: 'corrió solo/a 🏃' },
    run:        { emoji: '🏃', nekos: 'run',       mensaje: 'corrió',                      msgSolo: 'corrió solo/a 🏃' },
    triste:     { emoji: '😔', nekos: 'sad',       mensaje: 'está triste',                 msgSolo: 'está triste 😔' },
    sad:        { emoji: '😔', nekos: 'sad',       mensaje: 'está triste',                 msgSolo: 'está triste 😔' },
    enojado:    { emoji: '😠', nekos: 'baka',      mensaje: 'está enojado/a',              msgSolo: 'está enojado/a 😠' },
    angry:      { emoji: '😠', nekos: 'baka',      mensaje: 'está enojado/a',              msgSolo: 'está enojado/a 😠' },
    saludar:    { emoji: '👋', nekos: 'wave',      mensaje: 'saludó a',                    msgSolo: 'saludó a todos 👋' },
    wave:       { emoji: '👋', nekos: 'wave',      mensaje: 'saludó a',                    msgSolo: 'saludó a todos 👋' },
    greet:      { emoji: '👋', nekos: 'wave',      mensaje: 'saludó a',                    msgSolo: 'saludó a todos 👋' },
    hi:         { emoji: '👋', nekos: 'wave',      mensaje: 'saludó a',                    msgSolo: 'saludó a todos 👋' },
    aburrido:   { emoji: '😴', nekos: 'bored',     mensaje: 'está aburrido/a',             msgSolo: 'está aburrido/a 😴' },
    bored:      { emoji: '😴', nekos: 'bored',     mensaje: 'está aburrido/a',             msgSolo: 'está aburrido/a 😴' },
    bofetada:   { emoji: '🤦', nekos: 'facepalm',  mensaje: 'se hace un facepalm',         msgSolo: 'se hace un facepalm 🤦' },
    facepalm:   { emoji: '🤦', nekos: 'facepalm',  mensaje: 'se hace un facepalm',         msgSolo: 'se hace un facepalm 🤦' },
    feliz:      { emoji: '😄', nekos: 'happy',     mensaje: 'está muy feliz',              msgSolo: 'está muy feliz 😄' },
    happy:      { emoji: '😄', nekos: 'happy',     mensaje: 'está muy feliz',              msgSolo: 'está muy feliz 😄' },
    pensar:     { emoji: '🤔', nekos: 'think',     mensaje: 'está pensando',               msgSolo: 'está pensando 🤔' },
    think:      { emoji: '🤔', nekos: 'think',     mensaje: 'está pensando',               msgSolo: 'está pensando 🤔' },
    dormir:     { emoji: '😴', nekos: 'sleep',     mensaje: 'se quedó dormido/a',          msgSolo: 'se quedó dormido/a 😴' },
    sleep:      { emoji: '😴', nekos: 'sleep',     mensaje: 'se quedó dormido/a',          msgSolo: 'se quedó dormido/a 😴' },
    guinar:     { emoji: '😉', nekos: 'wink',      mensaje: 'le guiñó el ojo a',           msgSolo: 'guiñó el ojo 😉' },
    wink:       { emoji: '😉', nekos: 'wink',      mensaje: 'le guiñó el ojo a',           msgSolo: 'guiñó el ojo 😉' },
    lamer:      { emoji: '👅', nekos: 'nom',       mensaje: 'lamió a',                     msgSolo: 'lamió el aire 👅' },
    lick:       { emoji: '👅', nekos: 'nom',       mensaje: 'lamió a',                     msgSolo: 'lamió el aire 👅' },
    cosquillas: { emoji: '🤣', nekos: 'tickle',    mensaje: 'le hizo cosquillas a',        msgSolo: 'hizo cosquillas al aire 🤣' },
    tickle:     { emoji: '🤣', nekos: 'tickle',    mensaje: 'le hizo cosquillas a',        msgSolo: 'hizo cosquillas al aire 🤣' },
    comer:      { emoji: '🍜', nekos: 'nom',       mensaje: 'comió con',                   msgSolo: 'comió solo/a 🍜' },
    eat:        { emoji: '🍜', nekos: 'nom',       mensaje: 'comió con',                   msgSolo: 'comió solo/a 🍜' },
    matar:      { emoji: '⚔️', nekos: 'shoot',     mensaje: 'eliminó a',                   msgSolo: 'buscó a quién eliminar ⚔️' },
    kill:       { emoji: '⚔️', nekos: 'shoot',     mensaje: 'eliminó a',                   msgSolo: 'buscó a quién eliminar ⚔️' },
    seducir:    { emoji: '😏', nekos: 'smug',      mensaje: 'sedujo a',                    msgSolo: 'está siendo seductor/a 😏' },
    seduce:     { emoji: '😏', nekos: 'smug',      mensaje: 'sedujo a',                    msgSolo: 'está siendo seductor/a 😏' },
    patear:     { emoji: '🦵', nekos: 'kick',      mensaje: 'pateó a',                     msgSolo: 'pateó al aire 🦵' },
    kick:       { emoji: '🦵', nekos: 'kick',      mensaje: 'pateó a',                     msgSolo: 'pateó al aire 🦵' },
    tomar:      { emoji: '🤝', nekos: 'handhold',  mensaje: 'tomó de la mano a',           msgSolo: 'busca de quién agarrarse 🤝' },
    handhold:   { emoji: '🤝', nekos: 'handhold',  mensaje: 'tomó de la mano a',           msgSolo: 'busca de quién agarrarse 🤝' },
    bath:       { emoji: '🛁', nekos: 'hug',       mensaje: 'se está bañando con',         msgSolo: 'se está bañando 🛁' },
    bleh:       { emoji: '😛', nekos: 'smug',      mensaje: 'le sacó la lengua a',         msgSolo: 'sacó la lengua 😛' },
    call:       { emoji: '📞', nekos: 'wave',      mensaje: 'le está llamando a',          msgSolo: 'está llamando a alguien 📞' },
    clap:       { emoji: '👏', nekos: 'handshake', mensaje: 'aplaudió',                    msgSolo: 'aplaudió 👏' },
    aplaudir:   { emoji: '👏', nekos: 'handshake', mensaje: 'aplaudió',                    msgSolo: 'aplaudió 👏' },
    coffee:     { emoji: '☕', nekos: 'nom',       mensaje: 'tomó café con',               msgSolo: 'tomó café solo/a ☕' },
    cafe:       { emoji: '☕', nekos: 'nom',       mensaje: 'tomó café con',               msgSolo: 'tomó café solo/a ☕' },
    cold:       { emoji: '🥶', nekos: 'shrug',     mensaje: 'tiene mucho frío',            msgSolo: 'tiene mucho frío 🥶' },
    cook:       { emoji: '🍳', nekos: 'nom',       mensaje: 'cocinó algo para',            msgSolo: 'cocinó algo 🍳' },
    dramatic:   { emoji: '🎭', nekos: 'cry',       mensaje: 'está siendo dramático/a con', msgSolo: 'está siendo dramático/a 🎭' },
    drama:      { emoji: '🎭', nekos: 'cry',       mensaje: 'está siendo dramático/a con', msgSolo: 'está siendo dramático/a 🎭' },
    draw:       { emoji: '🎨', nekos: 'smug',      mensaje: 'dibujó algo para',            msgSolo: 'dibujó algo 🎨' },
    drunk:      { emoji: '🍺', nekos: 'bored',     mensaje: 'está borracho/a con',         msgSolo: 'está borracho/a 🍺' },
    gaming:     { emoji: '🎮', nekos: 'smug',      mensaje: 'está jugando videojuegos con', msgSolo: 'está jugando videojuegos 🎮' },
    heat:       { emoji: '🥵', nekos: 'shrug',     mensaje: 'tiene mucho calor',           msgSolo: 'tiene mucho calor 🥵' },
    jump:       { emoji: '⬆️', nekos: 'yeet',     mensaje: 'saltó',                       msgSolo: 'saltó ⬆️' },
    lewd:       { emoji: '😈', nekos: 'smug',      mensaje: 'está siendo lascivo/a con',   msgSolo: 'está siendo lascivo/a 😈' },
    love:       { emoji: '❤️', nekos: 'hug',       mensaje: 'está enamorado/a de',         msgSolo: 'está enamorado/a ❤️' },
    amor:       { emoji: '❤️', nekos: 'hug',       mensaje: 'está enamorado/a de',         msgSolo: 'está enamorado/a ❤️' },
    nope:       { emoji: '🙅', nekos: 'shrug',     mensaje: 'se negó',                     msgSolo: 'se negó 🙅' },
    pout:       { emoji: '😤', nekos: 'baka',      mensaje: 'está haciendo pucheros',      msgSolo: 'está haciendo pucheros 😤' },
    psycho:     { emoji: '🔪', nekos: 'shoot',     mensaje: 'se puso psicópata con',       msgSolo: 'se puso psicópata 🔪' },
    push:       { emoji: '💨', nekos: 'kick',      mensaje: 'empujó a',                    msgSolo: 'empujó al aire 💨' },
    scared:     { emoji: '😱', nekos: 'cry',       mensaje: 'tiene miedo de',              msgSolo: 'tiene miedo 😱' },
    scream:     { emoji: '😱', nekos: 'baka',      mensaje: 'le gritó a',                  msgSolo: 'gritó al vacío 😱' },
    shy:        { emoji: '🙈', nekos: 'blush',     mensaje: 'está tímido/a con',           msgSolo: 'está tímido/a 🙈' },
    timido:     { emoji: '🙈', nekos: 'blush',     mensaje: 'está tímido/a con',           msgSolo: 'está tímido/a 🙈' },
    sing:       { emoji: '🎤', nekos: 'dance',     mensaje: 'cantó para',                  msgSolo: 'cantó solo/a 🎤' },
    smoke:      { emoji: '🚬', nekos: 'smug',      mensaje: 'está fumando con',            msgSolo: 'está fumando 🚬' },
    spit:       { emoji: '💦', nekos: 'baka',      mensaje: 'le escupió a',                msgSolo: 'escupió al aire 💦' },
    escupir:    { emoji: '💦', nekos: 'baka',      mensaje: 'le escupió a',                msgSolo: 'escupió al aire 💦' },
    step:       { emoji: '👟', nekos: 'kick',      mensaje: 'pisó a',                      msgSolo: 'pisó al aire 👟' },
    pisar:      { emoji: '👟', nekos: 'kick',      mensaje: 'pisó a',                      msgSolo: 'pisó al aire 👟' },
    walk:       { emoji: '🚶', nekos: 'run',       mensaje: 'está caminando con',          msgSolo: 'está caminando solo/a 🚶' },
    caminar:    { emoji: '🚶', nekos: 'run',       mensaje: 'está caminando con',          msgSolo: 'está caminando solo/a 🚶' },
};

// ══════════════════════════════════════════
//  NSFW - IMÁGENES
// ══════════════════════════════════════════
const NSFW_CMDS = {
    neko:      'neko',
    hentai:    'hentai',
    ass:       'ass',
    poto:      'ass',
    pussy:     'pussy',
    blowjob:   'blowjob',
    mamada:    'blowjob',
    bj:        'blowjob',
    boobs:     'paizuri',
    tetas:     'paizuri',
    cum:       'cum',
    cumshot:   'cum',
    cummouth:  'oral',
    anal:      'anal',
    hentaigif: 'hentai',
    yuri:      'yuri',
    tijeras:   'yuri',
    loli:      'loli',
    nekomimi:  'neko',
    milf:      'milf',
    ecchi:     'ecchi',
    ero:       'ero',
    creampie:  'creampie',
    trap:      'trap',
    femdom:    'femdom',
};

// Tags específicos para cada tipo NSFW (Gelbooru/Danbooru)
const NSFW_TAGS = {
    ass:      '1girl+ass+rating:explicit',
    pussy:    '1girl+pussy+rating:explicit',
    neko:     'cat_ears+cat_tail+nude+rating:explicit',
    hentai:   '1girl+nude+rating:explicit',
    loli:     '1girl+flat_chest+rating:explicit',
    blowjob:  '1girl+fellatio+rating:explicit',
    boobs:    '1girl+large_breasts+rating:explicit',
    paizuri:  '1girl+paizuri+rating:explicit',
    cum:      '1girl+cum+rating:explicit',
    anal:     '1girl+anal+rating:explicit',
    yuri:     '2girls+yuri+rating:explicit',
    milf:     '1girl+milf+rating:explicit',
    ecchi:    '1girl+ecchi+rating:sensitive',
    ero:      '1girl+underwear+rating:sensitive',
    creampie: '1girl+creampie+rating:explicit',
    trap:     'trap+rating:explicit',
    femdom:   'femdom+rating:explicit',
};

function encodeBooruTags(tags) {
    return encodeURIComponent(String(tags || '').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim());
}

// ══════════════════════════════════════════
//  NSFW - ACCIONES (texto)
// ══════════════════════════════════════════
const NSFW_ACCIONES = {
    fuck:       { emoji: '🔥', texto: 'se cogió a' },
    coger:      { emoji: '🔥', texto: 'se cogió a' },
    spank:      { emoji: '🍑', texto: 'le dio una nalgada a' },
    nalgada:    { emoji: '🍑', texto: 'le dio una nalgada a' },
    handjob:    { emoji: '💦', texto: 'le hizo una paja a' },
    paja:       { emoji: '💦', texto: 'se hizo una paja pensando en' },
    fap:        { emoji: '💦', texto: 'se hizo una paja pensando en' },
    sixnine:    { emoji: '🔥', texto: 'hizo un 69 con' },
    '69':       { emoji: '🔥', texto: 'hizo un 69 con' },
    undress:    { emoji: '👗', texto: 'desnudó a' },
    encuerar:   { emoji: '👗', texto: 'desnudó a' },
    grope:      { emoji: '🙈', texto: 'manoseó a' },
    suckboobs:  { emoji: '🍈', texto: 'le chupó las tetas a' },
    lickass:    { emoji: '🍑', texto: 'le lamió el culo a' },
    lickpussy:  { emoji: '💦', texto: 'le lamió el coño a' },
    lickdick:   { emoji: '💦', texto: 'le lamió el pene a' },
    footjob:    { emoji: '🦶', texto: 'le hizo una paja con los pies a' },
    boobjob:    { emoji: '🍈', texto: 'le hizo una rusa a' },
    impregnate: { emoji: '🍼', texto: 'preñó a' },
    preg:       { emoji: '🍼', texto: 'preñó a' },
    grabboobs:  { emoji: '🍈', texto: 'le agarró las tetas a' },
    cum2:       { emoji: '💦', texto: 'se vino encima de' },
};

// ══════════════════════════════════════════
//  OBTENER GIF DE NEKOS.BEST + DESCARGAR BUFFER
// ══════════════════════════════════════════
const NEKOS_BEST_VALIDOS = new Set([
    'hug', 'kiss', 'slap', 'pat', 'dance', 'cry', 'bite', 'blush', 'cuddle',
    'poke', 'punch', 'laugh', 'run', 'wave', 'bored', 'facepalm', 'happy',
    'think', 'sleep', 'wink', 'tickle', 'nom', 'shoot', 'smug', 'kick',
    'handhold', 'baka', 'handshake', 'highfive', 'yeet', 'feed', 'nod',
    'thumbsup', 'stare', 'shrug', 'sad'
]);

async function obtenerGifBuffer(endpointNekos) {
    const endpoint = NEKOS_BEST_VALIDOS.has(endpointNekos) ? endpointNekos : 'hug';
    let gifUrl = null;

    try {
        const res = await axios.get(`https://nekos.best/api/v2/${endpoint}`, { timeout: 10000 });
        if (res.data?.results?.[0]?.url) gifUrl = res.data.results[0].url;
    } catch (err) { logRequestError('nekos.best sfw', err); }

    if (!gifUrl) {
        try {
            const res = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${endpoint}`, { timeout: 10000 });
            if (res.data?.url) gifUrl = res.data.url;
        } catch (err) { logRequestError('otakugifs sfw', err); }
    }

    if (!gifUrl) {
        try {
            const res = await axios.get(`https://nekos.life/api/v2/img/${endpoint}`, { timeout: 10000 });
            if (res.data?.url) gifUrl = res.data.url;
        } catch (err) { logRequestError('nekos.life sfw', err); }
    }

    if (!gifUrl) throw new Error('No se pudo obtener GIF');

    const bufRes = await axios.get(gifUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: HUMAN_HEADERS
    });

    const isVideo = gifUrl.endsWith('.mp4') || bufRes.headers['content-type']?.includes('video');
    return { buffer: Buffer.from(bufRes.data), isVideo };
}

// ══════════════════════════════════════════
//  INTERACCIÓN SFW ANIME
// ══════════════════════════════════════════
async function cmdInteraccion(sock, jid, senderJid, accion, mencionados, pushName) {
    const config = SFW_ACCIONES[accion];
    if (!config) return;

    const senderNombre = pushName || senderJid.split('@')[0];

    let texto;
    if (mencionados && mencionados.length > 0) {
        const destinoNum = mencionados[0].split('@')[0];
        texto = `${config.emoji} *${senderNombre}* ${config.mensaje} *@${destinoNum}*`;
    } else {
        // Usar el mensaje sin destinatario (msgSolo)
        texto = `${config.emoji} *${senderNombre}* ${config.msgSolo || config.mensaje}`;
    }

    try {
        const { buffer, isVideo } = await obtenerGifBuffer(config.nekos);

        if (isVideo) {
            await sock.sendMessage(jid, {
                video: buffer,
                caption: texto,
                gifPlayback: true,
                mentions: mencionados || []
            });
        } else {
            await sock.sendMessage(jid, {
                image: buffer,
                caption: texto,
                mentions: mencionados || []
            });
        }
    } catch (err) {
        logRequestError('cmdInteraccion', err);
        await sock.sendMessage(jid, {
            text: texto,
            mentions: mencionados || []
        });
    }
}

// ══════════════════════════════════════════
//  NSFW IMAGEN - MEJORADO
//  Usa Rule34/Gelbooru con tags específicos
//  + fallback a waifu.pics
// ══════════════════════════════════════════

// Buscar GIF animado en Rule34 con tags específicos
async function buscarGifNsfwRule34(tagsSencillos) {
    try {
        const pid = Math.floor(Math.random() * 5);
        const tagsGif = encodeURIComponent(tagsSencillos + '+animated');
        const res = await axios.get(
            `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsSencillos + '+animated')}&pid=${pid}`,
            { timeout: 20000, headers: HUMAN_HEADERS }
        );
        const posts = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.post) ? res.data.post : []);
        const gifs = posts.filter(p => p.file_url && /\.(gif|mp4|webm)$/i.test(p.file_url));
        if (gifs.length) return gifs[Math.floor(Math.random() * gifs.length)].file_url;
    } catch (err) { logRequestError('buscarGifNsfwRule34', err); }
    return null;
}

async function buscarImagenNsfw(tipo, prefGif = false) {
    const tags = NSFW_TAGS[tipo];
    const tagsSencillos = tags
        ? tags.split('+').filter(t => !t.startsWith('rating:')).slice(0, 2).join('+')
        : tipo;

    // 1. Si se prefieren GIFs, buscar animado en Rule34 primero
    if (prefGif) {
        const gifUrl = await buscarGifNsfwRule34(tagsSencillos);
        if (gifUrl) return gifUrl;
    }

    // 2. Rule34 — fuente principal para contenido explícito
    try {
        const pid = Math.floor(Math.random() * 5);
        const res = await axios.get(
            `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsSencillos)}&pid=${pid}`,
            { timeout: 20000, headers: HUMAN_HEADERS }
        );
        const posts = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.post) ? res.data.post : []);
        const imgs = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file_url));
        if (imgs.length) return imgs[Math.floor(Math.random() * imgs.length)].file_url;
    } catch (err) { logRequestError('nsfw rule34 api', err); }

    // 3. Gelbooru con tags específicos
    if (tags) {
        try {
            const pid = Math.floor(Math.random() * 5);
            const res = await axios.get(
                `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tags)}&pid=${pid}`,
                { timeout: 20000, headers: HUMAN_HEADERS }
            );
            const posts = parsearPostsGelbooru(res.data);
            const imgs = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file_url));
            if (imgs.length) return imgs[Math.floor(Math.random() * imgs.length)].file_url;
        } catch (err) { logRequestError('nsfw gelbooru', err); }
    }

    // 4. Rule34 alternativo (endpoint principal sin api.)
    try {
        const pid = Math.floor(Math.random() * 5);
        const res = await axios.get(
            `https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsSencillos)}&pid=${pid}`,
            { timeout: 20000, headers: HUMAN_HEADERS }
        );
        const posts = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.post) ? res.data.post : []);
        const imgs = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file_url));
        if (imgs.length) return imgs[Math.floor(Math.random() * imgs.length)].file_url;
    } catch (err) { logRequestError('nsfw rule34 alt', err); }

    // 5. waifu.pics como fallback final
    const waifuPicsEndpoint = NSFW_CMDS[tipo] || 'hentai';
    const waifuPicsMap = {
        neko: 'neko',
        hentai: 'waifu',
        ass: 'waifu',
        pussy: 'waifu',
        blowjob: 'blowjob',
        paizuri: 'waifu',
        cum: 'waifu',
        anal: 'waifu',
        yuri: 'waifu',
        loli: 'waifu',
        milf: 'waifu',
        ecchi: 'waifu',
        ero: 'waifu',
        creampie: 'waifu',
        trap: 'trap',
        femdom: 'waifu'
    };
    const ep = waifuPicsMap[waifuPicsEndpoint] || 'waifu';
    try {
        const res = await axios.get(`https://api.waifu.pics/nsfw/${ep}`, { timeout: 12000 });
        if (res.data?.url) return res.data.url;
    } catch (err) { logRequestError('nsfw waifu.pics', err); }

    // 6. Último fallback
    try {
        const res = await axios.get('https://api.waifu.pics/nsfw/hentai', { timeout: 10000 });
        if (res.data?.url) return res.data.url;
    } catch (err) { logRequestError('nsfw waifu.pics fallback', err); }

    return null;
}

async function cmdNsfw(sock, jid, tipo) {
    const endpoint = NSFW_CMDS[tipo];
    if (!endpoint) return;

    try {
        const mediaUrl = await buscarImagenNsfw(endpoint, false);
        if (!mediaUrl) {
            await sock.sendMessage(jid, { text: '❌ No pude cargar la imagen. Intenta de nuevo.' });
            return;
        }

        const esVideo = /\.(mp4|webm)$/i.test(mediaUrl);
        if (esVideo) {
            await sock.sendMessage(jid, {
                video: { url: mediaUrl },
                caption: `🔞 *${tipo.toUpperCase()}*`,
                gifPlayback: true
            });
        } else {
            await sock.sendMessage(jid, {
                image: { url: mediaUrl },
                caption: `🔞 *${tipo.toUpperCase()}*`
            });
        }
    } catch (err) {
        logRequestError('cmdNsfw', err);
        await sock.sendMessage(jid, { text: `❌ Error NSFW: ${err.response?.status || err.message}` });
    }
}

// ══════════════════════════════════════════
//  NSFW ACCIÓN + GIF
// ══════════════════════════════════════════
const NSFW_ACCION_GIF = {
    fuck: 'hentai', coger: 'hentai',
    spank: 'ass', nalgada: 'ass',
    handjob: 'hentai', paja: 'hentai', fap: 'hentai',
    sixnine: 'hentai', '69': 'hentai',
    undress: 'ecchi', encuerar: 'ecchi',
    grope: 'ecchi',
    suckboobs: 'paizuri', boobjob: 'paizuri', grabboobs: 'paizuri',
    lickass: 'ass',
    lickpussy: 'hentai', lickdick: 'blowjob',
    footjob: 'hentai',
    impregnate: 'hentai', preg: 'hentai',
    cum2: 'cum',
};

async function cmdNsfwAccion(sock, jid, senderJid, accion, mencionados, pushName) {
    const config = NSFW_ACCIONES[accion];
    if (!config) return;
    const senderNombre = pushName || senderJid.split('@')[0];
    let texto;
    if (mencionados && mencionados.length > 0) {
        const destinoNum = mencionados[0].split('@')[0];
        texto = `${config.emoji} *${senderNombre}* ${config.texto} *@${destinoNum}* 🔞`;
    } else {
        texto = `${config.emoji} *${senderNombre}* ${config.texto} *todos* 🔞`;
    }
    const gifTipo = NSFW_ACCION_GIF[accion];
    if (gifTipo) {
        try {
            const mediaUrl = await buscarImagenNsfw(gifTipo, true); // prefGif = true para GIFs animados
            if (mediaUrl) {
                const esVideo = /\.(mp4|webm)$/i.test(mediaUrl);
                const esGif = /\.gif$/i.test(mediaUrl);
                if (esVideo) {
                    await sock.sendMessage(jid, {
                        video: { url: mediaUrl },
                        caption: texto,
                        gifPlayback: true,
                        mentions: mencionados || []
                    });
                } else if (esGif) {
                    await sock.sendMessage(jid, {
                        image: { url: mediaUrl },
                        caption: texto,
                        mentions: mencionados || []
                    });
                } else {
                    await sock.sendMessage(jid, {
                        image: { url: mediaUrl },
                        caption: texto,
                        mentions: mencionados || []
                    });
                }
                return;
            }
        } catch (err) { logRequestError('cmdNsfwAccion', err); }
    }
    await sock.sendMessage(jid, { text: texto, mentions: mencionados || [] });
}

// ══════════════════════════════════════════
//  WAIFU
// ══════════════════════════════════════════
async function buscarWaifuImagen(tag) {
    let imgUrl = null;

    // 1. Safebooru (siempre SFW, gran base de datos)
    if (!imgUrl) {
        try {
            const pid = Math.floor(Math.random() * 8);
            const res = await axios.get(
                `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tag)}&pid=${pid}`,
                { timeout: 15000, headers: HUMAN_HEADERS }
            );
            const posts = Array.isArray(res.data) ? res.data.filter(p => p.file_url || p.image) : [];
            if (posts.length) {
                const p = posts[Math.floor(Math.random() * posts.length)];
                imgUrl = p.file_url || `https://safebooru.org//images/${p.directory}/${p.image}`;
            }
        } catch (err) { logRequestError('waifu safebooru', err); }
    }

    // 2. Gelbooru rating:general como fallback
    if (!imgUrl) {
        try {
            const pid = Math.floor(Math.random() * 5);
            const res = await axios.get(
                `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tag + '+rating:general')}&pid=${pid}`,
                { timeout: 15000, headers: HUMAN_HEADERS }
            );
            const posts = parsearPostsGelbooru(res.data);
            if (posts.length) {
                const p = posts[Math.floor(Math.random() * posts.length)];
                imgUrl = p.file_url || p.sample_url;
            }
        } catch (err) { logRequestError('waifu gelbooru', err); }
    }

    // 3. Danbooru rating:general como segundo fallback
    if (!imgUrl) {
        try {
            const tagLimpio = tag.split('+')[0];
            const pid = Math.floor(Math.random() * 5) + 1;
            const res = await axios.get(
                `https://danbooru.donmai.us/posts.json?tags=${encodeBooruTags(tagLimpio + '+rating:g')}&limit=50&page=${pid}`,
                { timeout: 15000, headers: HUMAN_HEADERS }
            );
            const posts = (res.data || []).filter(p => p.file_url && /\.(jpg|jpeg|png|webp)$/i.test(p.file_url));
            if (posts.length) {
                imgUrl = posts[Math.floor(Math.random() * posts.length)].file_url;
            }
        } catch (err) { logRequestError('waifu danbooru', err); }
    }

    return imgUrl;
}

async function cmdWaifu(sock, jid, args) {
    try {
        const nombre = args.join(' ').trim();
        const waifu = nombre ? encontrarWaifu(nombre) : null;

        if (!nombre) {
            let imgUrl = null;
            try {
                const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 10000 });
                imgUrl = res.data?.url;
            } catch (err) { logRequestError('waifu.pics sfw', err); }
            if (!imgUrl) {
                try {
                    const res = await axios.get('https://nekos.best/api/v2/waifu', { timeout: 10000 });
                    imgUrl = res.data?.results?.[0]?.url;
                } catch (err) { logRequestError('nekos.best waifu', err); }
            }
            if (imgUrl) {
                await sock.sendMessage(jid, {
                    image: { url: imgUrl },
                    caption: `💖 *Waifu random*\n\n_Usa *#waifu [nombre]* para buscar un personaje específico_\nEjemplo: #waifu rem, #waifu nezuko, #waifu miku`
                });
            } else {
                await sock.sendMessage(jid, { text: '❌ No pude obtener una waifu random. Intenta de nuevo.' });
            }
            return;
        }

        // Búsqueda específica
        const tag = waifu ? waifu.tag : nombre.toLowerCase().replace(/\s+/g, '_');
        const displayName = nombre.charAt(0).toUpperCase() + nombre.slice(1);
        const encontrada = waifu ? (waifu.key.charAt(0).toUpperCase() + waifu.key.slice(1)) : displayName;

        let imgUrl = await buscarWaifuImagen(tag);

        // Si encontró waifu en DB pero sin imagen, intenta sin modificar el nombre
        if (!imgUrl && waifu && tag !== nombre.toLowerCase().replace(/\s+/g, '_')) {
            imgUrl = await buscarWaifuImagen(nombre.toLowerCase().replace(/\s+/g, '_'));
        }

        if (imgUrl) {
            const caption = waifu && waifu.key !== nombre.toLowerCase()
                ? `💖 *${encontrada}*\n_¡Aquí está tu waifu!_`
                : `💖 *${displayName}*\n_¡Aquí está tu waifu!_`;
            await sock.sendMessage(jid, { image: { url: imgUrl }, caption });
            return;
        }

        // Fallback: waifu.pics random si no se encontró imagen específica
        let fallbackUrl = null;
        try {
            const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 10000 });
            fallbackUrl = res.data?.url;
        } catch (err) { logRequestError('waifu fallback', err); }
        if (fallbackUrl) {
            await sock.sendMessage(jid, {
                image: { url: fallbackUrl },
                caption: `🔍 No encontré imagen exacta de *${displayName}*\n💭 Mostrando una waifu aleatoria como alternativa`
            });
        } else {
            await sock.sendMessage(jid, { text: `❌ No encontré imágenes de *${displayName}*. Prueba con: #waifu rem, #waifu miku, #waifu nezuko` });
        }
    } catch (err) {
        logRequestError('cmdWaifu', err);
        await sock.sendMessage(jid, { text: '❌ Error buscando waifu. Intenta de nuevo.' });
    }
}

// ══════════════════════════════════════════
//  BÚSQUEDA EN IMAGEBOARDS NSFW
// ══════════════════════════════════════════

// Helper para normalizar los posts de Gelbooru (varias versiones de API)
function parsearPostsGelbooru(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.post)) return data.post;
    if (data['@attributes'] && Array.isArray(data.post)) return data.post;
    return [];
}

async function buscarGelbooru(tags, soloVideo = false) {
    const tagsLimpios = tags.replace(/\s+/g, '_');
    const pid = Math.floor(Math.random() * 5);
    const ratingTag = tagsLimpios.includes('rating:') ? '' : '+rating:explicit';
    const tagsFinal = tagsLimpios + ratingTag;

    const res = await axios.get(
        `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsFinal)}&pid=${pid}`,
        { timeout: 20000, headers: HUMAN_HEADERS }
    );
    let posts = parsearPostsGelbooru(res.data);
    if (!posts.length) throw new Error('Sin resultados en Gelbooru');
    if (soloVideo) {
        posts = posts.filter(p => (p.file_url || '').match(/\.(mp4|webm)$/i));
        if (!posts.length) throw new Error('Sin videos en Gelbooru');
    } else {
        posts = posts.filter(p => p.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file_url));
        if (!posts.length) throw new Error('Sin imágenes en Gelbooru');
    }
    const elegido = posts[Math.floor(Math.random() * posts.length)];
    return elegido.file_url || elegido.sample_url;
}

async function buscarDanbooru(tags, rating = 'e') {
    const tagsLimpios = tags.replace(/\s+/g, '_');
    // Danbooru sin auth solo devuelve contenido general/sensitive
    // Intentamos con rating:s (sensitive) ya que rating:e requiere cuenta
    const pid = Math.floor(Math.random() * 5) + 1;
    const res = await axios.get(
        `https://danbooru.donmai.us/posts.json?tags=${encodeBooruTags(tagsLimpios + '+rating:s')}&limit=50&page=${pid}`,
        { timeout: 20000, headers: HUMAN_HEADERS }
    );
    const posts = (res.data || []).filter(p => p.file_url && /\.(jpg|png|webp|gif|mp4)$/i.test(p.file_url));
    if (!posts.length) throw new Error('Sin resultados en Danbooru');
    return posts[Math.floor(Math.random() * posts.length)].file_url;
}

async function buscarRule34Paheal(tags, soloVideo = false) {
    if (soloVideo) throw new Error('Paheal no devuelve videos desde su API pública');
    const tagsLimpios = String(tags || '').replace(/\+/g, ' ').replace(/rating:\w+/g, '').trim();
    const res = await axios.get(
        `https://rule34.paheal.net/api/danbooru/find_posts?tags=${encodeBooruTags(tagsLimpios)}&limit=50`,
        { timeout: 20000, headers: HUMAN_HEADERS }
    );
    const xml = String(res.data || '');
    const posts = [...xml.matchAll(/<tag\b[^>]*>/gi)]
        .map(m => ({
            url: m[0].match(/\bfile_url=['"]([^'"]+)['"]/)?.[1],
            name: m[0].match(/\bfile_name=['"]([^'"]+)['"]/)?.[1]
        }))
        .filter(p => /\.(jpg|jpeg|png|webp|gif)$/i.test(p.name));
    if (!posts.length) throw new Error('Sin resultados en Rule34 Paheal');
    return posts[Math.floor(Math.random() * posts.length)].url;
}

// Búsqueda en tbib.org (Tropical Booru) — comparte estructura con Gelbooru/Rule34
async function buscarTbib(tags, soloVideo = false) {
    const tagsLimpios = tags.replace(/\s+/g, '_');
    const pid = Math.floor(Math.random() * 25);
    try {
        const res = await axios.get(
            `https://tbib.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsLimpios)}&pid=${pid}`,
            { timeout: 20000, headers: HUMAN_HEADERS }
        );
        let posts = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.post) ? res.data.post : []);
        posts = posts
            .map(p => {
                if (p.file_url) return p;
                if (p.directory && p.image) {
                    return { ...p, file_url: `https://tbib.org/images/${p.directory}/${p.image}` };
                }
                return null;
            })
            .filter(Boolean);
        if (!posts.length) throw new Error('tbib sin resultados');
        const filtroVideo = soloVideo
            ? posts.filter(p => /\.(mp4|webm|m3u8)$/i.test(p.file_url))
            : posts.filter(p => /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file_url));
        if (!filtroVideo.length) throw new Error('tbib sin formato pedido');
        const e = filtroVideo[Math.floor(Math.random() * filtroVideo.length)];
        return e.file_url;
    } catch (err) {
        throw new Error(`tbib: ${err.message}`);
    }
}

// ── LRU en memoria para evitar repetir las mismas URLs entre llamadas ─────
const NSFW_LRU = new Map(); // key: tag+modo → array de URLs recientes
const NSFW_LRU_MAX = 80;
function _lruKey(tags, modo) { return `${modo}::${tags}`; }
function _lruRecord(tags, modo, url) {
    if (!url) return;
    const k = _lruKey(tags, modo);
    const arr = NSFW_LRU.get(k) || [];
    arr.push(url);
    if (arr.length > NSFW_LRU_MAX) arr.splice(0, arr.length - NSFW_LRU_MAX);
    NSFW_LRU.set(k, arr);
}
function _lruFiltrar(tags, modo, posts) {
    const k = _lruKey(tags, modo);
    const set = new Set(NSFW_LRU.get(k) || []);
    if (!set.size) return posts;
    const fresh = posts.filter(p => !set.has(p.file_url || p.sample_url));
    // Si quedaron muy pocos tras filtrar, devolver el set completo
    return fresh.length >= 5 ? fresh : posts;
}

async function _xbooruFetch(tagsLimpios, pid) {
    try {
        const res = await axios.get(
            `https://xbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsLimpios)}&pid=${pid}`,
            { timeout: 15000, headers: HUMAN_HEADERS }
        );
        const arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.post) ? res.data.post : []);
        return arr.map(p => {
            if (p.file_url) return p;
            if (p.directory && p.image) return { ...p, file_url: `https://img.xbooru.com/images/${p.directory}/${p.image}` };
            return p;
        });
    } catch (err) { logRequestError('xbooru', err); return []; }
}

async function _r34Fetch(tagsConcat, pid) {
    try {
        const res = await axios.get(
            `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${encodeBooruTags(tagsConcat)}&pid=${pid}`,
            { timeout: 15000, headers: HUMAN_HEADERS }
        );
        const arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.post) ? res.data.post : []);
        return arr;
    } catch (err) { logRequestError('rule34 api', err); return []; }
}

async function buscarRule34(tags, soloVideo = false) {
    const tagsLimpios = tags.replace(/\s+/g, '_');
    let posts = [];

    if (soloVideo) {
        // Para video: rule34 entiende `+animated` que cubre la enorme mayoría de mp4/webm.
        // Lanzamos en paralelo varias páginas con +animated y sin él, para máxima cobertura.
        const pidsAnim = [0, 1, 2, 3, 4];
        const pidsRaw = [0, 1, 2];
        const peticiones = [
            ...pidsAnim.map(p => _r34Fetch(`${tagsLimpios}+animated`, p)),
            ...pidsRaw.map(p => _r34Fetch(tagsLimpios, p)),
        ];
        const resultados = await Promise.allSettled(peticiones);
        for (const r of resultados) if (r.status === 'fulfilled' && r.value?.length) posts.push(...r.value);

        // Filtrar solo extensiones de video
        let videos = posts.filter(p => {
            const u = p.file_url || p.sample_url || '';
            return /\.(mp4|webm)$/i.test(u);
        });

        // Deduplicar
        const vistos = new Set();
        videos = videos.filter(p => {
            const key = p.id || p.file_url || p.sample_url;
            if (!key || vistos.has(key)) return false;
            vistos.add(key); return true;
        });

        // Filtrar contra cache LRU
        videos = _lruFiltrar(tagsLimpios, 'video', videos);

        if (videos.length) {
            const e = videos[Math.floor(Math.random() * videos.length)];
            const url = e.file_url || e.sample_url;
            _lruRecord(tagsLimpios, 'video', url);
            return url;
        }

        // Fallbacks de video: xbooru → gelbooru → tbib
        try {
            const xb = await _xbooruFetch(tagsLimpios, Math.floor(Math.random() * 5));
            const xbVid = xb.filter(p => /\.(mp4|webm)$/i.test(p.file_url || ''));
            if (xbVid.length) {
                const e = xbVid[Math.floor(Math.random() * xbVid.length)];
                _lruRecord(tagsLimpios, 'video', e.file_url);
                return e.file_url;
            }
        } catch (err) { logRequestError('xbooru video', err); }
        try { const u = await buscarGelbooru(tagsLimpios + '+animated', true); _lruRecord(tagsLimpios, 'video', u); return u; }
        catch (err) { logRequestError('gelbooru video animated', err); }
        try { const u = await buscarGelbooru(tagsLimpios, true); _lruRecord(tagsLimpios, 'video', u); return u; }
        catch (err) { logRequestError('gelbooru video', err); }
        try { const u = await buscarTbib(tagsLimpios, true); _lruRecord(tagsLimpios, 'video', u); return u; }
        catch (err) { logRequestError('tbib video', err); }
        throw new Error('Sin videos disponibles para esos tags (probé rule34, xbooru, gelbooru, tbib)');
    }

    // ── Imágenes: paralelizar páginas para máxima variedad y calidad ─────
    const pidPool = Array.from({ length: 25 }, (_, i) => i);
    for (let i = pidPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pidPool[i], pidPool[j]] = [pidPool[j], pidPool[i]];
    }
    const pidIntentos = Array.from(new Set([0, 1, ...pidPool.slice(0, 6)])).slice(0, 8);

    const resultados = await Promise.allSettled(pidIntentos.map(p => _r34Fetch(tagsLimpios, p)));
    for (const r of resultados) if (r.status === 'fulfilled' && r.value?.length) posts.push(...r.value);

    // Deduplicar por id/file_url
    const vistos = new Set();
    posts = posts.filter(p => {
        const key = p.id || p.file_url || p.sample_url;
        if (!key || vistos.has(key)) return false;
        vistos.add(key);
        return p.file_url || p.sample_url;
    });

    if (!posts.length) {
        // Imágenes: probar paheal, xbooru, gelbooru, tbib
        try { const u = await buscarRule34Paheal(tagsLimpios, false); _lruRecord(tagsLimpios, 'img', u); return u; }
        catch (err) { logRequestError('rule34 paheal', err); }
        try {
            const xb = await _xbooruFetch(tagsLimpios, Math.floor(Math.random() * 8));
            const xbImg = xb.filter(p => /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file_url || ''));
            if (xbImg.length) {
                const e = xbImg[Math.floor(Math.random() * xbImg.length)];
                _lruRecord(tagsLimpios, 'img', e.file_url);
                return e.file_url;
            }
        } catch (err) { logRequestError('xbooru img', err); }
        try { const u = await buscarGelbooru(tagsLimpios, false); _lruRecord(tagsLimpios, 'img', u); return u; }
        catch (err) { logRequestError('gelbooru fallback', err); }
        try { const u = await buscarTbib(tagsLimpios, false); _lruRecord(tagsLimpios, 'img', u); return u; }
        catch (err) { logRequestError('tbib fallback', err); }
        throw new Error('Sin resultados en ninguna fuente');
    }

    let imgs = posts.filter(p => {
        const u = p.file_url || p.sample_url || '';
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(u);
    });
    if (!imgs.length) throw new Error('Sin imágenes válidas');

    // Mejor calidad: ordenar por score (más alto primero) y mezclar el top 60%
    imgs.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const corte = Math.max(10, Math.floor(imgs.length * 0.6));
    let pool = imgs.slice(0, corte);

    // Filtrar contra cache LRU para no repetir
    pool = _lruFiltrar(tagsLimpios, 'img', pool);

    const elegido = pool[Math.floor(Math.random() * pool.length)];
    const url = elegido.file_url || elegido.sample_url;
    _lruRecord(tagsLimpios, 'img', url);
    return url;
}

async function buscarE621(tags) {
    const tagsLimpios = tags.replace(/\s+/g, '_');
    const page = Math.floor(Math.random() * 5) + 1;
    const res = await axios.get(
        `https://e621.net/posts.json?tags=${encodeBooruTags(tagsLimpios + '+rating:e')}&limit=50&page=${page}`,
        {
            timeout: 20000,
            headers: {
                ...HUMAN_HEADERS,
                'User-Agent': 'NexusBot/1.0 (by Alejx)',
                'Accept': 'application/json'
            }
        }
    );
    const posts = (res.data?.posts || []).filter(p => p.file?.url && /\.(jpg|jpeg|png|webp|gif)$/i.test(p.file.url));
    if (!posts.length) throw new Error('Sin resultados en e621');
    return posts[Math.floor(Math.random() * posts.length)].file.url;
}

async function cmdImageboard(sock, jid, tipo, args, soloVideo = false) {
    const queryRaw = args.join(' ').trim();
    if (!queryRaw) {
        await sock.sendMessage(jid, { text: `❌ Uso: *#${tipo} [nombre o tags]*\nEjemplo: *#${tipo} miku*` });
        return;
    }

    // Traducir nombre de personaje a tag canónico de booru usando waifuDB
    let tags = queryRaw.replace(/\s+/g, '_').toLowerCase();
    let labelOriginal = queryRaw;
    try {
        const w = encontrarWaifu(queryRaw);
        if (w && w.tag) {
            tags = String(w.tag).replace(/\s+/g, '_').toLowerCase();
            labelOriginal = w.key || queryRaw;
        }
    } catch {}

    const tipoDisplay = tipo.replace('video', ' video').toUpperCase();
    await sock.sendMessage(jid, { text: `🔍 Buscando en ${tipoDisplay}: *${labelOriginal}* _(tag: ${tags})_...` });

    let url = null;
    let errorMsg = null;

    try {
        if (tipo === 'danbooru' || tipo === 'dbooru') {
            try {
                url = await buscarDanbooru(tags);
            } catch {
                try {
                    url = await buscarGelbooru(tags, soloVideo);
                } catch {
                    url = await buscarRule34Paheal(tags, soloVideo);
                }
            }
        } else if (tipo === 'gelbooru' || tipo === 'gbooru' || tipo === 'booru' || tipo === 'gelboorovideo' || tipo === 'gboorovideo') {
            try {
                url = await buscarGelbooru(tags, soloVideo);
            } catch {
                url = await buscarRule34Paheal(tags, soloVideo);
            }
        } else if (tipo === 'rule34' || tipo === 'r34' || tipo === 'rule34video' || tipo === 'r34video') {
            url = await buscarRule34(tags, soloVideo);
        } else if (tipo === 'e621') {
            url = await buscarE621(tags);
        }
    } catch (err) {
        errorMsg = err.message;
    }

    if (!url) {
        await sock.sendMessage(jid, { text: `❌ No encontré resultados para: *${tags.replace(/_/g, ' ')}*\n_Intenta con otros tags_` });
        return;
    }

    const label = `🔞 *${tipoDisplay}* — ${tags.replace(/_/g, ' ')}`;
    const esVideo = soloVideo || /\.(mp4|webm)$/i.test(url);
    if (esVideo) {
        await sock.sendMessage(jid, { video: { url }, caption: label });
    } else {
        await sock.sendMessage(jid, { image: { url }, caption: label });
    }
}

// ══════════════════════════════════════════
//  TOP RANDOM
// ══════════════════════════════════════════
async function cmdTopRandom(sock, jid, groupMetadata, args) {
    if (!groupMetadata) {
        await sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' });
        return;
    }
    const tema = args.join(' ') || 'los más especiales';
    let participantes = [...(groupMetadata.participants || [])];
    if (participantes.length < 2) {
        await sock.sendMessage(jid, { text: '❌ Se necesitan al menos 2 miembros para crear un top.' });
        return;
    }
    // Fisher-Yates shuffle
    for (let i = participantes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantes[i], participantes[j]] = [participantes[j], participantes[i]];
    }
    const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const limit = Math.min(participantes.length, 10);
    const mentions = [];
    let lineas = '';
    for (let i = 0; i < limit; i++) {
        const p = participantes[i];
        lineas += `${emojis[i]} @${p.id.split('@')[0]}\n`;
        mentions.push(p.id);
    }

    const temaDisplay = tema.charAt(0).toUpperCase() + tema.slice(1);
    const texto = `📊 *TOP — ${temaDisplay}*\n${'─'.repeat(24)}\n\n${lineas}\n_¡Generado aleatoriamente!_ 🎲`;
    await sock.sendMessage(jid, { text: texto, mentions });
}

const TODO_SFW = Object.keys(SFW_ACCIONES);
const TODO_NSFW_IMG = Object.keys(NSFW_CMDS);
const TODO_NSFW_ACCION = Object.keys(NSFW_ACCIONES);
const TODO_IMAGEBOARDS = ['danbooru', 'dbooru', 'gelbooru', 'gbooru', 'booru', 'rule34', 'r34', 'e621'];
const TODO_IMAGEBOARDS_VIDEO = ['rule34video', 'r34video', 'gelboorovideo', 'gboorovideo'];

module.exports = {
    cmdInteraccion, cmdNsfw, cmdNsfwAccion, cmdWaifu, cmdImageboard, cmdTopRandom,
    TODO_SFW, TODO_NSFW_IMG, TODO_NSFW_ACCION, TODO_IMAGEBOARDS, TODO_IMAGEBOARDS_VIDEO
};
