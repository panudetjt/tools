import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  entry: ["code.ts"],
  format: ["esm"],
  name: "code",
  outDir: ".",
  platform: "browser",
});
