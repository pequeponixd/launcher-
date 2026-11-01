const test = require('node:test');
const assert = require('node:assert');
const { modKey, snapshotMods, diffMods, isEmpty } = require('../changes');

test('modKey quita la versión del nombre del jar', () => {
  assert.strictEqual(modKey('mods/create-1.20.1-0.5.1.jar'), 'create');
  assert.strictEqual(modKey('mods/jei_1.20.1-forge-15.2.0.27.jar'), 'jei');
  assert.strictEqual(modKey('mods/fabric-api-0.92.2+1.20.1.jar'), 'fabric-api');
  assert.strictEqual(modKey('mods/DEDsafio4RuletaFanProject-0.1.0.jar'), 'dedsafio4ruletafanproject');
  assert.strictEqual(modKey('mods/Sinversion.jar'), 'sinversion');
});

test('snapshotMods solo toma jars de mods/', () => {
  const s = snapshotMods([
    { path: 'mods/a-1.0.jar', sha1: '1' },
    { path: 'config/a.toml', sha1: '2' },
    { path: 'mods/sub/b.jar', sha1: '3' },
  ]);
  assert.deepStrictEqual(s, { 'mods/a-1.0.jar': '1' });
});

test('diffMods detecta agregados, quitados y actualizados', () => {
  const old = { 'mods/create-0.5.1.jar': 'a', 'mods/jei-15.0.jar': 'b', 'mods/viejo-1.0.jar': 'c', 'mods/igual-1.0.jar': 'd' };
  const next = { 'mods/create-0.5.2.jar': 'x', 'mods/jei-15.0.jar': 'b2', 'mods/nuevo-2.0.jar': 'e', 'mods/igual-1.0.jar': 'd' };
  const d = diffMods(old, next);
  assert.deepStrictEqual(d.added, ['nuevo-2.0']);
  assert.deepStrictEqual(d.removed, ['viejo-1.0']);
  assert.deepStrictEqual(d.updated, [
    { from: 'create-0.5.1', to: 'create-0.5.2' },
    { from: 'jei-15.0', to: 'jei-15.0' }, // mismo nombre, archivo distinto
  ]);
  assert.ok(isEmpty(diffMods(old, old)));
});
