/// <reference types="vite/client" />

interface Window {
  __midenReadStorage?: (storage: unknown, slotName: string) => unknown;
  __midenWordToNum?: (word: unknown) => number;
  __TAKEOFF_CONTRACTS?: Record<
    string,
    {
      packageBytes: Uint8Array;
      componentPackage: string;
      methods: string[];
      accountId?: string;
      masmSource: string;
      txScripts: Record<string, Uint8Array>;
    }
  >;
}
