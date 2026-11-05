// Skins y capas del "Vestidor". La skin elegida se guarda por cuenta en el launcher y, al darle Jugar,
// se copia a <instancia>/cachusafio/ para que el mod cachusafio_skins la lea y la comparta en el servidor.
const fsp = require('fs/promises');
const path = require('path');
const { isCapeHash } = require('./capes');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// el mod no acepta más: los paquetes que el juego manda al servidor tienen un tope de 32 KiB
const MAX_SKIN_BYTES = 30000;

/** Ancho y alto de un PNG (leídos de la cabecera IHDR), o null si no es un PNG. */
function pngSize(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24 || !buf.subarray(0, 8).equals(PNG_MAGIC)) return null;
  if (buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** null si la skin sirve; si no, la clave del error para la interfaz. */
function checkSkin(buf) {
  const size = pngSize(buf);
  if (!size) return 'skinNotPng';
  if (size.width !== 64 || size.height !== 64) return 'skinSize';
  if (buf.length > MAX_SKIN_BYTES) return 'skinHeavy';
  return null;
}

function dataUrlToPng(url) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(url || ''));
  return m ? Buffer.from(m[1], 'base64') : null;
}

// Skins por defecto de Minecraft 1.20.1 (texturas oficiales en textures.minecraft.net)
const DEFAULT_SKINS = {
  steve: { hash: '1a4af718455d4aab528e7a61f86fa25e6a369d1768dcb13f7df319a713eb810b', slim: false },
  alex: { hash: '3b60a1f6d562f52aaebbf1434f1de147933a3affe0e764fa49ea057536623cd3', slim: true },
};

/** Igual que DefaultPlayerSkin de 1.20.1: Alex si UUID.hashCode() es impar, si no Steve. */
function defaultSkinFor(uuid) {
  const hex = String(uuid || '').replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) return DEFAULT_SKINS.steve;
  const word = (i) => parseInt(hex.slice(i, i + 8), 16);
  const h = word(0) ^ word(8) ^ word(16) ^ word(24);
  return h & 1 ? DEFAULT_SKINS.alex : DEFAULT_SKINS.steve;
}

const pngToDataUrl = (buf) => 'data:image/png;base64,' + buf.toString('base64');

/** Lo que se guarda en settings para cada cuenta: { file, slim, cape }. */
function normalizeChoice(c = {}) {
  return {
    file: typeof c.file === 'string' && /^[a-z0-9-]+\.png$/.test(c.file) ? c.file : null,
    slim: !!c.slim,
    cape: isCapeHash(c.cape) ? c.cape : null,
  };
}

/**
 * Deja en <gameDir>/cachusafio/ lo que el mod va a usar: skin.png (si hay) y skin.json.
 * Sin elección se borran, así el jugador vuelve a verse con su skin normal.
 */
async function writeGameSkin(gameDir, skinPng, choice) {
  const dir = path.join(gameDir, 'cachusafio');
  const png = path.join(dir, 'skin.png');
  const json = path.join(dir, 'skin.json');
  const c = normalizeChoice(choice);
  if (!skinPng && !c.cape) {
    await fsp.rm(png, { force: true });
    await fsp.rm(json, { force: true });
    return;
  }
  await fsp.mkdir(dir, { recursive: true });
  if (skinPng) await fsp.writeFile(png, skinPng);
  else await fsp.rm(png, { force: true });
  await fsp.writeFile(json, JSON.stringify({ slim: c.slim, cape: c.cape }, null, 2));
}

/**
 * Skin de un jugador premium por su nombre, con la API oficial de Mojang.
 * Devuelve { png: Buffer, slim } o lanza un error con una clave para la interfaz.
 */
async function fetchPremiumSkin(name, fetchImpl = fetch) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(String(name || ''))) throw new Error('invalidName');
  const get = async (url) => {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
    if (r.status === 204 || r.status === 404) throw new Error('skinNoPlayer');
    if (!r.ok) throw new Error('skinFetchFail');
    return r;
  };
  const prof = await (await get(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`)).json();
  if (!prof || !prof.id) throw new Error('skinNoPlayer');
  const sess = await (await get(`https://sessionserver.mojang.com/session/minecraft/profile/${prof.id}`)).json();
  const prop = (sess.properties || []).find((p) => p.name === 'textures');
  const tex = prop ? JSON.parse(Buffer.from(prop.value, 'base64').toString('utf8')).textures || {} : {};
  const skin = tex.SKIN;
  if (!skin || !/^https?:\/\/textures\.minecraft\.net\/texture\/[0-9a-f]+$/.test(skin.url)) throw new Error('skinNoSkin');
  const png = Buffer.from(await (await get(skin.url.replace(/^http:/, 'https:'))).arrayBuffer());
  return { png, slim: skin.metadata?.model === 'slim' };
}

module.exports = { DEFAULT_SKINS, defaultSkinFor, pngSize, checkSkin, dataUrlToPng, pngToDataUrl, normalizeChoice, writeGameSkin, fetchPremiumSkin, MAX_SKIN_BYTES };
