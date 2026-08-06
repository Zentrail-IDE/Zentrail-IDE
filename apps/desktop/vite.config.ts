import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Tauri expects a fixed port and ignores Vite's HMR websocket in the bundle.
export default defineConfig({
  root: ".",
  plugins: [react()],
  resolve: {
    alias: {
      "@zentrail/ui": resolve(__dirname, "../../packages/ui/src"),
      "@zentrail/settings": resolve(__dirname, "../../packages/settings/src"),
      "@zentrail/workspace": resolve(__dirname, "../../packages/workspace/src"),
      "@zentrail/ai": resolve(__dirname, "../../packages/ai/src"),
      "@zentrail/agent": resolve(__dirname, "../../packages/agent/src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
