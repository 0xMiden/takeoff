import type { StateCreator } from "zustand";
import type { ChatMessage, PlaygroundMode } from "../types";

export interface ChatSlice {
  contractChat: ChatMessage[];
  dappChat: ChatMessage[];
  streamingMessageId: string | null;
  getChat: () => ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateStreamingMessage: (content: string) => void;
  finalizeStream: () => void;
  clearChat: () => void;
}

function chatKey(mode: PlaygroundMode): "contractChat" | "dappChat" {
  return mode === "contracts" ? "contractChat" : "dappChat";
}

export const createChatSlice: StateCreator<
  ChatSlice & { mode: PlaygroundMode },
  [],
  [],
  ChatSlice
> = (set, get) => ({
  contractChat: [],
  dappChat: [],
  streamingMessageId: null,

  getChat: () => {
    const key = chatKey(get().mode);
    return get()[key];
  },

  addMessage: (msg) => {
    const key = chatKey(get().mode);
    set((state) => ({
      [key]: [...state[key], msg],
      streamingMessageId: msg.isStreaming ? msg.id : state.streamingMessageId,
    }));
  },

  updateStreamingMessage: (content) => {
    const key = chatKey(get().mode);
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;
    set((state) => ({
      [key]: state[key].map((msg: ChatMessage) =>
        msg.id === streamingMessageId ? { ...msg, content } : msg
      ),
    }));
  },

  finalizeStream: () => {
    const key = chatKey(get().mode);
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;
    set((state) => ({
      [key]: state[key].map((msg: ChatMessage) =>
        msg.id === streamingMessageId
          ? { ...msg, isStreaming: false }
          : msg
      ),
      streamingMessageId: null,
    }));
  },

  clearChat: () => {
    const key = chatKey(get().mode);
    set({ [key]: [], streamingMessageId: null });
  },
});
