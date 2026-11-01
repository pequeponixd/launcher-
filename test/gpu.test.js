'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gpuEnv, withEnv } = require('../gpu');

test('gpuEnv: solo en Linux y solo si está activado', () => {
  assert.deepEqual(gpuEnv('linux', true), { __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' });
  assert.deepEqual(gpuEnv('linux', false), {});
  assert.deepEqual(gpuEnv('linux', undefined), {});
  assert.deepEqual(gpuEnv('win32', true), {});
  assert.deepEqual(gpuEnv('darwin', true), {});
});

test('withEnv: las variables existen durante la función y desaparecen después', async () => {
  delete process.env.PRUEBA_GPU_A;
  const r = await withEnv({ PRUEBA_GPU_A: 'x' }, async () => {
    assert.equal(process.env.PRUEBA_GPU_A, 'x');
    return 42;
  });
  assert.equal(r, 42);
  assert.equal(process.env.PRUEBA_GPU_A, undefined);
});

test('withEnv: restaura el valor que había antes, también si la función falla', async () => {
  process.env.PRUEBA_GPU_B = 'original';
  await assert.rejects(
    withEnv({ PRUEBA_GPU_B: 'temporal' }, async () => {
      assert.equal(process.env.PRUEBA_GPU_B, 'temporal');
      throw new Error('falló al lanzar');
    }),
    /falló al lanzar/
  );
  assert.equal(process.env.PRUEBA_GPU_B, 'original');
  delete process.env.PRUEBA_GPU_B;
});

test('withEnv: sin variables no toca nada', async () => {
  const antes = JSON.stringify(process.env);
  await withEnv({}, async () => {});
  assert.equal(JSON.stringify(process.env), antes);
});
