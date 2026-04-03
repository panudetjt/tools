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
    name: "color_extractor",
  },
  platform: "browser",
  target: "es2015",
});
