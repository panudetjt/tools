import { resolve } from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  build: {
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    emptyOutDir: false,
    outDir: "../../dist",
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/ui-react/ui.html"),
    },
    target: "baseline-widely-available",
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  root: "src/ui-react",
});
