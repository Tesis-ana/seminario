import { test, expect } from "bun:test";
import pkg from "../package.json" with { type: "json" };

test("tiene nombre de paquete correcto", () => {
  expect(pkg.name).toBe("frontend");
});
