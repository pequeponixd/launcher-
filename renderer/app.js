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
    discord: 'Mostrar en Discord', discordHint: 'Tus amigos ven "Jugando Cachusafio" en tu perfil.',
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
    update: 'Versión {v} disponible. Descargar',
    crashTitle: 'Minecraft se cerró con error',
    crashSub: 'Código {code}. Estas son las últimas líneas del log; si pides ayuda, copia y pega esto.',
    copy: 'Copiar', copied: 'Copiado',
    serverOn: 'En línea · {online}/{max} jugadores', serverOff: 'Servidor apagado', serverChecking: 'Consultando servidor…',
    newsPending: 'Actualización del modpack', newsPendingSub: 'Se descarga al darle Jugar',
    newsLast: 'Novedades', newsNotes: 'Notas', newsAdded: 'Agregados', newsUpdated: 'Actualizados', newsRemoved: 'Quitados',
    updDownloading: 'Descargando actualización del launcher… {p}%', updReady: 'Reiniciar para actualizar a {v}',
    secCustom: 'Personalizar (solo en este PC)', icon: 'Icono', background: 'Fondo', logo: 'Logo', color: 'Color',
    change: 'Cambiar', reset: 'Restaurar', before: 'antes',
    serverTitle: 'En el servidor', serverNone: 'Este modpack todavía no tiene servidor.', nobody: 'No hay nadie conectado.',
    playersHidden: 'El servidor no muestra quién está conectado.', more: 'y {n} más', nickRule: '3 a 16 letras, números o guion bajo',
    updateFinding: 'Actualización lista: {changes}. Se descarga al darle Jugar.', filterAll: 'Todos', filterNew: 'Nuevos', filterUpdated: 'Actualizados', filterBig: 'Grandes',
    adminNoneFilter: 'Ningún mod en este filtro.',
    modNew1: '1 mod nuevo', modNewN: '{n} mods nuevos', modUp1: '1 actualizado', modUpN: '{n} actualizados', modRm1: '1 quitado', modRmN: '{n} quitados', and: 'y',
    admin: 'Administrar', adminTitle: 'Administrar modpack', adminRefresh: 'Actualizar', adminMods: 'Mods',
    adminFolder: 'Abrir carpeta', adminAdd: 'Agregar mods', adminDrop: 'Arrastra archivos .jar aquí',
    adminVersion: 'Versión', adminServer: 'IP del servidor', adminServerPh: 'Vacío: el botón abre la lista de servidores',
    adminNotes: 'Notas para los jugadores', adminNotesPh: 'Una línea por novedad', adminPublish: 'Publicar para todos',
    adminSyncOk: 'Al día con GitHub', adminSyncBad: 'No se pudieron traer los cambios de GitHub:', adminLoading: 'Revisando…',
    adminNoChanges: 'Sin cambios en los mods desde la última publicación.', adminBig: '>95 MB: va a un Release',
    adminNew: 'nuevo', adminUpdated: 'actualizado', adminRemoveSure: '¿Quitar {name}?',
    'admin.pull': 'Trayendo cambios de GitHub…', 'admin.big': 'Revisando archivos grandes…', 'admin.upload': 'Subiendo {file} al Release…',
    'admin.menu': 'Actualizando el menú del juego…', 'admin.manifest': 'Generando manifest…', 'admin.commit': 'Guardando cambios…',
    'admin.push': 'Subiendo a GitHub…', adminDone: 'Publicado: {title}. Les llegará a todos al darle Jugar.',
    secAdmin: 'Administrador', adminHint: 'Elige la carpeta donde clonaste el repo del modpack. Solo funciona si tu git tiene permiso para subir a ese repo.',
    adminChoose: 'Elegir carpeta', adminForget: 'Dejar de administrar',
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
    discord: 'Show on Discord', discordHint: 'Your friends see "Playing Cachusafio" on your profile.',
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
    update: 'Version {v} available. Download',
    crashTitle: 'Minecraft closed with an error',
    crashSub: 'Code {code}. These are the last lines of the log; if you ask for help, copy and paste this.',
    copy: 'Copy', copied: 'Copied',
    serverOn: 'Online · {online}/{max} players', serverOff: 'Server offline', serverChecking: 'Checking server…',
    newsPending: 'Modpack update', newsPendingSub: 'Downloads when you press Play',
    newsLast: "What's new", newsNotes: 'Notes', newsAdded: 'Added', newsUpdated: 'Updated', newsRemoved: 'Removed',
    updDownloading: 'Downloading launcher update… {p}%', updReady: 'Restart to update to {v}',
    secCustom: 'Customize (this PC only)', icon: 'Icon', background: 'Background', logo: 'Logo', color: 'Color',
    change: 'Change', reset: 'Reset', before: 'was',
    serverTitle: 'On the server', serverNone: 'This modpack has no server yet.', nobody: 'Nobody is online.',
    playersHidden: 'The server hides who is online.', more: 'and {n} more', nickRule: '3 to 16 letters, numbers or underscore',
    updateFinding: 'Update ready: {changes}. Downloads when you press Play.', filterAll: 'All', filterNew: 'New', filterUpdated: 'Updated', filterBig: 'Large',
    adminNoneFilter: 'No mods in this filter.',
    modNew1: '1 new mod', modNewN: '{n} new mods', modUp1: '1 updated', modUpN: '{n} updated', modRm1: '1 removed', modRmN: '{n} removed', and: 'and',
    admin: 'Manage', adminTitle: 'Manage modpack', adminRefresh: 'Refresh', adminMods: 'Mods',
    adminFolder: 'Open folder', adminAdd: 'Add mods', adminDrop: 'Drop .jar files here',
    adminVersion: 'Version', adminServer: 'Server address', adminServerPh: 'Empty: the button opens the server list',
    adminNotes: 'Notes for players', adminNotesPh: 'One line per change', adminPublish: 'Publish for everyone',
    adminSyncOk: 'Up to date with GitHub', adminSyncBad: 'Could not fetch changes from GitHub:', adminLoading: 'Checking…',
    adminNoChanges: 'No mod changes since the last publish.', adminBig: '>95 MB: goes to a Release',
    adminNew: 'new', adminUpdated: 'updated', adminRemoveSure: 'Remove {name}?',
    'admin.pull': 'Fetching changes from GitHub…', 'admin.big': 'Checking large files…', 'admin.upload': 'Uploading {file} to the Release…',
    'admin.menu': 'Updating the in-game menu…', 'admin.manifest': 'Building manifest…', 'admin.commit': 'Saving changes…',
    'admin.push': 'Pushing to GitHub…', adminDone: 'Published: {title}. Everyone gets it when they press Play.',
    secAdmin: 'Admin', adminHint: 'Pick the folder where you cloned the modpack repo. It only works if your git can push to that repo.',
    adminChoose: 'Choose folder', adminForget: 'Stop managing',
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
  document.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
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

const MISSING = '\u2014'; // valor que falta (raya gris), no un cero
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
let lastServerPack;
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
  $('btn-admin').classList.toggle('hidden', !S.adminRepo);
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

  // portada: el arte del modpack con su logo; el título de la pantalla es siempre el nombre
  const logo = $('hero-logo');
  logo.classList.toggle('hidden', !p?.logo);
  if (p?.logo) {
    logo.src = p.logo;
    logo.alt = p.name;
  }
  $('cover').classList.toggle('hidden', !p);
  $('hero-title').textContent = p ? p.name : t('emptyTitle');
  $('crumb').textContent = p ? p.description || '' : '';
  // la línea bajo el título dice lo más importante: si hay actualización, eso; si no, versión y loader
  const pend = p?.pending;
  const count = (k) => (pend ? pend[k].length : 0);
  if (pend && count('added') + count('updated') + count('removed')) {
    const parts = [
      count('added') && t(count('added') === 1 ? 'modNew1' : 'modNewN', { n: count('added') }),
      count('updated') && t(count('updated') === 1 ? 'modUp1' : 'modUpN', { n: count('updated') }),
      count('removed') && t(count('removed') === 1 ? 'modRm1' : 'modRmN', { n: count('removed') }),
    ].filter(Boolean);
    const joined = parts.length > 1 ? parts.slice(0, -1).join(', ') + ` ${t('and')} ` + parts[parts.length - 1] : parts[0];
    $('hero-desc').innerHTML = esc(t('updateFinding', { changes: joined })).replace(/^([^:]+:)/, '<b>$1</b>');
  } else {
    $('hero-desc').textContent = p ? [p.minecraft && 'Minecraft ' + p.minecraft, LOADERS[p.loader] || p.loader, p.version && 'v' + p.version].filter(Boolean).join(' · ') : t('emptySub');
  }
  $('hero-meta').textContent = p ? [p.minecraft && 'Minecraft ' + p.minecraft, LOADERS[p.loader] || p.loader].filter(Boolean).join(' · ') : '';
  renderNews(p);
  if (stagePackId !== lastServerPack) refreshServer();
  $('btn-play').disabled = !p || busy;
  $('btn-folder').disabled = !p;
  if (!busy) $('status').textContent = p ? (p.offline ? t('offlinePack') : t('ready')) : '';
  document.title = `${S.appName} Launcher ${S.version}`;
}

/* ------------------------------------------------------------ novedades */
function renderNews(p) {
  const box = $('news');
  const ch = p && (p.pending || p.lastChanges);
  const notes = (p?.changelog || []).filter((l) => l.trim());
  if (!ch && !notes.length) return box.classList.add('hidden');
  const list = (cls, items) => items.map((x) => `<li class="${cls}">${x}</li>`).join('');
  const date = p.lastChanges?.date ? new Date(p.lastChanges.date).toLocaleDateString(lang) : '';
  const title = p.pending ? t('newsPending') : t('newsLast') + (p.version ? ` · v${esc(p.version)}` : '');
  const sub = p.pending ? t('newsPendingSub') : date;
  let body = '';
  if (notes.length) body += `<div><h5>${t('newsNotes')}</h5><ul>${list('note', notes.map(esc))}</ul></div>`;
  if (ch?.added.length) body += `<div><h5>${t('newsAdded')}</h5><ul>${list('add', ch.added.map(esc))}</ul></div>`;
  if (ch?.updated.length) {
    // si cambió el nombre del archivo se muestra "antes → ahora"; si no, solo el nombre
    const up = ch.updated.map((u) => (u.from === u.to ? esc(u.to) : `${esc(u.to)} <small>(${t('before')} ${esc(u.from)})</small>`));
    body += `<div><h5>${t('newsUpdated')}</h5><ul>${list('up', up)}</ul></div>`;
  }
  if (ch?.removed.length) body += `<div><h5>${t('newsRemoved')}</h5><ul>${list('rm', ch.removed.map(esc))}</ul></div>`;
  box.innerHTML = `<header><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</header><div class="body">${body}</div>`;
  box.classList.remove('hidden');
}

/* ------------------------------------------------------------ estado del servidor */
async function refreshServer() {
  const p = curPack();
  lastServerPack = p ? p.id : null;
  const el = $('server');
  // sin servidor el panel mantiene su marco y lo dice en una frase
  if (!p?.server) {
    el.className = 'server';
    el.textContent = t('serverNone');
    $('server-count').textContent = MISSING;
    $('server-max').textContent = '';
    $('heads').innerHTML = '';
    return;
  }
  if (el.dataset.pack !== p.id) {
    el.dataset.pack = p.id;
    el.className = 'server';
    el.textContent = t('serverChecking');
    $('server-count').textContent = MISSING;
    $('server-max').textContent = '';
    $('heads').innerHTML = '';
  }
  const r = await api.serverStatus(p.id).catch(() => null);
  if (curPack()?.id !== p.id) return; // cambió de modpack mientras esperaba
  el.classList.toggle('on', !!r?.online);
  el.textContent = r?.online ? [p.server, r.latency != null && `${r.latency} ms`].filter(Boolean).join(' · ') : t('serverOff');
  el.title = r?.online ? [r.motd, r.version].filter(Boolean).join('\n') : '';
  $('server-count').textContent = r?.online ? r.players.online : MISSING;
  $('server-max').textContent = r?.online ? `/ ${r.players.max}` : '';
  renderHeads(r?.online ? r.players : null);
}

// Quién está conectado: cara y nombre, hasta 5 filas y "y N más"
function renderHeads(players) {
  const box = $('heads');
  box.innerHTML = '';
  if (!players) return;
  const list = players.sample || [];
  if (!list.length) {
    box.innerHTML = `<li class="empty">${esc(players.online ? t('playersHidden') : t('nobody'))}</li>`;
    return;
  }
  const MAX = 5;
  for (const pl of list.slice(0, MAX)) {
    const li = document.createElement('li');
    const im = document.createElement('img');
    im.alt = '';
    im.src = head({ type: 'microsoft', uuid: pl.id }, 32);
    im.onerror = () => { im.onerror = null; im.src = STEVE; };
    const name = document.createElement('span');
    name.textContent = pl.name;
    li.append(im, name);
    box.appendChild(li);
  }
  const more = Math.max(players.online || 0, list.length) - Math.min(list.length, MAX);
  if (more > 0) box.insertAdjacentHTML('beforeend', `<li class="more">${esc(t('more', { n: more }))}</li>`);
}

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
    row.innerHTML = `<img alt=""><div class="n"><b></b><small></small></div><button class="x" title="${t('logout')}" aria-label="${t('logout')}"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>`;
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
    ${S.discordAvailable ? `<div class="row"><span>${t('discord')}<small class="hint">${t('discordHint')}</small></span>${toggle('discord-on')}</div>` : ''}
    <div class="row"><span>${t('hideOnLaunch')}<small class="hint">${t('hideOnLaunchHint')}</small></span>${toggle('hide-on')}</div>
    <h4>${t('secAdmin')}</h4>
    <p class="sub" style="margin:0 0 6px">${t('adminHint')}</p>
    <div class="row"><small class="hint" style="user-select:text;word-break:break-all">${S.adminRepo ? esc(S.adminRepo) : ''}</small>
      <span class="btns" style="display:flex;gap:6px">${S.adminRepo ? `<button class="btn" id="d-admin-forget">${t('adminForget')}</button>` : ''}<button class="btn" id="d-admin">${t('adminChoose')}</button></span></div>
    <p class="err" id="d-admin-err"></p>
    <h4>${t('secLauncher')}</h4>
    <div class="row"><span>${t('lang')}</span><select id="d-lang"><option value="es">Español</option><option value="en">English</option></select></div>
    <div class="row"><span>${t('sound')}</span>${toggle('sfx-on')}</div>
    <div class="row"><span>${t('volume')}</span><b id="sfx-val">${Math.round(sfx.getVol() * 100)}%</b></div>
    <input type="range" id="sfx-vol" min="0" max="100" step="5" value="${Math.round(sfx.getVol() * 100)}">
    ${p ? `<h4>${t('secCustom')}</h4>
      ${['icon', 'background', 'logo'].map((k) => `<div class="row custom-row"><span>${t(k)}</span><span class="btns">
        ${p.customized?.[k] ? `<button class="btn" data-reset="${k}">${t('reset')}</button>` : ''}<button class="btn" data-pick="${k}">${t('change')}</button></span></div>`).join('')}
      <div class="row custom-row"><span>${t('color')}</span><span class="btns">
        ${p.customized?.accent ? `<button class="btn" data-reset="accent">${t('reset')}</button>` : ''}<input type="color" id="d-accent" value="${/^#[0-9a-f]{6}$/i.test(p.accent || '') ? p.accent : '#e0112b'}"></span></div>
      <h4>${t('secPack')}</h4><div class="row"><span>${esc(p.name)}</span><button class="btn danger" id="d-remove">${t('removePack')}</button></div>` : ''}
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
  if ($('discord-on')) {
    $('discord-on').checked = S.settings.discord !== false;
    $('discord-on').onchange = async (e) => { S.settings.discord = e.target.checked; await api.setSettings({ discord: e.target.checked }); };
  }
  $('hide-on').checked = !!S.settings.hideOnLaunch;
  $('hide-on').onchange = async (e) => { S.settings.hideOnLaunch = e.target.checked; await api.setSettings({ hideOnLaunch: e.target.checked }); };
  $('d-lang').onchange = (e) => { setLang(e.target.value); $('btn-settings').click(); };
  $('d-ok').onclick = closeDialog;
  $('d-admin').onclick = async () => {
    const r = await api.adminChoose();
    if (r.canceled) return;
    if (!r.ok) return ($('d-admin-err').textContent = r.error);
    S.adminRepo = r.adminRepo;
    renderRail();
    closeDialog();
    openAdmin(r.status);
  };
  if ($('d-admin-forget')) {
    $('d-admin-forget').onclick = async () => {
      await api.adminForget();
      S.adminRepo = null;
      renderRail();
      closeAdmin();
      $('btn-settings').click();
    };
  }
  if (p) {
    // tras cada cambio se actualiza todo y se vuelve a abrir Ajustes para que se vea el estado nuevo
    const custom = async (kind, value) => {
      const r = await api.customize(p.id, kind, value);
      if (!r.ok) return;
      S.packs = r.packs;
      renderRail();
      renderStage();
      $('btn-settings').click();
    };
    document.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => custom(b.dataset.pick)));
    document.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = () => custom(b.dataset.reset, null)));
    $('d-accent').oninput = (e) => document.documentElement.style.setProperty('--accent', e.target.value);
    $('d-accent').onchange = (e) => custom('accent', e.target.value);
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

/* ------------------------------------------------------------ actualización del launcher */
function showUpdate({ state, version, percent }) {
  const a = $('update');
  a.removeAttribute('href');
  a.classList.remove('hidden');
  a.classList.toggle('ready', state === 'ready');
  if (state === 'ready') {
    a.textContent = t('updReady', { v: version });
    a.onclick = () => api.installUpdate();
  } else {
    a.textContent = t('updDownloading', { p: Math.round(percent || 0) });
    a.onclick = null;
  }
}
api.onUpdater(showUpdate);

/* ------------------------------------------------------------ administrar el modpack */
let adminSt = null;
let adminFilter = 'all';
let publishing = false;

const fmtMb = (b) => (b / 1048576 >= 10 ? (b / 1048576).toFixed(0) : (b / 1048576).toFixed(1)) + ' MB';

function renderAdmin(st, { keepForm = false } = {}) {
  adminSt = st;
  $('admin-repo').textContent = st.repo;
  const sync = $('admin-sync');
  sync.className = 'admin-sync ' + (st.syncError ? 'bad' : 'ok');
  sync.textContent = st.syncError ? `${t('adminSyncBad')}\n${st.syncError}` : t('adminSyncOk');

  // marca qué mods son nuevos o actualizados respecto a lo publicado
  const base = (n) => n.replace(/\.jar$/i, '');
  const added = new Set(st.changes.added);
  const updated = new Set(st.changes.updated.map((u) => u.to));
  // tarjetas de conteo que filtran la lista (Todos / Nuevos / Actualizados / Grandes)
  const kinds = {
    all: () => true,
    new: (m) => added.has(base(m.name)),
    updated: (m) => updated.has(base(m.name)),
    big: (m) => m.big,
  };
  const labels = { all: t('filterAll'), new: t('filterNew'), updated: t('filterUpdated'), big: t('filterBig') };
  $('admin-filters').innerHTML = Object.keys(kinds)
    .map((k) => `<button role="tab" aria-selected="${k === adminFilter}" data-filter="${k}"><small>${labels[k]}</small><b class="num">${st.mods.filter(kinds[k]).length}</b></button>`)
    .join('');
  $('admin-filters').querySelectorAll('[data-filter]').forEach((b) => {
    b.onclick = () => {
      adminFilter = b.dataset.filter;
      renderAdmin(adminSt, { keepForm: true });
    };
  });
  const shown = st.mods.filter(kinds[adminFilter]);
  $('admin-count').textContent = `${shown.length}`;
  $('admin-list').innerHTML = shown.length ? '' : `<li class="drop-hint">${t('adminNoneFilter')}</li>`;
  $('admin-list').innerHTML += shown
    .map((m) => {
      const tag = added.has(base(m.name)) ? `<span class="tag new">${t('adminNew')}</span>` : updated.has(base(m.name)) ? `<span class="tag up">${t('adminUpdated')}</span>` : '';
      return `<li><span class="n">${esc(m.name)}</span>${tag}${m.big ? `<span class="tag big">${t('adminBig')}</span>` : ''}<small>${fmtMb(m.size)}</small><button class="x" data-rm="${esc(m.name)}" title="${t('removePack')}" aria-label="${t('removePack')}"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button></li>`;
    })
    .join('');
  $('admin-list').querySelectorAll('[data-rm]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm(t('adminRemoveSure', { name: b.dataset.rm }))) return;
      const r = await api.adminRemoveMod(b.dataset.rm);
      r.ok ? renderAdmin(r.status, { keepForm: true }) : adminError(r.error);
    };
  });

  const c = st.changes;
  const line = (sym, items) => items.map((x) => `<div>${sym} ${esc(x)}</div>`).join('');
  $('admin-changes').innerHTML =
    c.added.length || c.updated.length || c.removed.length
      ? line('+', c.added) + line('~', c.updated.map((u) => (u.from === u.to ? u.to : `${u.from} → ${u.to}`))) + line('−', c.removed)
      : `<span class="none">${t('adminNoChanges')}</span>`;

  if (!keepForm) {
    $('admin-version').value = st.suggestedVersion;
    $('admin-server').value = st.pack.server;
    $('admin-notes').value = '';
  }
}

function adminError(text) {
  const el = $('admin-step');
  el.className = 'admin-step bad';
  el.textContent = text;
}

async function openAdmin(status) {
  $('admin').classList.remove('hidden');
  $('admin-step').textContent = '';
  if (status) return renderAdmin(status);
  $('admin-sync').className = 'admin-sync';
  $('admin-sync').textContent = t('adminLoading');
  const r = await api.adminStatus(true);
  r.ok ? renderAdmin(r.status) : adminError(r.error);
}
function closeAdmin() {
  if (!publishing) $('admin').classList.add('hidden');
}

$('btn-admin').onclick = () => ($('admin').classList.contains('hidden') ? openAdmin() : closeAdmin());
$('admin-close').onclick = closeAdmin;
$('admin-refresh').onclick = () => openAdmin();
$('admin-folder').onclick = () => api.adminOpenFolder();
$('admin-add').onclick = async () => {
  const r = await api.adminAddMods([]);
  r.ok ? renderAdmin(r.status, { keepForm: true }) : adminError(r.error);
};

// arrastrar .jar desde el explorador de archivos
const drop = $('admin-drop');
drop.ondragover = (e) => {
  e.preventDefault();
  drop.classList.add('over');
};
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = async (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const paths = [...e.dataTransfer.files].map((f) => api.pathForFile(f)).filter((p) => /\.jar$/i.test(p));
  if (!paths.length) return;
  const r = await api.adminAddMods(paths);
  r.ok ? renderAdmin(r.status, { keepForm: true }) : adminError(r.error);
};
// soltar archivos fuera de la zona no debe abrirlos dentro de la ventana
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

api.onAdminStep(({ key, params }) => {
  const el = $('admin-step');
  el.className = 'admin-step';
  el.textContent = t('admin.' + key, params);
});

$('admin-form').onsubmit = async (e) => {
  e.preventDefault();
  if (publishing) return;
  publishing = true;
  const btn = $('admin-publish');
  btn.disabled = true;
  const r = await api.adminPublish({ version: $('admin-version').value, notes: $('admin-notes').value, server: $('admin-server').value });
  publishing = false;
  btn.disabled = false;
  if (!r.ok) return adminError(r.error);
  S.packs = r.packs;
  renderRail();
  renderStage();
  renderAdmin(r.status);
  const el = $('admin-step');
  el.className = 'admin-step ok';
  el.textContent = t('adminDone', { title: r.result.title });
  sfx.success();
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
    if (u.ready) return showUpdate({ state: 'ready', version: u.version });
    const a = $('update');
    a.href = u.url;
    a.textContent = t('update', { v: u.version });
    a.classList.remove('hidden');
  }).catch(() => {});
})();
