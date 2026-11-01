/* global api, sfx */
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------ idiomas */
const T = {
  es: {
    'login.title': 'Inicia sesión',
    'login.sub': 'Con tu cuenta de Microsoft puedes entrar a servidores premium. Si el servidor no la pide, basta con un nombre.',
    'login.ms': 'Cuenta Microsoft', 'login.offline': 'Jugar sin cuenta',
    'login.nick': 'Tu nombre de jugador', 'login.enter': 'Entrar', lang: 'Idioma',
    play: 'Jugar', playing: 'En juego', preparing: 'Preparando…',
    ready: 'Listo para jugar', error: 'Error',
    'java.download': 'Descargando Java {major} (solo la primera vez)…',
    'java.download.mb': 'Descargando Java {major}… {mb} MB',
    'java.install': 'Instalando Java…',
    'loader.install': 'Instalando {loader}…',
    'loader.install.slow': 'Instalando {loader} (puede tardar unos minutos)…',
    'pack.check': 'Buscando actualizaciones del modpack…',
    'pack.verify': 'Verificando archivos… {done}/{total}',
    'pack.download': 'Descargando {file} ({done}/{total}) · {mb} de {totalMb} MB',
    'pack.retry': 'Reintentando {file} (intento {attempt}/{max})…',
    'pack.retry2': 'Reintentando {count} archivo(s) que fallaron…',
    'game.auth': 'Verificando tu cuenta…',
    'game.download': 'Descargando Minecraft ({type})…',
    'game.start': 'Iniciando Minecraft…',
    'game.running': 'Minecraft en ejecución',
    'game.crashed': 'Minecraft se cerró con error (código {code})',
    accounts: 'Cuentas', addMs: 'Agregar cuenta Microsoft', addOffline: 'Agregar cuenta offline',
    microsoft: 'Microsoft', offline: 'Offline', modpacks: 'Modpacks',
    addPack: 'Agregar modpack',
    addPackSub: 'Pega el enlace del manifest.json del modpack o escribe usuario/repositorio de GitHub.',
    add: 'Agregar', cancel: 'Cancelar', close: 'Cerrar', save: 'Guardar',
    settings: 'Ajustes', ram: 'Memoria RAM', ramWarn: 'Tu PC tiene {total} GB: deja al menos 2–3 GB para el sistema.',
    gpu: 'Usar gráfica NVIDIA', gpuHint: 'Solo Linux con gráfica Intel/AMD + NVIDIA. Actívalo si en el juego (F3) aparece Intel o Mesa.',
    openFolder: 'Abrir carpeta del modpack', openLog: 'Ver último log',
    hideOnLaunch: 'Ocultar el launcher mientras juegas', hideOnLaunchHint: 'Vuelve a aparecer al cerrar Minecraft.',
    secGame: 'Juego', secLauncher: 'Launcher', secPack: 'Este modpack',
    removePack: 'Quitar modpack', removeSure: '¿Quitar "{name}"? También puedes borrar sus archivos del disco.',
    removeKeep: 'Quitar (conservar archivos)', removeDelete: 'Quitar y borrar archivos',
    noAccount: 'Primero inicia sesión.', noPack: 'No hay modpack seleccionado.',
    alreadyRunning: 'El juego ya se está ejecutando.', alreadyAdded: 'Ese modpack ya está agregado.',
    invalidName: 'El nombre debe tener 3–16 caracteres: letras, números o guion bajo.',
    msExpired: 'Tu sesión de Microsoft expiró o fue revocada. Quita la cuenta y vuelve a agregarla.',
    emptyTitle: 'Sin modpacks', emptySub: 'Agrega uno desde la barra lateral.',
    offlinePack: 'Sin conexión: usando datos guardados', logout: 'Quitar cuenta',
    sound: 'Sonidos', volume: 'Volumen',
    kill: 'Cerrar juego', killSure: '¿Forzar el cierre de Minecraft? Se pierde lo que no se haya guardado.',
    update: 'Versión {v} disponible — descargar',
    crashTitle: 'Minecraft se cerró con error',
    crashSub: 'Código {code}. Estas son las últimas líneas del log; si pides ayuda, copia y pega esto.',
    copy: 'Copiar', copied: 'Copiado',
  },
  en: {
    'login.title': 'Sign in',
    'login.sub': 'A Microsoft account lets you join premium servers. If the server does not require one, a name is enough.',
    'login.ms': 'Microsoft account', 'login.offline': 'Play without an account',
    'login.nick': 'Your player name', 'login.enter': 'Enter', lang: 'Language',
    play: 'Play', playing: 'Playing', preparing: 'Preparing…',
    ready: 'Ready to play', error: 'Error',
    'java.download': 'Downloading Java {major} (first time only)…',
    'java.download.mb': 'Downloading Java {major}… {mb} MB',
    'java.install': 'Installing Java…',
    'loader.install': 'Installing {loader}…',
    'loader.install.slow': 'Installing {loader} (may take a few minutes)…',
    'pack.check': 'Checking modpack updates…',
    'pack.verify': 'Verifying files… {done}/{total}',
    'pack.download': 'Downloading {file} ({done}/{total}) · {mb} of {totalMb} MB',
    'pack.retry': 'Retrying {file} (attempt {attempt}/{max})…',
    'pack.retry2': 'Retrying {count} failed file(s)…',
    'game.auth': 'Verifying your account…',
    'game.download': 'Downloading Minecraft ({type})…',
    'game.start': 'Starting Minecraft…',
    'game.running': 'Minecraft is running',
    'game.crashed': 'Minecraft closed with an error (code {code})',
    accounts: 'Accounts', addMs: 'Add Microsoft account', addOffline: 'Add offline account',
    microsoft: 'Microsoft', offline: 'Offline', modpacks: 'Modpacks',
    addPack: 'Add modpack',
    addPackSub: "Paste the modpack's manifest.json link or type a GitHub user/repository.",
    add: 'Add', cancel: 'Cancel', close: 'Close', save: 'Save',
    settings: 'Settings', ram: 'RAM', ramWarn: 'Your PC has {total} GB: leave at least 2–3 GB for the system.',
    gpu: 'Use NVIDIA GPU', gpuHint: 'Linux only, with Intel/AMD + NVIDIA graphics. Turn it on if the game (F3) shows Intel or Mesa.',
    openFolder: 'Open modpack folder', openLog: 'View last log',
    hideOnLaunch: 'Hide the launcher while playing', hideOnLaunchHint: 'It comes back when Minecraft closes.',
    secGame: 'Game', secLauncher: 'Launcher', secPack: 'This modpack',
    removePack: 'Remove modpack', removeSure: 'Remove "{name}"? You can also delete its files from disk.',
    removeKeep: 'Remove (keep files)', removeDelete: 'Remove and delete files',
    noAccount: 'Please log in first.', noPack: 'No modpack selected.',
    alreadyRunning: 'The game is already running.', alreadyAdded: 'That modpack is already added.',
    invalidName: 'Name must be 3–16 characters: letters, numbers or underscore.',
    msExpired: 'Your Microsoft session expired or was revoked. Remove the account and add it again.',
    emptyTitle: 'No modpacks', emptySub: 'Add one from the sidebar.',
    offlinePack: 'Offline: using saved data', logout: 'Remove account',
    sound: 'Sounds', volume: 'Volume',
    kill: 'Close game', killSure: 'Force Minecraft to close? Anything not saved will be lost.',
    update: 'Version {v} available — download',
    crashTitle: 'Minecraft closed with an error',
    crashSub: 'Code {code}. These are the last lines of the log; if you ask for help, copy and paste this.',
    copy: 'Copy', copied: 'Copied',
  },
};

let S = null; // estado
let lang = 'es';
let busy = false;

const t = (k, p = {}) => (T[lang][k] ?? T.es[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => p[n] ?? '');
const msg = (e) => (T.es[e] ? t(e) : e); // si el error es una clave conocida, se traduce
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  $('lang-login').value = lang;
}

const head = (a, size = 64) =>
  a ? `https://mc-heads.net/avatar/${encodeURIComponent(a.type === 'offline' ? a.name : a.uuid)}/${size}` : '';
const STEVE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#6b4a35"/><rect y="3" width="8" height="5" fill="#d2a47c"/><rect x="1" y="4" width="2" height="1" fill="#fff"/><rect x="5" y="4" width="2" height="1" fill="#fff"/><rect x="2" y="4" width="1" height="1" fill="#4a3aa8"/><rect x="5" y="4" width="1" height="1" fill="#4a3aa8"/></svg>');

// "Create Extra" → "CE", "Cachusafio" → "CA": dos packs con la misma inicial ya no se ven iguales
const initials = (name = '?') => {
  const w = name.trim().split(/\s+/);
  return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase();
};

const LOADERS = { forge: 'Forge', neoforge: 'NeoForge', fabric: 'Fabric', quilt: 'Quilt', vanilla: 'Vanilla' };

const curPack = () => S.packs.find((p) => p.id === S.selectedPack) || S.packs[0] || null;
const curAcc = () => S.accounts.find((a) => a.id === S.selectedAccount) || S.accounts[0] || null;

/* ------------------------------------------------------------ pantallas */
function show() {
  const logged = S.accounts.length > 0;
  $('login').classList.toggle('hidden', logged);
  $('app').classList.toggle('hidden', !logged);
  if (logged) {
    renderRail();
    renderStage();
  }
}

// reinicia una animación CSS (quita la clase, fuerza el reflow y la vuelve a poner)
function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

let lastStagePack = null;
let prevGameState = 'idle';

function renderRail() {
  $('brand-name').textContent = S.appName;
  $('brand-ver').textContent = 'v' + S.version;
  const box = $('packs');
  box.innerHTML = '';
  for (const p of S.packs) {
    const b = document.createElement('button');
    b.className = 'pack' + (p.id === curPack()?.id ? ' active' : '') + (p.offline ? ' offline' : '');
    b.title = p.offline ? t('offlinePack') : p.name;
    b.innerHTML = '<span class="ico"></span><span class="n"><b></b><small></small></span>';
    const ico = b.querySelector('.ico');
    if (p.icon) {
      const im = document.createElement('img');
      im.src = p.icon;
      im.onerror = () => { im.remove(); ico.textContent = initials(p.name); };
      ico.appendChild(im);
    } else ico.textContent = initials(p.name);
    b.querySelector('b').textContent = p.name;
    b.querySelector('small').textContent = [p.minecraft, LOADERS[p.loader] || p.loader].filter(Boolean).join(' · ');
    b.onclick = () => {
      if (busy) return;
      S.selectedPack = p.id;
      api.selectPack(p.id);
      renderRail();
      renderStage();
    };
    box.appendChild(b);
  }
  const a = curAcc();
  const av = $('avatar');
  av.onerror = () => { av.onerror = null; av.src = STEVE; };
  av.src = a ? head(a) : STEVE;
  $('acc-name').textContent = a ? a.name : '';
  $('acc-type').textContent = a ? (a.type === 'microsoft' ? t('microsoft') : t('offline')) : '';
}

// Texto claro u oscuro sobre el color del modpack, según lo claro que sea ese color
function onAccent(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

function renderStage() {
  const p = curPack();
  const bg = $('stage-bg');
  const stagePackId = p ? p.id : null;
  if (stagePackId !== lastStagePack) {
    lastStagePack = stagePackId;
    retrigger($('stage'), 'swap');
  }
  const root = document.documentElement.style;
  if (p?.accent) {
    root.setProperty('--accent', p.accent);
    root.setProperty('--on-accent', onAccent(p.accent) || '#ffffff');
  } else {
    root.removeProperty('--accent');
    root.removeProperty('--on-accent');
  }
  bg.style.backgroundImage = p?.background ? `url("${p.background}")` : '';
  bg.classList.toggle('img', !!p?.background);
  bg.classList.toggle('empty', !p?.background);

  const logo = $('hero-logo');
  if (p?.logo) {
    logo.src = p.logo;
    logo.classList.remove('hidden');
    $('hero-title').classList.add('hidden');
  } else {
    logo.classList.add('hidden');
    $('hero-title').classList.remove('hidden');
    $('hero-title').textContent = p ? p.name : t('emptyTitle');
  }
  $('hero-desc').textContent = p ? p.description || '' : t('emptySub');
  const chips = p ? [p.minecraft && 'Minecraft ' + p.minecraft, LOADERS[p.loader] || p.loader, p.version && 'v' + p.version] : [];
  $('hero-meta').innerHTML = chips.filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join('');
  $('btn-play').disabled = !p || busy;
  $('btn-folder').disabled = !p;
  if (!busy) $('status').textContent = p ? (p.offline ? t('offlinePack') : t('ready')) : '';
  document.title = `${S.appName} Launcher ${S.version}`;
}

/* ------------------------------------------------------------ progreso */
api.onStatus(({ key, params, percent }) => {
  $('status').textContent = t(key, params);
  if (key === 'game.crashed') sfx.error();
  const running = key === 'game.running';
  $('bar').classList.toggle('hidden', running || key === 'ready');
  const f = $('fill');
  f.classList.toggle('indeterminate', percent == null);
  if (percent != null) f.style.width = Math.max(0, Math.min(100, percent)) + '%';
});

api.onGameState((st) => {
  busy = st !== 'idle';
  if (st === 'running' && prevGameState !== 'running') sfx.success();
  prevGameState = st;
  const btn = $('btn-play');
  btn.disabled = busy || !curPack();
  btn.classList.toggle('running', st === 'running');
  $('btn-kill').classList.toggle('hidden', st !== 'running');
  $('play-label').textContent = st === 'running' ? t('playing') : st === 'preparing' ? t('preparing') : t('play');
  if (st === 'idle') {
    $('bar').classList.add('hidden');
    setTimeout(() => !busy && renderStage(), 4000);
  }
});

api.onGameError(({ code, tail }) => {
  dialog(`<h3>${t('crashTitle')}</h3><p class="sub">${t('crashSub', { code })}</p>
    <pre id="d-tail">${esc(tail || '')}</pre>
    <div class="actions"><button class="btn" id="d-copy">${t('copy')}</button><button class="btn" id="d-log">${t('openLog')}</button><button class="btn primary" id="d-ok">${t('close')}</button></div>`);
  $('d-copy').onclick = async () => {
    await navigator.clipboard.writeText(tail || '');
    $('d-copy').textContent = t('copied');
  };
  $('d-log').onclick = () => api.openLog();
  $('d-ok').onclick = closeDialog;
});

$('btn-play').onclick = async () => {
  const p = curPack();
  if (!p || busy) return;
  sfx.play();
  $('bar').classList.remove('hidden');
  const r = await api.play(p.id);
  if (!r.ok) showError(msg(r.error));
};

$('btn-kill').onclick = () => {
  dialog(`<h3>${t('kill')}</h3><p class="sub">${t('killSure')}</p>
    <div class="actions"><button class="btn" id="d-cancel">${t('cancel')}</button><button class="btn danger" id="d-ok">${t('kill')}</button></div>`);
  $('d-cancel').onclick = closeDialog;
  $('d-ok').onclick = () => { api.killGame(); closeDialog(); };
};

/* ------------------------------------------------------------ login */
async function afterLogin() {
  sfx.success();
  S = await api.getState();
  show();
}

$('btn-ms').onclick = async () => {
  const b = $('btn-ms');
  b.disabled = true;
  $('login-error').textContent = '';
  const r = await api.loginMicrosoft();
  b.disabled = false;
  if (r.ok) await afterLogin();
  else $('login-error').textContent = /cancel|closed/i.test(r.error) ? '' : msg(r.error);
};
$('btn-show-offline').onclick = () => {
  $('btn-show-offline').classList.add('hidden');
  $('offline-form').classList.remove('hidden');
  $('offline-name').focus();
};
$('offline-form').onsubmit = async (e) => {
  e.preventDefault();
  const r = await api.loginOffline($('offline-name').value);
  if (r.ok) await afterLogin();
  else $('login-error').textContent = msg(r.error);
};
$('lang-login').onchange = (e) => setLang(e.target.value);

async function setLang(l) {
  lang = l;
  await api.setSettings({ lang: l });
  S.settings.lang = l;
  applyI18n();
  if (S.accounts.length) {
    renderRail();
    renderStage();
  }
}

/* ------------------------------------------------------------ menú de cuentas */
const menu = $('account-menu');
function openAccountMenu() {
  menu.innerHTML = '';
  for (const a of S.accounts) {
    const row = document.createElement('div');
    row.className = 'acc' + (a.id === curAcc()?.id ? ' sel' : '');
    row.innerHTML = `<img alt=""><div class="n"><b></b><small></small></div><button class="x" title="${t('logout')}">✕</button>`;
    const im = row.querySelector('img');
    im.src = head(a);
    im.onerror = () => { im.onerror = null; im.src = STEVE; };
    row.querySelector('b').textContent = a.name;
    row.querySelector('small').textContent = a.type === 'microsoft' ? t('microsoft') : t('offline');
    row.onclick = async (ev) => {
      if (ev.target.closest('.x')) return;
      S.selectedAccount = a.id;
      await api.selectAccount(a.id);
      menu.classList.add('hidden');
      renderRail();
    };
    row.querySelector('.x').onclick = async () => {
      const r = await api.removeAccount(a.id);
      S.accounts = S.accounts.filter((x) => x.id !== a.id);
      S.selectedAccount = r.selectedAccount;
      menu.classList.add('hidden');
      show();
    };
    menu.appendChild(row);
  }
  menu.insertAdjacentHTML('beforeend', `<hr><button class="item" id="m-ms">${t('addMs')}</button><button class="item" id="m-off">${t('addOffline')}</button>`);
  $('m-ms').onclick = async () => {
    menu.classList.add('hidden');
    const r = await api.loginMicrosoft();
    if (r.ok) await afterLogin();
    else if (!/cancel|closed/i.test(r.error)) showError(msg(r.error));
  };
  $('m-off').onclick = () => {
    menu.classList.add('hidden');
    dialog(`<h3>${t('addOffline')}</h3><input type="text" id="d-nick" maxlength="16" spellcheck="false" placeholder="${t('login.nick')}"><p class="err" id="d-err"></p>
      <div class="actions"><button class="btn" id="d-cancel">${t('cancel')}</button><button class="btn primary" id="d-ok">${t('add')}</button></div>`);
    $('d-nick').focus();
    $('d-cancel').onclick = closeDialog;
    const go = async () => {
      const r = await api.loginOffline($('d-nick').value);
      if (r.ok) { closeDialog(); await afterLogin(); } else $('d-err').textContent = msg(r.error);
    };
    $('d-ok').onclick = go;
    $('d-nick').onkeydown = (e) => e.key === 'Enter' && go();
  };
  menu.classList.remove('hidden');
  sfx.open();
}
$('btn-account').onclick = (e) => {
  e.stopPropagation();
  menu.classList.contains('hidden') ? openAccountMenu() : menu.classList.add('hidden');
};
document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.classList.add('hidden'); });

/* ------------------------------------------------------------ diálogos */
function dialog(html) {
  $('dialog').innerHTML = html;
  if ($('modal').classList.contains('hidden')) sfx.open();
  $('modal').classList.remove('hidden');
}
function closeDialog() {
  if ($('modal').classList.contains('hidden')) return;
  sfx.close();
  $('modal').classList.add('hidden');
}
$('modal').onclick = (e) => { if (e.target === $('modal')) closeDialog(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDialog(); });

function showError(text) {
  dialog(`<h3>${t('error')}</h3><p class="sub" style="user-select:text;white-space:pre-wrap">${esc(text)}</p>
    <div class="actions"><button class="btn" id="d-log">${t('openLog')}</button><button class="btn primary" id="d-ok">${t('close')}</button></div>`);
  $('d-ok').onclick = closeDialog;
  $('d-log').onclick = () => api.openLog();
  sfx.error();
}

$('btn-add').onclick = () => {
  dialog(`<h3>${t('addPack')}</h3><p class="sub">${t('addPackSub')}</p>
    <input type="text" id="d-url" spellcheck="false" placeholder="https://…/manifest.json  |  usuario/repo"><p class="err" id="d-err"></p>
    <div class="actions"><button class="btn" id="d-cancel">${t('cancel')}</button><button class="btn primary" id="d-ok">${t('add')}</button></div>`);
  $('d-url').focus();
  $('d-cancel').onclick = closeDialog;
  const go = async () => {
    $('d-ok').disabled = true;
    const r = await api.addPack($('d-url').value);
    $('d-ok').disabled = false;
    if (r.ok) {
      S.packs = r.packs;
      S.selectedPack = r.selectedPack;
      closeDialog();
      renderRail();
      renderStage();
    } else $('d-err').textContent = msg(r.error);
  };
  $('d-ok').onclick = go;
  $('d-url').onkeydown = (e) => e.key === 'Enter' && go();
};

$('btn-folder').onclick = () => api.openFolder(curPack()?.id || null);
$('btn-log').onclick = () => api.openLog();

const toggle = (id) => `<label class="switch"><input type="checkbox" id="${id}"><span class="slider"></span></label>`;

$('btn-settings').onclick = async () => {
  const info = await api.systemInfo();
  const max = Math.max(4, Math.min(32, info.totalRamGb));
  const p = curPack();
  const ramWarn = (gb) => (info.totalRamGb && gb > info.totalRamGb - 2 ? t('ramWarn', { total: info.totalRamGb }) : '');
  dialog(`<h3>${t('settings')}</h3>
    <h4>${t('secGame')}</h4>
    <div class="row"><span>${t('ram')}</span><b id="ram-val">${S.settings.ramGb} GB</b></div>
    <input type="range" id="ram" min="2" max="${max}" step="1" value="${Math.min(S.settings.ramGb, max)}">
    <p class="hint warn" id="ram-warn" style="font-size:12px;min-height:16px">${ramWarn(S.settings.ramGb)}</p>
    ${S.platform === 'linux' ? `<div class="row"><span>${t('gpu')}<small class="hint">${t('gpuHint')}</small></span>${toggle('gpu-on')}</div>` : ''}
    <div class="row"><span>${t('hideOnLaunch')}<small class="hint">${t('hideOnLaunchHint')}</small></span>${toggle('hide-on')}</div>
    <h4>${t('secLauncher')}</h4>
    <div class="row"><span>${t('lang')}</span><select id="d-lang"><option value="es">Español</option><option value="en">English</option></select></div>
    <div class="row"><span>${t('sound')}</span>${toggle('sfx-on')}</div>
    <div class="row"><span>${t('volume')}</span><b id="sfx-val">${Math.round(sfx.getVol() * 100)}%</b></div>
    <input type="range" id="sfx-vol" min="0" max="100" step="5" value="${Math.round(sfx.getVol() * 100)}">
    ${p ? `<h4>${t('secPack')}</h4><div class="row"><span>${esc(p.name)}</span><button class="btn danger" id="d-remove">${t('removePack')}</button></div>` : ''}
    <div class="actions"><button class="btn primary" id="d-ok">${t('close')}</button></div>`);
  $('d-lang').value = lang;
  $('sfx-on').checked = sfx.isOn();
  $('sfx-vol').disabled = !sfx.isOn();
  $('sfx-on').onchange = (e) => { sfx.setOn(e.target.checked); $('sfx-vol').disabled = !e.target.checked; sfx.click(); };
  $('sfx-vol').oninput = (e) => { sfx.setVol(Number(e.target.value) / 100); $('sfx-val').textContent = e.target.value + '%'; };
  $('sfx-vol').onchange = () => sfx.click();
  $('ram').oninput = (e) => {
    $('ram-val').textContent = e.target.value + ' GB';
    $('ram-warn').textContent = ramWarn(Number(e.target.value));
  };
  $('ram').onchange = async (e) => { S.settings.ramGb = Number(e.target.value); await api.setSettings({ ramGb: e.target.value }); };
  if ($('gpu-on')) {
    $('gpu-on').checked = !!S.settings.nvidiaGpu;
    $('gpu-on').onchange = async (e) => { S.settings.nvidiaGpu = e.target.checked; await api.setSettings({ nvidiaGpu: e.target.checked }); };
  }
  $('hide-on').checked = !!S.settings.hideOnLaunch;
  $('hide-on').onchange = async (e) => { S.settings.hideOnLaunch = e.target.checked; await api.setSettings({ hideOnLaunch: e.target.checked }); };
  $('d-lang').onchange = (e) => { setLang(e.target.value); $('btn-settings').click(); };
  $('d-ok').onclick = closeDialog;
  if (p) {
    $('d-remove').onclick = () => {
      dialog(`<h3>${t('removePack')}</h3><p class="sub">${t('removeSure', { name: esc(p.name) })}</p>
        <div class="actions"><button class="btn" id="d-cancel">${t('cancel')}</button><button class="btn" id="d-keep">${t('removeKeep')}</button><button class="btn danger" id="d-del">${t('removeDelete')}</button></div>`);
      $('d-cancel').onclick = closeDialog;
      const rm = async (del) => {
        const r = await api.removePack(p.id, del);
        S.packs = r.packs;
        S.selectedPack = r.selectedPack;
        closeDialog();
        renderRail();
        renderStage();
      };
      $('d-keep').onclick = () => rm(false);
      $('d-del').onclick = () => rm(true);
    };
  }
};

/* ------------------------------------------------------------ inicio */
(async function init() {
  S = await api.getState();
  lang = S.settings.lang;
  applyI18n();
  show();
  // actualiza nombres/iconos/fondos desde internet sin bloquear la ventana
  api.refreshPacks().then((packs) => {
    S.packs = packs;
    if (S.accounts.length) { renderRail(); renderStage(); }
  }).catch(() => {});
  // aviso discreto si hay una versión nueva del launcher en GitHub
  api.checkUpdate().then((u) => {
    if (!u) return;
    const a = $('update');
    a.href = u.url;
    a.textContent = t('update', { v: u.version });
    a.classList.remove('hidden');
  }).catch(() => {});
})();
