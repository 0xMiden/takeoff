import type { ExtractedCodeBlock } from "@/store/types";

const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g;
const FILE_PATH_RE = /^\/\/\s*(\/\S+)/;

export function extractCodeBlocks(content: string): ExtractedCodeBlock[] {
  const blocks: ExtractedCodeBlock[] = [];
  let match;

  while ((match = CODE_BLOCK_RE.exec(content)) !== null) {
    const language = match[1] ?? "plaintext";
    const code = match[2].trim();

    // Check first line for a file path comment: // /src/lib.rs
    let suggestedPath: string | undefined;
    let cleanCode = code;
    const firstLine = code.split("\n")[0];
    const pathMatch = firstLine?.match(FILE_PATH_RE);
    if (pathMatch) {
      suggestedPath = pathMatch[1];
      // Strip the file path comment line from the code
      cleanCode = code.split("\n").slice(1).join("\n").trim();
    }

    // Default path based on language if AI didn't include one
    if (!suggestedPath) {
      if (language === "tsx" || language === "typescriptreact" || language === "jsx" || language === "javascript" || language === "typescript" || language === "js" || language === "ts") {
        suggestedPath = "/src/App.tsx";
      } else if (language === "rust" || language === "rs") {
        suggestedPath = "/src/lib.rs";
      } else if (language === "toml") {
        suggestedPath = "/Cargo.toml";
      }
    }

    // Skip short snippets (< 3 lines) — these are inline explanations, not full files
    const lineCount = cleanCode.split("\n").length;
    if (lineCount >= 3) {
      blocks.push({ language, code: cleanCode, suggestedPath });
    }
  }

  return blocks;
}
