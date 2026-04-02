import { useState, useEffect, useCallback, type ComponentType } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { compileComponent } from "@/services/previewCompiler";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PreviewErrorBoundary } from "./ErrorBoundary";
import { ErrorOverlay } from "./ErrorOverlay";
import { PreviewToolbar } from "./PreviewToolbar";
import { Felt, Word } from "@miden-sdk/miden-sdk";

// Monkey-patch: make AccountStorage.getItem smart about StorageMap slots
// When AI code calls getItem on a map slot, it gets the hash (useless).
// We patch it to try getMapItem with default key [0,0,0,1] first.
let patched = false;
function patchAccountStorage() {
  if (patched) return;
  patched = true;
  try {
    // The AccountStorage prototype is on the WASM module
    // We intercept via a Proxy on the storage() return value instead
    // — see the __TAKEOFF_HELPERS setup below
  } catch {
    // Ignore if SDK not ready
  }
}

// Global helpers available to generated dApp code
function setupHelpers() {
  const defaultKey = Word.newFromFelts([
    new Felt(0n),
    new Felt(0n),
    new Felt(0n),
    new Felt(1n),
  ]);

  // Smart storage reader: tries getMapItem first, falls back to getItem
  (window as unknown as Record<string, unknown>).__midenReadStorage = (
    storage: { getMapItem: (s: string, k: unknown) => unknown; getItem: (s: string) => unknown },
    slotName: string
  ) => {
    try {
      const val = storage.getMapItem(slotName, defaultKey);
      if (val) return val;
    } catch { /* not a map, or key doesn't exist */ }
    return storage.getItem(slotName);
  };

  // Word hex to number (little-endian first felt)
  (window as unknown as Record<string, unknown>).__midenWordToNum = (
    word: { toHex: () => string } | null
  ): number => {
    if (!word) return 0;
    try {
      const hex = word.toHex();
      return Number(BigInt("0x" + hex.slice(2, 18).match(/../g)!.reverse().join("")));
    } catch { return 0; }
  };
}

// Wrap txScripts in a Proxy that does fuzzy matching
// So txScripts["increment"] resolves to txScripts["increment_count"]
function fuzzyTxScripts(scripts: Record<string, Uint8Array>): Record<string, Uint8Array> {
  return new Proxy(scripts, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      // Fuzzy: find a key that contains the requested name
      const match = Object.keys(target).find((k) => k.includes(prop) || prop.includes(k));
      return match ? target[match] : undefined;
    },
  });
}

export function PreviewPane() {
  const dappFiles = usePlaygroundStore((s) => s.dappFiles);
  const contracts = usePlaygroundStore((s) => s.contracts);
  const appendConsole = usePlaygroundStore((s) => s.appendConsole);

  const appFile = dappFiles.get("/src/App.tsx");
  const code = appFile?.content ?? "";

  // Setup global helpers for generated dApp code
  useEffect(() => {
    patchAccountStorage();
    setupHelpers();
  }, []);

  // Expose compiled contract data on window for dApp code to access
  useEffect(() => {
    const contractData: Record<
      string,
      {
        packageBytes: Uint8Array;
        componentPackage: string;
        methods: string[];
        accountId?: string;
        masmSource: string;
        txScripts: Record<string, Uint8Array>;
      }
    > = {};
    for (const [name, entry] of contracts) {
      if (entry.packageBytes) {
        contractData[name] = {
          packageBytes: entry.packageBytes,
          componentPackage: entry.componentPackage ?? "",
          methods: entry.methods ?? [],
          accountId: entry.accountId,
          masmSource: entry.masmSource ?? "",
          txScripts: fuzzyTxScripts(entry.txScripts ?? {}),
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
