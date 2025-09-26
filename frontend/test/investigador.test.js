import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test("investigador page exists", () => {
  const pagePath = join(__dirname, "..", "pages", "investigador.js");
  expect(existsSync(pagePath)).toBe(true);
});
