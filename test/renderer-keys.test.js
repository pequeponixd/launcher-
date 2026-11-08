'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Un onkeydown que devuelve false cancela la tecla: el campo no deja escribir (pasó con el PIN)
test('ningún onkey* de la interfaz devuelve el resultado de una comparación', () => {
  for (const f of ['app.js', 'wardrobe.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'renderer', f), 'utf8');
    const bad = src.split('\n').filter((l) => /\.onkey\w+\s*=\s*\(?\w*\)?\s*=>\s*[^{]*&&/.test(l));
    assert.deepEqual(bad, [], f);
  }
});
