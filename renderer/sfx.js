/* Sonidos del launcher: se generan con WebAudio, no hay archivos de audio. */
(function () {
  let ctx = null;
  let master = null;
  let on = true;
  let vol = 0.5;

  try {
    const s = JSON.parse(localStorage.getItem('sfx') || '{}');
    if (typeof s.on === 'boolean') on = s.on;
    if (typeof s.vol === 'number') vol = Math.max(0, Math.min(1, s.vol));
  } catch (_) { /* sin almacenamiento: se usan los valores por defecto */ }

  const save = () => {
    try { localStorage.setItem('sfx', JSON.stringify({ on, vol })); } catch (_) { /* nada */ }
  };

  function ensure() {
    if (!on) return null;
    // los navegadores no dejan sonar nada antes del primer clic/tecla del usuario
    if (!ctx && !(navigator.userActivation && navigator.userActivation.hasBeenActive)) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // una nota: frecuencia f (con barrido opcional hacia `to`), retraso t, duración d, volumen g
  function tone({ f = 440, to = null, t = 0, d = 0.1, type = 'sine', g = 0.3, a = 0.006 }) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + t;
    const o = c.createOscillator();
    const v = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(g, t0 + a);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(v);
    v.connect(master);
    o.start(t0);
    o.stop(t0 + d + 0.03);
  }

  // "whoosh": ruido filtrado con un barrido de frecuencia
  function swoosh({ t = 0, d = 0.18, g = 0.12, from = 500, to = 2800 }) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + t;
    const len = Math.max(1, Math.floor(c.sampleRate * d));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(from, t0);
    bp.frequency.exponentialRampToValueAtTime(to, t0 + d);
    const v = c.createGain();
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(g, t0 + d * 0.4);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(bp);
    bp.connect(v);
    v.connect(master);
    src.start(t0);
  }

  const sfx = {
    hover() { tone({ f: 1100, to: 1400, d: 0.04, g: 0.05, a: 0.003 }); },
    click() { tone({ f: 560, to: 380, d: 0.07, type: 'triangle', g: 0.2 }); },
    open() { swoosh({ from: 400, to: 2600 }); tone({ f: 420, to: 760, d: 0.14, g: 0.07 }); },
    close() { swoosh({ from: 2600, to: 400, d: 0.14, g: 0.09 }); tone({ f: 700, to: 380, d: 0.12, g: 0.06 }); },
    play() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ f, t: i * 0.07, d: 0.22, type: 'triangle', g: 0.2 }));
      tone({ f: 120, to: 50, d: 0.45, g: 0.35, a: 0.01 });
      swoosh({ d: 0.35, g: 0.1, from: 300, to: 4000 });
    },
    success() {
      tone({ f: 659.25, d: 0.22, g: 0.18 });
      tone({ f: 987.77, t: 0.11, d: 0.4, g: 0.18 });
    },
    error() {
      tone({ f: 190, to: 120, d: 0.2, type: 'sawtooth', g: 0.12 });
      tone({ f: 190, to: 110, t: 0.18, d: 0.26, type: 'sawtooth', g: 0.12 });
    },
    isOn: () => on,
    setOn(v) { on = !!v; save(); },
    getVol: () => vol,
    setVol(v) {
      vol = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = vol;
      save();
    },
  };
  window.sfx = sfx;

  // sonido al pasar el mouse y al hacer clic en cualquier botón
  const HOVERABLE = 'button, select, .pack, .acc, .item';
  let lastEl = null;
  let lastAt = 0;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest(HOVERABLE);
    if (!el || el === lastEl || el.disabled) return;
    lastEl = el;
    const now = performance.now();
    if (now - lastAt < 60) return;
    lastAt = now;
    sfx.hover();
  });
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget || !(lastEl && lastEl.contains(e.relatedTarget))) lastEl = null;
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('button, .pack, .acc');
    if (!el || el.disabled || el.id === 'btn-play') return; // Play tiene su propio sonido
    sfx.click();
  });
})();
