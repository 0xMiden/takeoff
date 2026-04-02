import type { StateCreator } from "zustand";
import type { PlaygroundMode } from "../types";

interface EditorState {
  openFiles: string[];
  activeFile: string | null;
}

export interface EditorSlice {
  contractEditorState: EditorState;
  dappEditorState: EditorState;
  getEditorState: () => EditorState;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
}

function editorKey(mode: PlaygroundMode): "contractEditorState" | "dappEditorState" {
  return mode === "contracts" ? "contractEditorState" : "dappEditorState";
}

export const createEditorSlice: StateCreator<
  EditorSlice & { mode: PlaygroundMode },
  [],
  [],
  EditorSlice
> = (set, get) => ({
  contractEditorState: { openFiles: [], activeFile: null },
  dappEditorState: { openFiles: [], activeFile: null },

  getEditorState: () => get()[editorKey(get().mode)],

  openFile: (path) => {
    const key = editorKey(get().mode);
    set((state) => {
      const ed = state[key];
      if (!ed.openFiles.includes(path)) {
        return { [key]: { openFiles: [...ed.openFiles, path], activeFile: path } };
      }
      return { [key]: { ...ed, activeFile: path } };
    });
  },

  closeFile: (path) => {
    const key = editorKey(get().mode);
    set((state) => {
      const ed = state[key];
      const openFiles = ed.openFiles.filter((f) => f !== path);
      const activeFile =
        ed.activeFile === path
          ? openFiles[openFiles.length - 1] ?? null
          : ed.activeFile;
      return { [key]: { openFiles, activeFile } };
    });
  },

  setActiveFile: (path) => {
    const key = editorKey(get().mode);
    set((state) => ({
      [key]: { ...state[key], activeFile: path },
    }));
  },
});
