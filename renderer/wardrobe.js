/* global api, sfx, skinview3d, $, T, t, msg, esc, S, faces, curAcc, renderRail, onAccountChange:writable */
// Vestidor: skin y capa de la cuenta actual. Lo elegido se guarda en el launcher y el mod
// cachusafio_skins lo comparte con los demás jugadores dentro del servidor.

Object.assign(T.es, {
  wardrobe: 'Vestidor',
  'wr.sub': 'Tu skin y tu capa se ven dentro del servidor, para todos los que juegan con este launcher.',
  'wr.classic': 'Clásico', 'wr.slim': 'Delgado', 'wr.walk': 'Caminar',
  'wr.drag': 'Arrastra para girar · rueda para acercar',
  'wr.skin': 'Skin', 'wr.cape': 'Capa',
  'wr.drop': 'Arrastra tu skin aquí', 'wr.dropSub': 'o haz clic para elegir un .png de 64×64',
  'wr.copyLabel': 'Copiar la skin de un jugador premium', 'wr.copy': 'Copiar',
  'wr.reset': 'Quitar mi skin', 'wr.note': 'Los cambios se guardan solos y se aplican la próxima vez que entres al juego.',
  'wr.saved': 'Guardado', 'wr.noCape': 'Sin capa', 'wr.capeNow': 'Capa: {name}', 'wr.capeNone': 'Sin capa',
  'wr.loading': 'Cargando capas…', 'wr.capesFail': 'No se pudieron descargar las capas. Revisa tu conexión.',
  skinNotPng: 'Ese archivo no es una imagen PNG.', skinSize: 'La skin debe medir 64×64 (o 64×32, las antiguas).',
  skinHeavy: 'La imagen pesa demasiado para una skin.', skinNoPlayer: 'No existe un jugador premium con ese nombre.',
  skinNoSkin: 'Ese jugador no tiene skin propia.', skinFetchFail: 'No se pudo conectar con Mojang. Prueba de nuevo.',
  skinBadCape: 'Esa capa no existe.',
});
Object.assign(T.en, {
  wardrobe: 'Wardrobe',
  'wr.sub': 'Your skin and cape show up on the server for everyone playing with this launcher.',
  'wr.classic': 'Classic', 'wr.slim': 'Slim', 'wr.walk': 'Walk',
  'wr.drag': 'Drag to rotate · scroll to zoom',
  'wr.skin': 'Skin', 'wr.cape': 'Cape',
  'wr.drop': 'Drop your skin here', 'wr.dropSub': 'or click to choose a 64×64 .png',
  'wr.copyLabel': "Copy a premium player's skin", 'wr.copy': 'Copy',
  'wr.reset': 'Remove my skin', 'wr.note': 'Changes save automatically and apply the next time you join the game.',
  'wr.saved': 'Saved', 'wr.noCape': 'No cape', 'wr.capeNow': 'Cape: {name}', 'wr.capeNone': 'No cape',
  'wr.loading': 'Loading capes…', 'wr.capesFail': 'Could not download the capes. Check your connection.',
  skinNotPng: 'That file is not a PNG image.', skinSize: 'The skin must be 64×64 (or 64×32 for old ones).',
  skinHeavy: 'That image is too heavy for a skin.', skinNoPlayer: 'There is no premium player with that name.',
  skinNoSkin: 'That player has no custom skin.', skinFetchFail: 'Could not reach Mojang. Try again.',
  skinBadCape: 'That cape does not exist.',
});

(() => {
  // estado de la cuenta abierta en el Vestidor
  let W = null; // { png, slim, cape, base: { png, slim } }
  let capes = null; // [{ id, name, hash, png }]
  let viewer = null;
  let walking = false;
  let loadedFor = null;

  /* ---------------------------------------------------- imágenes */

  const loadImage = (src) =>
    new Promise((ok, fail) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => fail(new Error('skinNotPng'));
      im.src = src;
    });

  // Skins antiguas (64×32) → formato 1.8 (64×64), copiando brazo y pierna al otro lado como hace Minecraft
  const LEGACY = [
    [4, 16, 16, 32, 4, 4], [8, 16, 16, 32, 4, 4], [0, 20, 24, 32, 4, 12], [4, 20, 16, 32, 4, 12],
    [8, 20, 8, 32, 4, 12], [12, 20, 16, 32, 4, 12], [44, 16, -8, 32, 4, 4], [48, 16, -8, 32, 4, 4],
    [40, 20, 0, 32, 4, 12], [44, 20, -8, 32, 4, 12], [48, 20, -16, 32, 4, 12], [52, 20, -8, 32, 4, 12],
  ];
  function to64(img) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    if (img.height === 32) {
      const d = g.getImageData(0, 0, 64, 64);
      const px = (x, y) => (y * 64 + x) * 4;
      for (const [sx, sy, ox, oy, w, h] of LEGACY) {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const from = px(sx + x, sy + y);
            const to = px(sx + ox + (w - 1 - x), sy + oy + y);
            for (let k = 0; k < 4; k++) d.data[to + k] = d.data[from + k];
          }
      }
      g.putImageData(d, 0, 0);
    }
    return c;
  }

  // Brazos de 3 px: la columna 54-55 del brazo derecho viene vacía
  function looksSlim(canvas) {
    const d = canvas.getContext('2d').getImageData(54, 20, 2, 12).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
    return true;
  }

  async function faceOf(src) {
    const im = await loadImage(src);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 8, 8, 8, 8, 0, 0, 64, 64); // cara
    g.drawImage(im, 40, 8, 8, 8, 0, 0, 64, 64); // gorro / pelo
    return c.toDataURL('image/png');
  }

  // frente de la capa (10×16 desde x=1,y=1 de la textura 64×32)
  function capeFront(src, canvas) {
    loadImage(src).then((im) => {
      const g = canvas.getContext('2d');
      g.imageSmoothingEnabled = false;
      const k = im.width / 64; // por si alguna viniera en HD
      g.drawImage(im, 1 * k, 1 * k, 10 * k, 16 * k, 0, 0, 10, 16);
    }, () => {});
  }

  /* ---------------------------------------------------- visor 3D */

  // de tres cuartos, como en una vitrina; en la pestaña Capa se da vuelta para mostrar la espalda
  const FRONT = 0.5;
  const BACK = Math.PI - 0.5;
  let turnTo = FRONT;
  function turn(target) {
    turnTo = target;
    if (!viewer) return;
    const w = viewer.playerWrapper;
    const step = () => {
      if (turnTo !== target) return; // otra vuelta pidió otra cosa
      const d = target - w.rotation.y;
      w.rotation.y += d * 0.18;
      if (Math.abs(d) > 0.01) requestAnimationFrame(step);
      else w.rotation.y = target;
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) w.rotation.y = target;
    else requestAnimationFrame(step);
  }

  function ensureViewer() {
    if (viewer) return viewer;
    const stage = $('wr-stage');
    viewer = new skinview3d.SkinViewer({ canvas: $('wr-canvas'), width: stage.clientWidth || 320, height: stage.clientHeight || 380 });
    viewer.background = null;
    viewer.fov = 40;
    viewer.zoom = 0.85;
    viewer.autoRotate = false;
    viewer.playerWrapper.rotation.y = turnTo;
    viewer.animation = new skinview3d.IdleAnimation();
    new ResizeObserver(() => viewer.setSize(stage.clientWidth, stage.clientHeight)).observe(stage);
    return viewer;
  }

  function paintViewer() {
    if (!W) return;
    const v = ensureViewer();
    const skin = W.png || W.base?.png;
    const slim = W.png ? W.slim : !!W.base?.slim;
    if (skin) v.loadSkin(skin, { model: slim ? 'slim' : 'default' });
    else v.loadSkin(null);
    const cape = W.cape && capes?.find((c) => c.hash === W.cape)?.png;
    if (cape) v.loadCape(cape);
    else v.loadCape(null);
  }

  /* ---------------------------------------------------- guardar */

  let savedTimer = null;
  async function save(change) {
    const r = await api.saveSkin({ slim: W.slim, cape: W.cape, ...change });
    if (!r.ok) {
      $('wr-err').textContent = msg(r.error);
      sfx.error();
      return false;
    }
    $('wr-err').textContent = '';
    const el = $('wr-saved');
    el.textContent = t('wr.saved');
    el.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove('show'), 1600);
    return true;
  }

  async function setSkin(src, slimHint) {
    $('wr-err').textContent = '';
    let canvas;
    try {
      const im = await loadImage(src);
      if (im.width !== 64 || (im.height !== 64 && im.height !== 32)) throw new Error('skinSize');
      canvas = to64(im);
    } catch (e) {
      $('wr-err').textContent = msg(e.message);
      sfx.error();
      return;
    }
    const png = canvas.toDataURL('image/png');
    const slim = slimHint ?? looksSlim(canvas);
    if (!(await save({ png, slim }))) return;
    W.png = png;
    W.slim = slim;
    sfx.success();
    render();
    updateFace();
  }

  async function updateFace() {
    const a = curAcc();
    if (!a || !W) return;
    const src = W.png || W.base?.png;
    if (src) faces[a.id] = await faceOf(src).catch(() => undefined);
    else delete faces[a.id];
    renderRail();
  }

  /* ---------------------------------------------------- interfaz */

  function render() {
    if (!W) return;
    const hasSkin = !!W.png;
    const slim = hasSkin ? W.slim : !!W.base?.slim;
    document.querySelectorAll('#wr-model button').forEach((b) => {
      b.setAttribute('aria-checked', String((b.dataset.model === 'slim') === slim));
      b.disabled = !hasSkin; // sin skin propia el modelo lo decide Minecraft
    });
    $('wr-reset').classList.toggle('hidden', !hasSkin);
    renderCapes();
    paintViewer();
  }

  function renderCapes() {
    const box = $('wr-capes');
    const now = W.cape && capes?.find((c) => c.hash === W.cape);
    $('wr-cape-name').innerHTML = !capes ? esc(t('wr.loading')) : now ? t('wr.capeNow', { name: `<b>${esc(now.name)}</b>` }) : esc(t('wr.capeNone'));
    if (!capes) return (box.innerHTML = '');
    if (capes.every((c) => !c.png)) {
      $('wr-cape-name').textContent = t('wr.capesFail');
      return (box.innerHTML = '');
    }
    box.innerHTML = '';
    box.setAttribute('role', 'radiogroup');
    const tile = (hash, title) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String((W.cape || null) === hash));
      b.title = title;
      b.setAttribute('aria-label', title);
      b.onclick = async () => {
        if ((W.cape || null) === hash) return;
        const before = W.cape;
        W.cape = hash;
        if (!(await save({}))) W.cape = before;
        else sfx.click();
        render();
      };
      box.appendChild(b);
      return b;
    };
    const none = tile(null, t('wr.noCape'));
    none.classList.add('none');
    none.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-x"/></svg>';
    for (const c of capes) {
      const b = tile(c.hash, c.name);
      if (c.png) {
        const cv = document.createElement('canvas');
        cv.width = 10;
        cv.height = 16;
        capeFront(c.png, cv);
        b.appendChild(cv);
      } else {
        b.disabled = true;
        b.insertAdjacentHTML('beforeend', '<span class="missing"></span>');
      }
    }
  }

  function selectTab(name) {
    for (const k of ['skin', 'cape']) {
      $('wr-tab-' + k).setAttribute('aria-selected', String(k === name));
      $('wr-pane-' + k).classList.toggle('hidden', k !== name);
    }
    turn(name === 'cape' ? BACK : FRONT);
  }

  async function load() {
    const a = curAcc();
    if (!a) return;
    loadedFor = a.id;
    W = await api.getSkin();
    if (curAcc()?.id !== a.id || !W) return;
    render();
    if (!capes) {
      capes = await api.listCapes().catch(() => []);
      render();
    }
  }

  function showView(name) {
    const ward = name === 'wardrobe';
    $('home').classList.toggle('hidden', ward);
    $('wardrobe').classList.toggle('hidden', !ward);
    $('btn-wardrobe').classList.toggle('active', ward);
    if (viewer) viewer.renderPaused = !ward;
    if (ward && loadedFor !== curAcc()?.id) load();
    else if (ward) paintViewer();
  }

  /* ---------------------------------------------------- eventos */

  $('btn-wardrobe').onclick = () => { sfx.click(); showView('wardrobe'); };
  // al elegir un modpack se vuelve a la portada
  $('packs').addEventListener('click', (e) => { if (e.target.closest('.pack')) showView('home'); });

  $('wr-tab-skin').onclick = () => selectTab('skin');
  $('wr-tab-cape').onclick = () => selectTab('cape');

  document.querySelectorAll('#wr-model button').forEach((b) => (b.onclick = async () => {
    const slim = b.dataset.model === 'slim';
    if (!W?.png || W.slim === slim) return;
    W.slim = slim;
    if (await save({})) sfx.click();
    render();
  }));

  $('wr-walk').onclick = () => {
    walking = !walking;
    $('wr-walk').setAttribute('aria-pressed', String(walking));
    ensureViewer().animation = walking ? new skinview3d.WalkingAnimation() : new skinview3d.IdleAnimation();
  };

  const readFile = (file) => {
    if (!file) return;
    if (file.type && file.type !== 'image/png') {
      $('wr-err').textContent = t('skinNotPng');
      return sfx.error();
    }
    const fr = new FileReader();
    fr.onload = () => setSkin(fr.result);
    fr.readAsDataURL(file);
  };
  $('wr-file').onchange = (e) => { readFile(e.target.files[0]); e.target.value = ''; };
  const drop = $('wr-drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    readFile(e.dataTransfer.files[0]);
  });

  const copyFromPlayer = async () => {
    const name = $('wr-player').value.trim();
    if (!name) return $('wr-player').focus();
    const b = $('wr-copy');
    b.disabled = true;
    const r = await api.skinFromPlayer(name);
    b.disabled = false;
    if (!r.ok) {
      $('wr-err').textContent = msg(r.error);
      return sfx.error();
    }
    $('wr-player').value = '';
    setSkin(r.png, r.slim);
  };
  $('wr-copy').onclick = copyFromPlayer;
  $('wr-player').onkeydown = (e) => e.key === 'Enter' && copyFromPlayer();

  $('wr-reset').onclick = async () => {
    if (!(await save({ png: null }))) return;
    W.png = null;
    W.slim = false;
    render();
    updateFace();
  };

  onAccountChange = async () => {
    const a = curAcc();
    if (!a) return;
    if (!$('wardrobe').classList.contains('hidden')) await load();
    else {
      loadedFor = null;
      W = await api.getSkin().catch(() => null);
      if (curAcc()?.id !== a.id) return;
    }
    updateFace();
  };
})();
