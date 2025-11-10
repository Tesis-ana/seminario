import { describe, beforeEach, afterAll, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";
import path from "node:path";
import { createMockResponse } from "./test-utils";

const ensureDirExistsMock = mock(() => {});
const segmentacionCreateMock = mock(async (data: any) => ({ id: 42, ...data }));
const imagenFindByPkMock = mock(async () => ({ id: 99, nombre_archivo: "/data/img/paciente-1.png" }));

const spawnMock = mock((cmd: string, args: string[], options: any) => {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  queueMicrotask(() => {
    proc.stdout.emit("data", Buffer.from(""));
    proc.emit("close", 0);
  });
  return proc;
});

mock.module("../controllers/utils/fileUpload", () => ({
  uploadSingleImage: () => {
    throw new Error("upload no utilizado en esta prueba");
  },
  MASKS_DIR: "/tmp/masks",
  ensureDirExists: ensureDirExistsMock,
  isJpegMime: () => true,
  respondMulterError: () => false,
}));

mock.module("../models", () => ({
  Sequelize: { Op: {} },
  Imagen: { findByPk: imagenFindByPkMock },
  Segmentacion: { create: segmentacionCreateMock },
}));

const segmentacionModule = await import("../controllers/segmentacion.controller.js");
const { crearSegmentacionAutomatica, __setSpawn } = segmentacionModule as any;
const realSpawn = require("child_process").spawn;

describe("Segmentacion controller", () => {
  beforeEach(() => {
    ensureDirExistsMock.mockReset();
    segmentacionCreateMock.mockReset();
    segmentacionCreateMock.mockImplementation(async (data: any) => ({ id: 42, ...data }));
    imagenFindByPkMock.mockReset();
    imagenFindByPkMock.mockImplementation(async () => ({ id: 99, nombre_archivo: "/data/img/paciente-1.png" }));

    spawnMock.mockReset();
    spawnMock.mockImplementation((cmd: string, args: string[], options: any) => {
      const proc = new EventEmitter() as any;
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      queueMicrotask(() => {
        proc.stdout.emit("data", Buffer.from(""));
        proc.emit("close", 0);
      });
      return proc;
    });

    __setSpawn(spawnMock);
  });

  afterAll(() => {
    __setSpawn(realSpawn);
  });

  it("genera la peticion al categorizador y guarda la segmentacion", async () => {
    const req = { body: { id: 15 } } as any;
    const res = createMockResponse();

    await crearSegmentacionAutomatica(req, res);

    expect(imagenFindByPkMock).toHaveBeenCalledWith(15);
    expect(spawnMock).toHaveBeenCalled();

    const [cmd, args] = spawnMock.mock.calls[0];
    expect(cmd).toBe("conda");
    expect(args.slice(0, 4)).toEqual(["run", "-n", "radiomics", "python"]);

    const expectedMaskPath = path.join("/virtual/masks", "paciente-1.jpg");
    expect(segmentacionCreateMock).toHaveBeenCalledWith({
      imagen_id: 15,
      ruta_mascara: expectedMaskPath,
      metodo: "automatica",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body?.segmentacionId).toBe(42);
    expect(res.body?.message).toContain("Segmentaci");
  });
});
