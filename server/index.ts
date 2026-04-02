import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import chatRouter from "./routes/chat.js";
import compileRouter from "./routes/compile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env") });

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "1mb" }));

app.use("/api", chatRouter);
app.use("/api", compileRouter);

app.listen(PORT, () => {
  console.log(`Takeoff server running on http://localhost:${PORT}`);
});
