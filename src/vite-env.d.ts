/// <reference types="vite/client" />

interface Window {
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
