// Capas oficiales de Minecraft Java. La textura NO viene con el launcher: se descarga de los servidores
// de Mojang (textures.minecraft.net/texture/<hash>), igual que hace el juego con las capas de verdad.
// Lista sacada de minecraft.wiki (campo texture-id de cada capa).
const CAPES = [
  { id: '15th_anniversary', name: "15th Anniversary", hash: 'cd9d82ab17fd92022dbd4a86cde4c382a7540e117fae7b9a2853658505a80625' },
  { id: 'aurora', name: "Aurora", hash: '7c418dfbd37412a55e9f1425c9807a591ad10cf71b1edb576a587be9114c277f' },
  { id: 'bacon', name: "Bacon", hash: 'fd14214cd8073059e93d9c626260f5df85e5a959181537119df56cadaf5002cc' },
  { id: 'birthday', name: "Birthday", hash: '2056f2eebd759cce93460907186ef44e9192954ae12b227d817eb4b55627a7fc' },
  { id: 'blueprint', name: "Blueprint", hash: 'fdcf48f01ec480d1d7cbec27f7ddce48c9da2be6724641109444dae58d4cd013' },
  { id: 'builder', name: "Builder", hash: '2c579968c64c1719740fd8c2a451461879b238002574fce48f7d1a7c36a1c7d4' },
  { id: 'cheapsh0t_s', name: "Cheapsh0t’s", hash: 'ca29f5dd9e94fb1748203b92e36b66fda80750c87ebc18d6eafdb0e28cc1d05f' },
  { id: 'cherry_blossom', name: "Cherry Blossom", hash: 'afd553b39358a24edfe3b8a9a939fa5fa4faa4d9a9c3d6af8eafb377fa05c2bb' },
  { id: 'cobalt', name: "Cobalt", hash: 'ca35c56efe71ed290385f4ab5346a1826b546a54d519e6a3ff01efa01acce81' },
  { id: 'common', name: "Common", hash: '5ec930cdd2629c8771655c60eebeb867b4b6559b0e6d3bc71c40c96347fa03f0' },
  { id: 'copper', name: "Copper", hash: '5e6f3193e74cd16cdd6637d9bae5484e3a37ff2a14c2d157c659a07810b1bdca' },
  { id: 'crafter', name: "Crafter", hash: '479eacefa3cdd7aca94207f36c0dd449653ddf259daf40544a5866baf05eee22' },
  { id: 'db', name: "DB", hash: 'bcfbe84c6542a4a5c213c1cacf8979b5e913dcb4ad783a8b80e3c4a7d5c8bdac' },
  { id: 'follower_s', name: "Follower’s", hash: '569b7f2a1d00d26f30efe3f9ab9ac817b1e6d35f4f3cfb0324ef2d328223d350' },
  { id: 'founder_s', name: "Founder’s", hash: '99aba02ef05ec6aa4d42db8ee43796d6cd50e4b2954ab29f0caeb85f96bf52a1' },
  { id: 'hero', name: "Hero", hash: 'bb384a1079b9a6f2811520c7991b6e8150d02e5a96457e44509e30822f72f38e' },
  { id: 'home', name: "Home", hash: '1de21419009db483900da6298a1e6cbf9f1bc1523a0dcdc16263fab150693edd' },
  { id: 'mcc_15th_year', name: "MCC 15th Year", hash: '56c35628fe1c4d59dd52561a3d03bfa4e1a76d397c8b9c476c2f77cb6aebb1df' },
  { id: 'menace', name: "Menace", hash: 'dbc21e222528e30dc88445314f7be6ff12d3aeebc3c192054fba7e3b3f8c77b1' },
  { id: 'migrator', name: "Migrator", hash: '2340c0e03dd24a11b15a8b33c2a7e9e32abb2051b2481d0ba7defd635ca7a933' },
  { id: 'millionth_customer', name: "Millionth Customer", hash: '70efffaf86fe5bc089608d3cb297d3e276b9eb7a8f9f2fe6659c23a2d8b18edf' },
  { id: 'minecon_2011', name: "MINECON 2011", hash: '953cac8b779fe41383e675ee2b86071a71658f2180f56fbce8aa315ea70e2ed6' },
  { id: 'minecon_2012', name: "MINECON 2012", hash: 'a2e8d97ec79100e90a75d369d1b3ba81273c4f82bc1b737e934eed4a854be1b6' },
  { id: 'minecon_2013', name: "MINECON 2013", hash: '153b1a0dfcbae953cdeb6f2c2bf6bf79943239b1372780da44bcbb29273131da' },
  { id: 'minecon_2015', name: "MINECON 2015", hash: 'b0cc08840700447322d953a02b965f1d65a13a603bf64b17c803c21446fe1635' },
  { id: 'minecon_2016', name: "MINECON 2016", hash: 'e7dfea16dc83c97df01a12fabbd1216359c0cd0ea42f9999b6e97c584963e980' },
  { id: 'minecraft_experience', name: "Minecraft Experience", hash: '7658c5025c77cfac7574aab3af94a46a8886e3b7722a895255fbf22ab8652434' },
  { id: 'moderator', name: "Moderator", hash: 'ae677f7d98ac70a533713518416df4452fe5700365c09cf45d0d156ea9396551' },
  { id: 'mojang_office', name: "Mojang Office", hash: '5c29410057e32abec02d870ecb52ec25fb45ea81e785a7854ae8429d7236ca26' },
  { id: 'mojang_studios', name: "Mojang Studios", hash: '9e507afc56359978a3eb3e32367042b853cddd0995d17d0da995662913fb00f7' },
  { id: 'moonlight_trail', name: "Moonlight Trail", hash: 'fe8a02dfe9e390e44ff33d69feef9d3943f76d3901015bbd50f0b67722d288bd' },
  { id: 'oxeye', name: "Oxeye", hash: '7706b5f5fc90329691e59277dcc66ba20572219fa8e5da472afd5235fad12cc8' },
  { id: 'pan', name: "Pan", hash: '28de4a81688ad18b49e735a273e086c18f1e3966956123ccb574034c06f5d336' },
  { id: 'prismarine', name: "Prismarine", hash: 'd8f8d13a1adf9636a16c31d47f3ecc9bb8d8533108aa5ad2a01b13b1a0c55eac' },
  { id: 'purple_heart', name: "Purple Heart", hash: 'cb40a92e32b57fd732a00fc325e7afb00a7ca74936ad50d8e860152e482cfbde' },
  { id: 'realms_mapmaker', name: "Realms MapMaker", hash: '17912790ff164b93196f08ba71d0e62129304776d0f347334f8a6eae509f8a56' },
  { id: 'scrolls_champion', name: "Scrolls Champion", hash: '3efadf6510961830f9fcc077f19b4daf286d502b5f5aafbd807c7bbffcaca245' },
  { id: 'snowman', name: "Snowman", hash: '23ec737f18bfe4b547c95935fc297dd767bb84ee55bfd855144d279ac9bfd9fe' },
  { id: 'spade', name: "Spade", hash: '2e002d5e1758e79ba51d08d92a0f3a95119f2f435ae7704916507b6c565a7da8' },
  { id: 'turtle', name: "Turtle", hash: '5048ea61566353397247d2b7d946034de926b997d5e66c86483dfb1e031aee95' },
  { id: 'twisted', name: "Twisted", hash: '24aafc451aa2cc34ddc7265211678585c0ef4da4d32edb75ecec1bd8b5408381' },
  { id: 'valentine', name: "Valentine", hash: 'e578ef995fabcf0a94768f9651ac3aaba30c59ef85d2438e9b3e0cc1d810652b' },
  { id: 'vanilla', name: "Vanilla", hash: 'f9a76537647989f9a0b6d001e320dac591c359e9e61a31f4ce11c88f207f0ad4' },
  { id: 'yearn', name: "Yearn", hash: '308b32a9e303155a0b4262f9e5483ad4a22e3412e84fe8385a0bdd73dc41fa89' },
  { id: 'zombie_horse', name: "Zombie Horse", hash: 'a3f6e4f14801f3ea55e3d95b9b4ef3b5e8802d947f669de93d6ec4b9354a436b' },
];

const BY_HASH = new Map(CAPES.map((c) => [c.hash, c]));
const isCapeHash = (h) => BY_HASH.has(h);
const capeUrl = (h) => `https://textures.minecraft.net/texture/${h}`;

module.exports = { CAPES, isCapeHash, capeUrl };
