import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test('server file existe', () => {
  const serverPath = join(__dirname, '..', 'server.js');
  expect(existsSync(serverPath)).toBe(true);
});
