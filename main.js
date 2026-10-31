const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const extract = require('extract-zip');
const tar = require('tar');

const config = require('./config.json');

/* Carpeta de datos (Windows: %APPDATA%\.cachusafio · Linux: ~/.config/.cachusafio) */
const ROOT = path.join(app.getPath('appData'), '.' + config.id);
const INSTANCES = path.join(ROOT, 'instances');
const SETTINGS_FILE = path.join(ROOT, 'launcher.json');
const LOG_FILE = path.join(ROOT, 'latest.log');

let win = null;
let playing = false;

/* ---------------------------------------------------------- utilidades */

const exists = (p) => fsp.access(p).then(() => true, () => false);
const errText = (e) => String(e && e.message ? e.message : e);

let settingsCache = null;
async function loadSettings() {
  if (settingsCache) return settingsCache;
  try {
    settingsCache = JSON.parse(await fsp.readFile(SETTINGS_FILE, 'utf8'));
  } catch {
    settingsCache = {};
  }
  settingsCache.ramGb ||= 4;
  settingsCache.lang ||= (app.getLocale() || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  settingsCache.accounts ||= [];
  if (!settingsCache.packs) {
    // primera vez: modpacks que vienen con el launcher
    settingsCache.packs = (config.defaultPacks || []).map((p) => ({
      url: p.manifestUrl,
      id: p.id,
      meta: { name: p.name || p.id },
    }));
  }
  return settingsCache;
}

async function saveSettings(patch = {}) {
  const s = Object.assign(await loadSettings(), patch);
  await fsp.mkdir(ROOT, { recursive: true });
  await fsp.writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2));
  return s;
}

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}
// Los mensajes viajan como clave + parámetros; la interfaz los traduce
const status = (key, params = {}, percent = null) => send('status', { key, params, percent });

async function sha1(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1');
    fs.createReadStream(file)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

async function download(url, dest, onChunk) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const tmp = dest + '.part';
  const body = Readable.fromWeb(res.body);
  if (onChunk) body.on('data', (c) => onChunk(c.length));
  await pipeline(body, fs.createWriteStream(tmp));
  await fsp.rename(tmp, dest);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, ...opts });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out.slice(-600) || `Código ${code}`))));
  });
}

/* --------------------------------------------------------------- Java */

function javaMajor(mc) {
  const [first, minor, patch = 0] = mc.split('.').map(Number);
  if (first >= 26) return 25; // versiones nuevas (26.x)
  if ((minor === 20 && patch >= 5) || minor > 20) return 21;
  if (minor >= 17) return 17;
  return 8;
}

async function findJavaExe(dir) {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  if (!(await exists(dir))) return null;
  for (const e of await fsp.readdir(dir)) {
    const candidate = path.join(dir, e, 'bin', exe);
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function ensureJava(mc) {
  const major = javaMajor(mc);
  const dir = path.join(ROOT, 'runtime', `java${major}`);
  const cached = await findJavaExe(dir);
  if (cached) return cached;

  const osName = process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  const isWin = osName === 'windows';
  const archive = path.join(ROOT, 'runtime', `java${major}.${isWin ? 'zip' : 'tar.gz'}`);
  const url = `https://api.adoptium.net/v3/binary/latest/${major}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;

  status('java.download', { major }, 0);
  let got = 0;
  await download(url, archive, (n) => {
    got += n;
    status('java.download.mb', { major, mb: (got / 1048576).toFixed(0) }, null);
  });
  status('java.install', {}, null);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  if (isWin) await extract(archive, { dir });
  else await tar.x({ file: archive, cwd: dir });
  await fsp.rm(archive, { force: true });

  const found = await findJavaExe(dir);
  if (!found) throw new Error('No se pudo instalar Java automáticamente.');
  return found;
}

/* ------------------------------------------------------------- Loader */

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.json();
}

async function ensureLoader(javaPath, mc, loader) {
  const { type, version } = loader;
  const versionsDir = path.join(ROOT, 'versions');
  await fsp.mkdir(versionsDir, { recursive: true });

  if (type === 'vanilla' || !type) return null;

  if (type === 'fabric' || type === 'quilt') {
    const base = type === 'fabric' ? 'https://meta.fabricmc.net' : 'https://meta.quiltmc.org';
    let lv = version;
    if (!lv) {
      const list = await getJson(`${base}/v2/versions/loader/${mc}`);
      const stable = list.find((x) => x.loader.stable !== false && !/beta|pre/.test(x.loader.version)) || list[0];
      if (!stable) throw new Error(`${type} no soporta Minecraft ${mc}`);
      lv = stable.loader.version;
    }
    const name = `${type}-loader-${lv}-${mc}`;
    const file = path.join(versionsDir, name, `${name}.json`);
    if (!(await exists(file))) {
      status('loader.install', { loader: type }, null);
      const res = await fetch(`${base}/v2/versions/loader/${mc}/${lv}/profile/json`);
      if (!res.ok) throw new Error(`No se pudo obtener ${type} ${lv} para ${mc} (HTTP ${res.status})`);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      await fsp.writeFile(file, await res.text());
    }
    return name;
  }

  if (type === 'forge' || type === 'neoforge') {
    if (!version) throw new Error(`El manifest debe indicar loader.version para ${type}`);
    const marker = path.join(ROOT, 'loaders', `${type}-${mc}-${version}.txt`);
    if (await exists(marker)) return (await fsp.readFile(marker, 'utf8')).trim();

    status('loader.install.slow', { loader: type }, null);
    const url =
      type === 'forge'
        ? `https://maven.minecraftforge.net/net/minecraftforge/forge/${mc}-${version}/forge-${mc}-${version}-installer.jar`
        : `https://maven.neoforged.net/releases/net/neoforged/neoforge/${version}/neoforge-${version}-installer.jar`;
    const installer = path.join(ROOT, 'loaders', `${type}-${version}-installer.jar`);
    await download(url, installer);

    // el instalador exige que exista launcher_profiles.json
    const profiles = path.join(ROOT, 'launcher_profiles.json');
    if (!(await exists(profiles))) await fsp.writeFile(profiles, JSON.stringify({ profiles: {} }));

    const before = new Set(await fsp.readdir(versionsDir));
    await run(javaPath, ['-jar', installer, '--installClient', ROOT]);
    const created = (await fsp.readdir(versionsDir)).filter((d) => !before.has(d) && d !== mc);
    const name = created.find((d) => d.toLowerCase().includes(type)) || created[0];
    if (!name) throw new Error('El instalador no generó ninguna versión.');
    await fsp.writeFile(marker, name);
    return name;
  }

  throw new Error(`Loader desconocido: ${type}`);
}

/* ------------------------------------------------------------ Modpack */

// Acepta una URL completa, o "usuario/repo" de GitHub (rama main)
function normalizeManifestUrl(input) {
  const s = String(input || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w.-]+\/[\w.-]+$/.test(s)) return `https://raw.githubusercontent.com/${s}/main/manifest.json`;
  throw new Error('URL de modpack no válida');
}

const bust = (url) => url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
const rel = (base, p) => (p ? new URL(p, base).href : null);

async function fetchManifest(url) {
  const res = await fetch(bust(url));
  if (!res.ok) throw new Error(`No se pudo leer el modpack (HTTP ${res.status})`);
  const m = await res.json();
  if (!m.minecraft || !Array.isArray(m.files)) throw new Error('El manifest no es válido (falta "minecraft" o "files").');
  m.loader ||= { type: 'vanilla' };
  m.id ||= crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  return m;
}

function metaOf(m, url) {
  return {
    name: m.name || m.id,
    description: m.description || '',
    version: m.version || '',
    minecraft: m.minecraft,
    loader: m.loader.type,
    icon: rel(url, m.icon),
    background: rel(url, m.background),
    logo: rel(url, m.logo),
    accent: m.accent || null,
  };
}

function fileUrl(manifestUrl, f) {
  if (f.url) return f.url;
  const p = f.path.split('/').map(encodeURIComponent).join('/');
  return new URL(p, manifestUrl).href;
}

const isKept = (keep, p) => (keep || []).some((k) => (k.endsWith('/') ? p.startsWith(k) : p === k));

async function walk(dir) {
  const out = [];
  if (!(await exists(dir))) return out;
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function syncPack(manifest, manifestUrl, gameDir) {
  status('pack.check', {}, null);
  const keep = manifest.keepLocal || [];
  const pending = [];
  let n = 0;
  for (const f of manifest.files) {
    // Rutas seguras: nada fuera de la carpeta de la instancia
    const dest = path.resolve(gameDir, f.path);
    if (!dest.startsWith(path.resolve(gameDir) + path.sep)) throw new Error(`Ruta no permitida en el manifest: ${f.path}`);
    n++;
    if (isKept(keep, f.path) && (await exists(dest))) continue;
    let ok = false;
    if (await exists(dest)) ok = (await sha1(dest)) === f.sha1;
    if (!ok) pending.push({ ...f, dest });
    if (n % 15 === 0) status('pack.verify', { done: n, total: manifest.files.length }, (n / manifest.files.length) * 100);
  }

  // descargas en paralelo (4 a la vez)
  const totalBytes = pending.reduce((a, f) => a + (f.size || 0), 0) || 1;
  let doneBytes = 0;
  let doneFiles = 0;
  const queue = [...pending];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      await download(fileUrl(manifestUrl, f), f.dest, (c) => {
        doneBytes += c;
        status('pack.download', { done: doneFiles, total: pending.length, file: path.basename(f.path) }, (doneBytes / totalBytes) * 100);
      });
      if ((await sha1(f.dest)) !== f.sha1) throw new Error(`Archivo corrupto: ${f.path}. Intenta de nuevo.`);
      doneFiles++;
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  // limpiar carpetas administradas (por defecto solo mods/)
  const wanted = new Set(manifest.files.map((f) => path.resolve(gameDir, f.path)));
  for (const d of manifest.managedDirs || ['mods']) {
    for (const file of await walk(path.join(gameDir, d))) {
      const r = path.relative(gameDir, file).split(path.sep).join('/');
      if (!wanted.has(path.resolve(file)) && !isKept(keep, r)) await fsp.rm(file, { force: true });
    }
  }
}

/* --------------------------------------------------------------- Cuentas */

const authManager = new Auth('select_account');

const publicAccount = (a) => ({ id: a.id, type: a.type, name: a.name, uuid: a.uuid });

// UUID de jugador sin premium, igual que calcula Minecraft ("OfflinePlayer:<nombre>")
function offlineUuid(name) {
  const h = crypto.createHash('md5').update('OfflinePlayer:' + name).digest();
  h[6] = (h[6] & 0x0f) | 0x30;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

async function upsertAccount(acc) {
  const s = await loadSettings();
  const i = s.accounts.findIndex((a) => a.id === acc.id);
  if (i >= 0) s.accounts[i] = acc;
  else s.accounts.push(acc);
  s.selectedAccount = acc.id;
  await saveSettings();
}

ipcMain.handle('auth:microsoft', async () => {
  try {
    const xbox = await authManager.launch('electron');
    const mc = await xbox.getMinecraft();
    const acc = {
      id: 'ms:' + mc.profile.id,
      type: 'microsoft',
      name: mc.profile.name,
      uuid: mc.profile.id,
      refreshToken: xbox.save(),
    };
    await upsertAccount(acc);
    return { ok: true, account: publicAccount(acc) };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
});

ipcMain.handle('auth:offline', async (_e, rawName) => {
  const name = String(rawName || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return { ok: false, error: 'invalidName' };
  const acc = { id: 'off:' + name.toLowerCase(), type: 'offline', name, uuid: offlineUuid(name) };
  await upsertAccount(acc);
  return { ok: true, account: publicAccount(acc) };
});

ipcMain.handle('auth:select', async (_e, id) => {
  await saveSettings({ selectedAccount: id });
  return { ok: true };
});

ipcMain.handle('auth:remove', async (_e, id) => {
  const s = await loadSettings();
  s.accounts = s.accounts.filter((a) => a.id !== id);
  if (s.selectedAccount === id) s.selectedAccount = s.accounts[0] ? s.accounts[0].id : null;
  await saveSettings();
  return { ok: true, selectedAccount: s.selectedAccount };
});

// Devuelve el objeto `authorization` que espera minecraft-launcher-core
async function resolveAuthorization(acc) {
  if (acc.type === 'offline') {
    return {
      access_token: acc.uuid,
      client_token: acc.uuid,
      uuid: acc.uuid,
      name: acc.name,
      user_properties: '{}',
      meta: { type: 'mojang', demo: false },
    };
  }
  const xbox = await authManager.refresh(acc.refreshToken);
  const mc = await xbox.getMinecraft();
  const s = await loadSettings();
  const stored = s.accounts.find((a) => a.id === acc.id);
  if (stored) {
    stored.refreshToken = xbox.save();
    stored.name = mc.profile.name;
    await saveSettings();
  }
  return mc.mclc();
}

/* ---------------------------------------------------------------- Packs */

async function refreshPacks() {
  const s = await loadSettings();
  await Promise.all(
    s.packs.map(async (p) => {
      try {
        const m = await fetchManifest(p.url);
        p.id = m.id;
        p.meta = metaOf(m, p.url);
        p.offline = false;
      } catch {
        p.offline = true; // se queda con los datos guardados
      }
    })
  );
  await saveSettings();
  return s.packs;
}

const publicPack = (p) => ({ id: p.id, url: p.url, offline: !!p.offline, ...p.meta });

ipcMain.handle('state:get', async () => {
  const s = await loadSettings();
  return {
    version: app.getVersion(),
    appName: config.name,
    platform: process.platform,
    packs: s.packs.map(publicPack),
    selectedPack: s.selectedPack || (s.packs[0] && s.packs[0].id) || null,
    accounts: s.accounts.map(publicAccount),
    selectedAccount: s.selectedAccount || null,
    settings: { ramGb: s.ramGb, lang: s.lang },
  };
});

ipcMain.handle('packs:refresh', async () => (await refreshPacks()).map(publicPack));

ipcMain.handle('packs:add', async (_e, input) => {
  try {
    const url = normalizeManifestUrl(input);
    const m = await fetchManifest(url);
    const s = await loadSettings();
    if (s.packs.some((p) => p.id === m.id)) return { ok: false, error: 'alreadyAdded' };
    s.packs.push({ url, id: m.id, meta: metaOf(m, url) });
    s.selectedPack = m.id;
    await saveSettings();
    return { ok: true, packs: s.packs.map(publicPack), selectedPack: m.id };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
});

ipcMain.handle('packs:remove', async (_e, id, deleteFiles) => {
  const s = await loadSettings();
  s.packs = s.packs.filter((p) => p.id !== id);
  if (s.selectedPack === id) s.selectedPack = s.packs[0] ? s.packs[0].id : null;
  await saveSettings();
  if (deleteFiles) await fsp.rm(path.join(INSTANCES, id), { recursive: true, force: true });
  return { packs: s.packs.map(publicPack), selectedPack: s.selectedPack };
});

ipcMain.handle('packs:select', async (_e, id) => {
  await saveSettings({ selectedPack: id });
});

ipcMain.handle('packs:openFolder', async (_e, id) => {
  const dir = id ? path.join(INSTANCES, id) : ROOT;
  await fsp.mkdir(dir, { recursive: true });
  shell.openPath(dir);
});

/* ----------------------------------------------------------------- Jugar */

ipcMain.handle('game:play', async (_e, packId) => {
  if (playing) return { ok: false, error: 'alreadyRunning' };
  const s = await loadSettings();
  const acc = s.accounts.find((a) => a.id === s.selectedAccount);
  if (!acc) return { ok: false, error: 'noAccount' };
  const pack = s.packs.find((p) => p.id === packId);
  if (!pack) return { ok: false, error: 'noPack' };

  playing = true;
  send('game-state', 'preparing');
  try {
    status('pack.check', {}, null);
    const manifest = await fetchManifest(pack.url);
    pack.meta = metaOf(manifest, pack.url);
    const gameDir = path.join(INSTANCES, manifest.id);
    await fsp.mkdir(gameDir, { recursive: true });

    const javaPath = await ensureJava(manifest.minecraft);
    const customVersion = await ensureLoader(javaPath, manifest.minecraft, manifest.loader);
    await syncPack(manifest, pack.url, gameDir);

    status('game.auth', {}, null);
    const authorization = await resolveAuthorization(acc);

    const ramGb = Math.min(32, Math.max(2, s.ramGb || manifest.ramGb || 4));
    const version = { number: manifest.minecraft, type: 'release' };
    if (customVersion) version.custom = customVersion;

    const launcher = new Client();
    const log = fs.createWriteStream(LOG_FILE);
    launcher.on('debug', (l) => log.write(l + '\n'));
    launcher.on('progress', (e) => {
      status('game.download', { type: e.type }, e.total ? (e.task / e.total) * 100 : null);
    });
    launcher.on('data', (l) => {
      log.write(l + '\n');
      send('game-state', 'running');
      status('game.running', {}, null);
    });
    launcher.on('close', (code) => {
      log.end();
      playing = false;
      send('game-state', 'idle');
      if (code && code !== 0) {
        status('game.crashed', { code }, 0);
        send('game-error', { code });
      } else status('ready', {}, 100);
    });

    status('game.start', {}, null);
    const proc = await launcher.launch({
      authorization,
      root: ROOT,
      javaPath,
      version,
      memory: { max: `${ramGb}G`, min: '1G' },
      overrides: { gameDirectory: gameDir },
    });
    if (!proc) throw new Error('Minecraft no pudo iniciarse. Revisa el log.');
    await saveSettings();
    return { ok: true };
  } catch (e) {
    playing = false;
    send('game-state', 'idle');
    status('error', {}, 0);
    return { ok: false, error: errText(e) };
  }
});

ipcMain.handle('game:openLog', async () => {
  if (await exists(LOG_FILE)) shell.openPath(LOG_FILE);
});

ipcMain.handle('settings:set', async (_e, patch) => {
  const next = {};
  if (patch.ramGb != null) next.ramGb = Math.min(32, Math.max(2, Number(patch.ramGb) || 4));
  if (patch.lang) next.lang = patch.lang === 'en' ? 'en' : 'es';
  const s = await saveSettings(next);
  return { ramGb: s.ramGb, lang: s.lang, totalRamGb: Math.floor(os.totalmem() / 1073741824) };
});

ipcMain.handle('system:info', () => ({ totalRamGb: Math.floor(os.totalmem() / 1073741824) }));

/* ---------------------------------------------------------------- Ventana */

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    title: `${config.name} Launcher ${app.getVersion()}`,
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // los enlaces externos se abren en el navegador, nunca dentro del launcher
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
