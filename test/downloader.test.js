'use strict';
// Pruebas del descargador y de la sincronización del modpack. Ejecutar con:  npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { downloadFile } = require('../downloader');
const { syncPack, sourcesFor } = require('../packsync');

/* ----------------------------------------------------------------- ayudas */

const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
const bytes = (n) => crypto.randomBytes(n);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cachu-'));
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });
const tally = () => {
  const t = { sum: 0, fn: (d) => (t.sum += d) };
  return t;
};

/** Servidor HTTP de prueba. `routes`: { '/ruta': (req, res) => … } */
async function serve(routes) {
  const log = [];
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    log.push({ url, range: req.headers.range || null });
    const h = routes[url];
    if (!h) {
      res.writeHead(404, { 'content-length': 0 });
      return res.end();
    }
    h(req, res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    log,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((r) => {
        server.closeAllConnections();
        server.close(r);
      }),
  };
}

/** Respuesta de archivo con Range, y fallos opcionales para simular redes malas. */
function file(buf, o = {}) {
  let n = 0;
  return (req, res) => {
    n++;
    if (o.before && o.before(n, req, res) === true) return;
    let start = 0;
    let end = buf.length - 1;
    let status = 200;
    const m = o.ranges === false ? null : /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    if (m) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
      if (start >= buf.length) {
        res.writeHead(416, { 'content-range': `bytes */${buf.length}`, 'content-length': 0 });
        return res.end();
      }
      status = 206;
    }
    const body = buf.subarray(start, end + 1);
    const headers = { 'content-length': body.length, 'content-type': 'application/octet-stream' };
    if (status === 206) headers['content-range'] = `bytes ${start}-${end}/${buf.length}`;
    res.writeHead(status, headers);
    if (o.cut && o.cut(n)) {
      res.write(body.subarray(0, Math.floor(body.length / 2)));
      setTimeout(() => res.destroy(), 20); // la conexión se cae a la mitad
      return;
    }
    if (o.hang && o.hang(n)) {
      res.write(body.subarray(0, Math.floor(body.length / 2))); // y se queda colgada sin terminar
      return;
    }
    res.end(body);
  };
}

async function withServer(routes, fn) {
  const srv = await serve(routes);
  const dir = tmp();
  try {
    await fn(srv, dir);
  } finally {
    await srv.close();
    rm(dir);
  }
}

const noParts = (dir) => fs.readdirSync(dir).filter((f) => f.includes('.part'));

/* ----------------------------------------------------------- descargador */

test('descarga normal: verifica sha1 y no deja restos', async () => {
  const buf = bytes(300_000);
  await withServer({ '/a.jar': file(buf) }, async (srv, dir) => {
    const t = tally();
    const dest = path.join(dir, 'a.jar');
    await downloadFile(`${srv.base}/a.jar`, dest, { size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, onBytes: t.fn });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(t.sum, buf.length);
    assert.deepEqual(noParts(dir), []);
  });
});

test('se corta la conexión dos veces y reanuda con Range sin empezar de cero', async () => {
  const buf = bytes(2_000_000);
  await withServer({ '/b.jar': file(buf, { cut: (n) => n <= 2 }) }, async (srv, dir) => {
    const t = tally();
    const dest = path.join(dir, 'b.jar');
    await downloadFile(`${srv.base}/b.jar`, dest, { size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, onBytes: t.fn });
    assert.deepEqual(fs.readFileSync(dest), buf);
    const ranged = srv.log.filter((r) => r.range && !r.range.startsWith('bytes=0-'));
    assert.ok(ranged.length >= 2, 'debía pedir solo lo que faltaba: ' + JSON.stringify(srv.log));
    assert.equal(t.sum, buf.length, 'el progreso no debe inflarse con los reintentos');
  });
});

test('varias conexiones: parte el archivo en 4 trozos y lo arma bien', async () => {
  const buf = bytes(3_000_000);
  await withServer({ '/c.jar': file(buf) }, async (srv, dir) => {
    const t = tally();
    const dest = path.join(dir, 'c.jar');
    await downloadFile(`${srv.base}/c.jar`, dest, {
      size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, segments: 4, segmentMin: 1 << 20, onBytes: t.fn,
    });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(new Set(srv.log.map((r) => r.range)).size, 4, 'debían ser 4 rangos distintos');
    assert.equal(t.sum, buf.length);
    assert.deepEqual(noParts(dir), []);
  });
});

test('si el servidor ignora Range, cae a una sola conexión sin inflar el progreso', async () => {
  const buf = bytes(2_500_000);
  await withServer({ '/d.jar': file(buf, { ranges: false }) }, async (srv, dir) => {
    const t = tally();
    const dest = path.join(dir, 'd.jar');
    await downloadFile(`${srv.base}/d.jar`, dest, {
      size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, segments: 4, segmentMin: 1 << 20, onBytes: t.fn,
    });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(t.sum, buf.length);
  });
});

test('respeta Retry-After cuando el servidor responde 429', async () => {
  const buf = bytes(50_000);
  const before = (n, req, res) => {
    if (n === 1) {
      res.writeHead(429, { 'retry-after': '1', 'content-length': 0 });
      res.end();
      return true;
    }
  };
  await withServer({ '/e.jar': file(buf, { before }) }, async (srv, dir) => {
    const t0 = Date.now();
    await downloadFile(`${srv.base}/e.jar`, path.join(dir, 'e.jar'), { size: buf.length, hash: { algo: 'sha1', value: sha1(buf) } });
    assert.ok(Date.now() - t0 >= 900, 'debía esperar lo que pidió el servidor');
    assert.equal(srv.log.length, 2);
  });
});

test('detecta un cuelgue (sin datos) y reanuda en vez de quedarse pegado', async () => {
  const buf = bytes(1_000_000);
  await withServer({ '/f.jar': file(buf, { hang: (n) => n === 1 }) }, async (srv, dir) => {
    const t = tally();
    const t0 = Date.now();
    const dest = path.join(dir, 'f.jar');
    await downloadFile(`${srv.base}/f.jar`, dest, {
      size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, stallMs: 300, onBytes: t.fn,
    });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.ok(Date.now() - t0 < 8000, 'no debía tardar minutos');
    assert.equal(t.sum, buf.length);
    assert.ok(srv.log[1].range && !srv.log[1].range.startsWith('bytes=0-'), 'la segunda petición debía continuar, no empezar de nuevo');
  });
});

test('espejo: si el primer enlace da 404 usa el siguiente', async () => {
  const buf = bytes(100_000);
  await withServer({ '/ok.jar': file(buf) }, async (srv, dir) => {
    const dest = path.join(dir, 'g.jar');
    const r = await downloadFile([`${srv.base}/no-existe.jar`, `${srv.base}/ok.jar`], dest, { size: buf.length, hash: { algo: 'sha1', value: sha1(buf) } });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(r.url, `${srv.base}/ok.jar`);
  });
});

test('contenido distinto con el mismo tamaño: se rechaza y se usa el espejo bueno', async () => {
  const good = bytes(80_000);
  const bad = bytes(80_000);
  await withServer({ '/bad.jar': file(bad), '/good.jar': file(good) }, async (srv, dir) => {
    const dest = path.join(dir, 'h.jar');
    await downloadFile([`${srv.base}/bad.jar`, `${srv.base}/good.jar`], dest, { size: good.length, hash: { algo: 'sha1', value: sha1(good) } });
    assert.deepEqual(fs.readFileSync(dest), good);
    assert.deepEqual(noParts(dir), []);
  });
});

test('si todos los enlaces sirven algo malo: falla con código "hash", sin dejar archivo ni progreso', async () => {
  const good = bytes(80_000);
  await withServer({ '/bad.jar': file(bytes(80_000)) }, async (srv, dir) => {
    const t = tally();
    const dest = path.join(dir, 'i.jar');
    await assert.rejects(
      downloadFile(`${srv.base}/bad.jar`, dest, { size: good.length, hash: { algo: 'sha1', value: sha1(good) }, onBytes: t.fn }),
      (e) => e.code === 'hash' && /sha1 no coincide/.test(e.message)
    );
    assert.equal(fs.existsSync(dest), false);
    assert.deepEqual(noParts(dir), []);
    assert.equal(t.sum, 0, 'un intento fallido no cuenta como progreso');
  });
});

test('reconoce un puntero de Git LFS y una página HTML en vez del archivo', async () => {
  const lfs = Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 106311714\n');
  const html = Buffer.from('<!DOCTYPE html><html><body>Access denied</body></html>');
  await withServer({ '/lfs.jar': file(lfs), '/web.jar': file(html) }, async (srv, dir) => {
    const opts = { size: 106311714, hash: { algo: 'sha1', value: 'x'.repeat(40) } };
    await assert.rejects(downloadFile(`${srv.base}/lfs.jar`, path.join(dir, 'l.jar'), opts), (e) => e.problems.some((p) => p.error.code === 'lfs'));
    await assert.rejects(downloadFile(`${srv.base}/web.jar`, path.join(dir, 'w.jar'), opts), (e) => e.problems.some((p) => p.error.code === 'html'));
  });
});

test('un archivo legítimo de 0 bytes se descarga bien', async () => {
  await withServer({ '/empty.json': file(Buffer.alloc(0)) }, async (srv, dir) => {
    const dest = path.join(dir, 'empty.json');
    await downloadFile(`${srv.base}/empty.json`, dest, { size: 0, hash: { algo: 'sha1', value: sha1(Buffer.alloc(0)) } });
    assert.equal(fs.statSync(dest).size, 0);
  });
});

test('continúa un .part de una ejecución anterior (y lo cuenta una sola vez)', async () => {
  const buf = bytes(1_000_000);
  await withServer({ '/j.jar': file(buf) }, async (srv, dir) => {
    const dest = path.join(dir, 'j.jar');
    fs.writeFileSync(dest + '.part', buf.subarray(0, 400_000));
    const t = tally();
    await downloadFile(`${srv.base}/j.jar`, dest, { size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, onBytes: t.fn });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(srv.log[0].range, 'bytes=400000-');
    assert.equal(t.sum, buf.length);
  });
});

test('un .part viejo que ya no corresponde se descarta y se repite desde cero', async () => {
  const buf = bytes(1_000_000);
  await withServer({ '/k.jar': file(buf) }, async (srv, dir) => {
    const dest = path.join(dir, 'k.jar');
    fs.writeFileSync(dest + '.part', bytes(300_000)); // basura de otra versión
    const t = tally();
    await downloadFile(`${srv.base}/k.jar`, dest, { size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, onBytes: t.fn });
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(t.sum, buf.length);
  });
});

test('plan B con curl cuando la red de Node falla', { skip: spawnSync('curl', ['--version']).status !== 0 && 'curl no está instalado' }, async () => {
  const buf = bytes(400_000);
  process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost';
  await withServer({ '/m.jar': file(buf) }, async (srv, dir) => {
    const dest = path.join(dir, 'm.jar');
    const t = tally();
    const r = await downloadFile(`${srv.base}/m.jar`, dest, {
      size: buf.length, hash: { algo: 'sha1', value: sha1(buf) }, attempts: 1, onBytes: t.fn,
      fetch: async () => { throw new TypeError('fetch failed', { cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' } }); },
    });
    assert.equal(r.via, 'curl');
    assert.deepEqual(fs.readFileSync(dest), buf);
    assert.equal(t.sum, buf.length);
  });
});

test('se puede cancelar a mitad de una descarga colgada', async () => {
  const buf = bytes(500_000);
  await withServer({ '/n.jar': file(buf, { hang: () => true }) }, async (srv, dir) => {
    const ac = new AbortController();
    const t = tally();
    setTimeout(() => ac.abort(), 250);
    const t0 = Date.now();
    await assert.rejects(downloadFile(`${srv.base}/n.jar`, path.join(dir, 'n.jar'), { size: buf.length, signal: ac.signal, onBytes: t.fn }), (e) => e.code === 'aborted');
    assert.ok(Date.now() - t0 < 3000);
    assert.equal(t.sum, 0);
  });
});

/* ------------------------------------------------------- sincronizar pack */

function manifestFor(entries) {
  return {
    id: 'test', minecraft: '1.20.1', loader: { type: 'forge', version: '1' }, managedDirs: ['mods'], keepLocal: ['options.txt'],
    files: entries.map(([p, buf, extra = {}]) => ({ path: p, sha1: sha1(buf), size: buf.length, ...extra })),
  };
}
const quiet = (statuses = []) => ({
  status: (key, params, percent) => statuses.push({ key, params, percent }),
  log: () => {},
  tuning: { retryDelayMs: 30, attempts: 2, concurrency: 4 },
});

test('sync: un archivo malo no tumba al resto y el error dice cuál y por qué', async () => {
  const a = bytes(10_000), b = bytes(10_000), c = bytes(10_000);
  const routes = {
    '/P/mods/a.jar': file(a), '/P/mods/b.jar': file(bytes(10_000)) /* no coincide con su sha1 */, '/P/mods/c.jar': file(c),
  };
  await withServer(routes, async (srv, dir) => {
    const m = manifestFor([['mods/a.jar', a], ['mods/b.jar', b], ['mods/c.jar', c]]);
    await assert.rejects(syncPack(m, `${srv.base}/P/manifest.json`, dir, quiet()), (e) =>
      /1 archivo/.test(e.message) && /mods\/b\.jar/.test(e.message) && /sha1 no coincide/.test(e.message) && /generate-manifest/.test(e.message));
    assert.deepEqual(fs.readFileSync(path.join(dir, 'mods/a.jar')), a, 'los buenos sí quedaron');
    assert.deepEqual(fs.readFileSync(path.join(dir, 'mods/c.jar')), c);
    assert.equal(fs.existsSync(path.join(dir, 'mods/b.jar')), false);
  });
});

test('sync: lo más pesado se pide primero y la barra termina en 100 sin pasarse', async () => {
  const small = [bytes(5_000), bytes(7_000), bytes(9_000)];
  const big = bytes(1_500_000);
  const routes = { '/P/mods/big.jar': file(big, { cut: (n) => n === 1 }) };
  small.forEach((s, i) => (routes[`/P/config/s${i}.json`] = file(s)));
  await withServer(routes, async (srv, dir) => {
    const st = [];
    const m = manifestFor([...small.map((s, i) => [`config/s${i}.json`, s]), ['mods/big.jar', big]]);
    await syncPack(m, `${srv.base}/P/manifest.json`, dir, quiet(st));
    assert.equal(srv.log[0].url, '/P/mods/big.jar', 'el pesado va primero');
    const pcts = st.filter((s) => s.key === 'pack.download').map((s) => s.percent);
    assert.ok(pcts.every((p) => p >= 0 && p <= 100), 'porcentajes fuera de rango: ' + pcts);
    assert.equal(Math.round(pcts[pcts.length - 1]), 100);
    assert.deepEqual(fs.readFileSync(path.join(dir, 'mods/big.jar')), big);
  });
});

test('sync: la segunda ronda rescata un archivo que falló la primera vez', async () => {
  const x = bytes(20_000);
  const before = (n, req, res) => {
    if (n <= 2) { res.writeHead(500, { 'content-length': 0 }); res.end(); return true; }
  };
  await withServer({ '/P/mods/x.jar': file(x, { before }) }, async (srv, dir) => {
    const st = [];
    await syncPack(manifestFor([['mods/x.jar', x]]), `${srv.base}/P/manifest.json`, dir, quiet(st));
    assert.deepEqual(fs.readFileSync(path.join(dir, 'mods/x.jar')), x);
    assert.ok(st.some((s) => s.key === 'pack.retry2'), 'debía avisar que hace una segunda ronda');
  });
});

test('sync: no vuelve a bajar lo que ya está bien, y limpia mods que sobran', async () => {
  const a = bytes(10_000);
  await withServer({ '/P/mods/a.jar': file(a) }, async (srv, dir) => {
    fs.mkdirSync(path.join(dir, 'mods'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'mods/a.jar'), a);
    fs.writeFileSync(path.join(dir, 'mods/viejo.jar'), 'x');
    fs.writeFileSync(path.join(dir, 'options.txt'), 'mia');
    await syncPack(manifestFor([['mods/a.jar', a]]), `${srv.base}/P/manifest.json`, dir, quiet());
    assert.equal(srv.log.length, 0, 'no debía descargar nada');
    assert.equal(fs.existsSync(path.join(dir, 'mods/viejo.jar')), false);
    assert.equal(fs.readFileSync(path.join(dir, 'options.txt'), 'utf8'), 'mia');
  });
});

test('sync: rechaza rutas que se salen de la carpeta de la instancia', async () => {
  const a = bytes(100);
  const m = manifestFor([['../fuera.jar', a]]);
  const dir = tmp();
  try {
    await assert.rejects(syncPack(m, 'http://127.0.0.1:1/manifest.json', dir, quiet()), /Ruta no permitida/);
  } finally {
    rm(dir);
  }
});

test('sync: enlaces propios (release) y espejo jsDelivr para repos de GitHub', () => {
  const gh = 'https://raw.githubusercontent.com/user/repo/main/Modpack/manifest.json?t=1';
  const normal = sourcesFor(gh, { path: 'mods/A b.jar', size: 1000 });
  assert.equal(normal[0], 'https://raw.githubusercontent.com/user/repo/main/Modpack/mods/A%20b.jar');
  assert.equal(normal[1], 'https://cdn.jsdelivr.net/gh/user/repo@main/Modpack/mods/A%20b.jar');
  const release = sourcesFor(gh, { path: 'mods/grande.jar', size: 106311714, url: 'https://github.com/u/r/releases/download/t/grande.jar' });
  assert.deepEqual(release, ['https://github.com/u/r/releases/download/t/grande.jar']);
  assert.equal(sourcesFor(gh, { path: 'mods/pesado.jar', size: 60 * 1048576 }).length, 1, 'jsDelivr no sirve de más de 50 MB');
  assert.equal(sourcesFor('http://x/manifest.json', { path: 'a.jar' }).length, 1);
  const extra = sourcesFor(gh, { path: 'a.jar', size: 5, urls: ['https://mirror.example/a.jar'] });
  assert.equal(extra[1], 'https://mirror.example/a.jar');
});
