'use strict';
/**
 * Arma el manifest.json de un modpack a partir de su carpeta (pack.json + mods/, config/…).
 * Lo usa el comando tools/generate-manifest.js.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Carpetas que se sincronizan. FancyMenu vive dentro de config/ (y a veces fancymenu/ en la raíz)
const DEFAULT_SYNC_DIRS = ['mods', 'config', 'defaultconfigs', 'resourcepacks', 'shaderpacks', 'kubejs', 'fancymenu', 'customization'];
const DEFAULT_SYNC_FILES = ['servers.dat']; // servers.dat: opcional, para que ya aparezca el server en la lista

function walk(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...walk(p));
    else res.push(p);
  }
  return res;
}
const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');

function readPack(src) {
  const packFile = path.join(src, 'pack.json');
  if (!fs.existsSync(packFile)) throw new Error('Falta pack.json en la carpeta del modpack. Mira tools/pack.example.json');
  const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'));
  for (const k of ['id', 'name', 'minecraft', 'loader']) if (!pack[k]) throw new Error(`pack.json: falta "${k}"`);
  return pack;
}

/** Devuelve el objeto manifest (no escribe nada). */
function buildManifest(src) {
  const pack = readPack(src);
  const SYNC_DIRS = pack.syncDirs || DEFAULT_SYNC_DIRS;
  const SYNC_FILES = pack.syncFiles || DEFAULT_SYNC_FILES;

  // Archivos de más de 100 MB que viven en un Release: "externalUrls": { "mods/x.jar": "https://…" }
  const external = pack.externalUrls || {};
  const files = [];
  const add = (f) => {
    if (path.basename(f).startsWith('.')) return;
    const rel = path.relative(src, f).split(path.sep).join('/');
    const entry = { path: rel, sha1: sha1(f), size: fs.statSync(f).size };
    if (external[rel]) entry.url = external[rel];
    files.push(entry);
  };
  for (const d of SYNC_DIRS) {
    const full = path.join(src, d);
    if (fs.existsSync(full)) walk(full).forEach(add);
  }
  for (const f of SYNC_FILES) {
    const full = path.join(src, f);
    if (fs.existsSync(full)) add(full);
  }

  // Los archivos de externalUrls suelen no estar en la carpeta (pesan demasiado para el repo).
  // Si faltan, se reutiliza su entrada del manifest anterior; sin ella no se puede saber su hash.
  // Dejarlos fuera haría que el launcher los BORRARA a todos los jugadores (mods/ es carpeta administrada).
  const missing = Object.keys(external).filter((rel) => !files.some((f) => f.path === rel));
  if (missing.length) {
    let prev = [];
    try {
      prev = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8')).files || [];
    } catch {}
    for (const rel of missing) {
      const old = prev.find((f) => f.path === rel && f.sha1 && f.size);
      if (!old) throw new Error(`Falta ${rel}: ponlo en la carpeta (o deja el manifest.json anterior) para calcular su hash`);
      files.push({ path: rel, sha1: old.sha1, size: old.size, url: external[rel] });
    }
  }

  return {
    id: pack.id,
    name: pack.name,
    description: pack.description || '',
    version: pack.version || '',
    minecraft: pack.minecraft,
    loader: typeof pack.loader === 'string' ? { type: pack.loader, version: pack.loaderVersion || '' } : pack.loader,
    icon: fs.existsSync(path.join(src, 'icon.png')) ? 'icon.png' : undefined,
    background: ['background.png', 'background.jpg', 'background.webp'].find((f) => fs.existsSync(path.join(src, f))),
    logo: fs.existsSync(path.join(src, 'logo.png')) ? 'logo.png' : undefined,
    accent: pack.accent,
    server: pack.server, // "ip:puerto" para mostrar si el servidor está prendido
    changelog: pack.changelog, // notas de esta versión: texto o lista de líneas
    ramGb: pack.ramGb,
    keepLocal: pack.keepLocal || ['options.txt', 'servers.dat'],
    managedDirs: pack.managedDirs || ['mods'],
    generatedAt: new Date().toISOString(),
    files,
  };
}

/** Escribe manifest.json en la carpeta y devuelve { manifest, file, mb }. */
function writeManifest(src) {
  const manifest = buildManifest(src);
  const file = path.join(src, 'manifest.json');
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  const mb = manifest.files.reduce((a, f) => a + f.size, 0) / 1048576;
  return { manifest, file, mb };
}

module.exports = { buildManifest, writeManifest, readPack };
