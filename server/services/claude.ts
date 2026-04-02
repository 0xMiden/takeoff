import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  systemPrompt: string;
}

export async function* streamChat(
  req: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const stream = getClient().messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: req.systemPrompt,
    messages: req.messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
