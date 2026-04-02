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

    blocks.push({ language, code: cleanCode, suggestedPath });
  }

  return blocks;
}
