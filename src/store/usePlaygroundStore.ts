import { create } from "zustand";
import { createModeSlice, type ModeSlice } from "./slices/modeSlice";
import { createConsoleSlice, type ConsoleSlice } from "./slices/consoleSlice";
import {
  createFileSystemSlice,
  type FileSystemSlice,
} from "./slices/fileSystemSlice";
import { createEditorSlice, type EditorSlice } from "./slices/editorSlice";
import {
  createContractSlice,
  type ContractSlice,
} from "./slices/contractSlice";
import { createChatSlice, type ChatSlice } from "./slices/chatSlice";

export type PlaygroundStore = ModeSlice &
  ConsoleSlice &
  FileSystemSlice &
  EditorSlice &
  ContractSlice &
  ChatSlice;

export const usePlaygroundStore = create<PlaygroundStore>()((...args) => ({
  ...createModeSlice(...args),
  ...createConsoleSlice(...args),
  ...createFileSystemSlice(...args),
  ...createEditorSlice(...args),
  ...createContractSlice(...args),
  ...createChatSlice(...args),
}));
