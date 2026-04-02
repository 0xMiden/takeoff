import { useEffect, useRef, useState } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { saveState, loadState } from "@/services/persistence";
import { getTemplatesForMode } from "@/lib/fileTemplates";

export function usePersistence() {
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    loadState().then((saved) => {
      if (saved) {
        // Clean up any stale streaming messages from interrupted sessions
        const cleanChat = (msgs: typeof saved.contractChat) =>
          msgs.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          );

        usePlaygroundStore.setState({
          contractFiles: saved.contractFiles,
          dappFiles: saved.dappFiles,
          contractChat: cleanChat(saved.contractChat),
          dappChat: cleanChat(saved.dappChat),
          contracts: saved.contracts,
          mode: saved.mode,
          streamingMessageId: null,
        });
      } else {
        // First launch — populate with templates
        const contractFiles = new Map(
          getTemplatesForMode("contracts").map((f) => [f.path, f])
        );
        const dappFiles = new Map(
          getTemplatesForMode("dapp").map((f) => [f.path, f])
        );
        usePlaygroundStore.setState({ contractFiles, dappFiles });
      }
      setIsHydrated(true);
    });
  }, []);

  // Auto-save on state changes (debounced 500ms)
  useEffect(() => {
    if (!isHydrated) return;

    const unsub = usePlaygroundStore.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const s = usePlaygroundStore.getState();
        saveState({
          contractFiles: s.contractFiles,
          dappFiles: s.dappFiles,
          contractChat: s.contractChat,
          dappChat: s.dappChat,
          contracts: s.contracts,
          mode: s.mode,
        });
      }, 500);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isHydrated]);

  return { isHydrated };
}
