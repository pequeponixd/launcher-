'use strict';
/**
 * "Jugando Cachusafio" en el perfil de Discord (Rich Presence), hablando directo con la app de Discord
 * por su socket local. Si Discord no está abierto, todo se ignora en silencio.
 */
const net = require('net');
const path = require('path');
const fs = require('fs');

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;

/** Rutas donde Discord abre su socket (escritorio, Flatpak y Snap en Linux; tubería con nombre en Windows). */
function socketPaths(platform = process.platform, env = process.env) {
  const out = [];
  for (let i = 0; i < 10; i++) {
    if (platform === 'win32') {
      out.push(`\\\\?\\pipe\\discord-ipc-${i}`);
      continue;
    }
    const base = env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || '/tmp';
    for (const sub of ['', 'app/com.discordapp.Discord', 'app/com.discordapp.DiscordCanary', 'snap.discord', '.flatpak/dev.vencord.Vesktop/xdg-run']) {
      out.push(path.join(base, sub, `discord-ipc-${i}`));
    }
  }
  return out;
}

function encode(op, data) {
  const json = Buffer.from(JSON.stringify(data));
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(json.length, 4);
  return Buffer.concat([head, json]);
}

function connectAny(paths, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const list = paths.filter((p) => p.startsWith('\\\\') || fs.existsSync(p));
    const next = () => {
      const p = list.shift();
      if (!p) return reject(new Error('Discord no está abierto'));
      const sock = net.connect(p);
      const timer = setTimeout(() => sock.destroy(new Error('timeout')), timeoutMs);
      sock.once('connect', () => {
        clearTimeout(timer);
        resolve(sock);
      });
      sock.once('error', () => {
        clearTimeout(timer);
        next();
      });
    };
    next();
  });
}

class DiscordPresence {
  constructor(clientId, { paths, log = () => {} } = {}) {
    this.clientId = clientId;
    this.paths = paths;
    this.log = log;
    this.sock = null;
    this.ready = null;
  }

  async connect() {
    if (!this.clientId) throw new Error('sin discordClientId');
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const sock = await connectAny(this.paths || socketPaths());
      await new Promise((resolve, reject) => {
        // si Discord acepta el socket pero nunca responde, no quedarse esperando para siempre
        const timer = setTimeout(() => {
          sock.destroy();
          reject(new Error('Discord no respondió'));
        }, 5000);
        const fail = (e) => {
          clearTimeout(timer);
          reject(e);
        };
        let buf = Buffer.alloc(0);
        const onData = (d) => {
          buf = Buffer.concat([buf, d]);
          if (buf.length < 8) return;
          const len = buf.readInt32LE(4);
          if (buf.length < 8 + len) return;
          sock.off('data', onData);
          clearTimeout(timer);
          let msg = null;
          try {
            msg = JSON.parse(buf.subarray(8, 8 + len).toString());
          } catch {}
          if (msg?.evt === 'READY') resolve();
          else reject(new Error(msg?.data?.message || 'Discord rechazó la conexión'));
        };
        sock.on('data', onData);
        sock.once('error', fail);
        sock.once('close', () => fail(new Error('Discord cerró la conexión')));
        sock.write(encode(OP_HANDSHAKE, { v: 1, client_id: this.clientId }));
      });
      sock.on('error', () => {});
      sock.on('close', () => {
        this.sock = null;
        this.ready = null;
      });
      this.sock = sock;
    })();
    try {
      await this.ready;
    } catch (e) {
      this.ready = null;
      throw e;
    }
  }

  async setActivity(activity) {
    try {
      await this.connect();
      this.sock.write(
        encode(OP_FRAME, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity }, nonce: String(Date.now()) + Math.random() })
      );
      return true;
    } catch (e) {
      this.log('discord: ' + e.message);
      return false;
    }
  }

  clear() {
    // si la conexión aún se está abriendo, se borra cuando termine (si no, "Jugando" quedaba pegado)
    if (!this.ready) return;
    this.ready
      .then(() => this.sock?.write(encode(OP_FRAME, { cmd: 'SET_ACTIVITY', args: { pid: process.pid }, nonce: String(Date.now()) })))
      .catch(() => {});
  }

  close() {
    if (this.sock) this.sock.destroy();
    this.sock = null;
    this.ready = null;
  }
}

/** La actividad que se muestra mientras se juega un modpack. */
function playingActivity(pack, startedAt) {
  const loader = { forge: 'Forge', neoforge: 'NeoForge', fabric: 'Fabric', quilt: 'Quilt' }[pack.loader] || '';
  const a = {
    details: `Jugando ${pack.name}`.slice(0, 128),
    state: [loader && pack.minecraft ? `${loader} ${pack.minecraft}` : pack.minecraft, pack.version && `v${pack.version}`]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 128),
    timestamps: { start: Math.floor(startedAt / 1000) },
    instance: false,
  };
  // Discord acepta enlaces https como imagen; sin icono queda solo el texto
  if (pack.icon && /^https:\/\//.test(pack.icon)) a.assets = { large_image: pack.icon, large_text: pack.name };
  return a;
}

module.exports = { DiscordPresence, playingActivity, socketPaths, encode };
