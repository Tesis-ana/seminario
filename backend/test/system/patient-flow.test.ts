import { beforeAll, afterAll, describe, it, expect } from "bun:test";
import { MySqlContainer } from "@testcontainers/mysql";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import bcrypt from "bcrypt";

type DbModule = typeof import("../../models");

const backendRoot = path.resolve(process.cwd());

const ADMIN_RUT = "11.111.111-1";
const ADMIN_PASSWORD = "AdminClave123!";
const PROFESSIONAL_RUT = "22.222.222-2";
const PROFESSIONAL_PASSWORD = "ProfesionalClave123!";
const PATIENT_RUT = "33.333.333-3";
const PATIENT_PASSWORD = "PacienteClave123!";

const originalEnv: Record<string, string | undefined> = {};
const serverLogs: string[] = [];

let container: StartedMySqlContainer | undefined;
let db: DbModule | undefined;
let serverProcess: ChildProcessWithoutNullStreams | undefined;
let serverExitError: Error | null = null;
let shuttingDownServer = false;
let serverExitListener: ((code: number | null, signal: NodeJS.Signals | null) => void) | undefined;
let baseUrl = "";

beforeAll(async () => {
  container = await new MySqlContainer().start();

  const runPort = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${runPort}`;

  setEnv("RUN_PORT", String(runPort));
  setEnv("NODE_ENV", "test");
  setEnv("JWT_SECRET", "patient-flow-secret");
  setEnv("DB_HOST", container.getHost());
  setEnv("DB_PORT", String(container.getPort()));
  setEnv("DB_USER", container.getUsername());
  setEnv("DB_PASSWORD", container.getPassword());
  setEnv("DB_NAME", container.getDatabase());
  setEnv("DB_DIALECT", "mysql");
  setEnv("DB_POOL_MAX", "5");
  setEnv("DB_POOL_MIN", "0");
  setEnv("DB_POOL_ACQUIRE", "30000");
  setEnv("DB_POOL_IDLE", "10000");

  db = require("../../models");

  await db.sequelize.sync({ force: true });

  const [adminHash, professionalHash, patientHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(PROFESSIONAL_PASSWORD, 10),
    bcrypt.hash(PATIENT_PASSWORD, 10),
  ]);

  await db.User.bulkCreate([
    { rut: ADMIN_RUT, nombre: "Admin Sistema", correo: "admin@example.test", rol: "admin", contrasena_hash: adminHash },
    { rut: PROFESSIONAL_RUT, nombre: "Doctora Flores", correo: "profesional@example.test", rol: "doctor", contrasena_hash: professionalHash },
    { rut: PATIENT_RUT, nombre: "Paciente Perez", correo: "paciente@example.test", rol: "paciente", contrasena_hash: patientHash },
  ]);

  serverProcess = spawn("node", ["server.js"], {
    cwd: backendRoot,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.setEncoding("utf8");
  serverProcess.stderr.setEncoding("utf8");
  serverProcess.stdout.on("data", (chunk) => serverLogs.push(String(chunk)));
  serverProcess.stderr.on("data", (chunk) => serverLogs.push(String(chunk)));

  serverExitListener = (code, signal) => {
    if (shuttingDownServer) {
      return;
    }
    const reason = `Servidor detenido inesperadamente (code=${code}, signal=${signal})`;
    const logTail = serverLogs.slice(-20).join("").trim();
    serverExitError = new Error(logTail ? `${reason}\n--- Logs ---\n${logTail}` : reason);
  };

  serverProcess.on("exit", serverExitListener);

  await waitForServerReady(`${baseUrl}/`);
});

afterAll(async () => {
  shuttingDownServer = true;
  if (serverProcess && serverExitListener) {
    serverProcess.off("exit", serverExitListener);
    serverExitListener = undefined;
  }
  if (serverProcess) {
    await stopServer(serverProcess);
    serverProcess = undefined;
  }
  const database = db;
  if (database) {
    await database.sequelize.drop();
    await database.sequelize.close();
    db = undefined;
  }
  if (container) {
    await container.stop();
    container = undefined;
  }
  restoreEnv();
});

describe("patient flow system test", () => {
  it("permite gestionar el flujo completo de pacientes y profesionales", async () => {
    const database = assertDb();

    const adminToken = await loginUser(ADMIN_RUT, ADMIN_PASSWORD);
    const authHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    };

    const profesionalResponse = await fetch(`${baseUrl}/profesionales`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        user_id: PROFESSIONAL_RUT,
        especialidad: "Kinesiologia",
        fecha_ingreso: new Date().toISOString().slice(0, 10),
      }),
    });
    const profesionalBody = await parseJson(profesionalResponse);
    expect(profesionalResponse.status).toBe(201);
    const profesionalId = profesionalBody?.id;
    expect(typeof profesionalId).toBe("number");
    const profesionalIdNumber = profesionalId as number;

    const profesionalInDb = await database.Profesional.findByPk(profesionalIdNumber);
    expect(profesionalInDb?.user_id).toBe(PROFESSIONAL_RUT);

    const pacienteResponse = await fetch(`${baseUrl}/pacientes`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        user_id: PATIENT_RUT,
        sexo: "F",
        comentarios: "Paciente creada por el sistema de pruebas",
        profesional_id: profesionalIdNumber,
      }),
    });
    const pacienteBody = await parseJson(pacienteResponse);
    expect(pacienteResponse.status).toBe(201);
    const pacienteRecord = pacienteBody?.paciente;
    expect(pacienteRecord?.user_id).toBe(PATIENT_RUT);
    const pacienteIdValue = pacienteRecord?.id;
    expect(typeof pacienteIdValue).toBe("number");
    const pacienteIdNumber = pacienteIdValue as number;

    const atencion = await database.Atencion.findOne({
      where: { paciente_id: pacienteIdNumber, profesional_id: profesionalIdNumber },
    });
    expect(atencion).not.toBeNull();

    const profesionalLookup = await fetch(`${baseUrl}/pacientes/${pacienteIdNumber}/profesional`, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const profesionalLookupBody = await parseJson(profesionalLookup);
    expect(profesionalLookup.status).toBe(200);
    expect(profesionalLookupBody?.user_id).toBe(PROFESSIONAL_RUT);
    expect(profesionalLookupBody?.id).toBe(profesionalIdNumber);

    const patientToken = await loginUser(PATIENT_RUT, PATIENT_PASSWORD);
    const meResponse = await fetch(`${baseUrl}/pacientes/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const meBody = await parseJson(meResponse);
    expect(meResponse.status).toBe(200);
    expect(meBody?.id).toBe(pacienteIdNumber);
    expect(meBody?.user_id).toBe(PATIENT_RUT);
  });
});

function assertDb(): DbModule {
  if (!db) {
    throw new Error("La conexión a la base de datos no está disponible.");
  }
  return db;
}

function setEnv(key: string, value: string) {
  if (!(key in originalEnv)) {
    originalEnv[key] = process.env[key];
  }
  process.env[key] = value;
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

// Helper to allocate a random free TCP port so concurrent tests can run without clashes.
async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("No se pudo determinar un puerto libre.")));
        return;
      }
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

// Helper to poll the HTTP server until it is ready to accept requests.
async function waitForServerReady(url: string, timeoutMs = 45000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverExitError) {
      throw serverExitError;
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore until server is reachable
    }
    await delay(500);
  }
  const logTail = serverLogs.slice(-20).join("").trim();
  throw new Error(
    logTail ? `El servidor no respondió en ${timeoutMs} ms.\n--- Logs ---\n${logTail}` : `El servidor no respondió en ${timeoutMs} ms.`
  );
}

// Helper to login a user via the API and obtain a bearer token.
async function loginUser(rut: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rut, contra: password }),
  });
  const body = await parseJson(response);
  expect(response.status).toBe(200);
  const token = body?.token;
  if (typeof token !== "string") {
    throw new Error("La respuesta de login no incluyó un token válido.");
  }
  return token;
}

async function parseJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

// Helper to stop the spawned server process and wait for its shutdown.
async function stopServer(proc: ChildProcessWithoutNullStreams): Promise<void> {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    serverExitError = null;
    serverLogs.length = 0;
    return;
  }
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (!proc.killed) {
        proc.kill("SIGKILL");
      }
    }, 5000);
    proc.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    if (!proc.kill("SIGTERM")) {
      proc.kill();
    }
  });
  serverExitError = null;
  serverLogs.length = 0;
}
