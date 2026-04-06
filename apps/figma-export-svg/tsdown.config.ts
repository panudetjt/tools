import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  deps: {
    alwaysBundle: [/.*/],
  },
  entry: ["src/main.ts"],
  format: ["iife"],
  outDir: "dist",
  outputOptions: {
    name: "svg_export",
  },
  platform: "browser",
  target: "es2015",
});
