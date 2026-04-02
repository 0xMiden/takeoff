import { useEffect } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export function useInitialFiles() {
  const mode = usePlaygroundStore((s) => s.mode);
  const files = usePlaygroundStore((s) => s.getFiles());
  const openFile = usePlaygroundStore((s) => s.openFile);
  const activeFile = usePlaygroundStore((s) => s.activeFile);

  // Open the first file on mode switch if nothing is open
  useEffect(() => {
    if (activeFile) return;
    if (files.size === 0) return;

    // Open main file for the mode
    const mainFile =
      mode === "contracts" ? "/src/lib.rs" : "/src/App.tsx";
    if (files.has(mainFile)) {
      openFile(mainFile);
    } else {
      // Open the first file
      const first = files.keys().next().value;
      if (first) openFile(first);
    }
  }, [mode, files, activeFile, openFile]);
}
