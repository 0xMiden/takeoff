import { spawn } from "child_process";
import { mkdtemp, writeFile, mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const COMPILE_TIMEOUT_MS = 180_000;
const TX_SCRIPTS_TIMEOUT_MS = 360_000;
const DOCKER_IMAGE = "docker-compiler";

interface CompileResult {
  success: boolean;
  output: string;
  packageBase64?: string;
  masmSource?: string;
  txScripts?: Record<string, string>; // method name → base64 .masp bytes
}

export async function* compileContract(
  files: Record<string, string>
): AsyncGenerator<
  { type: "output"; text: string } | { type: "result"; result: CompileResult },
  void,
  unknown
> {
  // Create isolated temp directory
  const tmpDir = await mkdtemp(join(tmpdir(), "miden-compile-"));

  try {
    // Write project files
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(tmpDir, path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, content, "utf-8");
    }

    // Ensure Cargo.toml exists
    if (!files["Cargo.toml"]) {
      yield {
        type: "result",
        result: { success: false, output: "Missing Cargo.toml" },
      };
      return;
    }

    // Run cargo-miden build in Docker
    let fullOutput = "";
    const exitCode = await new Promise<number>((resolve, reject) => {
      const proc = spawn("docker", [
        "run",
        "--rm",
        "--memory=2g",
        "--cpus=2",
        `-v=${tmpDir}:/project`,
        DOCKER_IMAGE,
        "cargo",
        "miden",
        "build",
        "--release",
        "--emit",
        "masp,masm",
      ]);

      const timeout = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error("Compilation timed out (120s)"));
      }, COMPILE_TIMEOUT_MS);

      const onData = (data: Buffer) => {
        const text = data.toString();
        fullOutput += text;
      };

      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);

      proc.on("close", (code) => {
        clearTimeout(timeout);
        resolve(code ?? 1);
      });

      proc.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Stream the full output (we collected it to also parse for errors)
    yield { type: "output", text: fullOutput };

    if (exitCode !== 0) {
      yield {
        type: "result",
        result: { success: false, output: fullOutput },
      };
      return;
    }

    // Find the .masp file in target/
    const maspPath = await findMasp(tmpDir);
    if (!maspPath) {
      yield {
        type: "result",
        result: {
          success: false,
          output: fullOutput + "\nError: No .masp file found after build",
        },
      };
      return;
    }

    const maspBytes = await readFile(maspPath);

    // Extract method names and component package from source files
    const libRs = files["src/lib.rs"] ?? "";
    const cargoToml = files["Cargo.toml"] ?? "";
    const methods = [...libRs.matchAll(/pub\s+fn\s+(\w+)/g)].map(m => m[1]);
    const pkgMatch = cargoToml.match(/\[package\.metadata\.component\][\s\S]*?package\s*=\s*"([^"]+)"/);
    const componentPackage = pkgMatch?.[1] ?? "";

    // Auto-generate and compile tx-scripts for each public method in ONE Docker run
    const txScripts: Record<string, string> = {};
    if (componentPackage && methods.length > 0) {
      yield { type: "output", text: "\nGenerating transaction scripts..." };

      // Create all tx-script projects on the host
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

      // Build a bash script that compiles all tx-scripts sequentially
      // Build script with progress markers
      const total = methods.length;
      const buildScript = methods.map((m, i) =>
        `echo "TX_PROGRESS:${i + 1}/${total} Compiling tx-script for ${m}..." && cd /project/__tx_${m} && cargo miden build --release 2>&1 && echo "TX_OK:${m}" || echo "TX_FAIL:${m}"`
      ).join(" ; ");

      try {
        // Run tx-script compilation and collect output line by line
        const txOutputLines: string[] = [];
        await new Promise<void>((resolve, reject) => {
          const proc = spawn("docker", [
            "run", "--rm",
            "--memory=2g", "--cpus=2",
            `-v=${tmpDir}:/project`,
            DOCKER_IMAGE,
            "bash", "-c", buildScript,
          ]);
          let buffer = "";
          const timeout = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("TX scripts compile timeout")); }, TX_SCRIPTS_TIMEOUT_MS);
          const onData = (d: Buffer) => {
            buffer += d.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            txOutputLines.push(...lines);
          };
          proc.stdout.on("data", onData);
          proc.stderr.on("data", onData);
          proc.on("close", () => { clearTimeout(timeout); resolve(); });
          proc.on("error", (err) => { clearTimeout(timeout); reject(err); });
        });

        // Stream progress lines to the client
        const fullTxOutput = txOutputLines.join("\n");
        for (const line of txOutputLines) {
          if (line.includes("TX_PROGRESS:")) {
            yield { type: "output", text: line.replace("TX_PROGRESS:", "  ") };
          }
        }

        // Collect results
        for (const method of methods) {
          if (fullTxOutput.includes(`TX_OK:${method}`)) {
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
      } catch (e) {
        yield { type: "output", text: `  ✗ TX scripts: ${e}` };
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
    // Cleanup temp directory
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function findMasp(dir: string): Promise<string | null> {
  // cargo-miden output location may vary — search common paths
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
    } catch {
      // Skip inaccessible directories
    }
    return null;
  }

  return walk(dir);
}
