# Changelog

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
