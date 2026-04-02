import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { useMiden, useSigner } from "@miden-sdk/react";

export function StatusBar() {
  const mode = usePlaygroundStore((s) => s.mode);
  const { isReady } = useMiden();
  const signer = useSigner();
  const connected = signer?.isConnected ?? false;

  return (
    <footer className="glass-panel flex h-6 shrink-0 items-center justify-between px-4 text-[10px] text-muted-foreground border-t">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isReady ? "bg-primary" : "bg-yellow-400 animate-pulse"
            }`}
          />
          {isReady ? "Connected" : "Initializing..."}
        </span>
        {connected && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Wallet
          </span>
        )}
      </div>
      <span className="capitalize">{mode} mode</span>
    </footer>
  );
}
