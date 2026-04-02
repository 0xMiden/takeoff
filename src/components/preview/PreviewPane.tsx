import { useState, useEffect, useCallback, type ComponentType } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { compileComponent } from "@/services/previewCompiler";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PreviewErrorBoundary } from "./ErrorBoundary";
import { ErrorOverlay } from "./ErrorOverlay";
import { PreviewToolbar } from "./PreviewToolbar";

export function PreviewPane() {
  const dappFiles = usePlaygroundStore((s) => s.dappFiles);
  const contracts = usePlaygroundStore((s) => s.contracts);
  const appendConsole = usePlaygroundStore((s) => s.appendConsole);

  const appFile = dappFiles.get("/src/App.tsx");
  const code = appFile?.content ?? "";

  // Expose compiled contract data on window for dApp code to access
  useEffect(() => {
    const contractData: Record<
      string,
      {
        packageBytes: Uint8Array;
        componentPackage: string;
        methods: string[];
        accountId?: string;
      }
    > = {};
    for (const [name, entry] of contracts) {
      if (entry.packageBytes) {
        contractData[name] = {
          packageBytes: entry.packageBytes,
          componentPackage: entry.componentPackage ?? "",
          methods: entry.methods ?? [],
          accountId: entry.accountId,
        };
      }
    }
    (window as unknown as Record<string, unknown>).__TAKEOFF_CONTRACTS = contractData;
    return () => {
      delete (window as unknown as Record<string, unknown>).__TAKEOFF_CONTRACTS;
    };
  }, [contracts]);

  // Debounce 500ms to prevent cascading hook remounts
  const debouncedCode = useDebouncedValue(code, 500);

  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compile on debounced code change
  useEffect(() => {
    if (!debouncedCode.trim()) {
      setComponent(null);
      setError(null);
      return;
    }

    let cancelled = false;

    compileComponent(debouncedCode)
      .then((Comp) => {
        if (cancelled) return;
        setComponent(() => Comp);
        setError(null);
        appendConsole("info", "Preview updated");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        appendConsole("error", `Preview error: ${err}`);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCode, refreshKey, appendConsole]);

  // Global console patching — capture SDK + user logs
  useEffect(() => {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args: unknown[]) => {
      origLog(...args);
      appendConsole("info", args.map(String).join(" "));
    };
    console.warn = (...args: unknown[]) => {
      origWarn(...args);
      appendConsole("warn", args.map(String).join(" "));
    };
    console.error = (...args: unknown[]) => {
      origError(...args);
      appendConsole("error", args.map(String).join(" "));
    };

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    };
  }, [appendConsole]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden border-l border-white/[0.04]">
      <PreviewToolbar onRefresh={handleRefresh} />
      <div className="flex-1 overflow-auto">
        {error ? (
          <ErrorOverlay error={error} />
        ) : !Component ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-sm">
            Write a component in App.tsx to see the preview
          </div>
        ) : (
          <PreviewErrorBoundary resetKey={String(refreshKey)}>
            <div className="preview-sandbox p-4">
              <Component />
            </div>
          </PreviewErrorBoundary>
        )}
      </div>
    </div>
  );
}
