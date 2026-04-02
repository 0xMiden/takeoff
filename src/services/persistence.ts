import type { VirtualFile, ChatMessage, ContractEntry } from "@/store/types";

const DB_NAME = "miden-takeoff";
const DB_VERSION = 1;
const STORES = {
  files: "files",
  chat: "chat",
  contracts: "contracts",
  meta: "meta",
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(store: string, key: string, value: unknown) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

// Serialize Map to array of entries for IndexedDB structured clone
function serializeMap<V>(map: Map<string, V>): [string, V][] {
  return Array.from(map.entries());
}

function deserializeMap<V>(entries: [string, V][] | undefined): Map<string, V> {
  return new Map(entries ?? []);
}

export interface PersistedState {
  contractFiles: [string, VirtualFile][];
  dappFiles: [string, VirtualFile][];
  contractChat: ChatMessage[];
  dappChat: ChatMessage[];
  contracts: [string, ContractEntry][];
  mode: "contracts" | "dapp";
}

export async function saveState(state: {
  contractFiles: Map<string, VirtualFile>;
  dappFiles: Map<string, VirtualFile>;
  contractChat: ChatMessage[];
  dappChat: ChatMessage[];
  contracts: Map<string, ContractEntry>;
  mode: "contracts" | "dapp";
}) {
  const data: PersistedState = {
    contractFiles: serializeMap(state.contractFiles),
    dappFiles: serializeMap(state.dappFiles),
    contractChat: state.contractChat,
    dappChat: state.dappChat,
    contracts: serializeMap(state.contracts),
    mode: state.mode,
  };
  await put(STORES.meta, "state", data);
}

export async function loadState(): Promise<{
  contractFiles: Map<string, VirtualFile>;
  dappFiles: Map<string, VirtualFile>;
  contractChat: ChatMessage[];
  dappChat: ChatMessage[];
  contracts: Map<string, ContractEntry>;
  mode: "contracts" | "dapp";
} | null> {
  const data = await get<PersistedState>(STORES.meta, "state");
  if (!data) return null;

  return {
    contractFiles: deserializeMap(data.contractFiles),
    dappFiles: deserializeMap(data.dappFiles),
    contractChat: data.contractChat ?? [],
    dappChat: data.dappChat ?? [],
    contracts: deserializeMap(data.contracts),
    mode: data.mode ?? "contracts",
  };
}
