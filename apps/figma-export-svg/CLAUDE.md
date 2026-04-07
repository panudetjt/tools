# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `bun run build` - Full build: Vite (UI) then tsdown (main)
- `bun run build:ui` - Build UI only
- `bun run build:main` - Build plugin main thread only (tsdown)
- `bun run dev` - Parallel watch mode (Vite UI + tsdown)
- `bun fix` (run from `tools/` root) - Ultracite format + lint fix

## Architecture

This is a **Figma plugin** with a dual-build system producing two outputs into `dist/`:

- `dist/main.iife.js` - Plugin sandbox (tsdown, IIFE format). Runs in Figma's restricted JS environment with access to the `figma` global API. No DOM/browser APIs.
- `dist/ui.html` - Plugin UI (Vite + vite-plugin-singlefile). Self-contained HTML with all JS/CSS inlined. Runs in a browser iframe with full DOM access. Communicates with main via `parent.postMessage`.

### Communication

UI -> Main: `parent.postMessage({ pluginMessage: { type, ...data } }, "*")`
Main -> UI: `figma.ui.postMessage(msg)`
Main listens: `figma.ui.onmessage = (msg) => {}`

### Source Layout

- `src/main.ts` - Plugin sandbox entry. Has access to `figma` global and `__html__` (string contents of ui.html). Handles multi-node selection, SVG export, and currentColor replacement.
- `src/ui/` - Preact/compat + Nanostores UI built by Vite. Entry: `ui.html` -> `main.tsx` -> `app.tsx`.
- `src/ui/app.tsx` - Main app component with stores, SVG-to-JSX converter, format selector, preview, copy/download actions.
- `src/ui/zip.ts` - Minimal ZIP creator for multi-file downloads (~2KB). Pure JS with CRC32 and stored (uncompressed) entries.
- `src/ui/zip.test.ts` - Tests for zip.ts using `unzip` CLI to validate output integrity.
- `src/ui/tsconfig.json` - Separate TS config for UI (DOM libs, bundler module resolution).
- `docs/` - Decision records and technical notes. formatted with {running-number}-{title}.md
- `tsconfig.json` - TS config for plugin sandbox (es2020 target, `@figma/plugin-typings`).

### Build Constraints

- `vite-plugin-singlefile` inlines all assets into a single HTML file (Figma sandbox requirement).
- `emptyOutDir: false` prevents Vite from deleting `dist/main.iife.js` during UI build.
- `clean: false` in tsdown prevents deleting `dist/ui.html` during main build.
- tsdown outputs IIFE format (not ESM) because Figma sandbox does not support `export` syntax.
- tsdown targets ES2015 because Figma's sandbox does not support ES2021+ syntax (optional chaining, nullish coalescing).
- TailwindCSS v4 uses `@import "tailwindcss"` with `@tailwindcss/vite` plugin (no config file).

### UI Theming

- Figma's `themeColors: true` option injects CSS variables (`--figma-color-bg`, `--figma-color-text`, etc.) into the plugin iframe.
- Tailwind v4 `@theme` block in `src/ui/app.css` maps these to semantic tokens (`surface`, `fg`, `edge`, `brand`).
- All UI components use semantic tokens only - no hardcoded colors.

### Key Config Files

- `manifest.json` - Figma plugin manifest. Points `main` and `ui` to `dist/` outputs.
- `vite.config.ts` - Vite config with Preact/compat, Nanostores, TailwindCSS, and singlefile plugins. `root: "src/ui"`.
- `tsdown.config.ts` - Bundles `src/main.ts` as IIFE targeting ES2015 for Figma sandbox compatibility.

## Tech Stack

- **UI**: Preact/compat + Nanostores, TailwindCSS v4, Vite 8
- **Plugin sandbox**: TypeScript, tsdown (IIFE bundler, ES2015 target)
- **SVG-to-JSX**: Built-in converter with attribute camelCasing, style object transform, PascalCase component names
- **Zip bundling**: Built-in minimal ZIP creator (CRC32 + stored entries, ~2KB)
- **Prerendering**: Build-time static HTML via `preact-render-to-string` + Vite SSR build for instant first paint
- **Animations**: tw-animate-css
- **Linting**: Oxlint with `@figma/eslint-plugin-figma-plugins` rules
- **Package manager**: bun

## Build Pipeline

The UI build runs in two stages:

1. **Prerender** (`bun run src/ui/prerender.ts`) - Uses Vite SSR mode to render the App component to static HTML via `preact-render-to-string`. Outputs to `src/ui/.prerender.html` (gitignored).
2. **Client build** (`vite build`) - Vite injects the prerendered HTML into `ui.html` via the `prerender-inject` plugin, then bundles and inlines everything with `vite-plugin-singlefile`.

The prerendered HTML provides instant first paint during JS parsing. Preact's `hydrate()` takes over when the script executes.

## Clipboard Constraints

- `navigator.clipboard.writeText()` does not work in Figma's plugin iframe
- Must use `document.execCommand("copy")` (deprecated but functional)
- Never append temporary elements to `document.body` or change browser selection - Figma's plugin system detects these mutations and triggers unwanted UI re-renders
- Use ClipboardEvent handler to set clipboard data without DOM manipulation (see `docs/003-clipboard-copy-event.md`)
