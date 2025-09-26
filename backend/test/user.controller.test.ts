import { describe, beforeEach, expect, it, mock } from "bun:test";
import { createMockResponse } from "./test-utils";

const hashMock = mock(async (value: string) => `hashed-${value}`);
const userCreateMock = mock(async (data: any) => ({ id: 1, ...data }));
const userFindAllMock = mock(async () => [
  { rut: "11.111.111-1", nombre: "Alice", correo: "alice@example.com", rol: "doctor" },
]);

mock.module("../models", () => ({
  Sequelize: { Op: {} },
  User: {
    create: userCreateMock,
    findAll: userFindAllMock,
  },
}));

mock.module("bcrypt", () => ({
  hash: hashMock,
}));

const { crearUser, listarUsers } = await import("../controllers/user.controller.js");

describe("User controller", () => {
  beforeEach(() => {
    hashMock.mockReset();
    hashMock.mockImplementation(async (value: string) => `hashed-${value}`);
    userCreateMock.mockReset();
    userCreateMock.mockImplementation(async (data: any) => ({ id: 1, ...data }));
    userFindAllMock.mockReset();
    userFindAllMock.mockImplementation(async () => [
      { rut: "20.147.725-5", nombre: "Alice", correo: "alice@example.com", rol: "doctor" },
    ]);
  });

  it("crearUser crea un usuario con datos v�lidos", async () => {
    hashMock.mockResolvedValueOnce("hashed-secret");
    const expectedUser = {
      rut: "20.731.153-7",
      nombre: "Bob",
      correo: "bob@example.com",
      rol: "doctor",
      contrasena_hash: "hashed-secret",
    };
    userCreateMock.mockResolvedValueOnce({ id: 7, ...expectedUser });

    const req = {
      body: {
        rut: expectedUser.rut,
        nombre: expectedUser.nombre,
        correo: expectedUser.correo,
        contra: "secret",
        rol: expectedUser.rol,
      },
    } as any;
    const res = createMockResponse();

    await crearUser(req, res);

    expect(hashMock).toHaveBeenCalledWith("secret", 10);
    expect(userCreateMock).toHaveBeenCalledWith(expectedUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 7, ...expectedUser });
  });

  it("listarUsers retorna todos los usuarios", async () => {
    const users = [
      { rut: "20.147.725-5", nombre: "Alice", correo: "alice@example.com", rol: "doctor" },
      { rut: "20.731.153-7", nombre: "Bob", correo: "bob@example.com", rol: "enfermera" },
    ];
    userFindAllMock.mockResolvedValueOnce(users);
    const res = createMockResponse();

    await listarUsers({} as any, res);

    expect(userFindAllMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(users);
  });
});
