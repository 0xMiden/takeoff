import type { StateCreator } from "zustand";
import type { ContractEntry, CompileStatus, DeployStatus } from "../types";

export interface ContractSlice {
  contracts: Map<string, ContractEntry>;
  addContract: (name: string) => void;
  setCompileStatus: (name: string, status: CompileStatus, output?: string) => void;
  setDeployStatus: (name: string, status: DeployStatus, accountId?: string) => void;
  setPackageBytes: (name: string, bytes: Uint8Array) => void;
  setContractError: (name: string, error: string) => void;
}

export const createContractSlice: StateCreator<ContractSlice> = (set) => ({
  contracts: new Map(),

  addContract: (name) =>
    set((state) => {
      const contracts = new Map(state.contracts);
      if (!contracts.has(name)) {
        contracts.set(name, {
          name,
          compileStatus: "idle",
          compileOutput: "",
          deployStatus: "idle",
        });
      }
      return { contracts };
    }),

  setCompileStatus: (name, status, output) =>
    set((state) => {
      const contracts = new Map(state.contracts);
      const entry = contracts.get(name);
      if (entry) {
        contracts.set(name, {
          ...entry,
          compileStatus: status,
          compileOutput: output ?? entry.compileOutput,
          error: status === "error" ? entry.error : undefined,
        });
      }
      return { contracts };
    }),

  setDeployStatus: (name, status, accountId) =>
    set((state) => {
      const contracts = new Map(state.contracts);
      const entry = contracts.get(name);
      if (entry) {
        contracts.set(name, {
          ...entry,
          deployStatus: status,
          accountId: accountId ?? entry.accountId,
        });
      }
      return { contracts };
    }),

  setPackageBytes: (name, bytes) =>
    set((state) => {
      const contracts = new Map(state.contracts);
      const entry = contracts.get(name);
      if (entry) {
        contracts.set(name, { ...entry, packageBytes: bytes });
      }
      return { contracts };
    }),

  setContractError: (name, error) =>
    set((state) => {
      const contracts = new Map(state.contracts);
      const entry = contracts.get(name);
      if (entry) {
        contracts.set(name, { ...entry, error });
      }
      return { contracts };
    }),
});
