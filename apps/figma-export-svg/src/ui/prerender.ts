import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

await build({
  build: {
    emptyOutDir: true,
    outDir: resolve(root, ".prerender-dist"),
    rollupOptions: {
      output: { entryFileNames: "prerender.js" },
    },
    ssr: resolve(__dirname, "prerender-entry.tsx"),
  },
  configFile: resolve(root, "vite.config.ts"),
});

const { render } = await import(resolve(root, ".prerender-dist/prerender.js"));
const html = render();

const outPath = resolve(__dirname, ".prerender.html");
await Bun.write(outPath, html);
console.log(`Prerendered ${html.length} bytes`);
