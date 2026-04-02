import type { StateCreator } from "zustand";
import type { ConsoleLine, ConsoleLevel } from "../types";

const MAX_LINES = 5000;
let lineCounter = 0;

export interface ConsoleSlice {
  consoleLines: ConsoleLine[];
  appendConsole: (level: ConsoleLevel, text: string) => void;
  clearConsole: () => void;
}

export const createConsoleSlice: StateCreator<ConsoleSlice> = (set) => ({
  consoleLines: [],
  appendConsole: (level, text) =>
    set((state) => {
      const line: ConsoleLine = {
        id: String(++lineCounter),
        text,
        level,
        timestamp: Date.now(),
      };
      const lines = [...state.consoleLines, line];
      return {
        consoleLines: lines.length > MAX_LINES ? lines.slice(-MAX_LINES) : lines,
      };
    }),
  clearConsole: () => set({ consoleLines: [] }),
});
