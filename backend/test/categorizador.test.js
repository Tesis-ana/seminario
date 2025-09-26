import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test('eval_metrics script exists', () => {
  const script = join(__dirname, '..', '..', 'categorizador', 'eval_metrics.py');
  expect(existsSync(script)).toBe(true);
});
