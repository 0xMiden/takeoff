# Miden Playground - Implementation Plan

## Context

Build a Remix IDE-style AI playground for Miden. Two modes: **Contracts** (Rust smart contracts) and **dApp** (React apps using `@miden-sdk/react`). An AI chatbot (Claude API) generates code in both modes. The UI should be super sleek, modern, professional - dark theme, resizable panels, polished.

This is a standalone repo at `~/miden/miden-takeoff`. It consumes `@miden-sdk/react`, `@miden-sdk/miden-sdk`, `@miden-sdk/vite-plugin`, and `@miden-sdk/miden-wallet-adapter-react` as published npm packages. Uses the MidenFi wallet adapter for authentication and transaction signing.

---

## Project Structure

```
miden-takeoff/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx              # Logo, [Contracts][dApp] toggle, network, wallet button
│   │   │   ├── PanelLayout.tsx         # allotment-based resizable 3-column + vertical split
│   │   │   ├── LeftSidebar.tsx         # FileExplorer + ContractList container
│   │   │   ├── WalletButton.tsx        # Connect/disconnect, shows address when connected
│   │   │   └── StatusBar.tsx           # Sync height, connection, wallet status
│   │   │
│   │   ├── explorer/
│   │   │   ├── FileExplorer.tsx        # Virtual FS tree view
│   │   │   ├── FileTreeNode.tsx        # Recursive tree node with icons
│   │   │   └── ContractList.tsx        # Per-contract compile/deploy status + actions
│   │   │
│   │   ├── editor/
│   │   │   ├── CodeEditor.tsx          # Monaco wrapper
│   │   │   ├── EditorTabs.tsx          # Open file tabs with dirty indicator
│   │   │   ├── editorTheme.ts          # Custom dark Monaco theme
│   │   │   └── diagnostics.ts          # Parse cargo errors → Monaco markers (inline squiggles)
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx           # Container: header, message list, input
│   │   │   ├── ChatMessage.tsx         # Single message (markdown + code blocks)
│   │   │   ├── ChatInput.tsx           # Textarea + send button
│   │   │   └── ApplyCodeButton.tsx     # "Apply to editor" on code blocks
│   │   │
│   │   ├── console/
│   │   │   ├── ConsolePanel.tsx        # Unified console: compile output, deploy logs, preview errors, warnings
│   │   │   ├── ConsoleLine.tsx         # Single log line with icon, timestamp, color by level
│   │   │   └── ConsoleToolbar.tsx      # Filter by level (error/warn/info), clear, search
│   │   │
│   │   ├── preview/
│   │   │   ├── PreviewPane.tsx         # Live eval + render generated component
│   │   │   ├── ErrorOverlay.tsx        # Compile/runtime error display
│   │   │   └── PreviewToolbar.tsx      # Refresh, fullscreen toggle
│   │   │
│   │   └── ui/                         # shadcn/ui primitives (copy-pasted, not dep)
│   │       ├── button.tsx
│   │       ├── badge.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── tabs.tsx
│   │       ├── tooltip.tsx
│   │       ├── dropdown-menu.tsx
│   │       └── separator.tsx
│   │
│   ├── store/
│   │   ├── usePlaygroundStore.ts       # Root Zustand store (composed from slices)
│   │   ├── slices/
│   │   │   ├── modeSlice.ts           # "contracts" | "dapp"
│   │   │   ├── fileSystemSlice.ts     # Two virtual FSes (one per mode)
│   │   │   ├── editorSlice.ts         # Open tabs, active file, cursor state
│   │   │   ├── chatSlice.ts           # Two conversation histories (one per mode)
│   │   │   ├── contractSlice.ts       # Compile/deploy lifecycle per contract
│   │   │   ├── consoleSlice.ts         # Unified console log lines (compile, deploy, preview, system)
│   │   │   ├── previewSlice.ts        # dApp preview state
│   │   │   └── networkSlice.ts        # Network selection, derived MidenConfig
│   │   └── types.ts
│   │
│   ├── services/
│   │   ├── api.ts                      # Typed fetch wrapper
│   │   ├── chatService.ts             # Streaming Claude API via backend proxy
│   │   ├── compileService.ts          # POST /api/compile, SSE output stream
│   │   ├── previewCompiler.ts         # Sucrase TSX transpile + import rewriting
│   │   └── persistence.ts             # Save/restore virtual FS + chat to IndexedDB
│   │
│   ├── lib/
│   │   ├── virtualFs.ts               # VirtualFile type, tree derivation helpers
│   │   ├── fileTemplates.ts           # Default Rust/React project scaffolds
│   │   ├── systemPrompts.ts           # Claude system prompts per mode
│   │   ├── codeParser.ts              # Extract fenced code blocks from AI responses
│   │   └── cn.ts                       # clsx + tailwind-merge utility
│   │
│   ├── hooks/
│   │   ├── useChat.ts                  # Orchestrates chat streaming + code extraction
│   │   ├── useCompile.ts              # Triggers compilation, pipes output to terminal
│   │   ├── useDeploy.ts              # Deploy via WASM (needs useMidenClient + useMidenFiWallet)
│   │   ├── usePersistence.ts          # Auto-save/restore virtual FS + chat to IndexedDB
│   │   └── useKeyboardShortcuts.ts   # Ctrl+S compile, Ctrl+Enter send
│   │
│   └── styles/
│       └── globals.css                 # Tailwind directives + CSS variables (dark theme)
│
├── server/
│   ├── index.ts                        # Express entry point
│   ├── routes/
│   │   ├── chat.ts                     # POST /api/chat → Claude SSE proxy
│   │   └── compile.ts                  # POST /api/compile → Docker cargo-miden
│   ├── services/
│   │   ├── claude.ts                   # Anthropic SDK streaming
│   │   └── compiler.ts                # Docker orchestration for cargo-miden
│   ├── middleware/
│   │   └── rateLimit.ts               # Per-session/IP rate limiting
│   ├── .env.example                    # ANTHROPIC_API_KEY=sk-ant-...
│   └── tsconfig.json
│
└── docker/
    ├── Dockerfile.compiler             # rustup + wasm32 target + cargo-miden + miden-sdk
    └── docker-compose.yml
```

---

## UI Layout

### Contracts Mode
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ◆ Miden Takeoff    [Contracts] [dApp]     testnet ▾  [Connect Wallet]  │
├─────────────┬────────────────────────────────────┬───────────────────────┤
│ EXPLORER    │ lib.rs  ×  Cargo.toml  ×           │ ASSISTANT            │
│             │                                    │                      │
│ ▾ src/      │  use miden_sdk::*;                 │ You: Create a counter│
│   lib.rs    │                                    │ contract with inc/dec│
│ Cargo.toml  │  #[storage]                        │                      │
│             │  struct Counter {                   │ AI: Here's a counter │
│─────────────│      count: StorageValue,          │ component using...   │
│ CONTRACTS   │  }                                 │                      │
│             │                                    │ ```rust              │
│ counter     │  #[external]                       │ [Apply to lib.rs]    │
│  ✓ compiled │  fn increment(&mut self) {         │ ```                  │
│  [Deploy]   │      ...                           │                      │
├─────────────┼────────────────────────────────────┤                      │
│ CONSOLE  [errors ▾] [clear]                      │                      │
│ ℹ Compiling counter v0.1.0...                    │                      │
│ ✓ Build succeeded (2.3s)                         │                      │
│ ℹ Deploying to testnet...                        │                      │
│ ✓ Deployed: miden1qy3...5x2                      │                      │
├──────────────────────────────────────────────────┴──────────────────────┤
│ ● Connected  │  Block: 142857  │  Contracts mode                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### dApp Mode
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ◆ Miden Takeoff    [Contracts] [dApp]     testnet ▾  miden1qy3...5x2  │
├─────────────┬──────────────────┬─────────────────┬───────────────────────┤
│ EXPLORER    │ App.tsx  ×       │  PREVIEW         │ ASSISTANT            │
│             │                  │                  │                      │
│ ▾ src/      │ import {         │  ┌──────────┐   │ You: Build a UI for  │
│   App.tsx   │   useAccount,    │  │ Counter  │   │ the counter contract │
│   Counter.. │   useSend        │  │          │   │                      │
│ index.css   │ } from           │  │   42     │   │ AI: I'll create a    │
│             │ "@miden-sdk/...";│  │          │   │ React app using      │
│─────────────│                  │  │ [+] [-]  │   │ useAccount and       │
│ CONTRACTS   │ function App() { │  │          │   │ useTransaction...    │
│ (read-only) │   ...            │  └──────────┘   │                      │
│ counter     │                  │                  │ ```tsx               │
│  0xabc1...  │                  │                  │ [Apply to App.tsx]   │
├─────────────┼──────────────────┴─────────────────┤ ```                  │
│ CONSOLE  [errors ▾] [clear]                      │                      │
│ ℹ Preview updated                                │                      │
│ ⚠ useAccount: no account found for 0xabc1...     │                      │
│ ℹ Sync complete, block 142857                    │                      │
├──────────────────────────────────────────────────┴──────────────────────┤
│ ● Connected  │  Block: 142857  │  dApp mode                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Layout structure**: The console panel sits at the bottom of the left+center area (below both the sidebar and editor/preview), always visible in both modes. It collects all output: compile results, deploy status, preview console.log/console.error intercepts, sync events, and system messages.

In dApp mode, the upper-center area splits **horizontally** — editor left, preview right.

---

## Component Hierarchy

```
<App>
  <MidenFiSignerProvider             # wallet auth + signing
    network={walletNetwork}          # WalletAdapterNetwork enum from networkSlice
    appName="Miden Takeoff"
    autoConnect={true}
    storageMode="public"
  >
    <MidenProvider config={midenConfig}>  # MidenConfig from networkSlice
      <TopBar>
        <ModeSwitch />
        <NetworkSelector />          # testnet / devnet
        <WalletButton />             # Connect/disconnect + address display
      </TopBar>
      <PanelLayout>                     # horizontal: left | center | right
        <LeftSidebar>
          <FileExplorer />
          <ContractList />           # read-only in dApp mode
        </LeftSidebar>

        <Allotment vertical>         # vertical: workspace top | console bottom
          <CenterPanel>              # MUST have h-full w-full overflow-hidden for allotment
            {mode === "contracts" ? (
              <EditorSection>        # full width editor
                <EditorTabs />
                <CodeEditor />
              </EditorSection>
            ) : (
              <Allotment>            # editor left | preview right
                <EditorSection>
                  <EditorTabs />
                  <CodeEditor />
                </EditorSection>
                <PreviewPane />
              </Allotment>
            )}
          </CenterPanel>
          <ConsolePanel />           # always visible, both modes
        </Allotment>

        <ChatPanel />
      </PanelLayout>
      <StatusBar />
    </MidenProvider>
  </MidenFiSignerProvider>
</App>
```

Note: Contracts are deployed as **standalone accounts** via `AccountBuilder` + `useDeploy` hook, NOT via `customComponents` on the signer provider. The signer provider only manages the user's wallet account for signing.

---

## State Management (Zustand Slices)

```typescript
// Key types
type PlaygroundMode = "contracts" | "dapp";

interface VirtualFile {
  path: string;
  content: string;
  language: "rust" | "typescript" | "typescriptreact" | "toml" | "json" | "css";
  isDirty: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeBlocks?: { language: string; code: string; suggestedPath?: string }[];
  isStreaming?: boolean;
}

type CompileStatus = "idle" | "compiling" | "success" | "error";
type DeployStatus = "idle" | "deploying" | "deployed" | "error";

interface ContractEntry {
  name: string;
  compileStatus: CompileStatus;
  compileOutput: string;
  deployStatus: DeployStatus;
  accountId?: string;
  packageBytes?: Uint8Array;  // compiled .masp
}
```

Each mode maintains **independent** file systems and chat histories. Switching modes swaps which FS/chat is active. The contract list is shared (visible in both modes, read-only in dApp mode).

`networkSlice` maps the dropdown selection to a full `MidenConfig` + `WalletAdapterNetwork`:
```typescript
import { WalletAdapterNetwork } from "@miden-sdk/miden-wallet-adapter-base";

interface NetworkEntry {
  config: MidenConfig;
  walletNetwork: WalletAdapterNetwork;
}

const NETWORKS: Record<string, NetworkEntry> = {
  testnet: {
    config: { rpcUrl: "testnet", prover: "testnet", autoSyncInterval: 15000 },
    walletNetwork: WalletAdapterNetwork.Testnet,
  },
};
```

Note: v1 is **testnet-only**. The Vite gRPC proxy is fixed at startup (default: testnet), so runtime network switching would silently route RPC calls to the wrong network. Multi-network support (devnet) can be added later with a dynamic proxy or env-var-based config. The network selector dropdown is hidden for v1 — "testnet" shown as a static badge in the TopBar.

---

## Backend API

### Auth Model: Operator-funded
- Anthropic API key lives in `server/.env` (gitignored, never in frontend)
- Backend proxies all Claude requests — browser never sees the key
- Rate limiting per session/IP (e.g., 30 req/min) to control spend
- Optional BYOK: users can provide their own key in settings to bypass rate limits

### `POST /api/chat` (SSE stream)
- Body: `{ messages, mode, deployedContracts }`
- Server injects mode-appropriate system prompt:
  - Contracts mode: Miden Rust SDK docs, miden-base crate patterns
  - dApp mode: Full `@miden-sdk/react` hook reference (from react-sdk CLAUDE.md) + deployed contract addresses/ABIs
- Server adds `ANTHROPIC_API_KEY` from env, calls Claude Messages API with `stream: true`
- Streams Claude response back as SSE events

### `POST /api/compile` (SSE stream)
- Body: `{ files: Record<string, string> }` (the Rust project files)
- Server scaffolds a Cargo project in a temp directory (unique per request), runs `cargo-miden build` in Docker
- Streams compilation output as SSE events
- Final event contains `.masp` bytes (base64) on success
- Operational details:
  - **Timeout**: 120s hard limit per compilation (kill Docker container if exceeded)
  - **Isolation**: each request gets its own temp dir + Docker container (no shared state)
  - **Cleanup**: temp dirs removed after response completes (success or failure)
  - **Concurrency**: max 3 concurrent compilations (queue additional requests)
  - **Docker image**: pre-built with `cargo-miden`, `wasm32-unknown-unknown` target, and a dummy project pre-compiled to warm the `target/` cache (reduces first-compile latency from ~60s to ~15s)
  - **SDK version pinning**: `Cargo.toml` template pins `miden-sdk` to a specific version matching the deployed playground

### Deployment: Client-side via `useDeploy` hook
- Happens entirely client-side. Requires wallet connected via MidenFiSignerProvider.
- `useDeploy` is a **React hook** (not a plain service) because it needs `useMidenClient()` for the WebClient and `useMidenFiWallet()` for the wallet's public key.
- Full flow:

```typescript
// hooks/useDeploy.ts
function useDeploy() {
  const client = useMidenClient();
  const { publicKey } = useMidenFiWallet();
  const { sync } = useSyncState();
  const { runExclusive } = useMiden();

  async function deploy(maspBase64: string, storageSlotsConfig: StorageSlotConfig[]) {
    return runExclusive(async () => {
      // 1. Decode base64 from compile endpoint → Uint8Array
      const maspBytes = Uint8Array.from(atob(maspBase64), c => c.charCodeAt(0));

      // 2. Deserialize compiled package
      const pkg = Package.deserialize(maspBytes);

      // 3. Construct StorageSlotArray (WASM wrapper type, NOT a plain JS array)
      //    All WASM calls can throw — entire function is wrapped in try/catch by caller
      const slots = new StorageSlotArray();
      for (const slot of storageSlotsConfig) {
        slots.push(StorageSlot.emptyValue(slot.name));
      }

      // 4. Create component from compiled package
      const component = AccountComponent.fromPackage(pkg, slots);

      // 5. Build auth component from wallet's public key
      //    publicKey is Uint8Array | null from useMidenFiWallet()
      //    Expected format: Winterfell-serialized Word (4 field elements, 32 bytes)
      //    VERIFY during implementation: check MidenWalletAdapter.connect() to confirm
      //    the publicKey format matches what Word.deserialize expects.
      //    The deploy button is disabled when wallet is disconnected, but guard anyway
      if (!publicKey) throw new Error("Wallet not connected");
      const pubKeyWord = Word.deserialize(publicKey);
      const authComponent = AccountComponent.createAuthComponentFromCommitment(
        pubKeyWord, AuthScheme.AuthEcdsaK256Keccak  // MidenFi wallet uses ECDSA, not Falcon512
      );

      // 6. Build account — builder methods consume self, MUST reassign
      const initSeed = crypto.getRandomValues(new Uint8Array(32));
      let builder = new AccountBuilder(initSeed);  // Uint8Array directly, not Array.from()
      builder = builder.accountType(AccountType.RegularAccountUpdatableCode);
      builder = builder.storageMode(AccountStorageMode.public());  // factory method, NOT property
      builder = builder.withAuthComponent(authComponent);
      builder = builder.withBasicWalletComponent();
      builder = builder.withComponent(component);

      // 7. Build returns AccountBuilderResult, not Account directly
      //    account and seed are GETTERS (properties), NOT methods — no ()
      const result = builder.build();
      const account = result.account;   // property access, not result.account()
      const seed = result.seed;         // property access, not result.seed()

      // 8. Store locally
      await client.newAccount(account, false);
      // NOTE: Key registration is handled by the MidenFiSignerProvider's signCb.
      // When the wallet adapter created the signer context, it registered a signCb
      // that routes signing requests to the external wallet. The wallet holds the
      // private key — we only used the public key commitment for the auth component.
      // No separate registerAccountPublicKeyCommitments call is needed (and it's
      // not exposed in the JS API anyway). The wallet signs via its own adapter
      // when transactions reference this account.

      // 9. Sync with network — registers public account on-chain + refreshes Zustand store
      await sync();

      // 10. Return account ID for display
      // bech32id() is a prototype augmentation from @miden-sdk/react (installed at import time)
      // Ensure @miden-sdk/react is imported in this file for both the runtime patch and TS types
      return { accountId: account.bech32id(), seed };
    });
  }

  return { deploy };
}

// Storage slot config — extensible for future value/map slots
interface StorageSlotConfig {
  name: string;
  // v2: type: "empty" | "value" | "map"; value?: Word;
}
```

Key details:
- **`runExclusive`** wraps all WASM calls to prevent aliasing panics from concurrent access (e.g., auto-sync).
- **`AccountStorageMode.public()`** — factory method, not enum property. Same for `.private()`, `.network()`.
- **`AuthScheme.AuthEcdsaK256Keccak`** — MidenFi wallet uses ECDSA K256/Keccak (scheme 1), not Falcon512.
- **`Uint8Array` directly** to `AccountBuilder`, not `Array.from()`. Constructor can throw if not exactly 32 bytes.
- **Base64 decode** — compile endpoint returns base64, must convert to `Uint8Array` before `Package.deserialize()`.
- **Key registration not needed** — MidenFiSignerProvider's signCb handles signing via the external wallet. The JS API doesn't expose `registerAccountPublicKeyCommitments`.
- **`bech32id()`** — matches react-sdk convention for displaying account IDs.
- Builder methods consume `self` — must use `builder = builder.method()` pattern.
- All WASM calls can throw — caller wraps in try/catch and reports to console.

---

## dApp Preview Strategy

**In-app eval** — no iframe, no Sandpack, no external bundler.

The playground already has `MidenProvider` + WASM initialized (needed for contract deployment). The generated dApp component runs inside the same React tree with full access to the real Miden client.

### How it works

1. Chatbot generates an `<App />` component (TSX code string)
2. **Sucrase** transpiles TSX → JS in-browser (tiny, fast, zero config)
3. Import rewriting: strip `import` statements, inject real module references
4. `new Function(...)` or `eval` creates the component
5. Render inside the existing `MidenProvider` in the preview pane

```tsx
// lib/preview.ts
import * as MidenReact from "@miden-sdk/react";
import * as React from "react";
import { transform } from "sucrase";

const MODULE_MAP: Record<string, unknown> = {
  "@miden-sdk/react": MidenReact,
  "react": React,
};

function compileComponent(code: string): React.ComponentType {
  // IMPORTANT: Sucrase MUST run before es-module-lexer because
  // es-module-lexer only parses plain JS, not TypeScript/TSX.
  //
  // 1. Sucrase transpile TSX→JS with transforms: ['typescript', 'jsx']
  //    but NOT 'imports' — preserves import statements as-is
  // 2. es-module-lexer parses the resulting plain JS to extract imports
  // 3. Map each import source to MODULE_MAP, collect bound names
  // 4. Strip import statements from the transpiled code
  // 5. Wrap in new Function() that receives modules as args
  // 6. Return the default export as a React component
}
```

```tsx
// components/preview/PreviewPane.tsx
function PreviewPane() {
  const code = usePlaygroundStore((s) => s.dappFiles.get("/src/App.tsx")?.content);
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Debounce re-eval to 500ms — prevents cascading hook unmounts/remounts
  // on every keystroke. Without this, useSend/useAccount etc. would be
  // destroyed and re-created on each character, losing in-flight state.
  const debouncedCode = useDebouncedValue(code, 500);

  useEffect(() => {
    try {
      const Comp = compileComponent(debouncedCode);
      setComponent(() => Comp);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [debouncedCode]);

  if (error) return <ErrorOverlay error={error} />;
  if (!Component) return null;

  // Runs inside the playground's existing MidenProvider
  // Real WASM, real hooks, real blockchain
  return (
    <ErrorBoundary fallback={<ErrorOverlay />}>
      <div className="preview-sandbox">
        <Component />
      </div>
    </ErrorBoundary>
  );
}
```

### What this gives us
- **Real WASM** — same client instance as the rest of the playground
- **Real hooks** — `useSend()` executes actual transactions on-chain
- **Real data** — `useAccount()` reads live state, `useSyncState()` shows real block height
- **Zero infrastructure** — no Sandpack, no WebContainers, no backend dev server
- **Instant reload** — re-eval on edit, no bundler round-trip

### Console integration
Patch the **global** `console` methods (not a scoped object) so that SDK hooks, React internals, and user code all route to the ConsolePanel:
```typescript
// In PreviewPane mount — patch global console to also append to ConsolePanel
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

console.log = (...args) => { origLog(...args); appendToConsole("info", args); };
console.warn = (...args) => { origWarn(...args); appendToConsole("warn", args); };
console.error = (...args) => { origError(...args); appendToConsole("error", args); };

// Restore on unmount
return () => { console.log = origLog; console.warn = origWarn; console.error = origError; };
```
This captures logs from the generated component, SDK hooks (useSend, useAccount), and React warnings/errors — not just user code.

### CSS isolation
Generated component styles could leak into the playground UI. Options:
- v1: Scope with a `.preview-sandbox` wrapper class + CSS containment
- v2: Shadow DOM or iframe if needed

### CSP requirement
`new Function()` / `eval` requires `unsafe-eval` in Content-Security-Policy. The vite dev server doesn't enforce CSP by default, so this works in development. For production, the hosting config must include `script-src 'unsafe-eval'` — or we can use Sucrase's output with a `<script>` injection pattern to avoid eval entirely.

### Dependencies
- `sucrase` (~1MB) — fast in-browser TSX transpilation
- `react-live` is an alternative (wraps Sucrase + provides `<LiveProvider>` / `<LivePreview>` components), but rolling our own gives more control over the module map

---

## Styling — "Liquid Glass" Dark Theme

**Stack**: Tailwind CSS v3 + shadcn/ui (customized) + custom CSS variables + `backdrop-filter` glassmorphism

**Design language**: Apple Liquid Glass aesthetic — translucent panels with blur, subtle depth layers, soft glows, smooth transitions. The UI should feel like frosted glass floating over a dark canvas.

### Core visual principles
- **Glassmorphism everywhere** — panels use `backdrop-blur` + semi-transparent backgrounds, not opaque surfaces
- **Depth via layering** — background canvas (darkest) → panel glass (translucent) → active elements (slightly more opaque)
- **Soft glow accents** — Miden green glow on active/hover states, not hard borders
- **Smooth transitions** — all state changes (hover, focus, mode switch, panel resize) animate with `transition-all duration-200`
- **Minimal hard borders** — prefer `border-white/5` (near-invisible) + shadow/glow over solid borders

### CSS variables
```css
/* globals.css */
:root {
  /* Base canvas */
  --background: 228 12% 4%;           /* deep dark blue-black */
  --foreground: 0 0% 95%;

  /* Glass panels */
  --glass: rgba(255, 255, 255, 0.03); /* panel fill */
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-hover: rgba(255, 255, 255, 0.06);
  --glass-blur: 20px;                 /* backdrop-blur amount */

  /* Elevated glass (chat, modals) */
  --glass-elevated: rgba(255, 255, 255, 0.05);
  --glass-elevated-blur: 30px;

  /* Accent — Miden green */
  --primary: 142 71% 45%;
  --primary-glow: 0 0 20px rgba(74, 222, 128, 0.15);  /* soft green glow */
  --primary-glow-strong: 0 0 30px rgba(74, 222, 128, 0.25);

  /* Status colors */
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --error: 0 84% 60%;

  /* Text hierarchy */
  --muted-foreground: 228 8% 55%;
  --subtle: 228 8% 35%;

  /* Radius */
  --radius: 12px;
  --radius-sm: 8px;
}
```

### Glass panel recipe
```css
.glass-panel {
  background: var(--glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
}

.glass-panel-elevated {
  background: var(--glass-elevated);
  backdrop-filter: blur(var(--glass-elevated-blur));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);  /* top highlight */
}
```

### Key component styling

**TopBar**: Glass panel spanning full width. Left side: **"Miden Takeoff"** branding — Miden logo (SVG) + "Takeoff" in Inter semi-bold, with a subtle green glow on the logo. Mode switch is a pill-shaped toggle with green glow on active segment. Wallet button has a subtle green border glow when connected.

**Sidebar (FileExplorer + ContractList)**: Glass panel. File tree items have `hover:bg-white/5` with smooth transition. Active file has left green accent bar (2px). Contract status badges use colored dots with matching soft glow.

**Editor area**: The Monaco editor itself sits in a slightly more opaque container (code readability > aesthetics). Editor tabs are glass with active tab having a bottom green glow line.

**Chat panel**: Glass elevated panel. Messages float as rounded cards — user messages have a subtle green-tinted glass background (`rgba(74, 222, 128, 0.05)`), assistant messages use standard glass. Streaming text has a pulsing green cursor.

**Console panel**: Glass panel with a darker tint. Log lines color-coded with soft colored dots (green/yellow/red). Filter chips are pill-shaped toggles.

**Preview pane**: Clean container with a thin glass border. Error overlay uses a red-tinted glass backdrop.

**Buttons**: Primary buttons have green glass fill + green glow on hover. Ghost buttons are transparent with `hover:bg-white/5`. All buttons have `transition-all duration-150`.

**Wallet button**: When disconnected: outlined with subtle pulse animation. When connected: shows truncated address with green dot indicator and soft glow.

### Fonts
- **UI**: `Inter` (variable weight)
- **Code/terminal/console**: `JetBrains Mono`
- Both loaded from Google Fonts or self-hosted

### Animations
```css
/* Subtle entrance for panels */
@keyframes fadeInGlass {
  from { opacity: 0; backdrop-filter: blur(0); }
  to { opacity: 1; backdrop-filter: blur(var(--glass-blur)); }
}

/* Green pulse for wallet connect button */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(74, 222, 128, 0.1); }
  50% { box-shadow: 0 0 16px rgba(74, 222, 128, 0.3); }
}

/* Streaming cursor in chat */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### Background canvas
The app background is not plain black — it has a very subtle radial gradient or mesh gradient to add depth:
```css
body {
  background: radial-gradient(ellipse at 20% 50%, rgba(74, 222, 128, 0.03) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(59, 130, 246, 0.02) 0%, transparent 50%),
              hsl(228, 12%, 4%);
}
```

**Panel resizing**: `allotment` library — high-performance, built for IDE layouts, handles horizontal/vertical splits with min/max constraints. Resize handles styled as thin translucent bars with `hover:bg-white/10`.

---

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { midenVitePlugin } from "@miden-sdk/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    midenVitePlugin(),  // keep default gRPC proxy (testnet) — needed to avoid CORS on localhost dev
    // Plugin handles: WASM dedup, worker format, esbuild config, optimizeDeps, gRPC proxy
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
```

Proxy setup:
- `/api/*` → Express backend (port 3001) for chat + compilation
- `/rpc.Api` → Miden testnet RPC (handled by `midenVitePlugin` default — required to avoid CORS in dev)
- Network switching caveat: the Vite proxy target is set at dev server startup (default: testnet). Switching to devnet in the UI changes `MidenProvider`'s config but the proxy still routes to testnet. For v1, this is acceptable — testnet is the primary target. For multi-network support, the proxy target can be made configurable via env var or custom middleware.

---

## Key Libraries

| Library | Purpose |
|---------|---------|
| `@miden-sdk/react` | Miden hooks (useSend, useAccount, etc.) |
| `@miden-sdk/miden-sdk` | WASM client (AccountBuilder, Package, etc.) |
| `@miden-sdk/vite-plugin` | WASM dedup, headers, gRPC proxy |
| `@miden-sdk/miden-wallet-adapter-react` | MidenFi wallet connect + signing |
| `@monaco-editor/react` | Code editor (Rust + TypeScript) |
| `allotment` | Resizable panel layout |
| `sucrase` | In-browser TSX transpilation for preview |
| `es-module-lexer` | Parse import statements in preview (3KB, robust) |
| `tailwindcss` + `shadcn/ui` | Styling |
| `zustand` | State management |
| `react-markdown` + `rehype-highlight` | Chat message rendering |
| `lucide-react` | Icons |
| `@anthropic-ai/sdk` (server) | Claude API |
| `express` (server) | Backend API |

---

## Implementation Phases

### Phase 1: Shell + Layout
- Initialize repo at `~/miden/miden-takeoff` with git, package.json, vite.config.ts (with `midenVitePlugin()`), tsconfig, tailwind
- Install shadcn/ui primitives (button, badge, tabs, scroll-area, select, tooltip, dropdown-menu, separator)
- Build `App.tsx` with `MidenFiSignerProvider` → `MidenProvider` → `TopBar` + `PanelLayout` (allotment) + `StatusBar`
- `WalletButton` component — connect/disconnect, shows truncated address when connected
- Mode switch toggle, network selector
- Three placeholder panels with correct resize behavior

### Phase 2: Editor + Virtual FS
- `fileSystemSlice` + `editorSlice` in Zustand
- `FileExplorer` tree view with file icons and context menus
- Monaco integration with custom dark theme
- `EditorTabs` with open/close/dirty state
- Default file templates (Rust project for Contracts, React project for dApp)
- `Ctrl+S` shortcut
- `persistence.ts` + `usePersistence` — auto-save virtual FS, chat history, contract list (including compiled `.masp` bytes), and editor state to IndexedDB. Restore on page load. Debounced (500ms) to avoid thrashing. Uses IndexedDB directly (not localStorage/JSON) because `Uint8Array` fields (`packageBytes`) require structured clone serialization — `JSON.stringify` would corrupt them.
- **Hydration gate**: App renders a loading screen until IndexedDB restore completes. This prevents flash of default content, Monaco losing cursor state, and MidenProvider double-initializing due to network config change mid-render. Pattern: `const { isHydrated } = usePersistence(); if (!isHydrated) return <LoadingScreen />;`

### Phase 3: Chat Integration
- Backend `server/` with Express + `/api/chat` endpoint
- `chatService.ts` — SSE streaming from backend
- `systemPrompts.ts` — mode-specific system prompts:
  - **Contracts mode**: Miden Rust SDK docs, miden-base crate patterns, cargo-miden build constraints
  - **dApp mode**: `@miden-sdk/react` hook reference (from react-sdk CLAUDE.md — verify import paths match actual package names, e.g., `@miden-sdk/miden-wallet-adapter-react` not `@miden-sdk/wallet-adapter-react`)
  - **dApp mode extra constraint**: instruct Claude to write components as single default-exported functions, using only `import` statements from the module map (`react`, `@miden-sdk/react`). No dynamic imports, no `require`, no relative imports — the eval preview can only resolve modules in the MODULE_MAP.
- `ChatPanel` + `ChatMessage` + `ChatInput` components
- Markdown rendering with syntax-highlighted code blocks
- `ApplyCodeButton` — pushes AI code into virtual FS and opens in editor
- Mode-independent chat histories

### Phase 4: Compilation
- `Dockerfile.compiler` — rustup + wasm32 + cargo-miden + miden-sdk pre-fetched
- Backend `/api/compile` endpoint — streams cargo output as SSE
- `compileService.ts` — client-side SSE consumer
- `diagnostics.ts` — parses compiler error output into Monaco markers for inline squiggles
- `ContractList` component with compile/deploy status badges
- `Terminal` component showing live compile output (raw text)
- On compile error: both terminal shows full output AND editor shows inline markers on the affected lines
- On successful compile: clear all markers

```typescript
// diagnostics.ts — parse cargo/cargo-miden errors into Monaco markers
//
// cargo-miden may not support --message-format=json (it's not standard cargo).
// Two strategies:
//   1. Try --message-format=json first. If supported, parse structured JSON.
//   2. Fallback: regex-parse standard cargo error format:
//      "error[E0308]: mismatched types\n --> src/lib.rs:42:5"

// Cargo error format:
//   error[E0308]: mismatched types
//     --> src/lib.rs:42:5
//
// Two-pass approach: find " --> file:line:col" lines, then look back for the error message

const POINTER_RE = /^\s*-->\s+(.+?):(\d+):(\d+)/gm;
const ERROR_LINE_RE = /^(error|warning)(\[E\d+\])?: (.+)$/;

function parseCargoOutput(output: string): monaco.editor.IMarkerData[] {
  const lines = output.split("\n");
  const markers: monaco.editor.IMarkerData[] = [];

  for (let i = 0; i < lines.length; i++) {
    const pointerMatch = lines[i].match(/^\s*-->\s+(.+?):(\d+):(\d+)/);
    if (!pointerMatch) continue;

    // Look back for the error/warning line (usually 1-2 lines above)
    let level = "error";
    let message = "Unknown error";
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const errMatch = lines[j].match(ERROR_LINE_RE);
      if (errMatch) {
        level = errMatch[1];
        message = errMatch[3];
        break;
      }
    }

    markers.push({
      severity: level === "error" ? MarkerSeverity.Error : MarkerSeverity.Warning,
      message,
      startLineNumber: parseInt(pointerMatch[2]),
      startColumn: parseInt(pointerMatch[3]),
      endLineNumber: parseInt(pointerMatch[2]),
      endColumn: parseInt(pointerMatch[3]) + 1,
    });
  }
  return markers;
}
// Applied via: monaco.editor.setModelMarkers(model, "cargo-miden", markers)
```

### Phase 5: Deployment
- `useDeploy` hook (see Backend API section for full implementation)
- Deploy button gated on: `compileStatus === "success"` AND wallet connected AND `useMiden().isReady`
- Disabled states with tooltips: "Compile first" / "Connect wallet" / "Initializing..."
- On success: show bech32 account ID with copy button, `sync()` refreshes Zustand store
- On error: show error in terminal + toast notification
- All WASM calls wrapped in try/catch (StorageSlotArray, fromPackage, build can all throw)

### Phase 6: dApp Preview
- `previewCompiler.ts` — Sucrase transpilation + import rewriting against module map
- `PreviewPane` — eval component, render inside existing `MidenProvider`
- `ErrorOverlay` + `ErrorBoundary` for compile/runtime errors
- Preview toolbar (refresh, fullscreen)
- CSS isolation via scoped `.preview-sandbox` wrapper
- Test with real `@miden-sdk/react` hooks — useSend, useAccount, etc. all work live

---

## Files to Reference

**miden-client repo:**
- `miden-client/packages/react-sdk/examples/wallet/vite.config.ts` — Vite config pattern with `midenVitePlugin()`
- `miden-client/packages/react-sdk/examples/wallet/package.json` — dependency versions
- `miden-client/packages/vite-plugin/src/index.ts` — WASM dedup, worker config, gRPC proxy
- `miden-client/packages/react-sdk/CLAUDE.md` — complete hook reference (inject into dApp mode system prompt)
- `miden-client/crates/web-client/src/models/account_builder.rs` — AccountBuilder WASM API (init_seed, accountType, storageMode, withAuthComponent, withComponent, build)
- `miden-client/crates/web-client/src/models/account_component.rs` — fromPackage(pkg, StorageSlotArray)
- `miden-client/crates/web-client/src/models/package.rs` — Package.deserialize(Uint8Array)

**miden-wallet-adapter repo:**
- `miden-wallet-adapter/packages/core/react/MidenFiSignerProvider.tsx` — wallet provider integration
- `miden-wallet-adapter/examples/react-signer/src/main.tsx` — setup pattern
- `miden-wallet-adapter/examples/react-signer/src/App.tsx` — connect/disconnect UX

---

## Verification

1. `yarn dev:all` starts both Vite dev server and Express backend
2. Mode switch toggles between Contracts and dApp views
3. Panels resize smoothly with allotment
4. Wallet connect/disconnect works via MidenFi adapter, address shows in TopBar
5. Chat sends messages, receives streamed responses, renders markdown
6. "Apply to editor" pushes code into virtual FS and opens file
7. Compile button sends Rust code to backend, terminal shows live output + inline errors in Monaco
8. Deploy button (wallet connected) creates account on testnet, shows bech32 account ID
9. dApp preview renders generated React code with real @miden-sdk/react hooks
10. Browser refresh restores virtual FS, chat history, and compiled artifacts from IndexedDB
11. `yarn lint && yarn typecheck` pass
