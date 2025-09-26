import { describe, it, beforeAll, beforeEach, expect, mock } from "bun:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { EventEmitter } from "node:events";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-secret";
process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
process.env.DB_USER = process.env.DB_USER ?? "root";
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "password";
process.env.DB_NAME = process.env.DB_NAME ?? "test";
process.env.DB_PORT = process.env.DB_PORT ?? "3306";
process.env.DB_POOL_MAX = process.env.DB_POOL_MAX ?? "5";
process.env.DB_POOL_MIN = process.env.DB_POOL_MIN ?? "0";
process.env.DB_POOL_ACQUIRE = process.env.DB_POOL_ACQUIRE ?? "30000";
process.env.DB_POOL_IDLE = process.env.DB_POOL_IDLE ?? "10000";

const userFindOneMock = mock(async () => undefined as any);
const pacienteCreateMock = mock(async (payload: any) => ({ id: 101, ...payload }));
const atencionCreateMock = mock(async () => ({}));
const imagenFindByPkMock = mock(async () => ({ id: 77, nombre_archivo: "../categorizador/predicts/imgs/1_1758858838874.jpg" }));
const imagenFindOneMock = mock(async () => ({ id: 77, nombre_archivo: "predicts/imgs/caso.jpg" }));
const segmentacionFindOneMock = mock(async () => ({ id: 333, ruta_mascara: "/virtual/masks/caso.jpg" }));
const segmentacionCreateMock = mock(async (payload: any) => ({ id: 2, ...payload }));
const pwatscoreCreateMock = mock(async (payload: any) => ({ id: 702, ...payload }));
const ensureDirExistsMock = mock(() => {});

mock.module("../models", () => ({
  Sequelize: { Op: {} },
  User: { findOne: userFindOneMock },
  Paciente: { create: pacienteCreateMock },
  Atencion: { create: atencionCreateMock },
  Imagen: { findByPk: imagenFindByPkMock, findOne: imagenFindOneMock },
  Segmentacion: { create: segmentacionCreateMock, findOne: segmentacionFindOneMock },
  PWATScore: { create: pwatscoreCreateMock },
}));

mock.module("../controllers/utils/fileUpload.js", () => ({
  uploadSingleImage: mock(() => {}),
  MASKS_DIR: "/virtual/masks",
  ensureDirExists: ensureDirExistsMock,
  isJpegMime: () => true,
  respondMulterError: () => false,
}));

const segmentacionController = await import("../controllers/segmentacion.controller.js");
const pwatscoreController = await import("../controllers/pwatscore.controller.js");

type SpawnMock = ReturnType<typeof mock<(cmd: string, args: string[], opts: any) => any>>;

function createSpawnMock(exitCode: number, options: { stdout?: string; stderr?: string } = {}): SpawnMock {
  return mock(() => {
    const proc = new EventEmitter();
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    (proc as any).stdout = stdout;
    (proc as any).stderr = stderr;

    queueMicrotask(() => {
      if (options.stdout) stdout.emit("data", options.stdout);
      if (options.stderr) stderr.emit("data", options.stderr);
      proc.emit("close", exitCode);
    });

    return proc as any;
  });
}

let hashedPassword: string;
const defaultRut = "11.111.111-1";

beforeAll(async () => {
  hashedPassword = await bcrypt.hash("ClaveSegura123", 10);
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const verifyToken = require("../middleware/auth.middleware.js");

  app.use((req, res, next) => {
    const openPaths = ["/", "/users/login"];
    const imagenRegex = /^\/imagenes\/\d+\/archivo$/;
    const maskRegex = /^\/segmentaciones\/\d+\/mask$/;
    if (
      openPaths.includes(req.path) ||
      (req.method === "GET" && (imagenRegex.test(req.path) || maskRegex.test(req.path)))
    ) {
      return next();
    }
    return verifyToken(req, res, next);
  });

  require("../routes/main.routes.js")(app);

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = err?.status ?? 500;
    const message = err?.message ?? "Error inesperado";
    return res.status(status).json({ message });
  });

  return app;
}

type JsonBody = Record<string, unknown> | string | undefined;

type ResponsePayload<T = any> = {
  status: number;
  body: T;
};

async function withServer<T>(app: express.Express, handler: (port: number) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo | null;
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("No se pudo obtener el puerto del servidor de pruebas.");
  }

  try {
    return await handler(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
  }
}

async function sendRequest<T = any>(
  app: express.Express,
  method: string,
  path: string,
  body?: JsonBody,
  headers: Record<string, string> = {}
): Promise<ResponsePayload<T>> {
  return withServer(app, async (port) => {
    const init: RequestInit = { method, headers: { ...headers } };

    if (body !== undefined) {
      if (typeof body === "string") {
        init.body = body;
      } else {
        init.body = JSON.stringify(body);
        init.headers = { "Content-Type": "application/json", ...init.headers };
      }
    }

    const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
    const raw = await response.text();
    let parsed: any = undefined;
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    return { status: response.status, body: parsed };
  });
}

function createAuthHeader(overrides: Record<string, unknown> = {}) {
  const token = jwt.sign({ rut: defaultRut, rol: "admin", ...overrides }, process.env.JWT_SECRET!);
  return { Authorization: `Bearer ${token}` };
}

beforeEach(() => {
  userFindOneMock.mockReset();
  userFindOneMock.mockImplementation(async () => ({
    rut: defaultRut,
    contrasena_hash: hashedPassword,
    rol: "admin",
  }));

  pacienteCreateMock.mockReset();
  pacienteCreateMock.mockImplementation(async (payload: any) => ({ id: 501, ...payload }));

  atencionCreateMock.mockReset();
  atencionCreateMock.mockImplementation(async () => ({}));

  imagenFindByPkMock.mockReset();
  imagenFindByPkMock.mockImplementation(async () => ({
    id: 77,
    nombre_archivo: "predicts/imgs/caso.jpg",
  }));

  imagenFindOneMock.mockReset();
  imagenFindOneMock.mockImplementation(async () => ({
    id: 77,
    nombre_archivo: "predicts/imgs/caso.jpg",
  }));

  segmentacionCreateMock.mockReset();
  segmentacionCreateMock.mockImplementation(async (payload: any) => ({ id: 909, ...payload }));

  segmentacionFindOneMock.mockReset();
  segmentacionFindOneMock.mockImplementation(async () => ({
    id: 333,
    ruta_mascara: "/virtual/masks/caso.jpg",
  }));

  pwatscoreCreateMock.mockReset();
  pwatscoreCreateMock.mockImplementation(async (payload: any) => ({ id: 801, ...payload }));

  ensureDirExistsMock.mockReset();

  const spawnSuccess = createSpawnMock(0, { stdout: "ok" });
  segmentacionController.__setSpawn(spawnSuccess);
  const pwatSpawnSuccess = createSpawnMock(0, { stdout: JSON.stringify({
    Cat3: 0,
    Cat4: 0,
    Cat5: 0,
    Cat6: 0,
    Cat7: 0,
    Cat8: 0,
  }) });
  pwatscoreController.__setSpawn(pwatSpawnSuccess as any);
});

describe("POST /users/login", () => {
  it("devuelve un token v�lido cuando las credenciales son correctas", async () => {
    const app = buildApp();
    const response = await sendRequest(app, "POST", "/users/login", {
      rut: defaultRut,
      contra: "ClaveSegura123",
    });

    expect(response.status).toBe(200);
    expect(typeof response.body?.token).toBe("string");
    expect(userFindOneMock).toHaveBeenCalledTimes(1);
  });

  it("retorna 401 cuando la contrase�a es incorrecta", async () => {
    const app = buildApp();
    const response = await sendRequest(app, "POST", "/users/login", {
      rut: defaultRut,
      contra: "otraClave",
    });

    expect(response.status).toBe(401);
    expect(response.body?.message).toContain("incorrecta");
    expect(userFindOneMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /pwatscore", () => {
  it("ejecuta el script con conda y persiste las categorias devueltas", async () => {
    const categorias = {
      Cat3: 1,
      Cat4: 2,
      Cat5: 3,
      Cat6: 4,
      Cat7: 5,
      Cat8: 6,
    };
    const spawnMock = createSpawnMock(0, { stdout: `${JSON.stringify(categorias)}\n` });
    pwatscoreController.__setSpawn(spawnMock as any);

    const app = buildApp();
    const response = await sendRequest(app, "POST", "/pwatscore", { id: 77 }, createAuthHeader());

    expect(response.status).toBe(201);
    expect(response.body?.categorias).toEqual(
      expect.objectContaining({
        cat3: categorias.Cat3,
        cat4: categorias.Cat4,
        cat5: categorias.Cat5,
        cat6: categorias.Cat6,
        cat7: categorias.Cat7,
        cat8: categorias.Cat8,
      })
    );

    expect(pwatscoreCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cat3: categorias.Cat3,
        cat4: categorias.Cat4,
        cat5: categorias.Cat5,
        cat6: categorias.Cat6,
        cat7: categorias.Cat7,
        cat8: categorias.Cat8,
        imagen_id: 77,
        segmentacion_id: 333,
      })
    );

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawnMock.mock.calls[0];
    expect(String(cmd)).toContain("conda");
    expect(args).toEqual(
      expect.arrayContaining([
        "run",
        "-n",
        "pyradiomics_env12",
        "python",
        expect.stringContaining("PWAT.py"),
        "--mode",
        "predecir",
        "--image_path",
        "predicts/imgs/caso.jpg",
        "--mask_path",
        "caso.jpg",
      ])
    );
  });

  it("retorna 500 cuando el script externo finaliza con error", async () => {
    const spawnMock = createSpawnMock(1, { stderr: "Traceback simulated" });
    pwatscoreController.__setSpawn(spawnMock as any);

    const app = buildApp();
    const response = await sendRequest(app, "POST", "/pwatscore", { id: 77 }, createAuthHeader());

    expect(response.status).toBe(500);
    expect(String(response.body?.message)).toContain("Error al ejecutar");
    expect(String(response.body?.error)).toContain("Traceback");
    expect(pwatscoreCreateMock).not.toHaveBeenCalled();
  });

  it("retorna 404 cuando no existe segmentacion asociada", async () => {
    segmentacionFindOneMock.mockImplementationOnce(async () => null);

    const app = buildApp();
    const response = await sendRequest(app, "POST", "/pwatscore", { id: 77 }, createAuthHeader());

    expect(response.status).toBe(404);
    expect(String(response.body?.message)).toContain("segmentación");
    expect(pwatscoreCreateMock).not.toHaveBeenCalled();
  });
});

describe("POST /pacientes", () => {
  it("bloquea solicitudes sin token y devuelve 401", async () => {
    const app = buildApp();
    const response = await sendRequest(app, "POST", "/pacientes", {
      sexo: "F",
      user_id: defaultRut,
    });

    expect(response.status).toBe(401);
    expect(response.body?.message).toContain("Token");
    expect(pacienteCreateMock).not.toHaveBeenCalled();
  });

  it("crea un paciente cuando los datos y el token son v�lidos", async () => {
    const app = buildApp();
    const response = await sendRequest(app, "POST", "/pacientes", {
      sexo: "M",
      user_id: defaultRut,
      comentarios: "Ingreso de prueba",
      profesional_id: 42,
    }, createAuthHeader());

    expect(response.status).toBe(201);
    expect(response.body?.paciente?.user_id).toBe(defaultRut);
    expect(pacienteCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      sexo: "M",
      user_id: defaultRut,
    }));
    expect(atencionCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      profesional_id: 42,
    }));
  });

  it("propaga el error cuando la capa de datos falla", async () => {
    pacienteCreateMock.mockImplementationOnce(async () => {
      throw new Error("Fallo en la base de datos");
    });

    const app = buildApp();
    const response = await sendRequest(app, "POST", "/pacientes", {
      sexo: "F",
      user_id: defaultRut,
    }, createAuthHeader());

    expect(response.status).toBe(500);
    expect(String(response.body?.message)).toContain("Error al crear paciente");
    expect(pacienteCreateMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /segmentaciones/automatico", () => {
  it("genera una segmentaci�n autom�tica cuando el proceso externo finaliza correctamente", async () => {
    const app = buildApp();
    const response = await sendRequest(app, "POST", "/segmentaciones/automatico", {
      id: 77,
    }, createAuthHeader());

    expect(response.status).toBe(201);
    expect(response.body?.segmentacionId).toBe(909);
    expect(imagenFindByPkMock).toHaveBeenCalledWith(77);
    expect(segmentacionCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      imagen_id: 77,
      metodo: "automatica",
    }));
  });

  it("retorna 404 cuando la imagen solicitada no existe", async () => {
    imagenFindByPkMock.mockImplementationOnce(async () => null);

    const app = buildApp();
    const response = await sendRequest(app, "POST", "/segmentaciones/automatico", {
      id: 999,
    }, createAuthHeader());

    expect(response.status).toBe(404);
    expect(response.body?.message).toContain("La imagen no existe");
    expect(segmentacionCreateMock).not.toHaveBeenCalled();
  });

  it("propaga el fallo del proceso externo y retorna 500", async () => {
    const spawnFailure = createSpawnMock(1, { stderr: "Proceso fallido" });
    segmentacionController.__setSpawn(spawnFailure as any);

    const app = buildApp();
    const response = await sendRequest(app, "POST", "/segmentaciones/automatico", {
      id: 77,
    }, createAuthHeader());

    expect(response.status).toBe(500);
    expect(String(response.body?.message)).toContain("Error al crear segmentacion");
  });
});




