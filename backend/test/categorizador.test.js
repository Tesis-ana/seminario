const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('eval_metrics script exists', () => {
  const script = path.join(__dirname, '..', '..', 'categorizador', 'eval_metrics.py');
  assert.ok(fs.existsSync(script));
});
