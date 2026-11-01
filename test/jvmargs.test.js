'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildJvmArgs, loadJvmArgs, ruleAllows } = require('../jvmargs');

// Lista con la misma forma que `arguments.jvm` de un JSON de Forge 1.17+ (valores representativos).
const FORGE_LIKE = [
  '-Djava.library.path=${natives_directory}',
  '-Dminecraft.launcher.brand=${launcher_name}',
  '-Dminecraft.launcher.version=${launcher_version}',
  '-cp',
  '${classpath}',
  '-Djava.net.preferIPv6Addresses=system',
  '-DignoreList=bootstraplauncher,securejarhandler,asm-commons,${version_name}.jar',
  '-DmergeModules=jna-5.10.0.jar,jna-platform-5.10.0.jar',
  '-DlibraryDirectory=${library_directory}',
  '-p',
  '${library_directory}/cpw/mods/bootstraplauncher/1.1.2/bootstraplauncher-1.1.2.jar${classpath_separator}${library_directory}/cpw/mods/securejarhandler/2.1.10/securejarhandler-2.1.10.jar',
  '--add-modules',
  'ALL-MODULE-PATH',
  '--add-opens',
  'java.base/java.util.jar=cpw.mods.securejarhandler',
  '--add-opens',
  'java.base/java.lang.invoke=cpw.mods.securejarhandler',
  '--add-exports',
  'java.base/sun.security.util=cpw.mods.securejarhandler',
];

const CTX = { libraryDirectory: '/data/libraries', versionName: '1.20.1-forge-47.3.0', osName: 'linux', arch: 'x64', delimiter: ':' };

test('jvmargs: conserva --add-opens/-p/--add-modules que faltaban y que causaban el código 1', () => {
  const args = buildJvmArgs(FORGE_LIKE, CTX);
  const at = (flag, value) => args.findIndex((a, i) => a === flag && args[i + 1] === value);
  assert.ok(at('--add-opens', 'java.base/java.lang.invoke=cpw.mods.securejarhandler') >= 0);
  assert.ok(at('--add-opens', 'java.base/java.util.jar=cpw.mods.securejarhandler') >= 0);
  assert.ok(at('--add-exports', 'java.base/sun.security.util=cpw.mods.securejarhandler') >= 0);
  assert.ok(at('--add-modules', 'ALL-MODULE-PATH') >= 0);
  assert.ok(args.includes('-p'));
});

test('jvmargs: reemplaza library_directory, classpath_separator y version_name', () => {
  const args = buildJvmArgs(FORGE_LIKE, CTX);
  assert.ok(args.includes('-DlibraryDirectory=/data/libraries'));
  assert.ok(args.includes('-DignoreList=bootstraplauncher,securejarhandler,asm-commons,1.20.1-forge-47.3.0.jar'));
  const modulePath = args[args.indexOf('-p') + 1];
  assert.equal(
    modulePath,
    '/data/libraries/cpw/mods/bootstraplauncher/1.1.2/bootstraplauncher-1.1.2.jar:/data/libraries/cpw/mods/securejarhandler/2.1.10/securejarhandler-2.1.10.jar'
  );
  assert.ok(!args.some((a) => a.includes('${')), 'no debe quedar ningún placeholder sin reemplazar');
});

test('jvmargs: omite lo que minecraft-launcher-core ya pone (classpath, natives, marca)', () => {
  const args = buildJvmArgs(FORGE_LIKE, CTX);
  assert.ok(!args.includes('-cp'));
  assert.ok(!args.some((a) => a.startsWith('-Djava.library.path=')));
  assert.ok(!args.some((a) => a.startsWith('-Dminecraft.launcher.')));
});

test('jvmargs: el separador del module path sigue al sistema (Windows usa ;)', () => {
  const args = buildJvmArgs(FORGE_LIKE, { ...CTX, osName: 'windows', delimiter: ';' });
  assert.ok(args[args.indexOf('-p') + 1].includes('.jar;/data/libraries/'));
});

test('jvmargs: reglas por sistema operativo', () => {
  const rule = (name, action = 'allow') => ({ action, os: { name } });
  assert.equal(ruleAllows([rule('linux')], { osName: 'linux', arch: 'x64' }), true);
  assert.equal(ruleAllows([rule('windows')], { osName: 'linux', arch: 'x64' }), false);
  assert.equal(ruleAllows([{ action: 'allow' }, rule('linux', 'disallow')], { osName: 'linux', arch: 'x64' }), false);
  assert.equal(ruleAllows([{ action: 'allow', os: { arch: 'x86' } }], { osName: 'linux', arch: 'x64' }), false);
  assert.equal(ruleAllows([{ action: 'allow', features: { is_demo_user: true } }], { osName: 'linux', arch: 'x64' }), false);
  assert.equal(ruleAllows(undefined, { osName: 'linux' }), true);

  const list = [
    { rules: [rule('windows')], value: '-XX:HeapDumpPath=solo-windows' },
    { rules: [rule('linux')], value: ['-Xss1M', '-Dsolo=linux'] },
  ];
  assert.deepEqual(buildJvmArgs(list, CTX), ['-Xss1M', '-Dsolo=linux']);
});

test('jvmargs: un placeholder desconocido no deja una opción huérfana', () => {
  const args = buildJvmArgs(['-Da=1', '--algo', '${no_existe}/x', '-Db=2'], CTX);
  assert.deepEqual(args, ['-Da=1', '-Db=2']);
});

test('jvmargs: sin lista no hace nada', () => {
  assert.deepEqual(buildJvmArgs(undefined, CTX), []);
  assert.deepEqual(buildJvmArgs([], CTX), []);
});

test('loadJvmArgs: lee versions/<nombre>/<nombre>.json y usa la carpeta libraries del launcher', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jvmargs-'));
  try {
    const name = '1.20.1-forge-47.3.0';
    fs.mkdirSync(path.join(root, 'versions', name), { recursive: true });
    fs.writeFileSync(path.join(root, 'versions', name, `${name}.json`), JSON.stringify({ id: name, arguments: { jvm: FORGE_LIKE, game: [] } }));
    const args = await loadJvmArgs(root, name, { osName: 'linux', arch: 'x64', delimiter: ':' });
    assert.ok(args.includes(`-DlibraryDirectory=${path.join(root, 'libraries')}`));
    assert.ok(args.includes('--add-modules'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('loadJvmArgs: archivo ausente, roto o sin arguments.jvm devuelve []', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jvmargs-'));
  try {
    assert.deepEqual(await loadJvmArgs(root, 'no-existe'), []);
    fs.mkdirSync(path.join(root, 'versions', 'roto'), { recursive: true });
    fs.writeFileSync(path.join(root, 'versions', 'roto', 'roto.json'), '{ esto no es json');
    assert.deepEqual(await loadJvmArgs(root, 'roto'), []);
    fs.mkdirSync(path.join(root, 'versions', 'viejo'), { recursive: true });
    fs.writeFileSync(path.join(root, 'versions', 'viejo', 'viejo.json'), JSON.stringify({ minecraftArguments: '--username x' }));
    assert.deepEqual(await loadJvmArgs(root, 'viejo'), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
