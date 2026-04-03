# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `bun run build` - Full build: Vite (UI) then tsdown (main)
- `bun run build:ui` - Build UI only (Vite + Svelte + TailwindCSS)
- `bun run build:ui-solid` - Build SolidJS UI only (Vite + SolidJS + TailwindCSS)
- `bun run build:main` - Build plugin main thread only (tsdown)
- `bun run build:solid` - Full build: SolidJS UI then tsdown (main)
- `bun run dev` - Parallel watch mode (Vite + tsdown)
- `bun run dev:solid` - Parallel watch mode with SolidJS UI
- `bun fix` (run from `tools/` root) - Ultracite format + lint fix

## Architecture

This is a **Figma plugin** with a dual-build system producing two outputs into `dist/`:

- `dist/main.js` - Plugin sandbox (tsdown). Runs in Figma's restricted JS environment with access to the `figma` global API. No DOM/browser APIs.
- `dist/ui.html` - Plugin UI (Vite + vite-plugin-singlefile). Self-contained HTML with all JS/CSS inlined. Runs in a browser iframe with full DOM access. Communicates with main via `parent.postMessage`.

### Communication

UI -> Main: `parent.postMessage({ pluginMessage: { type, ...data } }, "*")`
Main -> UI: `figma.ui.postMessage(msg)`
Main listens: `figma.ui.onmessage = (msg) => {}`

### Source Layout

- `src/main.ts` - Plugin sandbox entry. Has access to `figma` global and `__html__` (string contents of ui.html).
- `src/ui/` - Svelte UI built by Vite. Entry: `ui.html` -> `main.ts` -> `App.svelte`.
- `src/ui-solidjs/` - SolidJS UI (alternative). Entry: `ui.html` -> `main.tsx` -> `App.tsx`.
- `src/ui/tsconfig.json` - Separate TS config for UI (DOM libs, bundler module resolution).
- `docs/` - Decision records and technical notes.
- `tsconfig.json` - TS config for plugin sandbox (es2020 target, `@figma/plugin-typings`).

### Build Constraints

- `vite-plugin-singlefile` inlines all assets into a single HTML file (Figma sandbox requirement).
- `emptyOutDir: false` prevents Vite from deleting `dist/main.js` during UI build.
- `clean: false` in tsdown prevents deleting `dist/ui.html` during main build.
- TailwindCSS v4 uses `@import "tailwindcss"` with `@tailwindcss/vite` plugin (no config file).

### Key Config Files

- `manifest.json` - Figma plugin manifest. Points `main` and `ui` to `dist/` outputs.
- `vite.config.ts` - Vite config with Svelte, TailwindCSS, and singlefile plugins. `root: "src/ui"`.
- `vite.config.solid.ts` - Vite config with SolidJS, TailwindCSS, and singlefile plugins. `root: "src/ui-solidjs"`.
- `tsdown.config.ts` - Bundles `src/main.ts` as ESM for browser platform.

## Tech Stack

- **UI**: Svelte 5 (runes mode: `$state`, `$derived`, `$effect`, `mount()` API), TailwindCSS v4, Vite 8
- **Plugin sandbox**: TypeScript, tsdown (ESM bundler)
- **Linting**: Oxlint with `@figma/eslint-plugin-figma-plugins` rules
- **Package manager**: bun
