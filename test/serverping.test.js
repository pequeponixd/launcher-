const test = require('node:test');
const assert = require('node:assert');
const net = require('net');
const { pingServer, varint, readVarint, motdText, resolveAddress, playerSample } = require('../serverping');

test('varint ida y vuelta', () => {
  for (const n of [0, 1, 127, 128, 25565, 2097151, 4294967295]) {
    const [v, used] = readVarint(varint(n));
    assert.strictEqual(v >>> 0, n);
    assert.strictEqual(used, varint(n).length);
  }
});

test('motdText aplana componentes y quita colores', () => {
  assert.strictEqual(motdText('§aHola §lmundo'), 'Hola mundo');
  assert.strictEqual(motdText({ text: 'Cachu', extra: [{ text: 'safio' }] }), 'Cachusafio');
});

test('resolveAddress con puerto explícito', async () => {
  assert.deepStrictEqual(await resolveAddress('127.0.0.1:25570'), { host: '127.0.0.1', port: 25570 });
  assert.deepStrictEqual(await resolveAddress('127.0.0.1'), { host: '127.0.0.1', port: 25565 });
});

// servidor falso que responde el estado en trozos, como puede pasar por la red
function fakeServer(status) {
  return new Promise((resolve) => {
    const srv = net.createServer((sock) => {
      let got = 0;
      sock.on('data', (d) => {
        got += d.length;
        if (got < 5) return;
        const json = Buffer.from(JSON.stringify(status));
        const body = Buffer.concat([varint(0), varint(json.length), json]);
        const pkt = Buffer.concat([varint(body.length), body]);
        sock.write(pkt.subarray(0, 3));
        setTimeout(() => sock.write(pkt.subarray(3)), 20);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

test('pingServer lee jugadores, versión y MOTD', async () => {
  const sample = [{ name: 'Pequeponi', id: '069a79f4-44e9-4726-a5be-fca90e38aaf5' }];
  const srv = await fakeServer({ version: { name: '1.20.1' }, players: { online: 3, max: 20, sample }, description: { text: 'Hola' } });
  const r = await pingServer(`127.0.0.1:${srv.address().port}`);
  srv.close();
  assert.strictEqual(r.online, true);
  assert.deepStrictEqual(r.players, { online: 3, max: 20, sample });
  assert.strictEqual(r.version, '1.20.1');
  assert.strictEqual(r.motd, 'Hola');
});

test('pingServer con el servidor apagado devuelve online: false', async () => {
  const srv = net.createServer();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  srv.close();
  const r = await pingServer(`127.0.0.1:${port}`, { timeoutMs: 1500 });
  assert.strictEqual(r.online, false);
});

test('playerSample descarta líneas de texto disfrazadas de jugadores', () => {
  const r = playerSample([
    { name: 'Steve', id: '8667ba71-b85a-4004-af54-457a9734eed7' },
    { name: '§aBienvenidos', id: '00000000-0000-0000-0000-000000000000' },
    { name: 'SinId' },
    null,
  ]);
  assert.deepStrictEqual(r, [{ name: 'Steve', id: '8667ba71-b85a-4004-af54-457a9734eed7' }]);
  assert.deepStrictEqual(playerSample(undefined), []);
});
