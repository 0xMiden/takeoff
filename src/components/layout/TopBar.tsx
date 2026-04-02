import { cn } from "@/lib/cn";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import type { PlaygroundMode } from "@/store/types";
import { WalletButton } from "./WalletButton";
import { Rocket } from "lucide-react";

const modes: { value: PlaygroundMode; label: string }[] = [
  { value: "contracts", label: "Contracts" },
  { value: "dapp", label: "dApp" },
];

export function TopBar() {
  const mode = usePlaygroundStore((s) => s.mode);
  const setMode = usePlaygroundStore((s) => s.setMode);

  return (
    <header className="glass-panel flex h-12 shrink-0 items-center justify-between px-4 border-b">
      {/* Left: Branding + Mode Switch */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary glow-green" />
          <span className="text-sm font-semibold tracking-tight">
            Miden <span className="text-primary">Takeoff</span>
          </span>
        </div>

        {/* Mode Switch */}
        <div className="flex items-center rounded-full bg-white/[0.03] p-0.5 border border-white/[0.06]">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-full px-4 py-1 text-xs font-medium transition-all duration-200",
                mode === m.value
                  ? "bg-primary/20 text-primary glow-green"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Network + Wallet */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1 border border-white/[0.06]">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">testnet</span>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
