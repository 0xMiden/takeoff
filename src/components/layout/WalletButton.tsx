import { cn } from "@/lib/cn";
import { Wallet } from "lucide-react";
import { useSigner } from "@miden-sdk/react";

export function WalletButton() {
  const signer = useSigner();
  const connected = signer?.isConnected ?? false;

  const handleClick = async () => {
    if (!signer) return;
    if (connected) {
      await signer.disconnect();
    } else {
      await signer.connect();
    }
  };

  // Get address from signer name or context
  const displayName = connected ? signer?.name ?? "Connected" : null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 border",
        connected
          ? "border-primary/30 text-foreground glow-green"
          : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.12] animate-pulse-glow"
      )}
    >
      <Wallet className="h-3.5 w-3.5" />
      {connected ? (
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {displayName}
        </span>
      ) : (
        "Connect Wallet"
      )}
    </button>
  );
}
