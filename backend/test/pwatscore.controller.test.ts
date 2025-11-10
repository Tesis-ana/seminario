import { describe, beforeEach, afterAll, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";
import path from "node:path";
import { createMockResponse } from "./test-utils";

const imagenFindOneMock = mock(async () => ({ id: 10, nombre_archivo: "/imagenes/example.jpg" }));
const segmentacionFindOneMock = mock(async () => ({ id: 20, ruta_mascara: "/mascaras/example.jpg" }));
const pwatscoreCreateMock = mock(async (data: any) => ({ id: 30, ...data }));

const spawnMock = mock((cmd: string, args: string[], options: any) => {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  queueMicrotask(() => {
    const resultado = JSON.stringify({
      Cat3: 1,
      Cat4: 2,
      Cat5: 3,
      Cat6: 4,
      Cat7: 5,
      Cat8: 6,
    });
    proc.stdout.emit("data", Buffer.from(resultado));
    proc.emit("close", 0);
  });
  return proc;
});

mock.module("../models", () => ({
  Sequelize: { Op: {} },
  Imagen: { findOne: imagenFindOneMock },
  Segmentacion: { findOne: segmentacionFindOneMock },
  PWATScore: { create: pwatscoreCreateMock },
}));

const pwatscoreModule = await import("../controllers/pwatscore.controller.js");
const { predecirPwatscore, __setSpawn } = pwatscoreModule as any;
const realSpawn = require("child_process").spawn;

describe("PWATScore controller", () => {
  beforeEach(() => {
    imagenFindOneMock.mockReset();
    imagenFindOneMock.mockImplementation(async () => ({ id: 10, nombre_archivo: "/imagenes/example.jpg" }));
    segmentacionFindOneMock.mockReset();
    segmentacionFindOneMock.mockImplementation(async () => ({ id: 20, ruta_mascara: "/mascaras/example.jpg" }));
    pwatscoreCreateMock.mockReset();
    pwatscoreCreateMock.mockImplementation(async (data: any) => ({ id: 30, ...data }));

    spawnMock.mockReset();
    spawnMock.mockImplementation((cmd: string, args: string[], options: any) => {
      const proc = new EventEmitter() as any;
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      queueMicrotask(() => {
        const resultado = JSON.stringify({
          Cat3: 1,
          Cat4: 2,
          Cat5: 3,
          Cat6: 4,
          Cat7: 5,
          Cat8: 6,
        });
        proc.stdout.emit("data", Buffer.from(resultado));
        proc.emit("close", 0);
      });
      return proc;
    });

    __setSpawn(spawnMock);
  });

  afterAll(() => {
    __setSpawn(realSpawn);
  });

  it("calcula PWAT y retorna las categorias", async () => {
    const req = { body: { id: 10 } } as any;
    const res = createMockResponse();

    await predecirPwatscore(req, res);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(imagenFindOneMock).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(segmentacionFindOneMock).toHaveBeenCalledWith({ where: { imagen_id: 10 } });

    expect(spawnMock).toHaveBeenCalled();
    const [cmd, args] = spawnMock.mock.calls[0];
    expect(cmd).toBe("conda");
    expect(args.slice(0, 4)).toEqual(["run", "-n", "pyradiomics_env12", "python"]);
    const maskArgIndex = args.indexOf("--mask_path");
    expect(maskArgIndex).toBeGreaterThan(-1);
    expect(args[maskArgIndex + 1]).toBe(path.basename("/mascaras/example.jpg"));

    expect(pwatscoreCreateMock).toHaveBeenCalledWith({
      evaluador: "experto",
      cat3: 1,
      cat4: 2,
      cat5: 3,
      cat6: 4,
      cat7: 5,
      cat8: 6,
      fecha_evaluacion: expect.any(Date),
      observaciones: expect.any(String),
      imagen_id: 10,
      segmentacion_id: 20,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body?.pwatscoreId).toBe(30);
    expect(res.body?.categorias).toEqual({
      cat3: 1,
      cat4: 2,
      cat5: 3,
      cat6: 4,
      cat7: 5,
      cat8: 6,
    });
  });
});
