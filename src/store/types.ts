export type PlaygroundMode = "contracts" | "dapp";

export interface VirtualFile {
  path: string;
  content: string;
  language:
    | "rust"
    | "typescript"
    | "typescriptreact"
    | "toml"
    | "json"
    | "css";
  isDirty: boolean;
}

export type CompileStatus = "idle" | "compiling" | "success" | "error";
export type DeployStatus = "idle" | "deploying" | "deployed" | "error";

export interface ContractEntry {
  name: string;
  compileStatus: CompileStatus;
  compileOutput: string;
  deployStatus: DeployStatus;
  accountId?: string;
  packageBytes?: Uint8Array;
  componentPackage?: string; // e.g. "miden:counter-contract" from Cargo.toml
  methods?: string[]; // e.g. ["get_count", "increment_count"] from lib.rs
  masmSource?: string; // compiled MASM source from cargo-miden
  error?: string;
}

export type ConsoleLevel = "info" | "warn" | "error" | "success" | "system";

export interface ConsoleLine {
  id: string;
  text: string;
  level: ConsoleLevel;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeBlocks?: ExtractedCodeBlock[];
  isStreaming?: boolean;
}

export interface ExtractedCodeBlock {
  language: string;
  code: string;
  suggestedPath?: string;
  applied?: boolean;
}
