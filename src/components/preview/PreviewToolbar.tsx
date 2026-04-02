import { RefreshCw, Eye } from "lucide-react";

interface PreviewToolbarProps {
  onRefresh: () => void;
}

export function PreviewToolbar({ onRefresh }: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
      <div className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </span>
      </div>
      <button
        onClick={onRefresh}
        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        title="Refresh preview"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  );
}
