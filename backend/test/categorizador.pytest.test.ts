import { test, expect } from "bun:test";
import path from "node:path";
import { spawnSync, SpawnSyncReturns } from "node:child_process";
import process from "node:process";

type CommandSpec = {
  cmd: string;
  args: string[];
  label: string;
};

const envName = process.env.CATEGORIZADOR_CONDA_ENV ?? "pyradiomics_env12";
const pytestCwd = path.join(import.meta.dir, "../../categorizador");

const commandChain: CommandSpec[] = [
  {
    cmd: process.env.CONDA_BIN ?? "conda",
    args: ["run", "-n", envName, "python", "-m", "pytest"],
    label: `conda env ${envName}`,
  },
  {
    cmd: process.env.CATEGORIZADOR_PYTHON ?? "python",
    args: ["-m", "pytest"],
    label: "system python",
  },
];

const missingPytestPatterns = [
  "No module named pytest",
  "ModuleNotFoundError: No module named 'pytest'",
];

function execute(spec: CommandSpec): SpawnSyncReturns<string> {
  const result = spawnSync(spec.cmd, spec.args, {
    cwd: pytestCwd,
    encoding: "utf-8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

function isMissingPytest(result: SpawnSyncReturns<string>): boolean {
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return missingPytestPatterns.some((pattern) => combined.includes(pattern));
}

function runPytest(): { status: number; label: string; error?: Error } {
  for (const spec of commandChain) {
    const result = execute(spec);

    if (result.error) {
      const code = (result.error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        continue;
      }
      return { status: result.status ?? 1, label: spec.label, error: result.error };
    }

    const status = result.status ?? 1;
    if (status === 0) {
      return { status: 0, label: spec.label };
    }

    if (isMissingPytest(result)) {
      continue;
    }

    return {
      status,
      label: spec.label,
      error: new Error(
        `pytest exited with code ${status} when using ${spec.label}`
      ),
    };
  }

  return {
    status: 1,
    label: "",
    error: new Error(
      "No valid command found to run pytest. Set CONDA_BIN or CATEGORIZADOR_PYTHON environment variables."
    ),
  };
}

test(
  "categorizador > pytest suite",
  () => {
    const { status, error, label } = runPytest();
    if (error && status !== 0) {
      throw error;
    }
    expect(status).toBe(0);
    expect(label.length).toBeGreaterThan(0);
  },
  { timeout: 120_000 }
);
