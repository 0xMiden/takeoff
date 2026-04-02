import { Router, type Request, type Response } from "express";
import { streamChat } from "../services/claude.js";

const router = Router();

interface ChatBody {
  messages: { role: "user" | "assistant"; content: string }[];
  systemPrompt: string;
}

router.post("/chat", async (req: Request, res: Response) => {
  const { messages, systemPrompt } = req.body as ChatBody;

  if (!messages || !systemPrompt) {
    res.status(400).json({ error: "Missing messages or systemPrompt" });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of streamChat({ messages, systemPrompt })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
