import { useState } from "react";
import { cn } from "@/lib/cn";
import type { FileTreeNode as TreeNode } from "@/lib/virtualFs";
import { getFileExtension } from "@/lib/virtualFs";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  FileJson,
  Settings,
} from "lucide-react";

const fileIcons: Record<string, typeof FileCode> = {
  rs: FileCode,
  tsx: FileCode,
  ts: FileCode,
  toml: Settings,
  json: FileJson,
  css: FileText,
};

interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  onFileClick: (path: string) => void;
}

export function FileTreeNode({
  node,
  depth,
  activeFile,
  onFileClick,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const ext = getFileExtension(node.path);
  const Icon = fileIcons[ext] ?? FileText;
  const isActive = node.path === activeFile;

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-white/[0.04] transition-colors"
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onFileClick={onFileClick}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileClick(node.path)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-xs transition-colors",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      )}
      style={{ paddingLeft: depth * 12 + 8 }}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-60" />
      <span className="truncate">{node.name}</span>
      {node.file?.isDirty && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}
