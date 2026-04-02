import { cn } from "@/lib/cn";
import type { ChatMessage as ChatMsg } from "@/store/types";
import { ApplyCodeButton } from "./ApplyCodeButton";
import ReactMarkdown from "react-markdown";

export function ChatMessage({ message }: { message: ChatMsg }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
        isUser
          ? "ml-8 bg-primary/[0.06] border border-primary/10"
          : "mr-4 glass-panel"
      )}
    >
      <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-lg prose-code:text-primary/90 prose-code:text-xs prose-code:font-mono">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {/* Apply buttons for code blocks */}
      {message.codeBlocks && message.codeBlocks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.codeBlocks.map((block, i) => (
            <ApplyCodeButton key={i} block={block} />
          ))}
        </div>
      )}

      {/* Streaming cursor */}
      {message.isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-blink" />
      )}
    </div>
  );
}
