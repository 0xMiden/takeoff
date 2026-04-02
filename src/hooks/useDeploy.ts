import { useCallback } from "react";
import { useMiden, useMidenClient, useSyncState } from "@miden-sdk/react";
import { useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter-react";
import {
  Package,
  StorageSlotArray,
  StorageSlot,
  AccountComponent,
  Word,
  AuthScheme,
  AccountBuilder,
  AccountType,
  AccountStorageMode,
} from "@miden-sdk/miden-sdk";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export interface StorageSlotConfig {
  name: string;
}

export function useDeploy() {
  const client = useMidenClient();
  const { publicKey } = useMidenFiWallet();
  const { sync } = useSyncState();
  const { runExclusive } = useMiden();
  const setDeployStatus = usePlaygroundStore((s) => s.setDeployStatus);
  const setContractError = usePlaygroundStore((s) => s.setContractError);
  const appendConsole = usePlaygroundStore((s) => s.appendConsole);

  const deploy = useCallback(
    async (
      contractName: string,
      maspBase64: string,
      storageSlotsConfig: StorageSlotConfig[] = []
    ) => {
      setDeployStatus(contractName, "deploying");
      appendConsole("system", `Deploying ${contractName} to testnet...`);

      try {
        const result = await runExclusive(async () => {
          // 1. Decode base64 → Uint8Array
          const maspBytes = Uint8Array.from(atob(maspBase64), (c) =>
            c.charCodeAt(0)
          );

          // 2. Deserialize compiled package
          const pkg = Package.deserialize(maspBytes);

          // 3. Construct StorageSlotArray (WASM wrapper type)
          const slots = new StorageSlotArray();
          for (const slot of storageSlotsConfig) {
            slots.push(StorageSlot.emptyValue(slot.name));
          }

          // 4. Create component from compiled package
          const component = AccountComponent.fromPackage(pkg, slots);

          // 5. Build auth component from wallet's public key
          if (!publicKey) throw new Error("Wallet not connected");
          const pubKeyWord = Word.deserialize(publicKey);
          const authComponent =
            AccountComponent.createAuthComponentFromCommitment(
              pubKeyWord,
              AuthScheme.AuthEcdsaK256Keccak
            );

          // 6. Build account — builder methods consume self, MUST reassign
          const initSeed = crypto.getRandomValues(new Uint8Array(32));
          let builder = new AccountBuilder(initSeed);
          builder = builder.accountType(
            AccountType.RegularAccountUpdatableCode
          );
          builder = builder.storageMode(AccountStorageMode.public());
          builder = builder.withAuthComponent(authComponent);
          builder = builder.withBasicWalletComponent();
          builder = builder.withComponent(component);

          // 7. Build returns AccountBuilderResult — account and seed are GETTERS
          const buildResult = builder.build();
          const account = buildResult.account;
          const seed = buildResult.seed;

          // 8. Store locally
          await client.newAccount(account, false);

          // 9. Return account ID
          return { accountId: account.bech32id(), seed };
        });

        // 10. Sync with network (outside runExclusive to avoid lock contention)
        await sync();

        setDeployStatus(contractName, "deployed", result.accountId);
        appendConsole(
          "success",
          `Deployed ${contractName}: ${result.accountId}`
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Deployment failed";
        setDeployStatus(contractName, "error");
        setContractError(contractName, message);
        appendConsole("error", `Deploy failed: ${message}`);
        throw err;
      }
    },
    [
      client,
      publicKey,
      sync,
      runExclusive,
      setDeployStatus,
      setContractError,
      appendConsole,
    ]
  );

  return { deploy };
}
