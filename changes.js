'use strict';
/**
 * Compara los mods de dos versiones del manifest para mostrar qué cambió:
 * agregados, quitados y actualizados (mismo mod, otra versión del .jar).
 */

const isMod = (p) => /^mods\/[^/]+\.jar$/i.test(p);

// "create-1.20.1-0.5.1.jar" → "create" · "jei_1.20.1-forge-15.2.jar" → "jei" · "fabric-api-0.92.jar" → "fabric-api"
function modKey(file) {
  const name = file.replace(/^.*\//, '').replace(/\.jar$/i, '').toLowerCase();
  const m = /^(.+?)[-_+ ]v?\d/.exec(name);
  return m ? m[1] : name;
}

const prettyName = (file) => file.replace(/^.*\//, '').replace(/\.jar$/i, '');

/** Foto de los mods de un manifest: { "mods/x.jar": sha1 } */
function snapshotMods(files) {
  const out = {};
  for (const f of files || []) if (isMod(f.path)) out[f.path] = f.sha1;
  return out;
}

/**
 * old/next: fotos de snapshotMods. Devuelve { added: [...], removed: [...], updated: [{from, to}] }
 * con nombres de archivo sin ".jar".
 */
function diffMods(old, next) {
  const byKey = (snap) => {
    const m = new Map();
    for (const [p, sha] of Object.entries(snap || {})) m.set(modKey(p), { p, sha });
    return m;
  };
  const a = byKey(old);
  const b = byKey(next);
  const added = [];
  const removed = [];
  const updated = [];
  for (const [k, n] of b) {
    const o = a.get(k);
    if (!o) added.push(prettyName(n.p));
    else if (o.p !== n.p || o.sha !== n.sha) updated.push({ from: prettyName(o.p), to: prettyName(n.p) });
  }
  for (const [k, o] of a) if (!b.has(k)) removed.push(prettyName(o.p));
  const sort = (x, y) => String(x.to || x).localeCompare(String(y.to || y));
  return { added: added.sort(sort), removed: removed.sort(sort), updated: updated.sort(sort) };
}

const isEmpty = (d) => !d || (!d.added.length && !d.removed.length && !d.updated.length);

module.exports = { modKey, snapshotMods, diffMods, isEmpty };
