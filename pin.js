// PIN de las cuentas sin premium (4 a 6 números).
// - En el PC se guarda solo un hash (scrypt) para comprobar el PIN antes de jugar.
// - Al servidor nunca va el PIN: va una clave derivada del nombre y el PIN (token). El mod cachusafio-skins la
//   registra la primera vez que el nombre entra y después expulsa a quien llegue con otra.
const crypto = require('crypto');

const isValidPin = (pin) => /^\d{4,6}$/.test(String(pin ?? ''));

function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pin), salt, 32);
  return { salt: salt.toString('base64'), hash: hash.toString('base64') };
}

function checkPin(pin, rec) {
  if (!rec || !rec.salt || !rec.hash || !isValidPin(pin)) return false;
  const want = Buffer.from(rec.hash, 'base64');
  const got = crypto.scryptSync(String(pin), Buffer.from(rec.salt, 'base64'), want.length);
  return crypto.timingSafeEqual(want, got);
}

/** Lo que recibe el servidor: igual en cualquier PC para el mismo nombre y PIN (64 hex). */
const pinToken = (name, pin) =>
  crypto.createHash('sha256').update(`cachusafio-pin:${String(name).toLowerCase()}:${pin}`).digest('hex');

/** Cuentas Microsoft: una clave al azar que el launcher guarda (no hay PIN que escribir). */
const randomToken = () => crypto.randomBytes(32).toString('hex');

/** Freno a quien prueba PINs a ciegas en el launcher: 5 errores → 30 s de espera. */
class Attempts {
  constructor(max = 5, waitMs = 30000, now = Date.now) {
    Object.assign(this, { max, waitMs, now, map: new Map() });
  }
  /** milisegundos que faltan para poder intentar (0 = puede) */
  wait(id) {
    const a = this.map.get(id);
    return a && a.until > this.now() ? a.until - this.now() : 0;
  }
  fail(id) {
    const a = this.map.get(id) || { n: 0, until: 0 };
    a.n += 1;
    if (a.n >= this.max) Object.assign(a, { n: 0, until: this.now() + this.waitMs });
    this.map.set(id, a);
  }
  ok(id) {
    this.map.delete(id);
  }
}

module.exports = { isValidPin, hashPin, checkPin, pinToken, randomToken, Attempts };
