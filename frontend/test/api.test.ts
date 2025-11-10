import { describe, beforeEach, afterAll, it, expect, mock } from "bun:test";
import { apiFetch, BACKEND_URL } from "../lib/api";

const originalFetch = globalThis.fetch;
let fetchMock;

describe("apiFetch", () => {
  beforeEach(() => {
    fetchMock = mock(async (input, options = {}) => ({
      ok: true,
      json: async () => ({}),
      status: 200,
      headers: options.headers || {},
    }));
    globalThis.fetch = fetchMock;
    localStorage.clear();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("incluye el token almacenado en la cabecera Authorization", async () => {
    localStorage.setItem("token", "abc123");

    await apiFetch("/foo");

    expect(fetchMock.mock.calls.length).toBe(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/foo`);
    expect(options.headers.Authorization).toBe("Bearer abc123");
  });

  it("mantiene cabeceras personalizadas y agrega Authorization", async () => {
    localStorage.setItem("token", "abc123");

    await apiFetch("/bar", {
      method: "POST",
      headers: { "X-Test": "1" },
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["X-Test"]).toBe("1");
    expect(options.headers.Authorization).toBe("Bearer abc123");
  });

  it("propaga fallas de la API", async () => {
    const error = new Error("network");
    fetchMock.mockImplementation(() => Promise.reject(error));

    await expect(apiFetch("/fails"))
      .rejects.toThrow("network");
  });
});
