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
    ...(fx.tooltip ? [`description = ${fx.tooltip}`] : []),
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

// El logo del menú ocupa en pantalla lo mismo que al final de la intro (tools/make-art.py, INTRO_LOGO):
// 136×22 de una escena 240×135 escalada al alto de la ventana, centrado y a 18 px de arriba.
const INTRO_LOGO = { sceneH: 135, w: 136, h: 22, top: 18 };
const calc = (expr) => `{"placeholder":"calc","values":{"expression":"${expr}","decimal":"false"}}`;
const GW = '{"placeholder":"guiwidth"}';
const GH = '{"placeholder":"guiheight"}';

function fittedLogo(name) {
  const L = INTRO_LOGO;
  return block('element', [
    `source = ${asset('logo.png')}`,
    'repeat_texture = false',
    'nine_slice_texture = false',
    'nine_slice_texture_border_x = 5',
    'nine_slice_texture_border_y = 5',
    'element_type = image',
    `advanced_width = ${calc(`${GH}*${L.w}/${L.sceneH}`)}`,
    `advanced_height = ${calc(`${GH}*${L.h}/${L.sceneH}`)}`,
    `advanced_posx = ${calc(`${GW}/2-${GH}*${L.w / 2}/${L.sceneH}`)}`,
    `advanced_posy = ${calc(`${GH}*${L.top}/${L.sceneH}`)}`,
    ...placement(name, { anchor: 'top-left', x: 0, y: 0, width: 220, height: 36 }),
  ]);
}

/** Frase amarilla que rebota al lado del logo, como en Minecraft (sale al azar de splashes.txt). */
function splash(name) {
  const L = INTRO_LOGO;
  return block('element', [
    `source = ${asset('splashes.txt')}`,
    'source_mode = text_file',
    'scale = 1.0',
    'shadow = true',
    'rotation = -20.0',
    'base_color = #FFFF00FF',
    'refresh = false',
    'bouncing = true',
    'element_type = splash_text',
    // esquina de abajo a la derecha del logo
    `advanced_posx = ${calc(`${GW}/2+${GH}*${L.w / 2 - 50}/${L.sceneH}`)}`,
    `advanced_posy = ${calc(`${GH}*${L.top + L.h - 2}/${L.sceneH}`)}`,
    ...placement(name, { anchor: 'top-left', x: 0, y: 0, width: 100, height: 20 }),
  ]);
}

/** Tu personaje con tu skin, que mira hacia el mouse. */
function player(name, pos) {
  return block('element', [
    'copy_client_player = true',
    'auto_skin = true',
    'auto_cape = true',
    'slim = false',
    'parrot = false',
    'parrot_left_shoulder = false',
    'is_baby = false',
    'body_movement = true',
    'player_pose = standing',
    'showname = true',
    'head_follows_mouse = true',
    'body_follows_mouse = true',
    'element_type = player_entity_v2',
    ...placement(name, pos),
  ]);
}

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
const SPLASHES = [
  '¡Ahora con ruleta!',
  '¡Gira la ruleta!',
  '¡No apagues la fogata!',
  '¡Revive en la fogata!',
  '¡Desafío aceptado!',
  '¡Con aurora boreal!',
  '¡100% pixel art!',
  '¡Mods recién horneados!',
  '¡No mires a la luna!',
  '¡Cuidado con los cachos!',
  '¡Kilas al poder!',
  '¡La cabaña tiene la luz prendida!',
];

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
  if (logoSize) out.push(fittedLogo('logo'));
  if (fx.splashes) out.push(splash('splash'));
  if (fx.player) out.push(player('player', { anchor: 'mid-centered', x: -158, y: -52, width: 34, height: 80 }));
  const srv = String(server || '').trim();
  out.push(
    srv
      ? customButton('play', label, 'joinserver', srv, { x: -100, y: -24, width: 200, height: 24 }, buttons.play, { ...fx, tooltip: `Entra directo a ${srv}` })
      : customButton('play', label, 'opengui', 'join_multiplayer_screen', { x: -100, y: -24, width: 200, height: 24 }, buttons.play, { ...fx, tooltip: 'Abre la lista de servidores' }),
    customButton('options', 'Opciones', 'opengui', 'options_screen', { x: -100, y: 6, width: 98, height: 20 }, buttons.small, { ...fx, tooltip: 'Video, sonido, controles e idioma' }),
    customButton('quit', 'Salir', 'quitgame', '', { x: 2, y: 6, width: 98, height: 20 }, buttons.small, { ...fx, tooltip: 'Cierra el juego' })
  );
  for (const b of ['singleplayer', 'multiplayer', 'realms', 'options', 'quit', 'language', 'accessibility']) {
    out.push(hiddenVanillaButton(`mc_titlescreen_${b}_button`));
  }
  // botón "Mods" que agregan Forge y ModMenu (Fabric); si el mod no está, FancyMenu lo ignora
  out.push(hiddenVanillaButton('forge_titlescreen_mods_button'), hiddenVanillaButton('modmenu_titlescreen_mods_button'));
  for (const d of ['title_screen_logo', 'title_screen_splash', 'title_screen_realms_notification']) out.push(hiddenDeep(d));
  return out.join('\n');
}

function layoutHeader(identifier, background) {
  const req = fmId(identifier + ':req');
  const out = [
    'type = fancymenu_layout\n',
    block('layout-meta', [
      `identifier = ${identifier}`,
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
      block('menu_background', [`image_path = ${asset(background)}`, 'slide = false', 'repeat_texture = false', 'background_type = image']),
      block('customization', ['action = backgroundoptions', 'keepaspectratio = true'])
    );
  }
  return out;
}

function logoAt(id, logoSize, pos) {
  if (!logoSize) return [];
  const w = pos.width || 200;
  return [image(id, 'logo.png', { ...pos, width: w, height: Math.round((w * logoSize[1]) / logoSize[0]) })];
}

// Pantallas mientras se entra a un servidor o a un mundo: mismo fondo y el logo arriba.
// Los textos de Minecraft ("Conectando…", "Cargando terreno…") siguen en su lugar.
const SCREENS = {
  connect_screen: 'net.minecraft.client.gui.screens.ConnectScreen',
  receiving_level_screen: 'net.minecraft.client.gui.screens.ReceivingLevelScreen',
  level_loading_screen: 'net.minecraft.client.gui.screens.LevelLoadingScreen',
  progress_screen: 'net.minecraft.client.gui.screens.ProgressScreen',
  disconnected_screen: 'net.minecraft.client.gui.screens.DisconnectedScreen',
};

function buildScreenLayout(identifier, { background = 'background.png', logoSize = null } = {}) {
  return [...layoutHeader(identifier, background), ...logoAt('logo:' + identifier, logoSize, { anchor: 'top-centered', x: -90, y: 18, width: 180 })].join('\n');
}

/** Pantalla de carga del juego (Drippy Loading Screen): fondo, logo y barra propia en vez de Mojang. */
function buildLoadingLayout({ background = 'background.png', logoSize = null } = {}) {
  const hideVanilla = (id) => {
    const blockId = fmId(id + ':block');
    return block('vanilla_button', [
      `button_element_executable_block_identifier = ${blockId}`,
      `[executable_block:${blockId}][type:generic] = [executables:]`,
      ...buttonCommon,
      'element_type = vanilla_button',
      ...placement('drippy:' + id, { anchor: 'vanilla' }).map((l) => l.replace(/^instance_identifier = .*/, `instance_identifier = ${id}`)),
      'is_hidden = true',
      'automated_button_clicks = 0',
    ]);
  };
  const bar = block('element', [
    `bar_texture = ${asset('loading-bar.png')}`,
    `background_texture = ${asset('loading-bar-bg.png')}`,
    'bar_color = #E0112BFF',
    'background_color = #1E1A1CFF',
    'direction = right',
    'progress_for_element_anchor = false',
    'progress_source = {"placeholder":"game_loading_progress"}',
    'value_mode = percentage',
    'smooth_filling_animation = true',
    'element_type = progress_bar',
    ...placement('loading:bar', { anchor: 'mid-centered', x: -100, y: 20, width: 200, height: 10 }),
  ]);
  return [
    ...layoutHeader('drippy_loading_overlay', background),
    ...logoAt('loading:logo', logoSize, { anchor: 'mid-centered', x: -120, y: -40, width: 240 }),
    bar,
    hideVanilla('mojang_logo'),
    hideVanilla('progress_bar'),
  ].join('\n');
}

// Cambia una opción de los options.txt de FancyMenu/Drippy (formato  S:clave = 'valor';)
function setOption(file, key, value) {
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`^([SBIF]):${key} = '[^']*';`, 'm');
  if (!re.test(text)) return false;
  const next = text.replace(re, (_m, t) => `${t}:${key} = '${value}';`);
  if (next === text) return false;
  fs.writeFileSync(file, next);
  return true;
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
  // frases amarillas del menú: se crean una vez y después se pueden editar a mano (una por línea)
  const splashFile = path.join(assets, 'splashes.txt');
  if (!fs.existsSync(splashFile)) {
    fs.writeFileSync(splashFile, SPLASHES.join('\n') + '\n');
    changed.push(splashFile);
  }
  // texturas de botones opcionales (las genera tools/make-art.py) ya dentro de assets/
  const pair = (a, b) => (fs.existsSync(path.join(assets, a)) && fs.existsSync(path.join(assets, b)) ? [a, b] : null);
  const buttons = { play: pair('btn-play.png', 'btn-play-hover.png'), small: pair('btn.png', 'btn-hover.png') };
  const has = (f) => (fs.existsSync(path.join(assets, f)) ? f : undefined);
  const fx = { hoverSound: has('hover.wav'), clickSound: has('click.wav'), splashes: has('splashes.txt'), player: true };
  // fondo animado (APNG) si existe; si no, la imagen fija
  const background = has('background.apng') || (hasBg && 'background.png');
  const logoSize = hasLogo ? pngSize(path.join(packDir, 'logo.png')) : null;
  const write = (name, text) => {
    const file = path.join(custom, name);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
      fs.writeFileSync(file, text);
      changed.push(file);
    }
  };
  write(LAYOUT_FILE, buildTitleLayout({ server, label, background, logoSize, buttons, fx }));
  const screens = { title: 'net.minecraft.client.gui.screens.TitleScreen' };
  for (const [id, cls] of Object.entries(SCREENS)) {
    write(`cachusafio_${id}.txt`, buildScreenLayout(id, { background: background || undefined, logoSize }));
    screens[id] = cls;
  }
  // pantalla de carga del juego, solo si el modpack trae Drippy Loading Screen
  const drippyCfg = path.join(packDir, 'config', 'drippyloadingscreen', 'options.txt');
  const hasDrippy = fs.existsSync(path.join(packDir, 'mods')) && fs.readdirSync(path.join(packDir, 'mods')).some((f) => /^drippyloadingscreen/i.test(f));
  if (hasDrippy && hasBg && has('loading-bar.png') && has('loading-bar-bg.png')) {
    write('cachusafio_carga.txt', buildLoadingLayout({ background: 'background.png', logoSize }));
    screens.drippy = 'de.keksuccino.drippyloadingscreen.customization.DrippyOverlayScreen';
    // la primera ventana de Forge (antes de que carguen los mods) también con el fondo, logo y barra
    const opt = (k, v) => setOption(drippyCfg, k, v) && !changed.includes(drippyCfg) && changed.push(drippyCfg);
    opt('early_loading_background_texture_path', '/config/fancymenu/assets/background.png');
    if (hasLogo) {
      opt('early_loading_logo_texture_path', '/config/fancymenu/assets/logo.png');
      opt('early_loading_logo_width', '480');
      opt('early_loading_logo_height', String(Math.round((480 * logoSize[1]) / logoSize[0])));
    }
    opt('early_loading_bar_progress_texture_path', '/config/fancymenu/assets/loading-bar.png');
    opt('early_loading_bar_background_texture_path', '/config/fancymenu/assets/loading-bar-bg.png');
    opt('early_loading_bar_height', '20');
  }
  // todos los botones y deslizadores de Minecraft (Opciones, Cancelar, Volver…) con el mismo estilo.
  // nine-slice: solo se estira el centro, así la textura sirve para botones de cualquier ancho
  if (has('btn.png') && has('btn-hover.png') && has('btn-inactive.png')) {
    const o = [
      ['global_button_background_normal', asset('btn.png')],
      ['global_button_background_hover', asset('btn-hover.png')],
      ['global_button_background_inactive', asset('btn-inactive.png')],
      ['global_button_background_nine_slice', 'true'],
      ['global_button_background_nine_slice_border_left', '3'],
      ['global_button_background_nine_slice_border_right', '3'],
      ['global_button_background_nine_slice_border_top', '2'],
      ['global_button_background_nine_slice_border_bottom', '3'],
      ['global_slider_background', asset('btn-inactive.png')],
      ['global_slider_background_nine_slice', 'true'],
      ['global_slider_background_nine_slice_border_left', '3'],
      ['global_slider_background_nine_slice_border_right', '3'],
      ['global_slider_background_nine_slice_border_top', '2'],
      ['global_slider_background_nine_slice_border_bottom', '3'],
    ];
    if (has('slider-handle.png') && has('slider-handle-hover.png')) {
      o.push(['global_slider_handle_normal', asset('slider-handle.png')], ['global_slider_handle_hover', asset('slider-handle-hover.png')]);
    }
    let any = false;
    for (const [k, v] of o) any = setOption(path.join(fmDir, 'options.txt'), k, v) || any;
    if (any) changed.push(path.join(fmDir, 'options.txt'));
  }

  // animación de entrada al abrir el juego
  const fmOptions = path.join(fmDir, 'options.txt');
  if (has('intro.apng')) {
    const a = setOption(fmOptions, 'game_intro_animation_name', asset('intro.apng'));
    const b = setOption(fmOptions, 'custom_game_intro_skip_text', 'Presiona cualquier tecla para saltar');
    if (a || b) changed.push(fmOptions);
  }

  // FancyMenu solo aplica layouts a las pantallas que están en esta lista
  const menus = path.join(fmDir, 'customizablemenus.txt');
  let current = fs.existsSync(menus) ? fs.readFileSync(menus, 'utf8') : 'type = customizablemenus\n\n';
  const before = current;
  for (const cls of Object.values(screens)) if (!current.includes(cls + ' {')) current = current.trimEnd() + `\n\n${cls} {\n}\n`;
  if (current !== before) {
    fs.writeFileSync(menus, current);
    changed.push(menus);
  }
  return changed;
}

module.exports = { buildTitleLayout, buildScreenLayout, buildLoadingLayout, installMenu, setOption, fmId, pngSize, LAYOUT_FILE, SCREENS };
