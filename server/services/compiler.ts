import { spawn } from "child_process";
import { mkdtemp, writeFile, mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const COMPILE_TIMEOUT_MS = 180_000;
const TX_SCRIPTS_TIMEOUT_MS = 360_000;
const DOCKER_IMAGE = "docker-compiler";

// Persistent Docker volumes for caching
const CARGO_REGISTRY_VOLUME = "miden-takeoff-cargo-registry";
const CARGO_TARGET_VOLUME = "miden-takeoff-cargo-target";

interface CompileResult {
  success: boolean;
  output: string;
  packageBase64?: string;
  masmSource?: string;
  txScripts?: Record<string, string>;
}

type CompileEvent =
  | { type: "output"; text: string }
  | { type: "result"; result: CompileResult };

// Helper: run a Docker command and yield output lines in real time
async function* runDocker(
  args: string[],
  timeoutMs: number
): AsyncGenerator<string, number, unknown> {
  const proc = spawn("docker", args);
  let buffer = "";
  let exitCode = 1;

  const lines: string[] = [];
  let resolve: (() => void) | null = null;
  let done = false;

  const timeout = setTimeout(() => {
    proc.kill("SIGKILL");
    done = true;
    if (resolve) resolve();
  }, timeoutMs);

  proc.stdout.on("data", (d: Buffer) => {
    buffer += d.toString();
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    lines.push(...parts);
    if (resolve) resolve();
  });

  proc.stderr.on("data", (d: Buffer) => {
    buffer += d.toString();
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    lines.push(...parts);
    if (resolve) resolve();
  });

  proc.on("close", (code) => {
    clearTimeout(timeout);
    exitCode = code ?? 1;
    if (buffer) lines.push(buffer);
    done = true;
    if (resolve) resolve();
  });

  proc.on("error", () => {
    clearTimeout(timeout);
    done = true;
    if (resolve) resolve();
  });

  // Yield lines as they arrive
  while (!done || lines.length > 0) {
    if (lines.length > 0) {
      yield lines.shift()!;
    } else if (!done) {
      await new Promise<void>((r) => { resolve = r; });
      resolve = null;
    }
  }

  return exitCode;
}

export async function* compileContract(
  files: Record<string, string>
): AsyncGenerator<CompileEvent, void, unknown> {
  const tmpDir = await mkdtemp(join(tmpdir(), "miden-compile-"));

  try {
    // Write project files
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(tmpDir, path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, content, "utf-8");
    }

    if (!files["Cargo.toml"]) {
      yield { type: "result", result: { success: false, output: "Missing Cargo.toml" } };
      return;
    }

    // Ensure cache volumes exist
    for (const vol of [CARGO_REGISTRY_VOLUME, CARGO_TARGET_VOLUME]) {
      try {
        await new Promise<void>((resolve) => {
          const proc = spawn("docker", ["volume", "create", vol]);
          proc.on("close", () => resolve());
          proc.on("error", () => resolve());
        });
      } catch { /* ignore */ }
    }

    // Run cargo-miden build with persistent cargo cache
    let fullOutput = "";
    const runner = runDocker([
      "run", "--rm",
      "--memory=2g", "--cpus=2",
      `-v=${tmpDir}:/project`,
      `-v=${CARGO_REGISTRY_VOLUME}:/usr/local/cargo/registry`,
      `-v=${CARGO_TARGET_VOLUME}:/cache/target`,
      `-e`, `CARGO_TARGET_DIR=/cache/target/contract`,
      DOCKER_IMAGE,
      "bash", "-c",
      "CARGO_TARGET_DIR=/cache/target/contract cargo miden build --release --emit masp,masm && mkdir -p /project/target && cp -r /cache/target/contract/miden /project/target/miden 2>/dev/null && cp -r /cache/target/contract/generated-wit /project/target/generated-wit 2>/dev/null; true",
    ], COMPILE_TIMEOUT_MS);

    let exitCode = 1;
    while (true) {
      const { value, done } = await runner.next();
      if (done) {
        exitCode = value as number;
        break;
      }
      const line = (value as string).trim();
      fullOutput += line + "\n";
      if (line.startsWith("Compiling") || line.startsWith("Finished") ||
          line.startsWith("Creating") || line.startsWith("error") ||
          line.startsWith("warning") || line.startsWith("Locking") ||
          line.startsWith("Updating")) {
        yield { type: "output", text: line };
      }
    }

    if (exitCode !== 0) {
      // Also yield errors that weren't caught by the filter
      yield { type: "output", text: fullOutput };
      yield { type: "result", result: { success: false, output: fullOutput } };
      return;
    }

    // Find the .masp file
    const maspPath = await findMasp(tmpDir);
    if (!maspPath) {
      yield { type: "result", result: { success: false, output: fullOutput + "\nNo .masp file found" } };
      return;
    }

    const maspBytes = await readFile(maspPath);

    // Extract method names and component package
    const libRs = files["src/lib.rs"] ?? "";
    const cargoToml = files["Cargo.toml"] ?? "";
    const methods = [...libRs.matchAll(/pub\s+fn\s+(\w+)/g)].map(m => m[1]);
    const pkgMatch = cargoToml.match(/\[package\.metadata\.component\][\s\S]*?package\s*=\s*"([^"]+)"/);
    const componentPackage = pkgMatch?.[1] ?? "";

    // Auto-generate and compile tx-scripts
    const txScripts: Record<string, string> = {};
    if (componentPackage && methods.length > 0) {
      yield { type: "output", text: "Generating transaction scripts..." };

      // Create all tx-script projects
      for (const method of methods) {
        const txDir = join(tmpDir, `__tx_${method}`);
        await mkdir(join(txDir, "src"), { recursive: true });

        await writeFile(join(txDir, "Cargo.toml"), `[package]
name = "tx-${method.replace(/_/g, "-")}"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib"]

[dependencies]
miden = "0.10.0"

[package.metadata.component]
package = "miden:tx-${method.replace(/_/g, "-")}"

[package.metadata.miden]
project-kind = "transaction-script"

[package.metadata.miden.dependencies]
"${componentPackage}" = { path = "/project" }

[package.metadata.component.target.dependencies]
"${componentPackage}" = { path = "/project/target/generated-wit/" }
`, "utf-8");

        await writeFile(join(txDir, "src", "lib.rs"), `#![no_std]
#![feature(alloc_error_handler)]
use miden::*;
use crate::bindings::Account;

#[tx_script]
fn run(_arg: Word, account: &mut Account) {
    account.${method}();
}
`, "utf-8");
      }

      // Build all tx-scripts in one Docker run, sharing the cargo cache volume
      const total = methods.length;
      const buildScript = methods.map((m, i) =>
        `echo "TX_PROGRESS:${i + 1}/${total} Compiling tx-script for ${m}..." && cd /project/__tx_${m} && CARGO_TARGET_DIR=/cache/target/tx_${m} cargo miden build --release 2>&1 && mkdir -p /project/__tx_${m}/target && cp -r /cache/target/tx_${m}/miden /project/__tx_${m}/target/miden 2>/dev/null && echo "TX_OK:${m}" || echo "TX_FAIL:${m}"`
      ).join(" ; ");

      const txRunner = runDocker([
        "run", "--rm",
        "--memory=2g", "--cpus=2",
        `-v=${tmpDir}:/project`,
        `-v=${CARGO_REGISTRY_VOLUME}:/usr/local/cargo/registry`,
        `-v=${CARGO_TARGET_VOLUME}:/cache/target`,
        DOCKER_IMAGE,
        "bash", "-c", buildScript,
      ], TX_SCRIPTS_TIMEOUT_MS);

      let txFullOutput = "";
      while (true) {
        const { value, done } = await txRunner.next();
        if (done) break;
        const line = (value as string).trim();
        txFullOutput += line + "\n";
        // Stream progress and compilation lines
        if (line.includes("TX_PROGRESS:") || line.startsWith("Compiling") ||
            line.startsWith("Finished") || line.startsWith("Creating") ||
            line.includes("TX_OK:") || line.includes("TX_FAIL:")) {
          const display = line.replace("TX_PROGRESS:", "  ");
          yield { type: "output", text: display };
        }
      }

      // Collect results
      for (const method of methods) {
        if (txFullOutput.includes(`TX_OK:${method}`)) {
          const txMaspPath = await findMasp(join(tmpDir, `__tx_${method}`));
          if (txMaspPath) {
            const txMaspBytes = await readFile(txMaspPath);
            txScripts[method] = txMaspBytes.toString("base64");
            yield { type: "output", text: `  ✓ TX script for ${method}` };
          }
        } else {
          yield { type: "output", text: `  ✗ TX script for ${method} failed` };
        }
      }
    }

    yield {
      type: "result",
      result: {
        success: true,
        output: fullOutput,
        packageBase64: maspBytes.toString("base64"),
        txScripts: Object.keys(txScripts).length > 0 ? txScripts : undefined,
      },
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function findMasp(dir: string): Promise<string | null> {
  const { readdir } = await import("fs/promises");
  async function walk(d: string): Promise<string | null> {
    try {
      const entries = await readdir(d, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(d, entry.name);
        if (entry.isDirectory()) {
          const found = await walk(full);
          if (found) return found;
        } else if (entry.name.endsWith(".masp")) {
          return full;
        }
      }
    } catch { /* skip */ }
    return null;
  }
  return walk(dir);
}
