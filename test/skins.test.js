const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const skins = require('../skins');
const { CAPES, isCapeHash } = require('../capes');

// PNG mínimo válido de w×h (transparente)
function png(w, h) {
  const crc = (buf) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('pngSize lee la cabecera y rechaza lo que no es PNG', () => {
  assert.deepStrictEqual(skins.pngSize(png(64, 32)), { width: 64, height: 32 });
  assert.strictEqual(skins.pngSize(Buffer.from('GIF89a........................')), null);
  assert.strictEqual(skins.pngSize(null), null);
});

test('checkSkin acepta solo PNG 64×64 livianos', () => {
  assert.strictEqual(skins.checkSkin(png(64, 64)), null);
  assert.strictEqual(skins.checkSkin(png(64, 32)), 'skinSize');
  assert.strictEqual(skins.checkSkin(png(128, 128)), 'skinSize');
  assert.strictEqual(skins.checkSkin(Buffer.from('hola')), 'skinNotPng');
  const heavy = Buffer.concat([png(64, 64), Buffer.alloc(skins.MAX_SKIN_BYTES)]);
  assert.strictEqual(skins.checkSkin(heavy), 'skinHeavy');
});

test('dataUrlToPng solo acepta data URLs de PNG', () => {
  const p = png(64, 64);
  assert.ok(skins.dataUrlToPng(skins.pngToDataUrl(p)).equals(p));
  assert.strictEqual(skins.dataUrlToPng('data:image/jpeg;base64,AAAA'), null);
  assert.strictEqual(skins.dataUrlToPng('file:///etc/passwd'), null);
});

test('normalizeChoice descarta capas y archivos inventados', () => {
  const ok = CAPES[0].hash;
  assert.deepStrictEqual(skins.normalizeChoice({ file: 'abc-1.png', slim: 1, cape: ok }), { file: 'abc-1.png', slim: true, cape: ok });
  assert.deepStrictEqual(skins.normalizeChoice({ file: '../../x.png', cape: 'f'.repeat(64) }), { file: null, slim: false, cape: null });
  assert.deepStrictEqual(skins.normalizeChoice(undefined), { file: null, slim: false, cape: null });
});

test('la lista de capas no tiene repetidas y todos los hash son hex', () => {
  assert.ok(CAPES.length >= 40);
  assert.strictEqual(new Set(CAPES.map((c) => c.hash)).size, CAPES.length);
  assert.strictEqual(new Set(CAPES.map((c) => c.id)).size, CAPES.length);
  for (const c of CAPES) assert.match(c.hash, /^[0-9a-f]{40,64}$/);
  assert.ok(isCapeHash(CAPES[3].hash));
  assert.ok(!isCapeHash('nope'));
});

test('defaultSkinFor elige Steve/Alex igual que Java (UUID.hashCode impar = Alex)', () => {
  // comprobados con java.util.UUID.fromString(u).hashCode() & 1
  assert.strictEqual(skins.defaultSkinFor('b50ad385-829d-3141-a216-7e7d7539ba7f'), skins.DEFAULT_SKINS.steve);
  assert.strictEqual(skins.defaultSkinFor('00000000-0000-0000-0000-000000000001'), skins.DEFAULT_SKINS.alex);
  assert.strictEqual(skins.defaultSkinFor('basura'), skins.DEFAULT_SKINS.steve);
});

test('writeGameSkin deja skin.png y skin.json, y los borra si no hay nada elegido', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skin-'));
  const p = png(64, 64);
  const cape = CAPES[0].hash;
  await skins.writeGameSkin(dir, p, { slim: true, cape });
  assert.ok(fs.readFileSync(path.join(dir, 'cachusafio', 'skin.png')).equals(p));
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'cachusafio', 'skin.json'), 'utf8')), { slim: true, cape });

  await skins.writeGameSkin(dir, null, { cape }); // solo capa
  assert.ok(!fs.existsSync(path.join(dir, 'cachusafio', 'skin.png')));
  assert.ok(fs.existsSync(path.join(dir, 'cachusafio', 'skin.json')));

  await skins.writeGameSkin(dir, null, {});
  assert.ok(!fs.existsSync(path.join(dir, 'cachusafio', 'skin.json')));
});

test('fetchPremiumSkin sigue perfil → sesión → textura y detecta brazos delgados', async () => {
  const p = png(64, 64);
  const tex = Buffer.from(JSON.stringify({ textures: { SKIN: { url: 'http://textures.minecraft.net/texture/abc123', metadata: { model: 'slim' } }, CAPE: { url: 'http://textures.minecraft.net/texture/cafe01' } } })).toString('base64');
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    if (url.includes('api.mojang.com')) return { ok: true, status: 200, json: async () => ({ id: 'deadbeef' }) };
    if (url.includes('sessionserver')) return { ok: true, status: 200, json: async () => ({ properties: [{ name: 'textures', value: tex }] }) };
    return { ok: true, status: 200, arrayBuffer: async () => p };
  };
  const r = await skins.fetchPremiumSkin('Notch', fake);
  assert.ok(r.png.equals(p));
  assert.strictEqual(r.slim, true);
  assert.strictEqual(r.cape, 'cafe01');
  assert.strictEqual(calls[2], 'https://textures.minecraft.net/texture/abc123');

  const missing = async () => ({ ok: false, status: 204 });
  await assert.rejects(skins.fetchPremiumSkin('NadieAqui', missing), /skinNoPlayer/);
  await assert.rejects(skins.fetchPremiumSkin('a b', fake), /invalidName/);
});

test('el generador de manifest conserva los archivos de externalUrls que no están en la carpeta', () => {
  const { buildManifest } = require('../manifest');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
  fs.mkdirSync(path.join(dir, 'mods'));
  fs.writeFileSync(path.join(dir, 'mods', 'chico.jar'), 'x');
  const big = 'mods/grande.jar';
  const url = 'https://example.com/grande.jar';
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify({ id: 'p', name: 'P', minecraft: '1.20.1', loader: 'forge', externalUrls: { [big]: url } }));

  assert.throws(() => buildManifest(dir), /Falta mods\/grande\.jar/);

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ files: [{ path: big, sha1: 'abc', size: 123, url }] }));
  const m = buildManifest(dir);
  assert.deepStrictEqual(m.files.find((f) => f.path === big), { path: big, sha1: 'abc', size: 123, url });
  assert.ok(m.files.some((f) => f.path === 'mods/chico.jar'));
});
