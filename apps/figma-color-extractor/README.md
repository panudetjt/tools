# Color Extractor

Figma plugin that extracts colors from selected elements and exports them in multiple formats.

## Features

- Extracts solid colors from fills, strokes, and text properties
- Extracts gradient colors (linear, radial, angular, diamond) as individual stops or native CSS gradient strings
- Resolves Figma variable names bound to paint properties
- Outputs colors in HEX, RGB, HSL, and OKLCH formats
- Filters by property type (fills, strokes, text)
- Deduplication with optional alpha merging
- Gradient mode toggle to view CSS gradients instead of individual stops
- Smart deduplication hides redundant stops when gradient CSS is shown
- Multi-select colors for batch operations
- Export to 6 languages (CSS, CSS Variables, Sass, TypeScript, JavaScript, JSON) with 6 casing styles
- Copy individual values or export/download formatted code
- Add selected colors to Figma canvas as a palette frame

## Tech Stack

- UI: Preact/compat + Nanostores, TailwindCSS v4, Vite 8
- Plugin sandbox: TypeScript, tsdown (IIFE)
- Color conversion: culori
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

- `dist/main.iife.js` - Plugin sandbox (tsdown, IIFE). Access to `figma` global API, no DOM.
- `dist/ui.html` - Plugin UI (Vite + vite-plugin-singlefile). Self-contained HTML with all JS/CSS inlined.

UI and main communicate via `parent.postMessage` / `figma.ui.postMessage`.

## Source Layout

```
src/
  main.ts          - Plugin sandbox entry, color extraction, canvas palette generation
  color.ts         - Paint-to-color conversion, gradient extraction, CSS gradient strings
  ui/
    main.tsx       - UI entry point
    app.tsx        - Main app component with stores, toolbar, cards, export modal
    color-export.ts - Export formatting (languages, casing styles), clipboard helper
```
