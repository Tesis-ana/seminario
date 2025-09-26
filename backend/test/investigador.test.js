import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test('metrics file exists', () => {
  const metricsPath = join(__dirname, '..', 'data', 'metrics.json');
  expect(existsSync(metricsPath)).toBe(true);
});
