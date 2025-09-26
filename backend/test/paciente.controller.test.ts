import { describe, beforeEach, expect, it, mock } from "bun:test";
import { createMockResponse } from "./test-utils";

const pacienteCreateMock = mock(async (data: any) => ({ id: 9, ...data }));
const atencionCreateMock = mock(async () => ({}));

mock.module("../models", () => ({
  Sequelize: { Op: {} },
  Paciente: {
    create: pacienteCreateMock,
  },
  Atencion: {
    create: atencionCreateMock,
  },
}));

const { crearPaciente } = await import("../controllers/paciente.controller.js");

describe("Paciente controller", () => {
  beforeEach(() => {
    pacienteCreateMock.mockReset();
    pacienteCreateMock.mockImplementation(async (data: any) => ({ id: 9, ...data }));
    atencionCreateMock.mockReset();
    atencionCreateMock.mockImplementation(async () => ({}));
  });

  it("retorna 400 si faltan campos obligatorios", async () => {
    const req = { body: { comentarios: "N/A" } } as any;
    const res = createMockResponse();

    await crearPaciente(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Los campos sexo y user_id son obligatorios.' });
    expect(pacienteCreateMock).not.toHaveBeenCalled();
  });

  it("crea paciente y registra atencion opcional", async () => {
    const req = {
      body: {
        sexo: 'F',
        comentarios: 'Urgencia',
        user_id: '11.111.111-1',
        profesional_id: 5,
      },
    } as any;
    const res = createMockResponse();

    await crearPaciente(req, res);

    expect(pacienteCreateMock).toHaveBeenCalledWith({
      sexo: 'F',
      fecha_ingreso: expect.any(Date),
      comentarios: 'Urgencia',
      user_id: '11.111.111-1',
    });
    expect(atencionCreateMock).toHaveBeenCalledWith({
      paciente_id: 9,
      profesional_id: 5,
      fecha_atencion: expect.any(Date),
    });
    expect(res.statusCode).toBe(201);
    expect(res.body?.message).toBe('Paciente creado correctamente.');
    expect(res.body?.paciente.id).toBe(9);
  });
});
