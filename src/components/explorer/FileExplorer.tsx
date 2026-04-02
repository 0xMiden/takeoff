import { useMemo } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { buildFileTree } from "@/lib/virtualFs";
import { FileTreeNode } from "./FileTreeNode";
import { Files } from "lucide-react";

export function FileExplorer() {
  const files = usePlaygroundStore((s) => s.getFiles());
  const activeFile = usePlaygroundStore((s) => s.getEditorState().activeFile);
  const openFile = usePlaygroundStore((s) => s.openFile);

  const tree = useMemo(() => buildFileTree(files), [files]);

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <Files className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
      </div>
      {tree.length === 0 ? (
        <div className="text-xs text-muted-foreground/60 italic px-1">
          No files yet
        </div>
      ) : (
        tree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            onFileClick={openFile}
          />
        ))
      )}
    </div>
  );
}
