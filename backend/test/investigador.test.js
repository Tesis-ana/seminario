const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('metrics file exists', () => {
  const metricsPath = path.join(__dirname, '..', 'data', 'metrics.json');
  assert.ok(fs.existsSync(metricsPath));
});
