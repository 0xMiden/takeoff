import { useCallback } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { compileContract } from "@/services/compileService";
import { parseCargoOutput } from "@/components/editor/diagnostics";
import type * as monaco from "monaco-editor";

// Store a reference to the Monaco instance for setting markers
let monacoInstance: typeof monaco | null = null;
export function setMonacoInstance(m: typeof monaco) {
  monacoInstance = m;
}

export function useCompile() {
  const contractFiles = usePlaygroundStore((s) => s.contractFiles);
  const setCompileStatus = usePlaygroundStore((s) => s.setCompileStatus);
  const setPackageBytes = usePlaygroundStore((s) => s.setPackageBytes);
  const setContractError = usePlaygroundStore((s) => s.setContractError);
  const addContract = usePlaygroundStore((s) => s.addContract);
  const appendConsole = usePlaygroundStore((s) => s.appendConsole);

  const compile = useCallback(
    async (contractName: string) => {
      addContract(contractName);
      setCompileStatus(contractName, "compiling");
      appendConsole("system", `Compiling ${contractName}...`);

      // Build files map from virtual FS
      const files: Record<string, string> = {};
      for (const [path, file] of contractFiles) {
        // Strip leading slash for the backend
        files[path.replace(/^\//, "")] = file.content;
      }

      await compileContract(files, {
        onOutput: (text) => {
          appendConsole("info", text);

          // Apply inline diagnostics to Monaco
          if (monacoInstance) {
            const markers = parseCargoOutput(text);
            const models = monacoInstance.editor.getModels();
            for (const model of models) {
              if (model.uri.path.endsWith(".rs")) {
                monacoInstance.editor.setModelMarkers(
                  model,
                  "cargo-miden",
                  markers
                );
              }
            }
          }
        },
        onResult: (result) => {
          if (result.success) {
            setCompileStatus(contractName, "success", result.output);
            appendConsole("success", `Build succeeded: ${contractName}`);

            if (result.packageBase64) {
              const bytes = Uint8Array.from(atob(result.packageBase64), (c) =>
                c.charCodeAt(0)
              );
              setPackageBytes(contractName, bytes);
            }

            // Clear diagnostics on success
            if (monacoInstance) {
              for (const model of monacoInstance.editor.getModels()) {
                monacoInstance.editor.setModelMarkers(
                  model,
                  "cargo-miden",
                  []
                );
              }
            }
          } else {
            setCompileStatus(contractName, "error", result.output);
            setContractError(contractName, result.output);
            appendConsole("error", `Build failed: ${contractName}`);
          }
        },
        onError: (error) => {
          setCompileStatus(contractName, "error");
          setContractError(contractName, error);
          appendConsole("error", error);
        },
      });
    },
    [
      contractFiles,
      setCompileStatus,
      setPackageBytes,
      setContractError,
      addContract,
      appendConsole,
    ]
  );

  return { compile };
}
