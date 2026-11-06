const test = require('node:test');
const assert = require('node:assert');
const pin = require('../pin');

test('isValidPin: solo 4 a 6 números', () => {
  for (const ok of ['1234', '00000', '987654']) assert.ok(pin.isValidPin(ok), ok);
  for (const bad of ['123', '1234567', '12a4', '', null, undefined, ' 1234', '12.4']) assert.ok(!pin.isValidPin(bad), String(bad));
});

test('hashPin/checkPin: acepta el correcto, rechaza el resto, y no guarda el PIN', () => {
  const rec = pin.hashPin('4821');
  assert.ok(!JSON.stringify(rec).includes('4821'));
  assert.ok(pin.checkPin('4821', rec));
  assert.ok(!pin.checkPin('4822', rec));
  assert.ok(!pin.checkPin('4821', null));
  assert.notDeepStrictEqual(pin.hashPin('4821'), rec); // sal distinta cada vez
});

test('pinToken: igual en cualquier PC, depende del nombre (sin importar mayúsculas) y del PIN', () => {
  const a = pin.pinToken('Pequepon', '4821');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.strictEqual(a, pin.pinToken('pequepon', '4821'));
  assert.notStrictEqual(a, pin.pinToken('Amigo', '4821'));
  assert.notStrictEqual(a, pin.pinToken('Pequepon', '4822'));
  assert.ok(!a.includes('4821'));
  assert.match(pin.randomToken(), /^[0-9a-f]{64}$/);
});

test('Attempts: 5 errores bloquean 30 s; acertar reinicia la cuenta', () => {
  let now = 1000;
  const at = new pin.Attempts(5, 30000, () => now);
  for (let i = 0; i < 4; i++) at.fail('x');
  assert.strictEqual(at.wait('x'), 0);
  at.fail('x');
  assert.strictEqual(at.wait('x'), 30000);
  now += 30001;
  assert.strictEqual(at.wait('x'), 0);
  at.fail('y');
  at.ok('y');
  for (let i = 0; i < 4; i++) at.fail('y');
  assert.strictEqual(at.wait('y'), 0);
});
