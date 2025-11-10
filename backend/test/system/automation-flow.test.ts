import { describe, it, beforeAll, afterAll, beforeEach, expect, mock } from "bun:test";
import express from "express";
import type { AddressInfo } from "node:net";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import jwt from "jsonwebtoken";

const expectedCategories = {
  Cat3: 10,
  Cat4: 20,
  Cat5: 30,
  Cat6: 40,
  Cat7: 50,
  Cat8: 60,
};

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "automation-flow-"));
const maskDir = path.join(tmpRoot, "masks");
const imagesDir = path.join(tmpRoot, "imgs");
fs.mkdirSync(maskDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

const dummyPythonPath = path.join(tmpRoot, "dummy-python");
fs.writeFileSync(dummyPythonPath, "#!/usr/bin/env bash\nexit 0\n");
fs.chmodSync(dummyPythonPath, 0o755);

const condaPosixPath = path.join(tmpRoot, "conda");
const condaPosixScript = `#!/usr/bin/env bash
set -e
mode=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--mode" ]; then
    mode="$2"
    shift 2
    continue
  fi
  shift
done

if [ "$mode" = "predecir" ]; then
  printf '{"Cat3":%d,"Cat4":%d,"Cat5":%d,"Cat6":%d,"Cat7":%d,"Cat8":%d}\n' ${expectedCategories.Cat3} ${expectedCategories.Cat4} ${expectedCategories.Cat5} ${expectedCategories.Cat6} ${expectedCategories.Cat7} ${expectedCategories.Cat8}
fi
exit 0
`;
fs.writeFileSync(condaPosixPath, condaPosixScript);
try {
  fs.chmodSync(condaPosixPath, 0o755);
} catch {}

const condaBatchPath = path.join(tmpRoot, "conda.bat");
const condaBatchScript = `@echo off
setlocal EnableDelayedExpansion
set MODE=
:LOOP
if "%~1"=="" goto END
if "%~1"=="--mode" (
  shift
  set MODE=%~1
)
shift
goto LOOP
:END
if /I "%MODE%"=="predecir" (
  echo {"Cat3":${expectedCategories.Cat3},"Cat4":${expectedCategories.Cat4},"Cat5":${expectedCategories.Cat5},"Cat6":${expectedCategories.Cat6},"Cat7":${expectedCategories.Cat7},"Cat8":${expectedCategories.Cat8}}
)
exit /B 0
`;
fs.writeFileSync(condaBatchPath, condaBatchScript);

const condaBinary = process.platform === "win32" ? condaBatchPath : condaPosixPath;

const originalPathValue = process.env.PATH;
const originalCondaBin = process.env.CONDA_BIN;
const originalForceConda = process.env.CATEGORIZADOR_FORCE_CONDA;
const originalCategorizerPython = process.env.CATEGORIZADOR_PYTHON;
const originalJwtSecret = process.env.JWT_SECRET;

process.env.PATH = originalPathValue ? `${tmpRoot}${path.delimiter}${originalPathValue}` : tmpRoot;
process.env.CONDA_BIN = condaBinary;
process.env.CATEGORIZADOR_FORCE_CONDA = "false";
process.env.CATEGORIZADOR_PYTHON = dummyPythonPath;
process.env.JWT_SECRET = "system-test-secret";

interface PacienteRecord {
  id: number;
  user_id: string;
  sexo: string;
}

interface ImagenRecord {
  id: number;
  nombre_archivo: string;
  ruta_archivo: string;
  paciente_id: number;
  fecha_captura: Date;
}

interface SegmentacionRecord {
  id: number;
  imagen_id: number;
  ruta_mascara: string;
  metodo: string;
}

interface PWATScoreRecord {
  id: number;
  imagen_id: number;
  segmentacion_id: number;
  cat3: number;
  cat4: number;
  cat5: number;
  cat6: number;
  cat7: number;
  cat8: number;
}

const basePatient: PacienteRecord = { id: 1, user_id: "11.111.111-1", sexo: "F" };
const baseImage: ImagenRecord = {
  id: 77,
  nombre_archivo: "predicts/imgs/caso.jpg",
  ruta_archivo: "predicts/imgs/caso.jpg",
  paciente_id: basePatient.id,
  fecha_captura: new Date("2023-01-01T00:00:00Z"),
};

let pacienteIdSeq = basePatient.id;
let imagenIdSeq = baseImage.id;
let segmentacionIdSeq = 0;
let pwatscoreIdSeq = 0;
let atencionIdSeq = 0;

const store = {
  pacientes: [] as PacienteRecord[],
  imagenes: [] as ImagenRecord[],
  segmentaciones: [] as SegmentacionRecord[],
  pwatscores: [] as PWATScoreRecord[],
  reset() {
    pacienteIdSeq = basePatient.id;
    imagenIdSeq = baseImage.id;
    segmentacionIdSeq = 0;
    pwatscoreIdSeq = 0;
    atencionIdSeq = 0;

    this.pacientes.length = 0;
    this.imagenes.length = 0;
    this.segmentaciones.length = 0;
    this.pwatscores.length = 0;

    this.pacientes.push({ ...basePatient });
    this.imagenes.push({ ...baseImage, fecha_captura: new Date(baseImage.fecha_captura) });
  },
};
store.reset();

type Where<T> = Partial<T>;

function matchesWhere<T>(record: T, where?: Where<T>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => (record as any)[key] === value);
}

function removeMatching<T>(collection: T[], where?: Where<T>): number {
  if (!where || Object.keys(where).length === 0) {
    const removedAll = collection.length;
    collection.length = 0;
    return removedAll;
  }
  let removed = 0;
  for (let i = collection.length - 1; i >= 0; i--) {
    if (matchesWhere(collection[i], where)) {
      collection.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

function wrapRecord<T extends Record<string, any>>(record: T) {
  return {
    ...record,
    save: async () => record,
    toJSON: () => ({ ...record }),
  };
}

const modelsStub = {
  Sequelize: { Op: {} },
  sequelize: {
    authenticate: async () => {},
    sync: async () => {},
  },
  User: {
    findOne: async () => null,
  },
  Paciente: {
    create: async (payload: any) => {
      const record = { id: ++pacienteIdSeq, ...payload };
      store.pacientes.push(record);
      return wrapRecord(record);
    },
    findOne: async (params?: any) => store.pacientes.find((paciente) => matchesWhere(paciente, params?.where)) ?? null,
    findByPk: async (id: number) => store.pacientes.find((paciente) => paciente.id === id) ?? null,
    findAll: async () => [...store.pacientes],
  },
  Imagen: {
    create: async (payload: any) => {
      const record = { id: ++imagenIdSeq, fecha_captura: new Date(), ...payload };
      store.imagenes.push(record);
      return wrapRecord(record);
    },
    findByPk: async (id: number) => store.imagenes.find((imagen) => imagen.id === id) ?? null,
    findOne: async (params?: any) => store.imagenes.find((imagen) => matchesWhere(imagen, params?.where)) ?? null,
    findAll: async () => [...store.imagenes],
  },
  Segmentacion: {
    create: async (payload: any) => {
      const record = { id: ++segmentacionIdSeq, ...payload };
      store.segmentaciones.push(record);
      return wrapRecord(record);
    },
    findOne: async (params?: any) => store.segmentaciones.find((seg) => matchesWhere(seg, params?.where)) ?? null,
    findByPk: async (id: number) => store.segmentaciones.find((seg) => seg.id === id) ?? null,
    destroy: async (params?: any) => removeMatching(store.segmentaciones, params?.where),
  },
  PWATScore: {
    create: async (payload: any) => {
      const record = { id: ++pwatscoreIdSeq, ...payload };
      store.pwatscores.push(record);
      return wrapRecord(record);
    },
    findOne: async (params?: any) => store.pwatscores.find((score) => matchesWhere(score, params?.where)) ?? null,
    destroy: async (params?: any) => removeMatching(store.pwatscores, params?.where),
  },
  Atencion: {
    create: async (payload: any) => wrapRecord({ id: ++atencionIdSeq, ...payload }),
  },
  Profesional: {
    findOne: async () => null,
  },
};

mock.module("../../models/index.js", () => modelsStub);
mock.module("../../models", () => modelsStub);
mock.module("../../controllers/utils/fileUpload.js", () => ({
  uploadSingleImage: () => {
    throw new Error("upload no utilizado en esta prueba");
  },
  IMGS_DIR: imagesDir,
  MASKS_DIR: maskDir,
  ensureDirExists: (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },
  isJpegMime: () => true,
  respondMulterError: () => false,
}));

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
    await new Promise<void>((resolve, reject) => server.close((err?: Error) => (err ? reject(err) : resolve())));
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
  route: string,
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

    const response = await fetch(`http://127.0.0.1:${port}${route}`, init);
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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const verifyToken = require("../../middleware/auth.middleware.js");

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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

  require("../../routes/main.routes.js")(app);

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = err?.status ?? 500;
    const message = err?.message ?? "Error inesperado.";
    return res.status(status).json({ message });
  });

  return app;
}

function createAuthHeader(overrides: Record<string, unknown> = {}) {
  const token = jwt.sign({ rut: basePatient.user_id, rol: "admin", ...overrides }, process.env.JWT_SECRET!);
  return { Authorization: `Bearer ${token}` };
}

function removeMaskArtifacts() {
  if (!fs.existsSync(maskDir)) {
    return;
  }
  for (const entry of fs.readdirSync(maskDir)) {
    fs.rmSync(path.join(maskDir, entry), { recursive: true, force: true });
  }
}

describe("automation flow system test", () => {
  let app: express.Express;
  let authHeader: Record<string, string>;

  beforeAll(() => {
    store.reset();
    removeMaskArtifacts();
    app = buildApp();
    authHeader = createAuthHeader();
  });

  beforeEach(() => {
    store.reset();
    removeMaskArtifacts();
  });

  afterEach(() => {
    removeMaskArtifacts();
  });

  afterAll(() => {
    removeMaskArtifacts();
    store.reset();

    if (originalPathValue === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPathValue;
    }
    if (originalCondaBin === undefined) {
      delete process.env.CONDA_BIN;
    } else {
      process.env.CONDA_BIN = originalCondaBin;
    }
    if (originalForceConda === undefined) {
      delete process.env.CATEGORIZADOR_FORCE_CONDA;
    } else {
      process.env.CATEGORIZADOR_FORCE_CONDA = originalForceConda;
    }
    if (originalCategorizerPython === undefined) {
      delete process.env.CATEGORIZADOR_PYTHON;
    } else {
      process.env.CATEGORIZADOR_PYTHON = originalCategorizerPython;
    }
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("crea una segmentación automática y calcula el PWAT score reusando el stub de conda", async () => {
    const expectedLowercase = {
      cat3: expectedCategories.Cat3,
      cat4: expectedCategories.Cat4,
      cat5: expectedCategories.Cat5,
      cat6: expectedCategories.Cat6,
      cat7: expectedCategories.Cat7,
      cat8: expectedCategories.Cat8,
    };

    const segmentacionResponse = await sendRequest(app, "POST", "/segmentaciones/automatico", { id: baseImage.id }, authHeader);
    expect(segmentacionResponse.status).toBe(201);
    expect(segmentacionResponse.body?.segmentacionId).toBeGreaterThan(0);

    const segmentacionId = segmentacionResponse.body?.segmentacionId as number;
    const storedSegmentacion = store.segmentaciones.find((seg) => seg.id === segmentacionId);
    expect(storedSegmentacion).toBeDefined();
    expect(storedSegmentacion?.metodo).toBe("automatica");
    expect(storedSegmentacion?.imagen_id).toBe(baseImage.id);

    const maskPath = storedSegmentacion!.ruta_mascara;
    expect(maskPath).toContain(maskDir);
    fs.mkdirSync(path.dirname(maskPath), { recursive: true });
    fs.writeFileSync(maskPath, "");

    const pwatResponse = await sendRequest(app, "POST", "/pwatscore", { id: baseImage.id }, authHeader);
    expect(pwatResponse.status).toBe(201);
    expect(pwatResponse.body?.categorias).toEqual(expectedLowercase);

    const storedPwatscore = store.pwatscores.find((score) => score.segmentacion_id === segmentacionId);
    expect(storedPwatscore).toBeDefined();
    expect(storedPwatscore).toMatchObject({
      ...expectedLowercase,
      imagen_id: baseImage.id,
      segmentacion_id: segmentacionId,
    });

    const previousPwatscoreCount = store.pwatscores.length;
    store.segmentaciones.length = 0;
    removeMaskArtifacts();

    const missingSegmentResponse = await sendRequest(app, "POST", "/pwatscore", { id: baseImage.id }, authHeader);
    expect(missingSegmentResponse.status).toBe(404);
    expect(store.pwatscores.length).toBe(previousPwatscoreCount);
  });
});
