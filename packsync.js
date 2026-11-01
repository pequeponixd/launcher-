'use strict';
/**
 * Sincroniza los archivos del modpack con el manifest.
 *
 * Diferencias con la versión anterior:
 *  - Un archivo que falla ya NO tumba toda la descarga ni deja trabajadores sueltos en segundo plano:
 *    se anotan los fallos, se hace una segunda ronda y recién entonces se informa todo junto.
 *  - Los archivos grandes se descargan primero, con varias conexiones, y se reanudan si se cortan.
 *  - La barra de progreso cuenta solo bytes reales (antes los reintentos la inflaban).
 *  - Los errores dicen QUÉ archivo falló y POR QUÉ (hash, tamaño, red, LFS…).
 *  - Cada archivo tiene espejos opcionales (`urls` en el manifest) y, para repos de GitHub, jsDelivr.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { downloadFile } = require('./downloader');

const exists = (p) => fsp.access(p).then(() => true, () => false);

function sha1(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1');
    fs.createReadStream(file)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
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

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

function fileUrl(manifestUrl, f) {
  if (f.url) return f.url;
  return new URL(encodePath(f.path), manifestUrl).href;
}

/** Enlaces posibles para un archivo, en orden de preferencia. */
function sourcesFor(manifestUrl, f) {
  const urls = [fileUrl(manifestUrl, f)];
  for (const u of f.urls || f.mirrors || []) if (typeof u === 'string' && !urls.includes(u)) urls.push(u);
  if (!f.url) {
    // Espejo para repos de GitHub (jsDelivr sirve hasta 50 MB). Si su caché estuviera vieja, el hash lo rechaza.
    const m = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*\/)?[^/]*$/i.exec(String(manifestUrl).split('?')[0]);
    if (m && (f.size || 0) <= 50 * 1048576) {
      const [, user, repo, ref, dir = ''] = m;
      urls.push(`https://cdn.jsdelivr.net/gh/${user}/${repo}@${ref}/${dir}${encodePath(f.path)}`);
    }
  }
  return urls;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function explain(failed) {
  const shown = failed.slice(0, 8).map(({ f, error }) => ` • ${f.path}: ${error.message}`);
  if (failed.length > shown.length) shown.push(` • … y ${failed.length - shown.length} más`);
  const codes = failed.flatMap(({ error }) => (error.problems || []).map((p) => p.error.code).concat(error.code));
  const hints = [];
  if (codes.includes('hash') || codes.includes('size')) {
    hints.push(
      'Si el error de hash o tamaño se repite siempre, el archivo que hay en el repositorio no coincide con el manifest: ' +
        'quien administra el modpack debe volver a ejecutar «node tools/generate-manifest.js» y subir el manifest.json nuevo.'
    );
  }
  if (codes.includes('lfs')) {
    hints.push('El archivo está guardado con Git LFS y GitHub no lo entrega por este enlace. Súbelo como archivo de un Release y pon su enlace en "url" del manifest.');
  }
  if (codes.includes('html')) {
    hints.push('Algo en tu red (antivirus, proxy, portal de internet) está respondiendo con una página web en vez del archivo.');
  }
  if (codes.includes('network') || codes.includes('stall')) {
    hints.push('Parece un problema de conexión (VPN, antivirus o red inestable). Prueba con otra red o sin VPN y vuelve a dar Jugar: continúa donde quedó.');
  }
  return [`No se pudieron descargar ${failed.length} archivo(s):`, ...shown, '', ...hints, 'Más detalles en launcher.log.'].join('\n').trim();
}

/**
 * io: { status(key, params, percent), log(text), tuning? }
 */
async function syncPack(manifest, manifestUrl, gameDir, io) {
  const { status, log = () => {} } = io;
  const tune = Object.assign({ concurrency: 4, segments: 4, attempts: 5, retryDelayMs: 4000, stallMs: undefined, segmentMin: undefined }, io.tuning);

  status('pack.check', {}, null);
  const keep = manifest.keepLocal || [];
  const root = path.resolve(gameDir);
  const pending = [];
  let n = 0;
  for (const f of manifest.files) {
    // Rutas seguras: nada fuera de la carpeta de la instancia
    const dest = path.resolve(gameDir, f.path);
    if (!dest.startsWith(root + path.sep)) throw new Error(`Ruta no permitida en el manifest: ${f.path}`);
    n++;
    if (isKept(keep, f.path) && (await exists(dest))) continue;
    let ok = false;
    if (await exists(dest)) ok = (await sha1(dest)) === f.sha1;
    if (!ok) pending.push({ ...f, dest });
    if (n % 15 === 0) status('pack.verify', { done: n, total: manifest.files.length }, (n / manifest.files.length) * 100);
  }

  if (pending.length) {
    log(`sync: ${pending.length} de ${manifest.files.length} archivos por descargar`);
    pending.sort((a, b) => (b.size || 0) - (a.size || 0)); // lo más pesado primero: es lo que más tarda

    const totalBytes = pending.reduce((a, f) => a + (f.size || 0), 0) || 1;
    const totalMb = (totalBytes / 1048576).toFixed(0);
    let doneBytes = 0;
    let doneFiles = 0;
    let lastEmit = 0;
    let fatal = null;
    const active = new Map();
    const abort = new AbortController();
    const pct = () => Math.max(0, Math.min(100, (doneBytes / totalBytes) * 100));

    const emit = (force = false) => {
      const now = Date.now();
      if (!force && now - lastEmit < 150) return;
      lastEmit = now;
      let main = null;
      for (const a of active.values()) if (!main || a.size > main.size) main = a;
      status(
        'pack.download',
        { file: main ? main.name : '', done: doneFiles, total: pending.length, mb: (Math.max(0, doneBytes) / 1048576).toFixed(0), totalMb },
        pct()
      );
    };

    const runOne = async (f) => {
      const name = path.basename(f.path);
      active.set(f.path, { name, size: f.size || 0 });
      const t0 = Date.now();
      try {
        const r = await downloadFile(sourcesFor(manifestUrl, f), f.dest, {
          size: typeof f.size === 'number' ? f.size : undefined,
          hash: { algo: 'sha1', value: f.sha1 },
          segments: tune.segments,
          attempts: tune.attempts,
          stallMs: tune.stallMs,
          segmentMin: tune.segmentMin,
          signal: abort.signal,
          onBytes: (d) => {
            doneBytes += d;
            emit();
          },
          onRetry: (r) => {
            log(`reintento ${r.attempt}/${r.max} de ${f.path}: ${r.error.message} (espera ${(r.waitMs / 1000).toFixed(1)} s)`);
            status('pack.retry', { file: name, attempt: r.attempt + 1, max: r.max }, pct());
          },
        });
        doneFiles++;
        emit();
        log(`ok ${f.path} (${((Date.now() - t0) / 1000).toFixed(1)} s${r.via ? `, vía ${r.via}` : ''})`);
      } finally {
        active.delete(f.path);
      }
    };

    const runPool = async (list, workers) => {
      const queue = [...list];
      const failed = [];
      const worker = async () => {
        while (queue.length && !abort.signal.aborted) {
          const f = queue.shift();
          try {
            await runOne(f);
          } catch (e) {
            if (e && e.code === 'disk') {
              fatal = e;
              abort.abort(); // sin espacio: no tiene sentido seguir
              return;
            }
            if (e && e.code === 'aborted') return;
            failed.push({ f, error: e });
            log(`FALLÓ ${f.path}: ${e && e.message}`);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(workers, list.length) }, worker));
      return failed;
    };
    const checkFatal = () => {
      if (fatal) throw new Error('No queda espacio en el disco para descargar el modpack. Libera espacio y vuelve a intentar.');
    };

    let failed = await runPool(pending, tune.concurrency);
    checkFatal();
    if (failed.length) {
      log(`sync: ${failed.length} archivo(s) fallaron; segunda ronda`);
      status('pack.retry2', { count: failed.length }, pct());
      await wait(tune.retryDelayMs);
      failed = await runPool(failed.map((x) => x.f), 2);
      checkFatal();
    }
    if (failed.length) throw new Error(explain(failed));
    emit(true);
  }

  // limpiar carpetas administradas (por defecto solo mods/)
  const wanted = new Set(manifest.files.map((f) => path.resolve(gameDir, f.path)));
  for (const d of manifest.managedDirs || ['mods']) {
    for (const file of await walk(path.join(gameDir, d))) {
      const r = path.relative(gameDir, file).split(path.sep).join('/');
      if (!wanted.has(path.resolve(file)) && !isKept(keep, r)) await fsp.rm(file, { force: true });
    }
  }
}

module.exports = { syncPack, sourcesFor, fileUrl, explain };
