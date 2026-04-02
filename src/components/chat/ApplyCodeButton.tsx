import { useState } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import type { ExtractedCodeBlock } from "@/store/types";
import { Check, FileDown } from "lucide-react";

const LANG_TO_FILE_LANG: Record<string, VirtualFile["language"]> = {
  rust: "rust",
  rs: "rust",
  tsx: "typescriptreact",
  typescript: "typescript",
  ts: "typescript",
  toml: "toml",
  json: "json",
  css: "css",
};

import type { VirtualFile } from "@/store/types";

export function ApplyCodeButton({ block }: { block: ExtractedCodeBlock }) {
  const [applied, setApplied] = useState(false);
  const createFile = usePlaygroundStore((s) => s.createFile);
  const updateFile = usePlaygroundStore((s) => s.updateFile);
  const files = usePlaygroundStore((s) => s.getFiles());
  const openFile = usePlaygroundStore((s) => s.openFile);

  if (!block.suggestedPath) return null;

  const handleApply = () => {
    const path = block.suggestedPath!;
    const lang: VirtualFile["language"] =
      LANG_TO_FILE_LANG[block.language] ?? "typescript";

    if (files.has(path)) {
      updateFile(path, block.code);
    } else {
      createFile(path, block.code, lang);
    }
    openFile(path);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const fileName = block.suggestedPath.split("/").pop();

  return (
    <button
      onClick={handleApply}
      disabled={applied}
      className="mt-1 flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-60"
    >
      {applied ? (
        <>
          <Check className="h-3 w-3" /> Applied
        </>
      ) : (
        <>
          <FileDown className="h-3 w-3" /> Apply to {fileName}
        </>
      )}
    </button>
  );
}
