const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('investigador page exists', () => {
  const pagePath = path.join(__dirname, '..', 'pages', 'investigador.js');
  assert.ok(fs.existsSync(pagePath));
});
