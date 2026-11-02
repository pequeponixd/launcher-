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
const { writeManifest } = require('../manifest');

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('Uso: node tools/generate-manifest.js <carpeta-del-modpack>');
  process.exit(1);
}
try {
  const { manifest, file, mb } = writeManifest(path.resolve(src));
  console.log(`manifest.json listo: ${manifest.files.length} archivos, ${mb.toFixed(1)} MB -> ${file}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
