import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { cn } from "@/lib/cn";
import { Trash2 } from "lucide-react";

const levelColors: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  success: "text-primary",
  system: "text-muted-foreground",
};

const levelDots: Record<string, string> = {
  info: "bg-blue-400",
  warn: "bg-yellow-400",
  error: "bg-red-400",
  success: "bg-primary",
  system: "bg-muted-foreground/50",
};

export function ConsolePanel() {
  const lines = usePlaygroundStore((s) => s.consoleLines);
  const clearConsole = usePlaygroundStore((s) => s.clearConsole);

  return (
    <div className="glass-panel h-full w-full flex flex-col overflow-hidden border-t">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Console
        </span>
        <button
          onClick={clearConsole}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-auto px-3 py-1 font-mono text-[11px] leading-5">
        {lines.length === 0 ? (
          <div className="text-muted-foreground/40 italic py-2">
            No output yet
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className={cn("flex items-start gap-2", levelColors[line.level])}
            >
              <span
                className={cn(
                  "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                  levelDots[line.level]
                )}
              />
              <span className="break-all">{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
