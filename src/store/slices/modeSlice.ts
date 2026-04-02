import type { StateCreator } from "zustand";
import type { PlaygroundMode } from "../types";

export interface ModeSlice {
  mode: PlaygroundMode;
  setMode: (mode: PlaygroundMode) => void;
}

export const createModeSlice: StateCreator<ModeSlice> = (set) => ({
  mode: "contracts",
  setMode: (mode) => set({ mode }),
});
