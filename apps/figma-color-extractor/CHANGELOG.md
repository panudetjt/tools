# Changelog

## 1.1.0 - 2026-04-06

### Features

- **Figma theme support** - Plugin UI now automatically adapts to Figma's light/dark theme using CSS variable integration with Tailwind v4 `@theme` semantic tokens.
- **Modal animations** - Export modal now has smooth enter/exit transitions (fade + slide) using tw-animate-css.
- **Click-to-focus** - Click any color or gradient swatch in the plugin UI to select and zoom to its source node on the Figma canvas. Works for both solid colors and gradients using Figma's async `getNodeByIdAsync` API.
- **Export label deduplication** - Duplicate labels in bulk export are automatically resolved with numbered suffixes (e.g., "red", "red1", "red2").
- **Export inline comments** - Bulk export now includes inline comments showing the original node name and property type (e.g., `/* Rectangle 1 - fill */`, `// Circle - stroke`). Applies to all formats except JSON.
- **Export label sanitization** - Names starting with a digit are prefixed with `_` for identifier-requiring languages (CSS, Sass, TypeScript, JavaScript). Names consisting only of special characters are resolved to readable symbol names (e.g., `*` to `star`, `***` to `star3`). Resolved names respect the selected casing style.

### Bug Fixes

- Fixed incorrect color tokens in toolbar format toggle buttons and export modal format picker. Active states now correctly use `bg-surface-active text-fg-brand` instead of `bg-surface-inverse text-fg-onbrand`.

### Tests

- Added 73 test cases for color export covering label sanitization, symbol name resolution, deduplication, casing style application, and comment formatting across all 6 export languages.
