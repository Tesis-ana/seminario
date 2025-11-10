import { describe, beforeEach, afterEach, it, expect, mock } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const pushMock = mock(() => {});
const apiFetchMock = mock(async () => ({ ok: true, json: async () => ({}) }));

mock.module("next/router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

mock.module("../lib/api", () => ({
  apiFetch: apiFetchMock,
}));

const { default: Home } = await import("../pages/index");

const buildToken = (role) => {
  const payload = { rol: role };
  const base64 = btoa(JSON.stringify(payload));
  return `header.${base64}.sig`;
};

describe("Home page", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockReset();
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    cleanup();
  });

  it.each([
    ["doctor", "/profesional"],
    ["enfermera", "/profesional"],
    ["paciente", "/paciente"],
    ["admin", "/admin"],
    ["investigador", "/investigador"],
  ])("redirige a la ruta %s", async (role, expectedPath) => {
    localStorage.setItem("token", buildToken(role));

    render(<Home />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(expectedPath));
  });

  it("muestra error cuando el formulario esta vacio", () => {
    render(<Home />);
    const [submit] = screen.getAllByRole("button", { name: /ingresar/i });
    fireEvent.click(submit);

    expect(screen.getByText(/contrasena son obligatorios/i)).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("muestra feedback cuando las credenciales son invalidas", async () => {
    apiFetchMock.mockImplementation(async (path) => {
      if (path === "/users/login") {
        return { ok: false, json: async () => ({ message: "Credenciales invalidas" }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<Home />);
    const [rutInput] = screen.getAllByPlaceholderText(/RUT/i);
    const [contraInput] = screen.getAllByPlaceholderText(/Contrasena/i);
    fireEvent.change(rutInput, { target: { value: "11.111.111-1" } });
    fireEvent.change(contraInput, { target: { value: "secret" } });
    const [submit] = screen.getAllByRole("button", { name: /ingresar/i });
    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByText(/credenciales invalidas/i)).toBeInTheDocument());
  });

  it("guarda token y redirige despues de login valido", async () => {
    const token = buildToken("paciente");
    apiFetchMock.mockImplementation(async (path) => {
      if (path === "/users/login") {
        return { ok: true, json: async () => ({ token }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<Home />);
    const [rutInput] = screen.getAllByPlaceholderText(/RUT/i);
    const [contraInput] = screen.getAllByPlaceholderText(/Contrasena/i);
    fireEvent.change(rutInput, { target: { value: "11.111.111-1" } });
    fireEvent.change(contraInput, { target: { value: "secret" } });
    const [submit] = screen.getAllByRole("button", { name: /ingresar/i });
    fireEvent.click(submit);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/paciente"));
    expect(localStorage.getItem("token")).toBe(token);
  });
});
