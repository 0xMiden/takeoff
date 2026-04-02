import { useCallback } from "react";
import { useMiden, useSyncState } from "@miden-sdk/react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export interface StorageSlotConfig {
  name: string;
}

export function useDeploy() {
  const { client, isReady, runExclusive } = useMiden();
  const { sync } = useSyncState();
  const setDeployStatus = usePlaygroundStore((s) => s.setDeployStatus);
  const setContractError = usePlaygroundStore((s) => s.setContractError);
  const appendConsole = usePlaygroundStore((s) => s.appendConsole);

  const deploy = useCallback(
    async (
      contractName: string,
      maspBase64: string,
      _storageSlotsConfig: StorageSlotConfig[] = []
    ) => {
      if (!isReady || !client) {
        throw new Error("Miden client not ready");
      }

      setDeployStatus(contractName, "deploying");
      appendConsole("system", `Deploying ${contractName} to testnet...`);

      try {
        // Dynamic import to avoid loading WASM types at module scope
        const {
          Package,
          StorageSlotArray,
          AccountComponent,
          AccountBuilder,
          AccountType,
          AccountStorageMode,
        } = await import("@miden-sdk/miden-sdk");

        const result = await runExclusive(async () => {
          // 1. Decode base64 → Uint8Array
          const maspBytes = Uint8Array.from(atob(maspBase64), (c) =>
            c.charCodeAt(0)
          );

          // 2. Deserialize compiled package
          const pkg = Package.deserialize(maspBytes);

          // 3. Construct StorageSlotArray
          const slots = new StorageSlotArray();

          // 4. Create component from compiled package
          const component = AccountComponent.fromPackage(pkg, slots);

          // 5. Build account with no-auth for now
          //    Full wallet-based auth will be wired when MidenFi wallet is available
          const initSeed = crypto.getRandomValues(new Uint8Array(32));
          let builder = new AccountBuilder(initSeed);
          builder = builder.accountType(
            AccountType.RegularAccountUpdatableCode
          );
          builder = builder.storageMode(AccountStorageMode.public());
          builder = builder.withNoAuthComponent();
          builder = builder.withBasicWalletComponent();
          builder = builder.withComponent(component);

          // 6. Build — account and seed are GETTERS (properties, not methods)
          const buildResult = builder.build();
          const account = buildResult.account;
          const seed = buildResult.seed;

          // 7. Store locally
          await client.newAccount(account, false);

          return { accountId: account.bech32id(), seed };
        });

        // 8. Sync with network (outside runExclusive)
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
      isReady,
      sync,
      runExclusive,
      setDeployStatus,
      setContractError,
      appendConsole,
    ]
  );

  return { deploy, isReady };
}
