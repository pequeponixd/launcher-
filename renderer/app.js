/* global api */
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------ idiomas */
const T = {
  es: {
    'login.title1': 'POR FAVOR', 'login.title2': 'INICIA SESIÓN', 'login.title3': 'CON TU CUENTA',
    'login.ms': 'Cuenta Microsoft', 'login.offline': 'Jugar sin cuenta (modo offline)',
    'login.nick': 'Tu nombre de jugador', 'login.enter': 'Entrar', lang: 'Idioma',
    play: 'Jugar', playing: 'En juego…', preparing: 'Preparando…',
    ready: 'Listo para jugar', error: 'Error',
    'java.download': 'Descargando Java {major} (solo la primera vez)…',
    'java.download.mb': 'Descargando Java {major}… {mb} MB',
    'java.install': 'Instalando Java…',
    'loader.install': 'Instalando {loader}…',
    'loader.install.slow': 'Instalando {loader} (puede tardar unos minutos)…',
    'pack.check': 'Buscando actualizaciones del modpack…',
    'pack.verify': 'Verificando archivos… {done}/{total}',
    'pack.download': 'Descargando {file} ({done}/{total})',
    'game.auth': 'Verificando tu cuenta…',
    'game.download': 'Descargando Minecraft ({type})…',
    'game.start': 'Iniciando Minecraft…',
    'game.running': 'Minecraft en ejecución',
    'game.crashed': 'Minecraft se cerró con error (código {code})',
    accounts: 'Cuentas', addMs: 'Agregar cuenta Microsoft', addOffline: 'Agregar cuenta offline',
    microsoft: 'Microsoft', offline: 'Offline',
    addPack: 'Agregar modpack',
    addPackSub: 'Pega el enlace del manifest.json del modpack o escribe usuario/repositorio de GitHub.',
    add: 'Agregar', cancel: 'Cancelar', close: 'Cerrar', save: 'Guardar',
    settings: 'Ajustes', ram: 'Memoria RAM', openFolder: 'Abrir carpeta del juego', openLog: 'Ver último log',
    removePack: 'Quitar modpack', removeSure: '¿Quitar "{name}"? También puedes borrar sus archivos del disco.',
    removeKeep: 'Quitar (conservar archivos)', removeDelete: 'Quitar y borrar archivos',
    noAccount: 'Primero inicia sesión.', noPack: 'No hay modpack seleccionado.',
    alreadyRunning: 'El juego ya se está ejecutando.', alreadyAdded: 'Ese modpack ya está agregado.',
    invalidName: 'El nombre debe tener 3–16 caracteres: letras, números o guion bajo.',
    emptyTitle: 'Agrega un modpack', emptySub: 'Pulsa + para agregar tu primer modpack.',
    offlinePack: 'Sin conexión: usando datos guardados', logout: 'Quitar cuenta',
    sound: 'Sonidos', volume: 'Volumen',
  },
  en: {
    'login.title1': 'PLEASE', 'login.title2': 'LOG-IN', 'login.title3': 'WITH YOUR ACCOUNT',
    'login.ms': 'Microsoft Account', 'login.offline': 'Play without account (offline mode)',
    'login.nick': 'Your player name', 'login.enter': 'Enter', lang: 'Language',
    play: 'Play', playing: 'Playing…', preparing: 'Preparing…',
    ready: 'Ready to play', error: 'Error',
    'java.download': 'Downloading Java {major} (first time only)…',
    'java.download.mb': 'Downloading Java {major}… {mb} MB',
    'java.install': 'Installing Java…',
    'loader.install': 'Installing {loader}…',
    'loader.install.slow': 'Installing {loader} (may take a few minutes)…',
    'pack.check': 'Checking modpack updates…',
    'pack.verify': 'Verifying files… {done}/{total}',
    'pack.download': 'Downloading {file} ({done}/{total})',
    'game.auth': 'Verifying your account…',
    'game.download': 'Downloading Minecraft ({type})…',
    'game.start': 'Starting Minecraft…',
    'game.running': 'Minecraft is running',
    'game.crashed': 'Minecraft closed with an error (code {code})',
    accounts: 'Accounts', addMs: 'Add Microsoft account', addOffline: 'Add offline account',
    microsoft: 'Microsoft', offline: 'Offline',
    addPack: 'Add modpack',
    addPackSub: "Paste the modpack's manifest.json link or type a GitHub user/repository.",
    add: 'Add', cancel: 'Cancel', close: 'Close', save: 'Save',
    settings: 'Settings', ram: 'RAM', openFolder: 'Open game folder', openLog: 'View last log',
    removePack: 'Remove modpack', removeSure: 'Remove "{name}"? You can also delete its files from disk.',
    removeKeep: 'Remove (keep files)', removeDelete: 'Remove and delete files',
    noAccount: 'Please log in first.', noPack: 'No modpack selected.',
    alreadyRunning: 'The game is already running.', alreadyAdded: 'That modpack is already added.',
    invalidName: 'Name must be 3–16 characters: letters, numbers or underscore.',
    emptyTitle: 'Add a modpack', emptySub: 'Press + to add your first modpack.',
    offlinePack: 'Offline: using saved data', logout: 'Remove account',
    sound: 'Sounds', volume: 'Volume',
  },
};

let S = null; // estado
let lang = 'es';
let busy = false;

const t = (k, p = {}) => (T[lang][k] ?? T.es[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => p[n] ?? '');
const msg = (e) => (T.es[e] ? t(e) : e); // si el error es una clave conocida, se traduce

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  $('lang-login').value = lang;
}

const head = (a, size = 64) =>
  a ? `https://mc-heads.net/avatar/${encodeURIComponent(a.type === 'offline' ? a.name : a.uuid)}/${size}` : '';
const STEVE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#6b4a35"/><rect y="3" width="8" height="5" fill="#d2a47c"/><rect x="1" y="4" width="2" height="1" fill="#fff"/><rect x="5" y="4" width="2" height="1" fill="#fff"/><rect x="2" y="4" width="1" height="1" fill="#4a3aa8"/><rect x="5" y="4" width="1" height="1" fill="#4a3aa8"/></svg>');

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

let railAnimated = false; // los iconos de la barra solo "entran" la primera vez
let lastStagePack = null;
let prevGameState = 'idle';

function renderRail() {
  const box = $('packs');
  box.innerHTML = '';
  for (const [i, p] of S.packs.entries()) {
    const b = document.createElement('button');
    b.className = 'pack' + (p.id === curPack()?.id ? ' active' : '') + (p.offline ? ' offline' : '') + (railAnimated ? '' : ' enter');
    b.style.setProperty('--i', i);
    b.title = p.name + (p.offline ? ` — ${t('offlinePack')}` : '');
    if (p.icon) {
      const im = document.createElement('img');
      im.src = p.icon;
      im.onerror = () => { im.remove(); b.textContent = p.name[0]; };
      b.appendChild(im);
    } else b.textContent = (p.name || '?')[0].toUpperCase();
    b.onclick = async () => {
      if (busy) return;
      S.selectedPack = p.id;
      api.selectPack(p.id);
      renderRail();
      renderStage();
    };
    box.appendChild(b);
  }
  railAnimated = true;
  const a = curAcc();
  const av = $('avatar');
  av.onerror = () => { av.onerror = null; av.src = STEVE; };
  av.src = a ? head(a) : STEVE;
}

function renderStage() {
  const p = curPack();
  const bg = $('stage-bg');
  const stagePackId = p ? p.id : null;
  if (stagePackId !== lastStagePack) {
    lastStagePack = stagePackId;
    retrigger($('stage'), 'swap'); // transición al cambiar de modpack
  }
  if (p?.accent) document.documentElement.style.setProperty('--accent', p.accent);
  else document.documentElement.style.removeProperty('--accent');
  bg.style.background = p?.background ? `url("${p.background}") center/cover no-repeat, #05060a` : '';

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
  $('hero-meta').textContent = p ? [p.minecraft, p.loader, p.version].filter(Boolean).join('  ·  ') : '';
  $('btn-play').disabled = !p || busy;
  $('play-label').textContent = busy ? t('preparing') : t('play');
  document.title = `${S.appName} Launcher ${S.version}`;
}

/* ------------------------------------------------------------ progreso */
api.onStatus(({ key, params, percent }) => {
  const prog = $('progress');
  prog.classList.remove('hidden');
  $('status').textContent = t(key, params);
  if (key === 'game.crashed') sfx.error();
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
  $('play-label').textContent = st === 'running' ? t('playing') : st === 'preparing' ? t('preparing') : t('play');
  if (st === 'idle') setTimeout(() => !busy && $('progress').classList.add('hidden'), 4000);
});

$('btn-play').onclick = async () => {
  const p = curPack();
  if (!p || busy) return;
  sfx.play();
  const r = await api.play(p.id);
  if (!r.ok) showError(msg(r.error));
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
  menu.insertAdjacentHTML('beforeend', `<hr><button class="item" id="m-ms">＋ ${t('addMs')}</button><button class="item" id="m-off">＋ ${t('addOffline')}</button>`);
  $('m-ms').onclick = async () => {
    menu.classList.add('hidden');
    const r = await api.loginMicrosoft();
    if (r.ok) await afterLogin();
    else if (!/cancel|closed/i.test(r.error)) showError(msg(r.error));
  };
  $('m-off').onclick = () => {
    menu.classList.add('hidden');
    dialog(`<h3>${t('addOffline')}</h3><input type="text" id="d-nick" maxlength="16" spellcheck="false" placeholder="${t('login.nick')}"><p class="err" id="d-err"></p>
      <div class="actions"><button id="d-cancel">${t('cancel')}</button><button class="primary" id="d-ok">${t('add')}</button></div>`);
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
  dialog(`<h3>${t('error')}</h3><p class="sub" style="user-select:text;white-space:pre-wrap">${String(text).replace(/</g, '&lt;')}</p>
    <div class="actions"><button id="d-log">${t('openLog')}</button><button class="primary" id="d-ok">${t('close')}</button></div>`);
  $('d-ok').onclick = closeDialog;
  $('d-log').onclick = () => api.openLog();
  sfx.error();
}

$('btn-add').onclick = () => {
  dialog(`<h3>${t('addPack')}</h3><p class="sub">${t('addPackSub')}</p>
    <input type="text" id="d-url" spellcheck="false" placeholder="https://…/manifest.json  |  usuario/repo"><p class="err" id="d-err"></p>
    <div class="actions"><button id="d-cancel">${t('cancel')}</button><button class="primary" id="d-ok">${t('add')}</button></div>`);
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

$('btn-settings').onclick = async () => {
  const info = await api.systemInfo();
  const max = Math.max(4, Math.min(32, info.totalRamGb));
  const p = curPack();
  dialog(`<h3>${t('settings')}</h3>
    <div class="row"><span>${t('ram')}</span><b id="ram-val">${S.settings.ramGb} GB</b></div>
    <input type="range" id="ram" min="2" max="${max}" step="1" value="${Math.min(S.settings.ramGb, max)}">
    <div class="row"><span>${t('lang')}</span><select id="d-lang"><option value="es">Español</option><option value="en">English</option></select></div>
    <div class="row"><span>${t('sound')}</span><label class="switch"><input type="checkbox" id="sfx-on"><span class="slider"></span></label></div>
    <div class="row"><span>${t('volume')}</span><b id="sfx-val">${Math.round(sfx.getVol() * 100)}%</b></div>
    <input type="range" id="sfx-vol" min="0" max="100" step="5" value="${Math.round(sfx.getVol() * 100)}">
    <div class="actions" style="justify-content:flex-start">
      <button id="d-folder">${t('openFolder')}</button><button id="d-log">${t('openLog')}</button>
      ${p ? `<button class="danger" id="d-remove">${t('removePack')}</button>` : ''}
    </div>
    <div class="actions"><button class="primary" id="d-ok">${t('close')}</button></div>`);
  $('d-lang').value = lang;
  $('sfx-on').checked = sfx.isOn();
  $('sfx-vol').disabled = !sfx.isOn();
  $('sfx-on').onchange = (e) => { sfx.setOn(e.target.checked); $('sfx-vol').disabled = !e.target.checked; sfx.click(); };
  $('sfx-vol').oninput = (e) => { sfx.setVol(Number(e.target.value) / 100); $('sfx-val').textContent = e.target.value + '%'; };
  $('sfx-vol').onchange = () => sfx.click();
  $('ram').oninput = (e) => ($('ram-val').textContent = e.target.value + ' GB');
  $('ram').onchange = async (e) => { S.settings.ramGb = Number(e.target.value); await api.setSettings({ ramGb: e.target.value }); };
  $('d-lang').onchange = (e) => { setLang(e.target.value); $('btn-settings').click(); };
  $('d-folder').onclick = () => api.openFolder(p ? p.id : null);
  $('d-log').onclick = () => api.openLog();
  $('d-ok').onclick = closeDialog;
  if (p) {
    $('d-remove').onclick = () => {
      dialog(`<h3>${t('removePack')}</h3><p class="sub">${t('removeSure', { name: p.name })}</p>
        <div class="actions"><button id="d-cancel">${t('cancel')}</button><button id="d-keep">${t('removeKeep')}</button><button class="danger" id="d-del">${t('removeDelete')}</button></div>`);
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
})();
