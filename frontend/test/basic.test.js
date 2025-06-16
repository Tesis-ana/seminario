const test = require('node:test');
const assert = require('node:assert');
const pkg = require('../package.json');

test('tiene nombre de paquete correcto', () => {
  assert.strictEqual(pkg.name, 'frontend');
});
