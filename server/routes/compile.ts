import { Router, type Request, type Response } from "express";
import { compileContract } from "../services/compiler.js";

const router = Router();

// Track concurrent compilations
let activeCompilations = 0;
const MAX_CONCURRENT = 3;

router.post("/compile", async (req: Request, res: Response) => {
  const { files } = req.body as { files?: Record<string, string> };

  if (!files || typeof files !== "object") {
    res.status(400).json({ error: "Missing files object" });
    return;
  }

  if (activeCompilations >= MAX_CONCURRENT) {
    res.status(429).json({ error: "Too many concurrent compilations. Try again shortly." });
    return;
  }

  activeCompilations++;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const event of compileContract(files)) {
      if (event.type === "output") {
        res.write(`data: ${JSON.stringify({ output: event.text })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ result: event.result })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Compilation failed";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  } finally {
    activeCompilations--;
  }
});

export default router;
