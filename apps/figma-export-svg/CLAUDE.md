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

- `src/main.ts` - Plugin sandbox entry. Has access to `figma` global and `__html__` (string contents of ui.html).
- `src/ui/` - Preact/compat + Nanostores UI built by Vite. Entry: `ui.html` -> `main.tsx` -> `app.tsx`.
- `src/ui/tsconfig.json` - Separate TS config for UI (DOM libs, bundler module resolution).
- `docs/` - Decision records and technical notes.
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
- **Animations**: tw-animate-css
- **Linting**: Oxlint with `@figma/eslint-plugin-figma-plugins` rules
- **Package manager**: bun
