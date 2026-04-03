import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import solid from "vite-plugin-solid";

export default defineConfig({
  build: {
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    emptyOutDir: false,
    outDir: "../../dist",
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/ui-solidjs/ui.html"),
    },
    target: "baseline-widely-available",
  },
  plugins: [
    solid(),
    tailwindcss(),
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  root: "src/ui-solidjs",
});
