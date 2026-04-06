# Color Extractor

<img src="./docs/assets/color-extractor-icon.svg" width="48px" />

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
- Click-to-focus: click any color swatch to select and zoom to its source node on the canvas
- Export to 6 languages (CSS, CSS Variables, Sass, TypeScript, JavaScript, JSON) with 6 casing styles
- Bulk export with duplicate label deduplication and inline comments showing source node name and property type
- Label sanitization: digit-prefixed names auto-prefixed with `_`, special characters resolved to readable names (e.g., `*` to `star`)
- Copy individual values or export/download formatted code
- Add selected colors and gradients to Figma canvas as a palette frame, using original Figma paint objects for 1:1 visual fidelity
- Canvas swatches display color names (variable name, node name, or "Unlinked") with hex values; gradient swatches show CSS gradient strings
- Gradient cards in the UI display the gradient type (Linear, Radial, Conic, Diamond) read from the original paint
- Automatic light/dark theme support matching Figma's UI theme
- Smooth enter/exit animations on export modal

## Tech Stack

- UI: Preact/compat + Nanostores, TailwindCSS v4, Vite 8
- Plugin sandbox: TypeScript, tsdown (IIFE, ES2015 target)
- Color conversion: culori
- Animations: tw-animate-css
- Package manager: bun

## Development

```sh
bun install          # install dependencies
bun run dev          # watch mode (UI + main)
bun run build        # production build
bun run check-type   # type check
bun test             # run tests
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
  main.ts          - Plugin sandbox entry, color extraction, canvas palette generation
  color.ts         - Paint-to-color conversion, gradient extraction, CSS gradient strings
  ui/
    main.tsx       - UI entry point
    app.tsx        - Main app component with stores, toolbar, cards, export modal
    app.css        - TailwindCSS v4 imports and @theme semantic token definitions
    color-export.ts - Export formatting (languages, casing styles), label sanitization, clipboard helper
    color-export.test.ts - Unit tests for color export utilities
docs/
  adr/             - Architecture decision records
  assets/          - Plugin icon and images
```
