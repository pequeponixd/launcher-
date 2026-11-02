'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { ModpackAdmin, nextVersion, exec } = require('../admin');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString();

// remoto "GitHub" falso (bare) + un clon con un modpack mínimo ya publicado
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-'));
  const remote = path.join(root, 'remote.git');
  git(root, 'init', '-q', '--bare', '-b', 'main', remote);
  const clone = path.join(root, 'clone');
  git(root, 'clone', '-q', remote, clone);
  for (const c of [['user.name', 'Test'], ['user.email', 't@t'], ['commit.gpgsign', 'false']]) git(clone, 'config', ...c);
  const pack = path.join(clone, 'Modpack');
  fs.mkdirSync(path.join(pack, 'mods'), { recursive: true });
  fs.writeFileSync(path.join(pack, 'pack.json'), JSON.stringify({ id: 'p', name: 'P', version: '1.0.0', minecraft: '1.20.1', loader: 'forge', loaderVersion: '47' }));
  fs.writeFileSync(path.join(pack, 'mods', 'create-0.5.1.jar'), 'a');
  fs.writeFileSync(path.join(pack, 'mods', 'viejo-1.0.jar'), 'b');
  require('../manifest').writeManifest(pack);
  git(clone, 'add', '-A');
  git(clone, 'commit', '-q', '-m', 'inicial');
  git(clone, 'push', '-q', '-u', 'origin', 'main');
  return { root, remote, clone, pack };
}

test('locate encuentra Modpack/ desde la raíz del repo', async () => {
  const { clone, pack } = setup();
  const a = await ModpackAdmin.locate(clone);
  assert.equal(a.pack, fs.realpathSync(pack));
  assert.equal(a.packRel, 'Modpack');
  await assert.rejects(ModpackAdmin.locate(os.tmpdir()), /repositorio de git/);
});

test('agregar, quitar y publicar llega al remoto con pack.json, menú y manifest', async () => {
  const { root, remote, clone, pack } = setup();
  const a = await ModpackAdmin.locate(clone);
  const nuevo = path.join(root, 'waystones-14.1.jar');
  fs.writeFileSync(nuevo, 'w');
  assert.deepEqual(await a.addMods([nuevo, path.join(root, 'nota.txt')]), ['waystones-14.1.jar']);
  fs.writeFileSync(path.join(pack, 'mods', 'create-0.5.2.jar'), 'a2');
  fs.rmSync(path.join(pack, 'mods', 'create-0.5.1.jar'));
  await a.removeMod('viejo-1.0.jar');
  await assert.rejects(a.removeMod('../pack.json'), /no válido/);

  const st = await a.status();
  assert.equal(st.syncError, null);
  assert.deepEqual(st.changes.added, ['waystones-14.1']);
  assert.deepEqual(st.changes.removed, ['viejo-1.0']);
  assert.deepEqual(st.changes.updated, [{ from: 'create-0.5.1', to: 'create-0.5.2' }]);

  const steps = [];
  const r = await a.publish({ version: '1.0.1', notes: 'Nuevo mod\n\nArreglos', server: '' }, (k) => steps.push(k));
  assert.equal(r.title, 'Modpack v1.0.1: +1 ~1 -1');
  assert.deepEqual(steps, ['pull', 'big', 'menu', 'manifest', 'commit', 'push']);

  // lo que quedó en el "GitHub" falso
  const check = path.join(root, 'check');
  git(root, 'clone', '-q', remote, check);
  const packJson = JSON.parse(fs.readFileSync(path.join(check, 'Modpack', 'pack.json'), 'utf8'));
  assert.equal(packJson.version, '1.0.1');
  assert.deepEqual(packJson.changelog, ['Nuevo mod', 'Arreglos']);
  const manifest = JSON.parse(fs.readFileSync(path.join(check, 'Modpack', 'manifest.json'), 'utf8'));
  assert.ok(manifest.files.some((f) => f.path === 'config/fancymenu/customization/cachusafio_menu.txt'));
  assert.ok(!manifest.files.some((f) => f.path === 'mods/viejo-1.0.jar'));
  assert.deepEqual((await a.status()).changes, { added: [], removed: [], updated: [] });
  await assert.rejects(a.publish({ version: '1.0.1', notes: 'Nuevo mod\nArreglos', server: '' }), /No hay cambios/);
  assert.equal(git(clone, 'status', '--porcelain').trim(), '');
});

test('trae primero lo que otro subió a GitHub (no lo pisa)', async () => {
  const { root, remote, clone } = setup();
  const other = path.join(root, 'otro');
  git(root, 'clone', '-q', remote, other);
  for (const c of [['user.name', 'Otro'], ['user.email', 'o@o'], ['commit.gpgsign', 'false']]) git(other, 'config', ...c);
  fs.writeFileSync(path.join(other, 'Modpack', 'mods', 'ferritecore-6.0.jar'), 'f');
  git(other, 'add', '-A');
  git(other, 'commit', '-q', '-m', 'ferritecore');
  git(other, 'push', '-q');

  const a = await ModpackAdmin.locate(clone);
  await a.publish({ version: '1.0.1' });
  const check = path.join(root, 'check');
  git(root, 'clone', '-q', remote, check);
  const manifest = JSON.parse(fs.readFileSync(path.join(check, 'Modpack', 'manifest.json'), 'utf8'));
  assert.ok(manifest.files.some((f) => f.path === 'mods/ferritecore-6.0.jar'));
});

test('archivos grandes van a un Release con gh y quedan fuera de git', async () => {
  const { clone, pack } = setup();
  const calls = [];
  const fake = (cmd, args, cwd) => {
    if (cmd !== 'gh') return exec(cmd, args, cwd);
    calls.push(args.slice(0, 2).join(' '));
    if (args[0] === 'repo') return Promise.resolve(JSON.stringify({ nameWithOwner: 'yo/modpack' }));
    return Promise.resolve('');
  };
  const a = await ModpackAdmin.locate(clone, { exec: fake });
  const big = path.join(pack, 'mods', 'enorme-1.0.jar');
  fs.writeFileSync(big, '');
  fs.truncateSync(big, 96 * 1048576);
  await a.publish({ version: '1.0.1' });
  assert.deepEqual(calls, ['repo view', 'release view', 'release upload']);
  const packJson = JSON.parse(fs.readFileSync(path.join(pack, 'pack.json'), 'utf8'));
  assert.equal(packJson.externalUrls['mods/enorme-1.0.jar'], 'https://github.com/yo/modpack/releases/download/mods-grandes/enorme-1.0.jar');
  assert.match(fs.readFileSync(path.join(clone, '.gitignore'), 'utf8'), /^Modpack\/mods\/enorme-1\.0\.jar$/m);
  assert.equal(git(clone, 'ls-files', 'Modpack/mods/enorme-1.0.jar').trim(), '');
  // segunda publicación sin cambios en el archivo grande: no se vuelve a subir
  fs.writeFileSync(path.join(pack, 'mods', 'chico-1.0.jar'), 'c');
  calls.length = 0;
  await a.publish({ version: '1.0.2' });
  assert.ok(!calls.includes('release upload'));
});

test('nextVersion', () => {
  assert.equal(nextVersion('1.0.9'), '1.0.10');
  assert.equal(nextVersion(''), '1.0.0');
});
