'use strict';
/**
 * Genera el menú principal del juego para FancyMenu 3 (Forge/Fabric 1.20.x):
 * fondo y logo del modpack, un botón grande para entrar al servidor, Opciones y Salir.
 * Así no hace falta usar el editor de FancyMenu dentro del juego.
 *
 * El formato es el mismo que guarda el editor de FancyMenu (config/fancymenu/customization/*.txt).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAYOUT_FILE = 'cachusafio_menu.txt';
const STAMP = 1762000000000; // fijo para que el archivo no cambie si nada cambió (diffs limpios en git)

// Identificadores con el formato de FancyMenu (uuid-timestamp), estables según un nombre
function fmId(name) {
  const h = crypto.createHash('sha1').update('cachusafio:' + name).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}-${STAMP}`;
}

const block = (type, lines) => `${type} {\n${lines.map((l) => '  ' + l).join('\n')}\n}\n`;

function placement(name, { anchor = 'mid-centered', x = 0, y = 0, width = 200, height = 20 }) {
  const req = fmId(name + ':req');
  return [
    `instance_identifier = ${/^(mc_|deep:|forge_|modmenu_)/.test(name) ? name : fmId(name)}`,
    'appearance_delay = no_delay',
    'appearance_delay_seconds = 1.0',
    'fade_in = false',
    'fade_in_speed = 1.0',
    `anchor_point = ${anchor}`,
    `x = ${x}`,
    `y = ${y}`,
    `width = ${width}`,
    `height = ${height}`,
    'stretch_x = false',
    'stretch_y = false',
    'stay_on_screen = true',
    `element_loading_requirement_container_identifier = ${req}`,
    `[loading_requirement_container_meta:${req}] = [groups:][instances:]`,
  ];
}

const buttonCommon = [
  'restartbackgroundanimations = true',
  'loopbackgroundanimations = true',
  'nine_slice_custom_background = false',
  'nine_slice_border_x = 5',
  'nine_slice_border_y = 5',
  'navigatable = true',
];

const asset = (file) => `[source:local]/config/fancymenu/assets/${file}`;

/**
 * Botón propio que ejecuta una acción de FancyMenu (joinserver, opengui, quitgame…).
 * tex: [normal, hover] texturas en config/fancymenu/assets, o null para el botón de Minecraft.
 */
function customButton(name, label, action, value, pos, tex = null, fx = {}) {
  const blockId = fmId(name + ':block');
  const actionId = fmId(name + ':action');
  return block('element', [
    `button_element_executable_block_identifier = ${blockId}`,
    `[executable_action_instance:${actionId}][action_type:${action}] = ${value}`,
    `[executable_block:${blockId}][type:generic] = [executables:${actionId};]`,
    ...(tex ? [`backgroundnormal = ${asset(tex[0])}`, `backgroundhovered = ${asset(tex[1])}`] : []),
    ...(fx.hoverSound ? [`hoversound = ${asset(fx.hoverSound)}`] : []),
    ...(fx.clickSound ? [`clicksound = ${asset(fx.clickSound)}`] : []),
    ...buttonCommon,
    `label = ${label}`,
    // resalte al pasar el mouse: el texto queda entre flechas
    `hoverlabel = » ${label} «`,
    'element_type = custom_button',
    ...placement(name, pos),
  ]);
}

/** Oculta un botón original de Minecraft o de Forge/ModMenu (Un jugador, Realms, Mods…). */
function hiddenVanillaButton(id) {
  const blockId = fmId(id + ':block');
  return block('vanilla_button', [
    `button_element_executable_block_identifier = ${blockId}`,
    `[executable_block:${blockId}][type:generic] = [executables:]`,
    ...buttonCommon,
    'element_type = vanilla_button',
    ...placement(id, { anchor: 'vanilla' }),
    'is_hidden = true',
    'automated_button_clicks = 0',
    'nine_slice_slider_handle = false',
    'nine_slice_slider_handle_border_x = 5',
    'nine_slice_slider_handle_border_y = 5',
  ]);
}

const hiddenDeep = (type) =>
  block('deep_element', [`element_type = ${type}`, ...placement(`deep:${type}`, { anchor: 'vanilla' }), 'is_hidden = true']);

function image(name, file, pos) {
  return block('element', [
    `source = ${asset(file)}`,
    'repeat_texture = false',
    'nine_slice_texture = false',
    'nine_slice_texture_border_x = 5',
    'nine_slice_texture_border_y = 5',
    'element_type = image',
    ...placement(name, pos),
  ]);
}

/**
 * Texto del layout. server: "ip:puerto" o vacío (entonces el botón abre la lista de servidores).
 * logoSize: [ancho, alto] del logo.png para mantener su proporción.
 */
function buildTitleLayout({ server = '', label = 'Jugar en Cachusafio', background = true, logoSize = null, buttons = {}, fx = {} } = {}) {
  const req = fmId('layout:req');
  const out = [
    'type = fancymenu_layout\n',
    block('layout-meta', [
      'identifier = title_screen',
      'render_custom_elements_behind_vanilla = false',
      `last_edited_time = ${STAMP}`,
      'is_enabled = true',
      'randommode = false',
      'randomgroup = 1',
      'randomonlyfirsttime = false',
      'layout_index = 0',
      `[loading_requirement_container_meta:${req}] = [groups:][instances:]`,
    ]),
  ];
  if (background) {
    out.push(
      block('menu_background', [
        `image_path = ${asset(typeof background === 'string' ? background : 'background.png')}`,
        'slide = false',
        'repeat_texture = false',
        'background_type = image',
      ]),
      block('customization', ['action = backgroundoptions', 'keepaspectratio = true'])
    );
  }
  if (logoSize) {
    const w = 220; // cabe en una ventana chica con escala de interfaz alta
    const h = Math.round((w * logoSize[1]) / logoSize[0]);
    out.push(image('logo', 'logo.png', { x: -w / 2, y: -40 - h - 16, width: w, height: h }));
  }
  const srv = String(server || '').trim();
  out.push(
    srv
      ? customButton('play', label, 'joinserver', srv, { x: -100, y: -40, width: 200, height: 24 }, buttons.play, fx)
      : customButton('play', label, 'opengui', 'join_multiplayer_screen', { x: -100, y: -40, width: 200, height: 24 }, buttons.play, fx),
    customButton('options', 'Opciones', 'opengui', 'options_screen', { x: -100, y: -10, width: 98, height: 20 }, buttons.small, fx),
    customButton('quit', 'Salir', 'quitgame', '', { x: 2, y: -10, width: 98, height: 20 }, buttons.small, fx)
  );
  for (const b of ['singleplayer', 'multiplayer', 'realms', 'options', 'quit', 'language', 'accessibility']) {
    out.push(hiddenVanillaButton(`mc_titlescreen_${b}_button`));
  }
  // botón "Mods" que agregan Forge y ModMenu (Fabric); si el mod no está, FancyMenu lo ignora
  out.push(hiddenVanillaButton('forge_titlescreen_mods_button'), hiddenVanillaButton('modmenu_titlescreen_mods_button'));
  for (const d of ['title_screen_logo', 'title_screen_splash', 'title_screen_realms_notification']) out.push(hiddenDeep(d));
  return out.join('\n');
}

// Ancho y alto de un PNG leyendo su cabecera (sin dependencias)
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/**
 * Instala el menú en la carpeta del modpack: copia background.png y logo.png a config/fancymenu/assets,
 * escribe el layout y activa la personalización del menú principal. Devuelve las rutas que cambió.
 */
function installMenu(packDir, { server = '', label } = {}) {
  const fmDir = path.join(packDir, 'config', 'fancymenu');
  const assets = path.join(fmDir, 'assets');
  const custom = path.join(fmDir, 'customization');
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync(custom, { recursive: true });
  const changed = [];
  const copy = (name) => {
    const src = path.join(packDir, name);
    if (!fs.existsSync(src)) return false;
    const dest = path.join(assets, name);
    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(fs.readFileSync(src))) {
      fs.copyFileSync(src, dest);
      changed.push(dest);
    }
    return true;
  };
  const hasBg = copy('background.png');
  const hasLogo = copy('logo.png');
  // texturas de botones opcionales (las genera tools/make-art.py) ya dentro de assets/
  const pair = (a, b) => (fs.existsSync(path.join(assets, a)) && fs.existsSync(path.join(assets, b)) ? [a, b] : null);
  const buttons = { play: pair('btn-play.png', 'btn-play-hover.png'), small: pair('btn.png', 'btn-hover.png') };
  const has = (f) => (fs.existsSync(path.join(assets, f)) ? f : undefined);
  const fx = { hoverSound: has('hover.wav'), clickSound: has('click.wav') };
  // fondo animado (APNG) si existe; si no, la imagen fija
  const background = has('background.apng') || (hasBg && 'background.png');
  const text = buildTitleLayout({ server, label, background, logoSize: hasLogo ? pngSize(path.join(packDir, 'logo.png')) : null, buttons, fx });
  const file = path.join(custom, LAYOUT_FILE);
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
    fs.writeFileSync(file, text);
    changed.push(file);
  }
  // FancyMenu solo aplica layouts a las pantallas que están en esta lista
  const menus = path.join(fmDir, 'customizablemenus.txt');
  const current = fs.existsSync(menus) ? fs.readFileSync(menus, 'utf8') : 'type = customizablemenus\n\n';
  if (!current.includes('net.minecraft.client.gui.screens.TitleScreen')) {
    fs.writeFileSync(menus, current.trimEnd() + '\n\nnet.minecraft.client.gui.screens.TitleScreen {\n}\n');
    changed.push(menus);
  }
  return changed;
}

module.exports = { buildTitleLayout, installMenu, fmId, pngSize, LAYOUT_FILE };
