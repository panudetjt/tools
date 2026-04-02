import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  entry: ["src/main.ts"],
  format: ["esm"],
  name: "code",
  outDir: "dist",
  platform: "browser",
});
