import type { VirtualFile } from "@/store/types";

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileTreeNode[];
  file?: VirtualFile;
}

export function buildFileTree(files: Map<string, VirtualFile>): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  const sorted = Array.from(files.values()).sort((a, b) =>
    a.path.localeCompare(b.path)
  );

  for (const file of sorted) {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = "/" + parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path,
          isDirectory: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.push(node);
      }
      current = node.children;
    }
  }

  return sortTree(root);
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes
    .map((n) => ({ ...n, children: sortTree(n.children) }))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function getFileExtension(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1) : "";
}
