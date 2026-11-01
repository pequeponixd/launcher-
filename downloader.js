'use strict';
/**
 * Descargador robusto del launcher (sin dependencias: solo Node/Electron).
 *
 *  - Reanuda: lo bajado queda en archivos .part y solo se pide lo que falta (cabecera Range).
 *  - Detecta cuelgues: si no llega ni un byte en `stallMs`, corta y reanuda (antes podía quedarse
 *    pegado varios minutos y volver a empezar de cero).
 *  - Reintenta con espera creciente y respeta «Retry-After» (GitHub limita con HTTP 429).
 *  - Varias conexiones para archivos grandes (`segments`) cuando el servidor admite Range.
 *  - Varios enlaces (espejos): si uno falla, prueba el siguiente.
 *  - Verifica tamaño y hash ANTES de dejar el archivo en su sitio, y reconoce los casos típicos de
 *    «archivo corrupto» que no son corrupción real: punteros de Git LFS y páginas HTML.
 *  - Plan B con el curl del sistema si la red de Node falla (certificados, antivirus, proxy).
 *  - `onBytes` nunca infla el progreso: si hay que descartar bytes ya contados, avisa con un delta negativo.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const UA = 'CachusafioLauncher/2.1';
const CONNECT_MS = 25000; // máximo esperando la respuesta del servidor
const STALL_MS = 20000; // máximo sin recibir datos
const SEGMENT_MIN = 32 * 1024 * 1024; // desde este tamaño se usan varias conexiones
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const BAD_CONTENT = new Set(['size', 'hash', 'html', 'lfs']);

class DownloadError extends Error {
  constructor(message, code, extra = {}) {
    super(message);
    this.name = 'DownloadError';
    this.code = code; // http | network | stall | size | hash | html | lfs | disk | norange | aborted | failed
    Object.assign(this, extra);
  }
}

/* ------------------------------------------------------------ utilidades */

const sizeOf = (f) => fsp.stat(f).then((s) => s.size, () => 0);

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) return reject(new DownloadError('Cancelado', 'aborted'));
    const onAbort = () => {
      clearTimeout(t);
      reject(new DownloadError('Cancelado', 'aborted'));
    };
    const t = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

function anySignal(signals) {
  const ac = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ac.abort();
      break;
    }
    s.addEventListener('abort', () => ac.abort(), { once: true });
  }
  return ac.signal;
}

function hashFile(file, algo = 'sha1') {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    fs.createReadStream(file)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

async function readHead(file, n) {
  const fh = await fsp.open(file, 'r');
  try {
    const buf = Buffer.alloc(n);
    const { bytesRead } = await fh.read(buf, 0, n, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

function parseRetryAfter(v) {
  if (!v) return null;
  if (/^\d+$/.test(v.trim())) return Number(v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - Date.now()) / 1000));
}

const hostOf = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
};

/* Vigilante: aborta la petición si pasa demasiado tiempo sin recibir nada */
function guard(outer, ms) {
  const ac = new AbortController();
  let timer = null;
  let stalled = false;
  const onOuter = () => ac.abort();
  if (outer) {
    if (outer.aborted) ac.abort();
    else outer.addEventListener('abort', onOuter, { once: true });
  }
  return {
    signal: ac.signal,
    arm(t = ms) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stalled = true;
        ac.abort();
      }, t);
    },
    stop() {
      clearTimeout(timer);
      if (outer) outer.removeEventListener('abort', onOuter);
    },
    get stalled() {
      return stalled;
    },
  };
}

function mapError(e, g, ctx) {
  if (e instanceof DownloadError) return e;
  if (ctx.signal && ctx.signal.aborted) return new DownloadError('Cancelado', 'aborted');
  if (g && g.stalled) return new DownloadError(`Sin datos durante ${Math.round(ctx.stallMs / 1000)} s`, 'stall');
  if (e && e.code === 'ENOSPC') return new DownloadError('No queda espacio en el disco', 'disk');
  const cause = e && e.cause && (e.cause.code || e.cause.message);
  return new DownloadError(`Error de red${cause ? ` (${cause})` : ''}: ${(e && e.message) || e}`, 'network');
}

function discardBody(res) {
  try {
    if (res && res.body && !res.bodyUsed) res.body.cancel().catch(() => {});
  } catch {}
}

/* ------------------------------------------------- contexto y progreso */

function makeCtx(opts) {
  const acct = { n: 0 }; // bytes que este archivo lleva sumados al progreso
  return {
    acct,
    add(d) {
      acct.n += d;
      if (opts.onBytes && d) opts.onBytes(d);
    },
    signal: opts.signal || null,
    size: typeof opts.size === 'number' ? opts.size : null,
    attempts: opts.attempts || 5,
    segments: opts.segments || 1,
    segmentMin: opts.segmentMin || SEGMENT_MIN,
    stallMs: opts.stallMs || STALL_MS,
    connectMs: opts.connectMs || CONNECT_MS,
    onRetry: opts.onRetry || null,
    fetch: opts.fetch || globalThis.fetch,
    resumed: 0, // bytes que ya estaban de una ejecución anterior
  };
}

const makePart = (file) => ({ file, counted: 0 });

async function partInit(p, ctx) {
  const have = await sizeOf(p.file);
  if (have) {
    p.counted = have;
    ctx.add(have);
    ctx.resumed += have;
  }
}

async function partDiscard(p, ctx) {
  await fsp.rm(p.file, { force: true });
  if (p.counted) {
    ctx.add(-p.counted);
    p.counted = 0;
  }
}

async function cleanParts(dest, ctx) {
  const dir = path.dirname(dest);
  const prefix = `${path.basename(dest)}.part`;
  let names = [];
  try {
    names = await fsp.readdir(dir);
  } catch {}
  for (const n of names) if (n.startsWith(prefix)) await fsp.rm(path.join(dir, n), { force: true });
  if (ctx.acct.n) ctx.add(-ctx.acct.n);
  ctx.resumed = 0;
}

/* ---------------------------------------------------------- red: una petición */

/**
 * Descarga el rango [start, end] (o el archivo entero si end == null) de `url` al archivo de `part`,
 * continuando lo que ya haya en él.
 */
async function fetchInto(url, part, start, end, ctx) {
  const wantLen = end == null ? null : end - start + 1;
  let have = await sizeOf(part.file);
  const limit = wantLen != null ? wantLen : ctx.size;
  if (limit != null) {
    if (have > limit) {
      await partDiscard(part, ctx); // lo guardado no puede ser de este archivo
      have = 0;
    } else if (have === limit && limit > 0) {
      return; // ya estaba completo (un archivo vacío sí se pide, para que se cree)
    }
  }

  const headers = { 'accept-encoding': 'identity', 'user-agent': UA };
  const offset = start + have;
  if (end != null) headers.range = `bytes=${offset}-${end}`;
  else if (offset > 0) headers.range = `bytes=${offset}-`;

  const g = guard(ctx.signal, ctx.stallMs);
  const doFetch = ctx.fetch;
  try {
    g.arm(ctx.connectMs);
    const res = await doFetch(url, { headers, signal: g.signal, redirect: 'follow' });

    if (res.status === 416) {
      const m = /\/(\d+)\s*$/.exec(res.headers.get('content-range') || '');
      discardBody(res);
      if (end == null && have > 0 && m && Number(m[1]) === have) return; // ya estaba completo
      await partDiscard(part, ctx);
      throw new DownloadError('El servidor rechazó reanudar; se reinicia la descarga', 'network');
    }
    if (!res.ok) {
      discardBody(res);
      throw new DownloadError(`HTTP ${res.status}`, 'http', {
        status: res.status,
        retryAfter: parseRetryAfter(res.headers.get('retry-after')),
      });
    }

    let mode = 'a';
    if (res.status !== 206) {
      if (end != null) {
        discardBody(res);
        throw new DownloadError('El servidor no admite descargar por trozos', 'norange');
      }
      if (offset > 0) {
        await partDiscard(part, ctx); // ignoró Range: hay que empezar de cero
        have = 0;
      }
      mode = 'w';
    }

    const clRaw = res.headers.get('content-length');
    const expectBody = clRaw !== null && Number.isFinite(Number(clRaw)) ? Number(clRaw) : null;
    const fh = await fsp.open(part.file, mode);
    let received = 0;
    try {
      g.arm();
      if (res.body) {
        for await (const chunk of res.body) {
          await fh.write(chunk);
          received += chunk.length;
          part.counted += chunk.length;
          ctx.add(chunk.length);
          g.arm();
        }
      }
    } finally {
      await fh.close();
    }
    if (expectBody !== null && received !== expectBody) {
      throw new DownloadError(`Descarga cortada (${received}/${expectBody} bytes)`, 'network');
    }
    if (wantLen != null && have + received !== wantLen) {
      throw new DownloadError(`Trozo incompleto (${have + received}/${wantLen} bytes)`, 'network');
    }
  } catch (e) {
    throw mapError(e, g, ctx);
  } finally {
    g.stop();
  }
}

const isRetryable = (e) =>
  e instanceof DownloadError && (e.code === 'network' || e.code === 'stall' || (e.code === 'http' && RETRY_STATUS.has(e.status)));

async function retrying(fn, ctx) {
  let last;
  for (let n = 1; n <= ctx.attempts; n++) {
    if (ctx.signal && ctx.signal.aborted) throw new DownloadError('Cancelado', 'aborted');
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRetryable(e) || n === ctx.attempts) throw e;
      const wait =
        e.retryAfter != null ? Math.min(e.retryAfter, 60) * 1000 : Math.min(30000, 1000 * 2 ** (n - 1)) + Math.random() * 400;
      if (ctx.onRetry) ctx.onRetry({ attempt: n, max: ctx.attempts, error: e, waitMs: wait });
      await sleep(wait, ctx.signal);
    }
  }
  throw last;
}

/* ------------------------------------------------------- una sola conexión */

async function getSingle(url, part, ctx) {
  const p = makePart(part);
  await partInit(p, ctx);
  await retrying(() => fetchInto(url, p, 0, null, ctx), ctx);
}

/* ------------------------------------------------------- varias conexiones */

async function getSegmented(url, dest, total, ctx) {
  const n = ctx.segments;
  const size = Math.ceil(total / n);
  const segs = [];
  for (let i = 0; i < n && i * size < total; i++) {
    segs.push({ part: makePart(`${dest}.part.s${i}`), start: i * size, end: Math.min(total, (i + 1) * size) - 1 });
  }
  for (const s of segs) await partInit(s.part, ctx);

  const inner = new AbortController();
  const sub = { ...ctx, signal: anySignal([ctx.signal, inner.signal]) };
  let firstError = null;
  await Promise.all(
    segs.map(async (s) => {
      try {
        await retrying(() => fetchInto(url, s.part, s.start, s.end, sub), sub);
      } catch (e) {
        if (!firstError || (firstError.code === 'aborted' && e.code !== 'aborted')) firstError = e;
        inner.abort(); // si un trozo falla, los demás no siguen gastando datos
      }
    })
  );
  if (firstError) throw firstError;

  for (const s of segs) {
    if ((await sizeOf(s.part.file)) !== s.end - s.start + 1) throw new DownloadError('Trozo incompleto', 'network');
  }
  const out = await fsp.open(`${dest}.part`, 'w');
  try {
    for (const s of segs) for await (const chunk of fs.createReadStream(s.part.file)) await out.write(chunk);
  } finally {
    await out.close();
  }
  for (const s of segs) await fsp.rm(s.part.file, { force: true });
}

async function fetchWhole(url, dest, part, ctx) {
  if (ctx.size != null && ctx.size >= ctx.segmentMin && ctx.segments > 1) {
    try {
      await getSegmented(url, dest, ctx.size, ctx);
      return;
    } catch (e) {
      if (!(e instanceof DownloadError) || e.code !== 'norange') throw e;
      await cleanParts(dest, ctx); // sin soporte de Range: se cae a una sola conexión
    }
  }
  await getSingle(url, part, ctx);
}

/* ------------------------------------------------------------ verificación */

async function verifyFile(file, opts = {}) {
  const size = await sizeOf(file);
  const hasSize = typeof opts.size === 'number';
  const sizeMatches = hasSize && size === opts.size;

  if (!sizeMatches && size < 4096) {
    if (size === 0) throw new DownloadError('El archivo llegó vacío', 'size', { got: 0, want: opts.size });
    const head = (await readHead(file, 300)).toString('utf8');
    if (head.startsWith('version https://git-lfs')) {
      throw new DownloadError('GitHub entregó un puntero de Git LFS en vez del archivo real', 'lfs', { got: size });
    }
    if (/^\s*<(!doctype|html)/i.test(head)) {
      throw new DownloadError('El servidor devolvió una página web en vez del archivo', 'html', { got: size });
    }
  }
  if (hasSize && !sizeMatches) {
    throw new DownloadError(`Tamaño distinto (llegaron ${size} bytes; el manifest dice ${opts.size})`, 'size', {
      got: size,
      want: opts.size,
    });
  }
  if (opts.hash && opts.hash.value) {
    const algo = opts.hash.algo || 'sha1';
    const want = String(opts.hash.value).toLowerCase();
    const got = await hashFile(file, algo);
    if (got !== want) {
      throw new DownloadError(`El ${algo} no coincide (llegó ${got.slice(0, 10)}…, el manifest dice ${want.slice(0, 10)}…)`, 'hash', {
        got,
        want,
      });
    }
  }
}

/* ------------------------------------------------------------ plan B: curl */

function curlFetch(url, file, ctx) {
  return new Promise((resolve, reject) => {
    const exe = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const args = ['-fsSL', '--retry', '3', '--retry-delay', '2', '--connect-timeout', '20', '--speed-time', '30', '--speed-limit', '1024', '-C', '-', '-o', file, url];
    let last = 0;
    let err = '';
    let settled = false;
    const p = spawn(exe, args, { windowsHide: true });
    const sync = async () => {
      const s = await sizeOf(file);
      if (s !== last) {
        ctx.add(s - last);
        last = s;
      }
    };
    const poll = setInterval(sync, 500);
    const onAbort = () => p.kill();
    if (ctx.signal) ctx.signal.addEventListener('abort', onAbort, { once: true });
    const finish = async (fn) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      if (ctx.signal) ctx.signal.removeEventListener('abort', onAbort);
      await sync();
      fn();
    };
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => finish(() => reject(new DownloadError(`No se pudo ejecutar curl (${e.message})`, 'network'))));
    p.on('close', (code) =>
      finish(() =>
        code === 0 ? resolve() : reject(new DownloadError(`curl falló (código ${code}) ${err.trim().slice(-200)}`, 'network'))
      )
    );
  });
}

/* ------------------------------------------------------------------ API */

function summarize(problems) {
  const byUrl = new Map();
  for (const p of problems) byUrl.set(p.url, p.error.message);
  return [...byUrl].map(([u, m]) => `${hostOf(u)}: ${m}`).join(' | ');
}

/**
 * Descarga `urls` (uno o varios espejos, en orden de preferencia) a `dest`.
 * opts: { size, hash:{algo,value}, segments, attempts, signal, onBytes(delta), onRetry(info), curl }
 */
async function downloadFile(urls, dest, opts = {}) {
  const list = [].concat(urls).filter(Boolean);
  if (!list.length) throw new DownloadError('No hay enlace de descarga', 'failed');
  const ctx = makeCtx(opts);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const problems = [];
  let ok = false;
  try {
    for (const url of list) {
      for (let pass = 0; pass < 2; pass++) {
        try {
          await fetchWhole(url, dest, part, ctx);
          await verifyFile(part, opts);
          await fsp.rename(part, dest);
          ok = true;
          return { url, bytes: ctx.acct.n, problems };
        } catch (e) {
          if (!(e instanceof DownloadError)) throw e;
          if (e.code === 'aborted' || e.code === 'disk') throw e;
          problems.push({ url, error: e });
          if (BAD_CONTENT.has(e.code)) {
            // Contenido malo: se borra y, si lo guardado venía de antes (o el archivo es chico),
            // se prueba una vez más desde cero con el mismo enlace.
            const again = pass === 0 && (ctx.resumed > 0 || (ctx.size != null ? ctx.size : 0) < 8 * 1048576);
            await cleanParts(dest, ctx);
            if (again) continue;
          }
          break; // siguiente espejo (lo ya bajado se conserva para reanudarlo)
        }
      }
    }

    // Plan B: curl del sistema (usa los certificados y el proxy del sistema operativo)
    if (opts.curl !== false && problems.some((p) => p.error.code === 'network' || p.error.code === 'stall')) {
      try {
        await cleanParts(dest, ctx);
        await curlFetch(list[0], part, ctx);
        await verifyFile(part, opts);
        await fsp.rename(part, dest);
        ok = true;
        return { url: list[0], bytes: ctx.acct.n, via: 'curl', problems };
      } catch (e) {
        if (ctx.signal && ctx.signal.aborted) throw new DownloadError('Cancelado', 'aborted');
        const err = e instanceof DownloadError ? e : new DownloadError(`curl: ${e.message}`, 'network');
        problems.push({ url: list[0], error: err });
        if (BAD_CONTENT.has(err.code)) await cleanParts(dest, ctx);
      }
    }

    const lastCode = problems.length ? problems[problems.length - 1].error.code : 'failed';
    throw new DownloadError(summarize(problems), lastCode, { problems });
  } finally {
    if (!ok && ctx.acct.n) ctx.add(-ctx.acct.n); // un intento fallido no cuenta como progreso
  }
}

module.exports = { downloadFile, verifyFile, hashFile, DownloadError, SEGMENT_MIN };
