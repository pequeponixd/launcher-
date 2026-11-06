'use strict';
/**
 * Pregunta a un servidor de Minecraft si está prendido, igual que la lista de servidores del juego
 * (protocolo "Server List Ping"). No necesita entrar al servidor ni tener cuenta.
 */
const net = require('net');
const dns = require('dns').promises;

function varint(n) {
  const out = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return Buffer.from(out);
}

// Lee un varint desde `off`; devuelve [valor, bytes usados] o null si todavía no llegó completo
function readVarint(buf, off = 0) {
  let n = 0;
  for (let i = 0; i < 5; i++) {
    if (off + i >= buf.length) return null;
    const b = buf[off + i];
    n |= (b & 0x7f) << (7 * i);
    if (!(b & 0x80)) return [n, i + 1];
  }
  throw new Error('varint demasiado largo');
}

const packet = (...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([varint(body.length), body]);
};
const mcString = (s) => {
  const b = Buffer.from(s, 'utf8');
  return Buffer.concat([varint(b.length), b]);
};

/** "play.ejemplo.com:25565" → { host, port }. Sin puerto, busca el registro SRV como hace el juego. */
async function resolveAddress(address) {
  const m = /^\[?([^\]]+?)\]?(?::(\d+))?$/.exec(String(address || '').trim());
  if (!m) throw new Error('Dirección de servidor no válida');
  const host = m[1];
  if (m[2]) return { host, port: Number(m[2]) };
  if (!net.isIP(host)) {
    try {
      const [srv] = await dns.resolveSrv(`_minecraft._tcp.${host}`);
      if (srv) return { host: srv.name, port: srv.port, original: host };
    } catch { /* sin SRV: puerto por defecto */ }
  }
  return { host, port: 25565 };
}

// El MOTD puede venir como texto o como componente de chat ({text, extra:[...]})
function motdText(d) {
  if (d == null) return '';
  if (typeof d === 'string') return d.replace(/§./g, '');
  return (motdText(d.text) + (d.extra || []).map(motdText).join('')).trim();
}

// Algunos servidores usan la lista para mostrar texto ("§aBienvenido") con UUID en cero: eso no son jugadores
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
function playerSample(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p.name === 'string' && UUID.test(p.id || '') && !/^0{8}-?0{4}/.test(p.id) && /^\w{1,16}$/.test(p.name))
    .map((p) => ({ name: p.name, id: p.id }));
}

/**
 * Devuelve { online: true, players: {online, max, sample}, version, motd, latency } o { online: false, error }.
 * sample: [{ name, id }] de algunos conectados (el servidor puede ocultarla y venir vacía).
 * Nunca lanza: un servidor apagado es una respuesta normal.
 */
async function pingServer(address, { timeoutMs = 5000 } = {}) {
  let target;
  try {
    target = await resolveAddress(address);
  } catch (e) {
    return { online: false, error: e.message };
  }
  return new Promise((resolve) => {
    const t0 = Date.now();
    const sock = net.connect({ host: target.host, port: target.port });
    let buf = Buffer.alloc(0);
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sock.destroy();
      resolve(r);
    };
    const timer = setTimeout(() => finish({ online: false, error: 'timeout' }), timeoutMs);
    sock.on('error', (e) => finish({ online: false, error: e.code || e.message }));
    sock.on('close', () => finish({ online: false, error: 'closed' }));
    sock.on('connect', () => {
      const port = Buffer.alloc(2);
      port.writeUInt16BE(target.port);
      // handshake (siguiente estado 1 = status) + pedido de estado.
      // Protocolo real (763 = 1.20.1): con -1 los túneles de playit.gg cortan la conexión
      sock.write(packet(varint(0), varint(763), mcString(target.original || target.host), port, varint(1)));
      sock.write(packet(varint(0)));
    });
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      try {
        const len = readVarint(buf);
        if (!len || buf.length < len[0] + len[1]) return; // falta llegar el resto
        let off = len[1];
        const id = readVarint(buf, off);
        off += id[1];
        const strLen = readVarint(buf, off);
        off += strLen[1];
        const data = JSON.parse(buf.subarray(off, off + strLen[0]).toString('utf8'));
        finish({
          online: true,
          players: { online: data.players?.online ?? 0, max: data.players?.max ?? 0, sample: playerSample(data.players?.sample) },
          version: data.version?.name || '',
          motd: motdText(data.description),
          latency: Date.now() - t0,
        });
      } catch (e) {
        finish({ online: false, error: 'respuesta inválida: ' + e.message });
      }
    });
  });
}

module.exports = { pingServer, resolveAddress, varint, readVarint, motdText, playerSample };
