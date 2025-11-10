import { MySqlContainer, type StartedMySqlContainer } from "@testcontainers/mysql";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export interface SystemTestContext {
  baseUrl: string;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  close(): Promise<void>;
  resetDatabase(): Promise<void>;
  db: any;
}

type DbModule = typeof import("../../models");

type EnvSnapshot = Record<string, string | undefined>;

type BootstrapState = {
  container?: StartedMySqlContainer;
  server?: ChildProcessWithoutNullStreams;
  db?: DbModule;
  baseUrl?: string;
  envSnapshot: EnvSnapshot;
  serverLogs: string[];
  serverExitError: Error | null;
  shuttingDown: boolean;
  exitListener?: (code: number | null, signal: NodeJS.Signals | null) => void;
};

const backendRoot = path.resolve(process.cwd());

function rememberEnv(state: BootstrapState, key: string) {
  if (!(key in state.envSnapshot)) {
    state.envSnapshot[key] = process.env[key];
  }
}

function setEnv(state: BootstrapState, key: string, value: string) {
  rememberEnv(state, key);
  process.env[key] = value;
}

function restoreEnv(state: BootstrapState) {
  for (const [key, value] of Object.entries(state.envSnapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("No se pudo obtener un puerto libre.")));
        return;
      }
      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

async function waitForServerReady(state: BootstrapState, url: string, timeoutMs = 45000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (state.serverExitError) {
      throw state.serverExitError;
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // wait and retry
    }
    await delay(500);
  }

  const logTail = state.serverLogs.slice(-20).join("").trim();
  throw new Error(
    logTail
      ? `El servidor no respondió en ${timeoutMs} ms.\n--- Logs ---\n${logTail}`
      : `El servidor no respondió en ${timeoutMs} ms.`
  );
}

async function stopServer(state: BootstrapState): Promise<void> {
  const proc = state.server;
  if (!proc) {
    return;
  }
  if (proc.exitCode !== null || proc.signalCode !== null) {
    state.serverExitError = null;
    state.serverLogs.length = 0;
    state.server = undefined;
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
  state.serverExitError = null;
  state.serverLogs.length = 0;
  state.server = undefined;
}

async function truncateAll(db: DbModule): Promise<void> {
  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  const models = Object.values(db.sequelize.models) as any[];
  for (const model of models) {
    await model.truncate({ cascade: true, restartIdentity: true });
  }
  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
}

export async function createSystemTestContext(): Promise<SystemTestContext> {
  const state: BootstrapState = {
    envSnapshot: {},
    serverLogs: [],
    serverExitError: null,
    shuttingDown: false,
  };

  const container = await new MySqlContainer().start();
  state.container = container;

  const runPort = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${runPort}`;
  state.baseUrl = baseUrl;

  setEnv(state, "RUN_PORT", String(runPort));
  setEnv(state, "NODE_ENV", "test");
  setEnv(state, "JWT_SECRET", "system-flow-secret");
  setEnv(state, "DB_HOST", container.getHost());
  setEnv(state, "DB_PORT", String(container.getPort()));
  setEnv(state, "DB_USER", container.getUsername());
  setEnv(state, "DB_PASSWORD", container.getPassword());
  setEnv(state, "DB_NAME", container.getDatabase());
  setEnv(state, "DB_DIALECT", "mysql");
  setEnv(state, "DB_POOL_MAX", "5");
  setEnv(state, "DB_POOL_MIN", "0");
  setEnv(state, "DB_POOL_ACQUIRE", "30000");
  setEnv(state, "DB_POOL_IDLE", "10000");

  const db: DbModule = require("../../models");
  state.db = db;

  await db.sequelize.sync({ force: true });

  const serverProcess = spawn("node", ["server.js"], {
    cwd: backendRoot,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  state.server = serverProcess;

  serverProcess.stdout.setEncoding("utf8");
  serverProcess.stderr.setEncoding("utf8");
  serverProcess.stdout.on("data", (chunk) => state.serverLogs.push(String(chunk)));
  serverProcess.stderr.on("data", (chunk) => state.serverLogs.push(String(chunk)));

  state.exitListener = (code, signal) => {
    if (state.shuttingDown) {
      return;
    }
    const reason = `Servidor detenido inesperadamente (code=${code}, signal=${signal})`;
    const logTail = state.serverLogs.slice(-20).join("").trim();
    state.serverExitError = new Error(logTail ? `${reason}\n--- Logs ---\n${logTail}` : reason);
  };

  serverProcess.on("exit", state.exitListener);

  await waitForServerReady(state, `${baseUrl}/`);

  const fetchWithBase = async (path: string, init?: RequestInit) => {
    if (state.serverExitError) {
      throw state.serverExitError;
    }
    const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
    const response = await fetch(url, init);
    if (state.serverExitError) {
      throw state.serverExitError;
    }
    return response;
  };

  const resetDatabase = async () => {
    const database = state.db;
    if (!database) {
      throw new Error("Base de datos no inicializada en el contexto de pruebas.");
    }
    await truncateAll(database);
  };

  const close = async () => {
    state.shuttingDown = true;
    if (state.server && state.exitListener) {
      state.server.off("exit", state.exitListener);
      state.exitListener = undefined;
    }
    await stopServer(state);
    if (state.db) {
      await state.db.sequelize.drop();
      await state.db.sequelize.close();
      state.db = undefined;
    }
    if (state.container) {
      await state.container.stop();
      state.container = undefined;
    }
    restoreEnv(state);
  };

  return {
    baseUrl,
    fetch: fetchWithBase,
    close,
    resetDatabase,
    db,
  };
}