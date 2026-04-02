import { spawn } from "child_process";
import { mkdtemp, writeFile, mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const COMPILE_TIMEOUT_MS = 120_000;
const DOCKER_IMAGE = "docker-compiler";

interface CompileResult {
  success: boolean;
  output: string;
  packageBase64?: string;
  masmSource?: string;
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

    // Also read the .masm file if it exists (same name, different extension)
    const masmPath = maspPath.replace(/\.masp$/, ".masm");
    let masmSource: string | undefined;
    try {
      masmSource = await readFile(masmPath, "utf-8") as unknown as string;
    } catch {
      // .masm file may not exist
    }

    yield {
      type: "result",
      result: {
        success: true,
        output: fullOutput,
        packageBase64: maspBytes.toString("base64"),
        masmSource,
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
