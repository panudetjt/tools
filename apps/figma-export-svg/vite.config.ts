import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import preactPreset from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
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
      input: resolve(import.meta.dirname, "src/ui/ui.html"),
    },
    target: "baseline-widely-available",
  },
  plugins: [
    preactPreset(),
    tailwindcss(),
    {
      name: "prerender-inject",
      transformIndexHtml(html: string) {
        const prerenderedPath = resolve(
          import.meta.dirname,
          "src/ui/.prerender.html"
        );
        if (!existsSync(prerenderedPath)) return html;
        const prerendered = readFileSync(prerenderedPath, "utf-8");
        return html.replace(
          '<div id="app"></div>',
          `<div id="app">${prerendered}</div>`
        );
      },
    },
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react-dom/client": "preact/compat/client",
    },
  },
  root: "src/ui",
});
