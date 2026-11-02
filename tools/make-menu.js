#!/usr/bin/env node
/**
 * Genera el menú principal de FancyMenu (y las pantallas de carga/conexión) dentro del modpack.
 *
 *   node tools/make-menu.js <carpeta-del-modpack> [ip:puerto]
 *
 * Sin IP, el botón "Jugar en Cachusafio" abre la lista de servidores; con IP, entra directo.
 * Después corre tools/generate-manifest.js y sube los cambios a GitHub.
 */
const fs = require('fs');
const path = require('path');
const { installMenu } = require('../fancymenu-layout');

const [src, server = ''] = process.argv.slice(2);
if (!src || !fs.existsSync(src)) {
  console.error('Uso: node tools/make-menu.js <carpeta-del-modpack> [ip:puerto]');
  process.exit(1);
}
try {
  installMenu(path.resolve(src), { server });
  console.log(`Menú listo en ${path.join(path.resolve(src), 'config', 'fancymenu')}${server ? ` (entra a ${server})` : ''}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
