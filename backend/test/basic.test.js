const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('server file existe', () => {
  const serverPath = path.join(__dirname, '..', 'server.js');
  assert.ok(fs.existsSync(serverPath));
});
