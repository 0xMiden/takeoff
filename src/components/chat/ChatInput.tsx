import { useState, useRef, useCallback } from "react";
import { SendHorizontal, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-white/[0.04]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Ask the AI assistant..."
        rows={1}
        className="flex-1 resize-none rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:glow-green transition-all font-sans"
      />
      {isStreaming ? (
        <button
          onClick={onStop}
          className="shrink-0 rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="shrink-0 rounded-lg bg-primary/20 p-2 text-primary hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:hover:bg-primary/20"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
