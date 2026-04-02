import type { StateCreator } from "zustand";
import type { VirtualFile, PlaygroundMode } from "../types";

export interface FileSystemSlice {
  contractFiles: Map<string, VirtualFile>;
  dappFiles: Map<string, VirtualFile>;
  getFiles: () => Map<string, VirtualFile>;
  createFile: (path: string, content: string, language: VirtualFile["language"]) => void;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
}

function filesKey(mode: PlaygroundMode): "contractFiles" | "dappFiles" {
  return mode === "contracts" ? "contractFiles" : "dappFiles";
}

export const createFileSystemSlice: StateCreator<
  FileSystemSlice & { mode: PlaygroundMode },
  [],
  [],
  FileSystemSlice
> = (set, get) => ({
  contractFiles: new Map(),
  dappFiles: new Map(),

  getFiles: () => {
    const key = filesKey(get().mode);
    return get()[key];
  },

  createFile: (path, content, language) => {
    const key = filesKey(get().mode);
    set((state) => {
      const files = new Map(state[key]);
      files.set(path, { path, content, language, isDirty: false });
      return { [key]: files };
    });
  },

  updateFile: (path, content) => {
    const key = filesKey(get().mode);
    set((state) => {
      const files = new Map(state[key]);
      const file = files.get(path);
      if (file) {
        files.set(path, { ...file, content, isDirty: true });
      }
      return { [key]: files };
    });
  },

  deleteFile: (path) => {
    const key = filesKey(get().mode);
    set((state) => {
      const files = new Map(state[key]);
      files.delete(path);
      return { [key]: files };
    });
  },

  renameFile: (oldPath, newPath) => {
    const key = filesKey(get().mode);
    set((state) => {
      const files = new Map(state[key]);
      const file = files.get(oldPath);
      if (file) {
        files.delete(oldPath);
        files.set(newPath, { ...file, path: newPath });
      }
      return { [key]: files };
    });
  },
});
