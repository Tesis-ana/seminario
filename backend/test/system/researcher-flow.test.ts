import { describe, it, beforeAll, afterAll, expect } from "bun:test";
import express from "express";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { promises as fsp } from "node:fs";
import jwt from "jsonwebtoken";

type JsonBody = Record<string, unknown> | string | undefined;

interface ResponsePayload<T = any> {
  status: number;
  body: T;
}

const tempRoot = path.join(import.meta.dir, "..", ".tmp-researcher-flow");
const metricsPath = path.join(import.meta.dir, "../..", "data", "metrics.json");
const metricsBackupPath = path.join(tempRoot, "metrics.json.bak");
const modelsDir = path.join(import.meta.dir, "../../..", "categorizador", "modelos");
const modelsBackupDir = path.join(tempRoot, "modelos-backup");
const pythonShimDir = path.join(tempRoot, "bin");

let originalPath: string | undefined;
let metricsOriginallyExisted = false;
let modelsOriginallyExisted = false;

const childProcessModule = require("node:child_process");
const realSpawnSync = childProcessModule.spawnSync;
childProcessModule.spawnSync = function patchedSpawnSync(command: string, args: string[], options: any = {}) {
  if (command === "python3") {
    const fallbackCommand = process.platform === "win32" ? "python" : "python3";
    const safePath = typeof options?.env?.PATH === "string" ? options.env.PATH : "";
    const basePath = originalPath ?? process.env.PATH ?? "";
    const mergedPath = [basePath, safePath].filter(Boolean).join(path.delimiter);
    return realSpawnSync.call(childProcessModule, fallbackCommand, args, {
      ...options,
      env: { ...(options.env ?? {}), PATH: mergedPath },
    });
  }
  return realSpawnSync.call(childProcessModule, command, args, options);
};

beforeAll(async () => {
  await fsp.mkdir(tempRoot, { recursive: true });
  await fsp.mkdir(path.dirname(metricsPath), { recursive: true });

  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "researcher-flow-secret";
  process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
  process.env.DB_USER = process.env.DB_USER ?? "root";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "password";
  process.env.DB_NAME = process.env.DB_NAME ?? "test";
  process.env.DB_PORT = process.env.DB_PORT ?? "3306";
  process.env.DB_DIALECT = process.env.DB_DIALECT ?? "mysql";
  process.env.DB_POOL_MAX = process.env.DB_POOL_MAX ?? "5";
  process.env.DB_POOL_MIN = process.env.DB_POOL_MIN ?? "0";
  process.env.DB_POOL_ACQUIRE = process.env.DB_POOL_ACQUIRE ?? "30000";
  process.env.DB_POOL_IDLE = process.env.DB_POOL_IDLE ?? "10000";

  metricsOriginallyExisted = await pathExists(metricsPath);
  if (metricsOriginallyExisted) {
    await fsp.copyFile(metricsPath, metricsBackupPath);
  }
  await fsp.rm(metricsPath, { force: true });

  modelsOriginallyExisted = await pathExists(modelsDir);
  if (modelsOriginallyExisted) {
    await fsp.rm(modelsBackupDir, { recursive: true, force: true });
    await fsp.mkdir(path.dirname(modelsBackupDir), { recursive: true });
    await fsp.rename(modelsDir, modelsBackupDir);
  }

  originalPath = process.env.PATH;
  await createPythonShim();
  const pathParts = [pythonShimDir];
  if (originalPath) {
    pathParts.push(originalPath);
  }
  process.env.PATH = pathParts.join(path.delimiter);
});

afterAll(async () => {
  childProcessModule.spawnSync = realSpawnSync;

  await fsp.rm(metricsPath, { force: true });
  if (metricsOriginallyExisted && (await pathExists(metricsBackupPath))) {
    await fsp.rename(metricsBackupPath, metricsPath);
  } else {
    await fsp.rm(metricsBackupPath, { force: true });
  }

  if (await pathExists(modelsDir)) {
    await fsp.rm(modelsDir, { recursive: true, force: true });
  }
  if (modelsOriginallyExisted && (await pathExists(modelsBackupDir))) {
    await fsp.mkdir(path.dirname(modelsDir), { recursive: true });
    await fsp.rename(modelsBackupDir, modelsDir);
  } else {
    await fsp.rm(modelsBackupDir, { recursive: true, force: true });
  }

  if (originalPath === undefined) {
    delete process.env.PATH;
  } else {
    process.env.PATH = originalPath;
  }

  await fsp.rm(tempRoot, { recursive: true, force: true });
});

async function pathExists(target: string): Promise<boolean> {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function createPythonShim() {
  await fsp.mkdir(pythonShimDir, { recursive: true });
  if (process.platform === "win32") {
    const shimPath = path.join(pythonShimDir, "python3.cmd");
    const content = "@echo off\r\npython %*\r\n";
    await fsp.writeFile(shimPath, content, "utf8");
  } else {
    const shimPath = path.join(pythonShimDir, "python3");
    const content = "#!/usr/bin/env sh\nexec python \"$@\"\n";
    await fsp.writeFile(shimPath, content, "utf8");
    await fsp.chmod(shimPath, 0o755);
  }
}

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const verifyToken: express.RequestHandler = require("../../middleware/auth.middleware.js");

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

  const investigadorRoutes = require("../../routes/investigador.routes.js");
  const categorizadorRoutes = require("../../routes/categorizador.routes.js");
  app.use("/investigador", investigadorRoutes);
  app.use("/categorizador", categorizadorRoutes);

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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function sendRequest<T = any>(
  app: express.Express,
  method: string,
  pathName: string,
  body?: JsonBody,
  headers: Record<string, string> = {}
): Promise<ResponsePayload<T>> {
  return withServer(app, async (port) => {
    const headerBag: Record<string, string> = { ...headers };
    const init: RequestInit = { method, headers: headerBag };

    if (body !== undefined) {
      if (typeof body === "string") {
        init.body = body;
      } else {
        init.body = JSON.stringify(body);
        headerBag["Content-Type"] = "application/json";
      }
    }

    const response = await fetch(`http://127.0.0.1:${port}${pathName}`, init);
    const raw = await response.text();
    let parsed: any = undefined;
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    return { status: response.status, body: parsed as T };
  });
}

function createAuthHeader(payload: { rut: string; rol: string }): Record<string, string> {
  const token = jwt.sign(payload, process.env.JWT_SECRET!);
  return { Authorization: `Bearer ${token}` };
}

describe("researcher end-to-end flow", () => {
  it("ejecuta el flujo completo de investigador y categorizador", async () => {
    const app = buildApp();
    const unauthorizedHeader = createAuthHeader({ rut: "22.222.222-2", rol: "paciente" });
    const researcherHeader = createAuthHeader({ rut: "11.111.111-1", rol: "investigador" });

    expect(await pathExists(metricsPath)).toBe(false);

    const forbiddenResponse = await sendRequest(app, "GET", "/investigador/metrics", undefined, unauthorizedHeader);
    expect(forbiddenResponse.status).toBe(403);

    const defaultResponse = await sendRequest(app, "GET", "/investigador/metrics", undefined, researcherHeader);
    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.body).toEqual({ iou: 0, spearman: 0, updated_at: null });

    const hyperparams = { learning_rate: 0.01, epochs: 15 };
    const retrainResponse = await sendRequest<{
      message: string;
      metrics: { iou: number; spearman: number; updated_at: string; learning_rate: number; epochs: number };
    }>(app, "POST", "/investigador/retrain", hyperparams, researcherHeader);
    expect(retrainResponse.status).toBe(200);
    expect(retrainResponse.body.message).toBe("Reentrenamiento iniciado");

    const metrics = retrainResponse.body.metrics;
    expect(metrics.learning_rate).toBe(hyperparams.learning_rate);
    expect(metrics.epochs).toBe(hyperparams.epochs);
    expect(typeof metrics.iou).toBe("number");
    expect(typeof metrics.spearman).toBe("number");
    expect(typeof metrics.updated_at).toBe("string");

    const storedMetrics = JSON.parse(await fsp.readFile(metricsPath, "utf8"));
    expect(storedMetrics).toMatchObject({
      learning_rate: hyperparams.learning_rate,
      epochs: hyperparams.epochs,
      iou: metrics.iou,
      spearman: metrics.spearman,
      updated_at: metrics.updated_at,
    });

    expect(await pathExists(modelsDir)).toBe(false);

    const missingResponse = await sendRequest(app, "GET", "/categorizador/metrics", undefined, researcherHeader);
    expect(missingResponse.status).toBe(404);

    const testModels = [
      path.join(modelsDir, "dummy-model.pkl"),
      path.join(modelsDir, "dummy-model.joblib"),
    ];
    await fsp.mkdir(modelsDir, { recursive: true });
    for (const filePath of testModels) {
      await fsp.writeFile(filePath, "");
    }

    const evaluateResponse = await sendRequest<Record<string, { accuracy: number; f1: number }>>(
      app,
      "GET",
      "/categorizador/metrics",
      undefined,
      researcherHeader
    );
    expect(evaluateResponse.status).toBe(200);

    const evaluation = evaluateResponse.body;
    const expectedKeys = testModels.map((filePath) => path.basename(filePath)).sort();
    const actualKeys = Object.keys(evaluation).sort();
    expect(actualKeys).toEqual(expectedKeys);

    for (const result of Object.values(evaluation)) {
      expect(typeof result.accuracy).toBe("number");
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(typeof result.f1).toBe("number");
      expect(result.f1).toBeGreaterThan(0);
      expect(result.f1).toBeLessThanOrEqual(1);
    }
  });
});
