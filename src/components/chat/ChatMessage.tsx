import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { ChatMessage as ChatMsg } from "@/store/types";
import { ApplyCodeButton } from "./ApplyCodeButton";
import ReactMarkdown from "react-markdown";

// Strip fenced code blocks from markdown, leaving only prose
// Handles both complete (```...```) and incomplete (```... with no closing) blocks
function stripCodeBlocks(content: string): string {
  // First strip complete blocks
  let result = content.replace(/```[\s\S]*?```/g, "");
  // Then strip any trailing incomplete block (opening ``` with no closing)
  result = result.replace(/```[\s\S]*$/g, "");
  return result.trim();
}

export function ChatMessage({ message }: { message: ChatMsg }) {
  const isUser = message.role === "user";

  // For assistant messages, always strip code blocks (including during streaming)
  const displayContent = useMemo(
    () => (!isUser ? stripCodeBlocks(message.content) : message.content),
    [message.content, isUser]
  );

  return (
    <div
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
        isUser
          ? "ml-8 bg-primary/[0.06] border border-primary/10"
          : "mr-4 glass-panel"
      )}
    >
      {displayContent && (
        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-lg prose-code:text-primary/90 prose-code:text-xs prose-code:font-mono">
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
      )}

      {/* Apply buttons for code blocks (replaces inline code display) */}
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
