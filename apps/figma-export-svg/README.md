# Export SVG

<img src="./docs/assets/export-svg-icon.svg" width="48px" />

Figma plugin that exports selected nodes as SVG files or JSX components, with optional currentColor replacement for themable icons.

## Features

- Export one or multiple selected Figma nodes as SVG
- Optional currentColor replacement - replaces fill, stroke, and stop-color values with `currentColor` for themable icons (enabled by default)
- Negative matching algorithm: replaces all color values except `none`, `currentColor`, `inherit`, and gradient `url()` references
- SVG-to-JSX conversion with proper attribute camelCasing, inline style object transform, and xmlns/id cleanup
- Three export formats: raw SVG, JSX with default export, JSX with named export
- PascalCase component names derived from Figma node names
- Multi-component files: selecting multiple nodes produces a single JSX file with all components as named exports
- Multi-item preview - all selected nodes are previewed with name labels
- Auto-preview on selection change - SVG preview updates instantly when selection changes in Figma
- Auto re-export when toggling currentColor setting
- Copy to clipboard or download as file
- Multi-file zip download using built-in minimal ZIP creator (~2KB) when downloading multiple selections
- Checkerboard background on SVG preview for transparency visualization
- Automatic light/dark theme support matching Figma's UI theme

## Tech Stack

- UI: Preact/compat + Nanostores, TailwindCSS v4, Vite 8
- Plugin sandbox: TypeScript, tsdown (IIFE, ES2015 target)
- Zip bundling: built-in minimal ZIP creator (~2KB)
- Build-time prerendering for instant first paint
- Animations: tw-animate-css
- Package manager: bun

## Development

```sh
bun install          # install dependencies
bun run dev          # watch mode (UI + main)
bun run build        # production build
bun run check-type   # type check
```

Run lint/format from the monorepo root:

```sh
cd /home/jame/work/my-project/tools
bun run fix          # ultracite fix
bun run check        # ultracite check
```

## Architecture

Dual-build system producing two outputs into `dist/`:

- `dist/main.iife.js` - Plugin sandbox (tsdown, IIFE, ES2015 target). Access to `figma` global API, no DOM.
- `dist/ui.html` - Plugin UI (Vite + vite-plugin-singlefile). Self-contained HTML with all JS/CSS inlined.

UI and main communicate via `parent.postMessage` / `figma.ui.postMessage`.

## Source Layout

```
src/
  main.ts          - Plugin sandbox entry, multi-node SVG export, currentColor replacement
  ui/
    main.tsx       - UI entry point
    app.tsx        - Main app component with stores, SVG-to-JSX converter, format selector, preview, zip bundling
    app.css        - TailwindCSS v4 imports and @theme semantic token definitions
```
