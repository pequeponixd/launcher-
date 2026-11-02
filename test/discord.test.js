'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { DiscordPresence, playingActivity, socketPaths, encode } = require('../discord');

// Discord falso: responde READY al handshake y guarda los mensajes recibidos
function fakeDiscord(sockPath) {
  const got = [];
  const srv = net.createServer((s) => {
    let buf = Buffer.alloc(0);
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 8 && buf.length >= 8 + buf.readInt32LE(4)) {
        const op = buf.readInt32LE(0);
        const len = buf.readInt32LE(4);
        const msg = JSON.parse(buf.subarray(8, 8 + len).toString());
        buf = buf.subarray(8 + len);
        got.push({ op, msg });
        if (op === 0) s.write(encode(1, { cmd: 'DISPATCH', evt: 'READY', data: {} }));
      }
    });
  });
  return new Promise((r) => srv.listen(sockPath, () => r({ srv, got })));
}

test('handshake y SET_ACTIVITY llegan a Discord', { skip: process.platform === 'win32' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-'));
  const sockPath = path.join(dir, 'discord-ipc-0');
  const { srv, got } = await fakeDiscord(sockPath);
  const d = new DiscordPresence('123', { paths: [sockPath] });
  const act = playingActivity({ name: 'Cachusafio', loader: 'forge', minecraft: '1.20.1', version: '1.0.0', icon: 'https://x/icon.png' }, 1700000000000);
  assert.equal(await d.setActivity(act), true);
  await new Promise((r) => setTimeout(r, 50));
  d.close();
  srv.close();
  assert.deepEqual(got[0], { op: 0, msg: { v: 1, client_id: '123' } });
  assert.equal(got[1].msg.cmd, 'SET_ACTIVITY');
  assert.equal(got[1].msg.args.activity.details, 'Jugando Cachusafio');
  assert.equal(got[1].msg.args.activity.state, 'Forge 1.20.1 · v1.0.0');
  assert.equal(got[1].msg.args.activity.timestamps.start, 1700000000);
  assert.equal(got[1].msg.args.activity.assets.large_image, 'https://x/icon.png');
});

test('sin Discord abierto no lanza error', async () => {
  const d = new DiscordPresence('123', { paths: ['/no/existe/discord-ipc-0'] });
  assert.equal(await d.setActivity({ details: 'x' }), false);
});

test('rutas de Linux incluyen Flatpak y Snap', () => {
  const p = socketPaths('linux', { XDG_RUNTIME_DIR: '/run/user/1000' });
  assert.ok(p.includes('/run/user/1000/discord-ipc-0'));
  assert.ok(p.includes('/run/user/1000/app/com.discordapp.Discord/discord-ipc-0'));
  assert.ok(p.includes('/run/user/1000/snap.discord/discord-ipc-0'));
  assert.ok(socketPaths('win32', {})[0].startsWith('\\\\?\\pipe\\'));
});
