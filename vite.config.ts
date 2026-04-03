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
      // Use local patched build of miden-sdk (with readNumber/readValue)
      "@miden-sdk/miden-sdk": path.resolve(__dirname, "../miden-client/crates/web-client"),
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
