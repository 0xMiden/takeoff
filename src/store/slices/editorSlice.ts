import type { StateCreator } from "zustand";

export interface EditorSlice {
  openFiles: string[];
  activeFile: string | null;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
}

export const createEditorSlice: StateCreator<EditorSlice> = (set, get) => ({
  openFiles: [],
  activeFile: null,

  openFile: (path) => {
    const { openFiles } = get();
    if (!openFiles.includes(path)) {
      set({ openFiles: [...openFiles, path], activeFile: path });
    } else {
      set({ activeFile: path });
    }
  },

  closeFile: (path) => {
    set((state) => {
      const openFiles = state.openFiles.filter((f) => f !== path);
      const activeFile =
        state.activeFile === path
          ? openFiles[openFiles.length - 1] ?? null
          : state.activeFile;
      return { openFiles, activeFile };
    });
  },

  setActiveFile: (path) => set({ activeFile: path }),
});
