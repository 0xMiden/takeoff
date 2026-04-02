import { useEffect, useRef } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { MessageSquare } from "lucide-react";

export function ChatPanel() {
  const chat = usePlaygroundStore((s) => s.getChat());
  const mode = usePlaygroundStore((s) => s.mode);
  const { send, stop, isStreaming } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chat]);

  return (
    <div className="glass-panel-elevated h-full w-full flex flex-col overflow-hidden border-l">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04]">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Assistant
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/40 capitalize">
          {mode}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3 space-y-3">
        {chat.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground/40">
              {mode === "contracts"
                ? "Ask me to create a Miden smart contract"
                : "Ask me to build a dApp using your contracts"}
            </p>
          </div>
        ) : (
          chat.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={send} onStop={stop} isStreaming={isStreaming} />
    </div>
  );
}
