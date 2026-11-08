'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildTitleLayout, installMenu } = require('../fancymenu-layout');

test('con IP el botón entra directo al servidor', () => {
  const t = buildTitleLayout({ server: 'play.cachu.cl:25565' });
  assert.match(t, /^type = fancymenu_layout/);
  assert.match(t, /identifier = title_screen/);
  assert.match(t, /\[action_type:joinserver\] = play\.cachu\.cl:25565/);
  assert.match(t, /\[action_type:opengui\] = options_screen/);
  assert.match(t, /\[action_type:quitgame\] = $/m);
});

test('sin IP el botón abre la lista de servidores', () => {
  const t = buildTitleLayout({});
  assert.doesNotMatch(t, /joinserver/);
  assert.match(t, /\[action_type:opengui\] = join_multiplayer_screen/);
  // sin servidor fijo hay que poder entrar a un mundo propio; con servidor no hace falta
  assert.match(t, /\[action_type:opengui\] = select_world_screen/);
  assert.doesNotMatch(buildTitleLayout({ server: 'x' }), /select_world_screen/);
});

test('cada bloque de acciones apunta a una acción que existe y las llaves cierran', () => {
  const t = buildTitleLayout({ server: 'x', logoSize: [1224, 198] });
  for (const [, , list] of t.matchAll(/\[executable_block:([^\]]+)\]\[type:generic\] = \[executables:([^\]]*)\]/g)) {
    for (const id of list.split(';').filter(Boolean)) assert.ok(t.includes(`[executable_action_instance:${id}]`), id);
  }
  assert.equal((t.match(/{/g) || []).length, (t.match(/}/g) || []).length);
  assert.match(t, /advanced_width = \{"placeholder":"calc","values":\{"expression":"\{"placeholder":"guiheight"\}\*136\/135"/);
  assert.match(t, /advanced_posy = \{"placeholder":"calc".*\*18\/135/);
  assert.match(t, /instance_identifier = forge_titlescreen_mods_button/);
  assert.equal(buildTitleLayout({ server: 'x' }), buildTitleLayout({ server: 'x' })); // estable
});

test('los botones usan las texturas si existen', () => {
  const t = buildTitleLayout({ buttons: { play: ['btn-play.png', 'btn-play-hover.png'], small: ['btn.png', 'btn-hover.png'] } });
  assert.match(t, /backgroundnormal = \[source:local\]\/config\/fancymenu\/assets\/btn-play\.png/);
  assert.match(t, /backgroundhovered = \[source:local\]\/config\/fancymenu\/assets\/btn-hover\.png/);
  assert.doesNotMatch(buildTitleLayout({}), /backgroundnormal/);
  assert.match(t, /hoverlabel = » Jugar en Cachusafio «/);
});

test('splash, personaje y tooltips', () => {
  const t = buildTitleLayout({ fx: { splashes: 'splashes.txt', player: true } });
  assert.match(t, /element_type = splash_text/);
  assert.match(t, /source = \[source:local\]\/config\/fancymenu\/assets\/splashes\.txt/);
  assert.match(t, /copy_client_player = true/);
  const withIsland = buildTitleLayout({ fx: { player: true, island: 'island.png', glow: 'glow.png' } });
  // la isla y la luz van antes que el personaje (FancyMenu dibuja en orden: lo último queda encima)
  assert.ok(withIsland.indexOf('island.png') < withIsland.indexOf('copy_client_player'));
  assert.ok(withIsland.indexOf('glow.png') < withIsland.indexOf('island.png'));
  assert.match(withIsland, /instance_identifier = deep:title_screen_branding\n(.*\n)*?  is_hidden = true/);
  assert.match(t, /description = Abre la lista de servidores/);
});

test('fondo animado y sonidos de los botones', () => {
  const t = buildTitleLayout({ background: 'background.apng', fx: { hoverSound: 'hover.wav', clickSound: 'click.wav' } });
  assert.match(t, /image_path = \[source:local\]\/config\/fancymenu\/assets\/background\.apng/);
  assert.match(t, /hoversound = \[source:local\]\/config\/fancymenu\/assets\/hover\.wav/);
  assert.match(t, /clicksound = \[source:local\]\/config\/fancymenu\/assets\/click\.wav/);
});

test('installMenu copia imágenes, escribe el layout y activa el menú principal', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-'));
  // PNG mínimo de 4x2 (solo importa la cabecera)
  const png = Buffer.alloc(33);
  png.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  png.writeUInt32BE(4, 16);
  png.writeUInt32BE(2, 20);
  fs.writeFileSync(path.join(dir, 'logo.png'), png);
  fs.writeFileSync(path.join(dir, 'background.png'), png);
  const changed = installMenu(dir, { server: '' });
  const names = changed.map((f) => path.basename(f));
  for (const n of ['logo.png', 'background.png', 'cachusafio_menu.txt', 'cachusafio_connect_screen.txt', 'cachusafio_disconnected_screen.txt', 'customizablemenus.txt']) {
    assert.ok(names.includes(n), n);
  }
  assert.ok(!names.includes('cachusafio_carga.txt')); // sin Drippy en mods/ no se crea
  const fm = path.join(dir, 'config', 'fancymenu');
  assert.ok(fs.existsSync(path.join(fm, 'assets', 'logo.png')));
  const menus = fs.readFileSync(path.join(fm, 'customizablemenus.txt'), 'utf8');
  assert.match(menus, /TitleScreen \{/);
  assert.match(menus, /multiplayer\.ConnectScreen \{|screens\.ConnectScreen \{/);
  assert.deepEqual(installMenu(dir, { server: '' }), []); // segunda vez no cambia nada
});

test('pantalla de carga de Drippy, intro y opciones', () => {
  const { buildLoadingLayout, setOption } = require('../fancymenu-layout');
  const t = buildLoadingLayout({ logoSize: [1224, 198] });
  assert.match(t, /identifier = drippy_loading_overlay/);
  assert.match(t, /progress_source = \{"placeholder":"game_loading_progress"\}/);
  assert.match(t, /instance_identifier = mojang_logo\n(.*\n)*?  is_hidden = true/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opt-'));
  const f = path.join(dir, 'options.txt');
  fs.writeFileSync(f, "##[x]\nS:game_intro_animation_name = '';\nB:other = 'true';\n");
  assert.equal(setOption(f, 'game_intro_animation_name', '[source:local]/a.apng'), true);
  assert.match(fs.readFileSync(f, 'utf8'), /S:game_intro_animation_name = '\[source:local\]\/a\.apng';/);
  assert.equal(setOption(f, 'no_existe', 'x'), false);
});

test('installMenu esconde la barra del editor y configura la carga temprana de Drippy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fmo-'));
  const png = Buffer.alloc(33);
  png.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  png.writeUInt32BE(1000, 16);
  png.writeUInt32BE(250, 20);
  fs.writeFileSync(path.join(dir, 'logo.png'), png);
  fs.writeFileSync(path.join(dir, 'background.png'), png);
  fs.mkdirSync(path.join(dir, 'mods'));
  fs.writeFileSync(path.join(dir, 'mods', 'drippyloadingscreen_fabric_3.1.5.jar'), '');
  const fm = path.join(dir, 'config', 'fancymenu');
  const dr = path.join(dir, 'config', 'drippyloadingscreen');
  fs.mkdirSync(fm, { recursive: true });
  fs.mkdirSync(dr, { recursive: true });
  fs.writeFileSync(path.join(fm, 'options.txt'), "B:show_customization_overlay = 'true';\n");
  fs.writeFileSync(path.join(dr, 'options.txt'), "S:early_loading_logo_texture_path = '/x.png';\nI:early_loading_logo_height = '120';\nS:early_loading_background_texture_path = '/x.png';\n");
  installMenu(dir, {});
  assert.match(fs.readFileSync(path.join(fm, 'options.txt'), 'utf8'), /show_customization_overlay = 'false'/);
  const d = fs.readFileSync(path.join(dr, 'options.txt'), 'utf8');
  assert.match(d, /early_loading_logo_texture_path = '\/config\/fancymenu\/assets\/logo\.png'/);
  assert.match(d, /early_loading_logo_height = '120'/); // 480 * 250 / 1000
  assert.match(d, /early_loading_background_texture_path = '\/config\/fancymenu\/assets\/background\.png'/);
});

test('menú al costado con botones de solo texto', () => {
  const tex = (n) => ({ tex: [`txt-${n}.png`, `txt-${n}-hover.png`], size: [120, 20] });
  const t = buildTitleLayout({ logoSize: [400, 300], side: { play: tex('play'), singleplayer: tex('singleplayer'), options: tex('options'), quit: tex('quit') }, fx: { player: true, island: 'island.png' } });
  assert.match(t, /backgroundnormal = \[source:local\]\/config\/fancymenu\/assets\/txt-play\.png/);
  assert.match(t, /\[action_type:opengui\] = select_world_screen/);
  assert.doesNotMatch(t, /hoverlabel = »/); // el texto viene en la textura
  assert.doesNotMatch(t, /island\.png/);
  // logo 4:3 → 77 de ancho para 58 de alto; sin personaje (la derecha es del fondo)
  assert.match(t, /advanced_width = \{"placeholder":"calc","values":\{"expression":"\{"placeholder":"guiheight"\}\*77\/135"/);
  assert.doesNotMatch(t, /copy_client_player/);
  assert.equal((t.match(/{/g) || []).length, (t.match(/}/g) || []).length);
});

test('el logo centrado y el de las pantallas de carga respetan la proporción', () => {
  const { buildScreenLayout } = require('../fancymenu-layout');
  assert.match(buildTitleLayout({ logoSize: [400, 100] }), /advanced_height = \{"placeholder":"calc","values":\{"expression":"\{"placeholder":"guiheight"\}\*34\/135"/);
  const s = buildScreenLayout('connect_screen', { logoSize: [400, 300] }); // alto: tope de 60
  assert.match(s, /width = 80\n  height = 60/);
});
