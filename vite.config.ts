import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { midenVitePlugin } from "@miden-sdk/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    midenVitePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // NOTE: Using patched @miden-sdk/miden-sdk (getItem fix for StorageMap)
      // Patched dist was copied over node_modules/@miden-sdk/miden-sdk/dist/
      // To re-patch after yarn install: cp -r ../miden-client/crates/web-client/dist/* node_modules/@miden-sdk/miden-sdk/dist/
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
