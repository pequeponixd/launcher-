const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const extract = require('extract-zip');
const tar = require('tar');
const { downloadFile } = require('./downloader');
const { syncPack: syncPackFiles } = require('./packsync');
const { loadJvmArgs } = require('./jvmargs');
const { gpuEnv, withEnv } = require('./gpu');
const { snapshotMods, diffMods, isEmpty } = require('./changes');
const { pingServer } = require('./serverping');
const { DiscordPresence, playingActivity } = require('./discord');
const skins = require('./skins');
const pin = require('./pin');
const { CAPES, isCapeHash, capeUrl } = require('./capes');
const { pathToFileURL } = require('url');
let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch { /* sin el módulo solo queda el aviso con enlace */ }

const config = require('./config.json');

// Linux (Wayland): sin esto, a veces no se puede escribir en los campos de texto
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-wayland-ime');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

/* Carpeta de datos (Windows: %APPDATA%\.cachusafio · Linux: ~/.config/.cachusafio) */
const ROOT = path.join(app.getPath('appData'), '.' + config.id);
const INSTANCES = path.join(ROOT, 'instances');
const SETTINGS_FILE = path.join(ROOT, 'launcher.json');
const LOG_FILE = path.join(ROOT, 'latest.log');
const LAUNCHER_LOG = path.join(ROOT, 'launcher.log');
const CUSTOM = path.join(ROOT, 'custom'); // fondos/iconos/logos que el jugador eligió para cada modpack
const SKINS = path.join(ROOT, 'skins'); // skin elegida en el Vestidor, una por cuenta
const CAPE_CACHE = path.join(ROOT, 'capes'); // texturas de capas oficiales ya descargadas

// cachu://custom/<pack>/<archivo> sirve esas imágenes a la interfaz sin abrirle todo el disco
protocol.registerSchemesAsPrivileged([{ scheme: 'cachu', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
function logLine(text) {
  try {
    fs.mkdirSync(ROOT, { recursive: true });
    fs.appendFileSync(LAUNCHER_LOG, `[${new Date().toISOString()}] ${text}\n`);
  } catch {}
}

let win = null;
let playing = false;
let gameProc = null;
const discord = new DiscordPresence(config.discordClientId, { log: logLine });

/* ---------------------------------------------------------- utilidades */

const exists = (p) => fsp.access(p).then(() => true, () => false);
const errText = (e) => String(e && e.message ? e.message : e);

// El refresh token de Microsoft da acceso a la cuenta: se guarda cifrado con el llavero del sistema
// (DPAPI en Windows, libsecret/kwallet en Linux). Si no hay llavero, queda como antes.
const canEncrypt = () => app.isReady() && safeStorage.isEncryptionAvailable();
function sealToken(token) {
  if (!token || token.startsWith('enc:') || !canEncrypt()) return token;
  return 'enc:' + safeStorage.encryptString(token).toString('base64');
}
function openToken(token) {
  if (!token || !token.startsWith('enc:')) return token;
  return safeStorage.decryptString(Buffer.from(token.slice(4), 'base64'));
}

// "3.1.0" > "3.0.2"? Tags raros (sin números) nunca cuentan como más nuevos
function isNewer(a, b) {
  const pa = String(a).replace(/^v/i, '').split('.').map(Number);
  const pb = String(b).replace(/^v/i, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false;
    if (x !== y) return x > y;
  }
  return false;
}

async function tailFile(file, lines = 40) {
  try {
    return (await fsp.readFile(file, 'utf8')).trimEnd().split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
}

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
  settingsCache.packs ||= [];
  settingsCache.removedDefaults ||= [];
  // Modpacks que vienen con el launcher: se agregan si faltan y su enlace se mantiene al día
  // (así, si cambias el enlace en config.json, a todos se les corrige solo).
  for (const d of config.defaultPacks || []) {
    const cur = settingsCache.packs.find((p) => p.fromDefault === d.id);
    if (cur) {
      cur.url = d.manifestUrl;
    } else if (!settingsCache.removedDefaults.includes(d.id) && !settingsCache.packs.some((p) => p.url === d.manifestUrl)) {
      // limpia restos de una versión vieja del mismo modpack (enlace antiguo)
      settingsCache.packs = settingsCache.packs.filter((p) => p.id !== d.id);
      settingsCache.packs.push({ url: d.manifestUrl, id: d.id, fromDefault: d.id, meta: { name: d.name || d.id } });
    }
  }
  // Tokens guardados en texto plano por versiones anteriores: se cifran la próxima vez que se guarde
  for (const a of settingsCache.accounts) if (a.refreshToken) a.refreshToken = sealToken(a.refreshToken);
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

// Descarga un archivo suelto (Java, instalador de Forge…): reanuda si se corta, detecta cuelgues y reintenta.
// Los archivos del modpack usan packsync.js, que además verifica hash y usa varias conexiones.
async function download(url, dest, onChunk) {
  await downloadFile(url, dest, {
    attempts: 4,
    onBytes: onChunk ? (n) => n > 0 && onChunk(n) : undefined, // el progreso de Java solo suma
    onRetry: (r) => logLine(`download ${path.basename(dest)}: intento ${r.attempt}/${r.max} falló: ${r.error.message}`),
  });
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
  // Datos oficiales del paquete: enlace, tamaño y checksum SHA-256
  status('java.download', { major }, 0);
  const info = await getJson(
    `https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=${arch}&image_type=jre&os=${osName}&vendor=eclipse`
  );
  const pkg = info && info[0] && info[0].binary && info[0].binary.package;
  if (!pkg) throw new Error(`Adoptium no tiene Java ${major} para ${osName}/${arch}`);
  logLine(`java: ${pkg.link} (${pkg.size} bytes, sha256 ${pkg.checksum})`);

  const sha256 = (file) =>
    new Promise((resolve, reject) => {
      const h = crypto.createHash('sha256');
      fs.createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
    });

  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    let got = 0;
    if (attempt === 1) {
      await download(pkg.link, archive, (n) => {
        got += n;
        status('java.download.mb', { major, mb: (got / 1048576).toFixed(0) }, null);
      });
    } else {
      // plan B: curl del sistema (viene en Windows 10/11 y en Linux)
      status('java.download.mb', { major, mb: '…' }, null);
      await fsp.rm(archive, { force: true });
      await run(isWin ? 'curl.exe' : 'curl', ['-fL', '--retry', '3', '-o', archive, pkg.link]);
    }
    const real = await sha256(archive);
    const st = await fsp.stat(archive);
    const head = (await fsp.readFile(archive)).subarray(0, 8).toString('hex');
    logLine(`java intento ${attempt}: ${st.size} bytes, sha256 ${real}, inicio ${head}`);
    ok = real === pkg.checksum.toLowerCase();
    if (!ok) await fsp.rm(archive, { force: true });
  }
  if (!ok) throw new Error('El Java se descarga dañado una y otra vez (no coincide con el checksum oficial). Revisa tu conexión, VPN o antivirus/proxy, y mira launcher.log.');

  status('java.install', {}, null);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  try {
    if (isWin) await extract(archive, { dir });
    else await run('tar', ['-xzf', archive, '-C', dir]); // tar del sistema, más fiable que la librería
  } catch (e) {
    await fsp.rm(archive, { force: true });
    await fsp.rm(dir, { recursive: true, force: true });
    throw new Error(`No se pudo descomprimir Java (${errText(e)}).`);
  }
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
    server: m.server || null,
    // notas que escribe el autor del modpack: texto o lista de líneas
    changelog: Array.isArray(m.changelog) ? m.changelog.map(String) : m.changelog ? String(m.changelog).split('\n') : [],
  };
}

// La sincronización (verificar, descargar, limpiar) vive en packsync.js para poder probarla sin Electron.
const syncPack = (manifest, manifestUrl, gameDir) =>
  syncPackFiles(manifest, manifestUrl, gameDir, { status, log: logLine });

/* --------------------------------------------------------------- Cuentas */

const authManager = new Auth('select_account');

const publicAccount = (a) => ({ id: a.id, type: a.type, name: a.name, uuid: a.uuid, hasPin: !!a.pin });

// PIN de cuentas offline: clave para el servidor de las cuentas desbloqueadas en esta sesión del launcher
// (solo en memoria; al cerrar el launcher hay que escribir el PIN otra vez)
const unlocked = new Map();
const pinAttempts = new pin.Attempts();

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
  // al volver a iniciar sesión se conservan la skin y la clave del servidor (sin ella el servidor lo expulsa)
  if (i >= 0) s.accounts[i] = { ...s.accounts[i], ...acc };
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
      refreshToken: sealToken(xbox.save()),
    };
    await upsertAccount(acc);
    return { ok: true, account: publicAccount(acc) };
  } catch (e) {
    logLine('ERROR: ' + (e && e.stack ? e.stack : errText(e)));
    return { ok: false, error: errText(e) };
  }
});

ipcMain.handle('auth:offline', async (_e, rawName, rawPin) => {
  const name = String(rawName || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return { ok: false, error: 'invalidName' };
  if (!pin.isValidPin(rawPin)) return { ok: false, error: 'pinInvalid' };
  const id = 'off:' + name.toLowerCase();
  const s = await loadSettings();
  const old = s.accounts.find((a) => a.id === id);
  // la cuenta ya está en este PC: solo se vuelve a entrar con el mismo PIN (si no, cualquiera podría cambiarlo)
  if (old?.pin) {
    if (pinAttempts.wait(id)) return { ok: false, error: 'pinWait' };
    if (!pin.checkPin(rawPin, old.pin)) {
      pinAttempts.fail(id);
      return { ok: false, error: 'pinTaken' };
    }
    pinAttempts.ok(id);
  }
  const acc = { ...old, id, type: 'offline', name, uuid: offlineUuid(name), pin: old?.pin || pin.hashPin(rawPin) };
  await upsertAccount(acc);
  unlocked.set(id, pin.pinToken(name, rawPin));
  return { ok: true, account: publicAccount(acc) };
});

// Cuenta offline de una versión anterior, sin PIN: lo crea (y queda desbloqueada)
ipcMain.handle('auth:setPin', async (_e, id, rawPin) => {
  const s = await loadSettings();
  const acc = s.accounts.find((a) => a.id === id && a.type === 'offline');
  if (!acc) return { ok: false, error: 'noAccount' };
  if (acc.pin) return { ok: false, error: 'pinAlready' };
  if (!pin.isValidPin(rawPin)) return { ok: false, error: 'pinInvalid' };
  acc.pin = pin.hashPin(rawPin);
  await saveSettings();
  unlocked.set(id, pin.pinToken(acc.name, rawPin));
  return { ok: true };
});

ipcMain.handle('auth:unlock', async (_e, id, rawPin) => {
  const s = await loadSettings();
  const acc = s.accounts.find((a) => a.id === id && a.type === 'offline');
  if (!acc || !acc.pin) return { ok: false, error: 'noAccount' };
  const wait = pinAttempts.wait(id);
  if (wait) return { ok: false, error: 'pinWait', seconds: Math.ceil(wait / 1000) };
  if (!pin.checkPin(rawPin, acc.pin)) {
    pinAttempts.fail(id);
    return { ok: false, error: 'pinWrong' };
  }
  pinAttempts.ok(id);
  unlocked.set(id, pin.pinToken(acc.name, rawPin));
  return { ok: true };
});

// Clave que el juego manda al servidor (variable de entorno, nunca a un archivo). null = falta el PIN.
async function serverToken(acc) {
  if (acc.type === 'offline') return unlocked.get(acc.id) || null;
  // Microsoft: el inicio de sesión ya prueba quién es; se usa una clave al azar guardada (cifrada) en la cuenta
  const s = await loadSettings();
  const stored = s.accounts.find((a) => a.id === acc.id) || acc;
  if (!stored.serverKey) {
    stored.serverKey = sealToken(pin.randomToken());
    await saveSettings();
  }
  return openToken(stored.serverKey);
}

ipcMain.handle('auth:select', async (_e, id) => {
  await saveSettings({ selectedAccount: id });
  return { ok: true };
});

ipcMain.handle('auth:remove', async (_e, id) => {
  const s = await loadSettings();
  const gone = s.accounts.find((a) => a.id === id);
  const file = gone && skins.normalizeChoice(gone.skin).file;
  if (file) await fsp.rm(path.join(SKINS, file), { force: true }); // su skin del Vestidor ya no sirve
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
  let xbox, mc;
  try {
    xbox = await authManager.refresh(openToken(acc.refreshToken));
    mc = await xbox.getMinecraft();
  } catch (e) {
    logLine('ERROR al renovar la sesión de Microsoft: ' + errText(e));
    throw new Error('msExpired');
  }
  const s = await loadSettings();
  const stored = s.accounts.find((a) => a.id === acc.id);
  if (stored) {
    stored.refreshToken = sealToken(xbox.save());
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
        // qué cambiaría en mods/ al darle Jugar (solo si ya se jugó antes con este launcher)
        p.pending = p.mods ? diffMods(p.mods, snapshotMods(m.files)) : null;
      } catch {
        p.offline = true; // se queda con los datos guardados
      }
    })
  );
  await saveSettings();
  return s.packs;
}

const customUrl = (p, kind) =>
  p.custom && p.custom[kind] ? `cachu://custom/${encodeURIComponent(p.id)}/${encodeURIComponent(p.custom[kind])}` : null;

const publicPack = (p) => {
  const meta = p.meta || {};
  const c = p.custom || {};
  return {
    id: p.id,
    url: p.url,
    offline: !!p.offline,
    ...meta,
    icon: customUrl(p, 'icon') || meta.icon,
    background: customUrl(p, 'background') || meta.background,
    logo: customUrl(p, 'logo') || meta.logo,
    accent: c.accent || meta.accent,
    customized: { icon: !!c.icon, background: !!c.background, logo: !!c.logo, accent: !!c.accent },
    pending: isEmpty(p.pending) ? null : p.pending,
    lastChanges: p.lastChanges || null,
  };
};

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
    settings: { ramGb: s.ramGb, lang: s.lang, nvidiaGpu: !!s.nvidiaGpu, hideOnLaunch: !!s.hideOnLaunch, discord: s.discord !== false },
    discordAvailable: !!config.discordClientId,
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
    logLine('ERROR: ' + (e && e.stack ? e.stack : errText(e)));
    return { ok: false, error: errText(e) };
  }
});

ipcMain.handle('packs:remove', async (_e, id) => {
  const s = await loadSettings();
  const gone = s.packs.find((p) => p.id === id);
  if (gone && gone.fromDefault) (s.removedDefaults ||= []).push(gone.fromDefault);
  s.packs = s.packs.filter((p) => p.id !== id);
  if (s.selectedPack === id) s.selectedPack = s.packs[0] ? s.packs[0].id : null;
  await saveSettings();
  await fsp.rm(path.join(CUSTOM, id), { recursive: true, force: true });
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
  if (acc.type === 'offline' && !acc.pin) return { ok: false, error: 'pinSetup' };
  if (acc.type === 'offline' && !unlocked.has(acc.id)) return { ok: false, error: 'pinLocked' };

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
    await prepareGameSkin(acc, gameDir).catch((e) => logLine('skin: ' + errText(e)));

    // guarda qué mods cambiaron respecto a la última vez, para la sección "Novedades"
    const snap = snapshotMods(manifest.files);
    if (pack.mods) {
      const d = diffMods(pack.mods, snap);
      if (!isEmpty(d)) pack.lastChanges = { ...d, version: manifest.version || '', date: new Date().toISOString() };
    }
    pack.mods = snap;
    pack.pending = null;
    await saveSettings();

    status('game.auth', {}, null);
    const authorization = await resolveAuthorization(acc);

    const ramGb = Math.min(32, Math.max(2, s.ramGb || manifest.ramGb || 4));
    const version = { number: manifest.minecraft, type: 'release' };
    if (customVersion) version.custom = customVersion;

    // Forge/NeoForge 1.17+ necesita los argumentos de Java de su JSON (--add-opens, -p, --add-modules…);
    // minecraft-launcher-core no los lee y sin ellos el juego se cierra al instante con código 1.
    let customArgs = [];
    if (customVersion && ['forge', 'neoforge'].includes(manifest.loader.type)) {
      customArgs = await loadJvmArgs(ROOT, customVersion);
      logLine(`argumentos de Java del loader: ${customArgs.length}${customArgs.length ? '' : ' (¡ninguno! Forge puede no arrancar)'}`);
    }

    const launcher = new Client();
    const log = fs.createWriteStream(LOG_FILE);
    // el token de Microsoft va en los argumentos de Java: no debe quedar en un log que se comparte para pedir ayuda
    launcher.on('debug', (l) => log.write(String(l).replace(/(--accessToken\s+)\S+/g, '$1[oculto]') + '\n'));
    launcher.on('progress', (e) => {
      status('game.download', { type: e.type }, e.total ? (e.task / e.total) * 100 : null);
    });
    let hidden = false;
    let shown = false;
    launcher.on('data', (l) => {
      log.write(l + '\n');
      if (!shown) {
        shown = true;
        if (s.discord !== false && config.discordClientId) discord.setActivity(playingActivity(pack.meta || {}, Date.now()));
      }
      if (s.hideOnLaunch && !hidden && win && !win.isDestroyed()) {
        hidden = true;
        win.hide();
      }
      send('game-state', 'running');
      status('game.running', {}, null);
    });
    launcher.on('close', (code) => {
      const killed = gameProc && gameProc.killedByUser;
      gameProc = null;
      if (shown) discord.clear();
      playing = false;
      if (hidden && win && !win.isDestroyed()) win.show();
      send('game-state', 'idle');
      // el log se termina de escribir antes de leer sus últimas líneas para el aviso de error
      log.end(async () => {
        if (code && code !== 0 && !killed) {
          status('game.crashed', { code }, 0);
          send('game-error', { code, tail: await tailFile(LOG_FILE) });
        } else status('ready', {}, 100);
      });
    });

    status('game.start', {}, null);
    const gpuVars = gpuEnv(process.platform, s.nvidiaGpu);
    const authToken = await serverToken(acc).catch(() => null);
    if (Object.keys(gpuVars).length) logLine('gráfica NVIDIA activada (PRIME render offload)');
    const proc = await withEnv({ ...gpuVars, ...(authToken ? { CACHUSAFIO_AUTH: authToken } : {}) }, () =>
      launcher.launch({
        authorization,
        root: ROOT,
        javaPath,
        version,
        memory: { max: `${ramGb}G`, min: '1G' },
        customArgs,
        // cwd = carpeta de la instancia: varios mods (FancyMenu, Konkrete…) leen su config con rutas relativas
        // y sin esto usaban la carpeta raíz del launcher, ignorando la config del modpack
        // maxSockets: los recursos son ~3.600 archivos chicos; con 2 conexiones (lo que trae la librería)
        // se pierde casi todo el tiempo esperando cada respuesta. Con 8 baja unas 4 veces más rápido.
        overrides: { gameDirectory: gameDir, cwd: gameDir, maxSockets: 8 },
      })
    );
    if (!proc) throw new Error('Minecraft no pudo iniciarse. Revisa el log.');
    gameProc = proc;
    await saveSettings();
    return { ok: true };
  } catch (e) {
    playing = false;
    send('game-state', 'idle');
    status('error', {}, 0);
    logLine('ERROR: ' + (e && e.stack ? e.stack : errText(e)));
    return { ok: false, error: errText(e) };
  }
});

// Abre el log más reciente: el del juego (latest.log) si se llegó a lanzar, o el del launcher si falló antes.
ipcMain.handle('game:openLog', async () => {
  const mtime = (f) => fsp.stat(f).then((s) => s.mtimeMs, () => -1);
  const [game, launcher] = await Promise.all([mtime(LOG_FILE), mtime(LAUNCHER_LOG)]);
  if (game < 0 && launcher < 0) shell.openPath(ROOT);
  else shell.openPath(game >= launcher ? LOG_FILE : LAUNCHER_LOG);
});

ipcMain.handle('game:kill', () => {
  if (!gameProc) return { ok: false };
  gameProc.killedByUser = true;
  gameProc.kill();
  return { ok: true };
});

// Busca en GitHub si hay un release más nuevo que esta versión. Sin internet o sin repo, no dice nada.
ipcMain.handle('app:checkUpdate', async () => {
  if (canAutoUpdate()) return updateReady ? { version: updateReady, ready: true } : null;
  if (!config.repo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${config.repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `${config.id}-launcher` },
    });
    if (!res.ok) return null;
    const r = await res.json();
    if (!isNewer(r.tag_name, app.getVersion())) return null;
    return { version: String(r.tag_name).replace(/^v/i, ''), url: r.html_url };
  } catch {
    return null;
  }
});

ipcMain.handle('settings:set', async (_e, patch) => {
  const next = {};
  if (patch.ramGb != null) next.ramGb = Math.min(32, Math.max(2, Number(patch.ramGb) || 4));
  if (patch.lang) next.lang = patch.lang === 'en' ? 'en' : 'es';
  if (patch.nvidiaGpu != null) next.nvidiaGpu = !!patch.nvidiaGpu;
  if (patch.hideOnLaunch != null) next.hideOnLaunch = !!patch.hideOnLaunch;
  if (patch.discord != null) next.discord = !!patch.discord;
  const s = await saveSettings(next);
  return { ramGb: s.ramGb, lang: s.lang, nvidiaGpu: !!s.nvidiaGpu, totalRamGb: Math.floor(os.totalmem() / 1073741824) };
});

ipcMain.handle('server:status', async (_e, packId) => {
  const s = await loadSettings();
  const p = s.packs.find((x) => x.id === packId);
  if (!p || !p.meta || !p.meta.server) return null;
  return pingServer(p.meta.server);
});

// Personalizar un modpack solo en este PC. kind: icon | background | logo | accent.
// value: undefined = elegir imagen, null = volver a la del modpack, "#rrggbb" = color.
ipcMain.handle('packs:customize', async (_e, packId, kind, value) => {
  const s = await loadSettings();
  const p = s.packs.find((x) => x.id === packId);
  if (!p || !['icon', 'background', 'logo', 'accent'].includes(kind)) return { ok: false };
  p.custom ||= {};
  const dir = path.join(CUSTOM, p.id);
  const dropOld = async () => {
    if (p.custom[kind] && kind !== 'accent') await fsp.rm(path.join(dir, p.custom[kind]), { force: true });
    delete p.custom[kind];
  };
  if (kind === 'accent') {
    if (value && !/^#[0-9a-f]{6}$/i.test(value)) return { ok: false };
    if (value) p.custom.accent = value;
    else delete p.custom.accent;
  } else if (value === null) {
    await dropOld();
  } else {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    await fsp.mkdir(dir, { recursive: true });
    await dropOld();
    // nombre nuevo cada vez para que la interfaz no muestre la imagen anterior desde la caché
    const name = `${kind}-${Date.now()}${path.extname(r.filePaths[0]).toLowerCase()}`;
    await fsp.copyFile(r.filePaths[0], path.join(dir, name));
    p.custom[kind] = name;
  }
  await saveSettings();
  return { ok: true, packs: s.packs.map(publicPack) };
});

/* ---------------------------------------------------- Actualización del launcher */

// Se actualizan solos el instalador de Windows y el AppImage; el .exe portable y el .tar.gz solo avisan
const canAutoUpdate = () =>
  !!autoUpdater &&
  app.isPackaged &&
  ((process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR) || (process.platform === 'linux' && !!process.env.APPIMAGE));
let updateReady = null;

function startAutoUpdate() {
  if (!canAutoUpdate()) return;
  autoUpdater.logger = { info: (m) => logLine('updater: ' + m), warn: (m) => logLine('updater: ' + m), error: (m) => logLine('updater ERROR: ' + m), debug() {} };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // si no reinicia a mano, se instala al cerrar el launcher
  autoUpdater.on('update-available', (i) => send('updater', { state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => send('updater', { state: 'downloading', percent: p.percent }));
  autoUpdater.on('update-downloaded', (i) => {
    updateReady = i.version;
    send('updater', { state: 'ready', version: i.version });
  });
  autoUpdater.on('error', (e) => logLine('updater ERROR: ' + errText(e)));
  const check = () => autoUpdater.checkForUpdates().catch((e) => logLine('updater ERROR: ' + errText(e)));
  check();
  setInterval(check, 4 * 3600 * 1000);
}

ipcMain.handle('app:installUpdate', () => {
  if (!updateReady || playing) return { ok: false };
  autoUpdater.quitAndInstall();
  return { ok: true };
});

/* ---------------------------------------------------------------- Vestidor */

const currentAccount = (s) => s.accounts.find((a) => a.id === s.selectedAccount) || s.accounts[0] || null;
const readSkinFile = (file) => (file ? fsp.readFile(path.join(SKINS, file)).catch(() => null) : Promise.resolve(null));

// Texturas oficiales (capas, Steve/Alex) descargadas una vez y guardadas
async function capeTexture(hash) {
  const file = path.join(CAPE_CACHE, hash + '.png');
  const cached = await fsp.readFile(file).catch(() => null);
  if (cached) return cached;
  const r = await fetch(capeUrl(hash), { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (!skins.pngSize(buf)) throw new Error('no es PNG');
  await fsp.mkdir(CAPE_CACHE, { recursive: true });
  await fsp.writeFile(file, buf);
  return buf;
}

// Copia la skin y la capa de la cuenta a la instancia (el mod las lee de ahí al entrar a un mundo)
async function prepareGameSkin(acc, gameDir) {
  const choice = skins.normalizeChoice(acc.skin);
  let png = await readSkinFile(choice.file);
  // el servidor es offline y no pide skins a Mojang: lo premium que no se cambió en el Vestidor se manda desde aquí
  if (acc.type === 'microsoft' && (!png || !choice.cape)) {
    const premium = await skins.fetchPremiumSkin(acc.name).catch(() => null);
    if (premium && !png) {
      png = premium.png;
      choice.slim = premium.slim;
    }
    if (premium && !choice.cape) choice.cape = premium.cape;
  }
  await skins.writeGameSkin(gameDir, png, choice);
  if (choice.cape) {
    // el mod usa esta copia y así no tiene que descargarla
    const tex = await capeTexture(choice.cape).catch(() => null);
    if (tex) {
      await fsp.mkdir(path.join(gameDir, 'cachusafio', 'capes'), { recursive: true });
      await fsp.writeFile(path.join(gameDir, 'cachusafio', 'capes', choice.cape + '.png'), tex);
    }
  }
}

ipcMain.handle('skins:get', async () => {
  const s = await loadSettings();
  const acc = currentAccount(s);
  if (!acc) return null;
  const c = skins.normalizeChoice(acc.skin);
  const png = await readSkinFile(c.file);
  return { png: png ? skins.pngToDataUrl(png) : null, slim: c.slim, cape: c.cape, base: await baseSkin(acc) };
});

// Cómo se ve la cuenta sin skin del Vestidor: su skin premium, o Steve/Alex como en el juego
const baseSkinCache = new Map();
async function baseSkin(acc) {
  if (baseSkinCache.has(acc.id)) return baseSkinCache.get(acc.id);
  let out = null;
  if (acc.type === 'microsoft') {
    out = await skins.fetchPremiumSkin(acc.name).then((r) => ({ png: skins.pngToDataUrl(r.png), slim: r.slim }), () => null);
    if (out) baseSkinCache.set(acc.id, out);
  }
  if (!out) {
    // sin conexión con Mojang se muestra Steve/Alex por ahora, pero sin guardarlo: la próxima vez se reintenta
    const d = skins.defaultSkinFor(acc.uuid);
    out = await capeTexture(d.hash).then((b) => ({ png: skins.pngToDataUrl(b), slim: d.slim }), () => null);
    if (out && acc.type !== 'microsoft') baseSkinCache.set(acc.id, out);
  }
  return out;
}

// png: data URL = skin nueva, null = volver a la normal, undefined = no cambiarla
ipcMain.handle('skins:save', async (_e, { png, slim, cape } = {}) => {
  const s = await loadSettings();
  const acc = currentAccount(s);
  if (!acc) return { ok: false, error: 'noAccount' };
  if (cape != null && !isCapeHash(cape)) return { ok: false, error: 'skinBadCape' };
  const c = skins.normalizeChoice(acc.skin);
  if (png !== undefined) {
    if (c.file) await fsp.rm(path.join(SKINS, c.file), { force: true });
    c.file = null;
    if (png !== null) {
      const buf = skins.dataUrlToPng(png);
      const bad = buf ? skins.checkSkin(buf) : 'skinNotPng';
      if (bad) return { ok: false, error: bad };
      await fsp.mkdir(SKINS, { recursive: true });
      c.file = crypto.createHash('sha1').update(acc.id).digest('hex').slice(0, 16) + '-' + Date.now().toString(36) + '.png';
      await fsp.writeFile(path.join(SKINS, c.file), buf);
    }
  }
  c.slim = !!slim;
  c.cape = cape || null;
  acc.skin = c;
  await saveSettings();
  return { ok: true };
});

// Lista de capas con su textura (data URL); las que no se pudieron bajar vienen con png: null
ipcMain.handle('skins:capes', async () => {
  const out = CAPES.map((c) => ({ ...c, png: null }));
  let next = 0;
  const worker = async () => {
    while (next < out.length) {
      const c = out[next++];
      const buf = await capeTexture(c.hash).catch((e) => { logLine(`capa ${c.id}: ${errText(e)}`); return null; });
      if (buf) c.png = skins.pngToDataUrl(buf);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return out;
});

ipcMain.handle('skins:fromPlayer', async (_e, name) => {
  try {
    const { png, slim } = await skins.fetchPremiumSkin(String(name || '').trim());
    return { ok: true, png: skins.pngToDataUrl(png), slim };
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
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
  app.whenReady().then(() => {
    protocol.handle('cachu', (req) => {
      const u = new URL(req.url);
      const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      const file = path.resolve(CUSTOM, ...parts);
      if (u.host !== 'custom' || parts.length !== 2 || !file.startsWith(path.resolve(CUSTOM) + path.sep)) {
        return new Response('', { status: 404 });
      }
      return net.fetch(pathToFileURL(file).toString());
    });
    createWindow();
    startAutoUpdate();
  });
  app.on('window-all-closed', () => app.quit());
}
