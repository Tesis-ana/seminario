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

const { default: LogoutButton } = await import("../components/LogoutButton");

describe("LogoutButton", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockReset();
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    cleanup();
  });

  it("envia la peticion de cierre, limpia token y redirige", async () => {
    localStorage.setItem("token", "tok");

    render(<LogoutButton />);
    const [button] = screen.getAllByRole("button", { name: /cerrar/i });
    fireEvent.click(button);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(localStorage.getItem("token")).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("redirige sin llamar API si no hay token", () => {
    render(<LogoutButton />);
    const [button] = screen.getAllByRole("button", { name: /cerrar/i });
    fireEvent.click(button);

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
