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
    async (contractName: string, maspBase64: string) => {
      if (!isReady || !client) {
        throw new Error("Miden client not ready");
      }

      setDeployStatus(contractName, "deploying");
      appendConsole("system", `Deploying ${contractName} to testnet...`);

      try {
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

          // 4. Extract library from package and create component with all-types support
          const library = pkg.asLibrary();
          const component = AccountComponent.fromLibrary(library, slots as unknown as never[])
            .withSupportsAllTypes();

          // 5. Build account
          const initSeed = crypto.getRandomValues(new Uint8Array(32));
          let builder = new AccountBuilder(initSeed);
          builder = builder.accountType(AccountType.RegularAccountUpdatableCode);
          builder = builder.storageMode(AccountStorageMode.public());
          builder = builder.withNoAuthComponent();
          builder = builder.withComponent(component);

          const buildResult = builder.build();
          const account = buildResult.account;
          const seed = buildResult.seed;

          // 6. Store locally
          await client.newAccount(account, false);

          return { accountId: account.bech32id(), seed };
        });

        // 7. Sync with network
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
