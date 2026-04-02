import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  deps: {
    alwaysBundle: [/.*/],
  },
  entry: ["src/main.ts"],
  format: ["esm"],
  name: "code",
  outDir: "dist",
  platform: "browser",
  target: "es2015",
});
