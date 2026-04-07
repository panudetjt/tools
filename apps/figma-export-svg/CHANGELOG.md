# Changelog

## 1.2.0 - 2026-04-07

### Features

- **Prerendered UI** - Initial UI state is pre-rendered at build time using `preact-render-to-string` and Vite SSR, providing instant first paint. The static HTML is injected into `ui.html` and Preact hydrates on top.

### Changes

- Added prerender script (`src/ui/prerender.ts`) and SSR entry (`src/ui/prerender-entry.tsx`) for build-time HTML generation
- Added `prerender-inject` Vite plugin to inject static HTML into `ui.html`
- Switched from `render` to `hydrate` in UI entry point for seamless pre-render takeover
- Added `typeof window` guard on `window.addEventListener` for SSR compatibility
- Clipboard copy now uses ClipboardEvent handler instead of textarea DOM manipulation, eliminating UI re-render blinking in Figma's plugin iframe
- Action buttons now independently disable only during their own action, preventing cross-button visual flashing

### Technical

- `preact-render-to-string@^6.6.7` added as devDependency
- Build pipeline now runs two stages: prerender (Vite SSR) then client build (Vite)
- See `docs/003-clipboard-copy-event.md` for clipboard implementation rationale

## 1.1.0 - 2026-04-06

### Features

- **Multi-item SVG preview** - Preview now displays all selected nodes instead of only the first. Each item shows its name as a label when multiple nodes are selected.

### Changes

- Replaced single `$svgPreview` atom with direct rendering from `$exportItems`
- React key props use stable `fileName` instead of array index

## 1.0.0 - 2026-04-06

### Features

- **SVG export** - Export one or multiple selected Figma nodes as SVG using Figma's `exportAsync` API. Nodes that fail to export are silently skipped.
- **currentColor replacement** - Optional mode (enabled by default) replaces fill, stroke, and stop-color values with `currentColor` for themable icons. Uses negative matching: replaces all color values except `none`, `currentColor`, `inherit`, and gradient `url()` references.
- **JSX conversion** - SVG-to-JSX converter that transforms raw SVG into React function components with TypeScript types (`SVGProps<SVGSVGElement>`). Handles attribute camelCasing (`stroke-width` to `strokeWidth`), inline style string-to-object transform, xmlns/id removal, and `{...props}` spread on the root `<svg>`.
- **Three export formats** - Raw SVG, JSX with default export, JSX with named export. Format selector in the UI switches between all three.
- **Multi-node export** - Selecting multiple nodes exports each as a separate item. Copy concatenates into a single file; download bundles individual files into a zip archive.
- **Auto-preview** - SVG preview updates automatically on selection change and when toggling the currentColor setting, without requiring a manual export click.
- **Copy and download** - One-click copy to clipboard (using `document.execCommand` for Figma iframe compatibility) or file download. Multi-file selections download as `export.zip`.
- **Figma theme support** - Plugin UI adapts to Figma's light/dark theme using CSS variable integration with Tailwind v4 `@theme` semantic tokens.
- **SVG preview** - Checkerboard background for transparency visualization using an inline SVG data URI.

### Technical

- **Minimal ZIP creator** (~2KB) replaces JSZip (~100KB) for multi-file downloads. Pure JS implementation with CRC32, stored (no compression) entries, and proper ZIP local/central/end-of-central-directory headers.
