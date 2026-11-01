#!/usr/bin/env node
/**
 * Genera manifest.json para tu modpack.
 *
 *   node tools/generate-manifest.js <carpeta-del-modpack>
 *
 * La carpeta tiene la misma estructura que una instancia de Minecraft:
 *
 *   modpack/
 *     pack.json            <- datos del modpack (ver pack.example.json)
 *     icon.png             <- icono de la barra lateral (opcional)
 *     background.png       <- fondo de la pantalla principal (opcional)
 *     logo.png             <- logo grande en la pantalla principal (opcional)
 *     mods/*.jar
 *     config/fancymenu/... <- tu menú principal con el botón de entrar al server
 *     resourcepacks/ shaderpacks/ ...
 *
 * Sube la carpeta completa (con manifest.json) a GitHub y comparte
 * la URL raw del manifest o simplemente  usuario/repositorio.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('Uso: node tools/generate-manifest.js <carpeta-del-modpack>');
  process.exit(1);
}
const out = path.join(src, 'manifest.json');

const packFile = path.join(src, 'pack.json');
if (!fs.existsSync(packFile)) {
  console.error('Falta pack.json en la carpeta del modpack. Mira tools/pack.example.json');
  process.exit(1);
}
const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'));
for (const k of ['id', 'name', 'minecraft', 'loader']) {
  if (!pack[k]) { console.error(`pack.json: falta "${k}"`); process.exit(1); }
}

// Carpetas que se sincronizan. FancyMenu vive dentro de config/ (y a veces fancymenu/ en la raíz)
const SYNC_DIRS = pack.syncDirs || ['mods', 'config', 'defaultconfigs', 'resourcepacks', 'shaderpacks', 'kubejs', 'fancymenu', 'customization'];
const SYNC_FILES = pack.syncFiles || ['servers.dat']; // servers.dat: opcional, para que ya aparezca el server en la lista

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

const manifest = {
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
fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
const mb = files.reduce((a, f) => a + f.size, 0) / 1048576;
console.log(`manifest.json listo: ${files.length} archivos, ${mb.toFixed(1)} MB -> ${out}`);
