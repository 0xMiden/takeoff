import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

export function EditorTabs() {
  const openFiles = usePlaygroundStore((s) => s.getEditorState().openFiles);
  const activeFile = usePlaygroundStore((s) => s.getEditorState().activeFile);
  const setActiveFile = usePlaygroundStore((s) => s.setActiveFile);
  const closeFile = usePlaygroundStore((s) => s.closeFile);
  const files = usePlaygroundStore((s) => s.getFiles());

  if (openFiles.length === 0) return null;

  return (
    <div className="flex h-8 shrink-0 items-center overflow-x-auto border-b border-white/[0.04] bg-white/[0.01]">
      {openFiles.map((path) => {
        const isActive = path === activeFile;
        const file = files.get(path);
        const name = path.split("/").pop() ?? path;

        return (
          <div
            key={path}
            className={cn(
              "group flex h-full shrink-0 items-center gap-1.5 border-r border-white/[0.04] px-3 text-xs cursor-pointer transition-colors",
              isActive
                ? "bg-white/[0.03] text-foreground border-b-2 border-b-primary"
                : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
            )}
            onClick={() => setActiveFile(path)}
          >
            <span className="truncate max-w-[120px]">{name}</span>
            {file?.isDirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(path);
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
