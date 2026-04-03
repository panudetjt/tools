# Frontend Frameworks for Figma Plugin UI

## Context

The Figma plugin UI ships as a single inlined HTML file (`vite-plugin-singlefile`) loaded in a Figma iframe - no network access, no hydration, no SEO. The ideal framework must: produce a single HTML file, be small, reactive, have no virtual DOM, and offer good DX.

## Tested (Actual Build)

|                     | Svelte 5                                | SolidJS 1.9                                            | Preact 10.29    | Preact + compat | React 19 + Compiler | Qwik 1.19             |
| ------------------- | --------------------------------------- | ------------------------------------------------------ | --------------- | --------------- | ------------------- | --------------------- |
| ui.html (raw)       | 51.33 kB                                | 28.37 kB                                               | 27.46 kB        | 33.36 kB        | 206.72 kB           | N/A (multi-file)      |
| Total bundle (raw)  | 51.33 kB                                | 28.37 kB                                               | 27.46 kB        | 33.36 kB        | 206.72 kB           | 87.07 kB (7 files)    |
| ui.html (gzip)      | 19.29 kB                                | 10.13 kB                                               | 9.91 kB         | 12.05 kB        | 65.10 kB            | N/A (multi-file)      |
| Modules transformed | 109                                     | 8                                                      | 9               | 10              | 18                  | 11 (manualChunks)     |
| vDOM                | Compiler (compiles away at build)       | No (fine-grained reactive)                             | Yes             | Yes             | Yes                 | No (resumable)        |
| Reactivity          | Runes (`$state`, `$derived`, `$effect`) | Signals (`createSignal`, `createEffect`, `createMemo`) | Hooks + Signals | Hooks + Signals | Hooks + Compiler    | Optimizer (lazy QRLs) |
| Build time          | 173ms                                   | 193ms                                                  | 91ms            | 184ms           | 425ms               | 112ms                 |
| Single file         | Yes                                     | Yes                                                    | Yes             | Yes             | Yes                 | **No**                |

## Researched (Framework Runtime Only)

| Framework               | Min  | Gzip | vDOM      | Reactivity Model         | Component Model      | Single File?            |
| ----------------------- | ---- | ---- | --------- | ------------------------ | -------------------- | ----------------------- |
| **SolidJS 1.9**         | 16   | 6    | No        | Fine-grained signals     | JSX components       | Yes (tested)            |
| **Svelte 5**            | 45   | 17   | No\*      | Compiler (compiles away) | `.svelte` files      | Yes (tested)            |
| **Preact 10.29**        | 11.5 | 4.8  | Yes       | Hooks + Signals addon    | JSX components       | Yes (tested)            |
| **Preact + Signals**    | 21   | 8.2  | Yes       | Signals (fine-grained)   | JSX components       | Yes (tested)            |
| **Alpine.js 3.15**      | 16   | 5.5  | No        | Proxy-based              | HTML attributes      | Yes                     |
| **Petite-vue 0.7**      | 6    | 2.5  | No        | Proxy-based              | HTML attributes      | Yes (no build needed)   |
| **Lit 3.4**             | 16   | 5    | No        | Reactive properties      | Web Components       | Yes                     |
| **Vue 3 runtime**       | 24   | 9    | Yes       | Proxy-based              | SFC (JSX/templ)      | Yes                     |
| **Qwik 1.19**           | ~60  | ~24  | No\*\*    | Optimizer (lazy QRLs)    | `component$()` + `$` | **No** (code splitting) |
| **htmx 2.0**            | 45   | 14   | N/A       | Server-driven HTML swap  | HTML attributes      | Yes but useless         |
| **React 19 + Compiler** | 207  | 65   | Yes\*\*\* | Compiler (auto-memoize)  | JSX components       | Yes (tested)            |
| **Million.js**          | N/A  | N/A  | No        | React compiler           | React JSX            | **Archived**            |

\*Svelte's compiler removes vDOM at build time - no vDOM at runtime.
\*\*Qwik has no runtime vDOM either, but its optimizer forces code splitting.
\*\*\*React Compiler is a build-time Babel plugin that adds ~0 to client bundle. It auto-memoizes to skip re-renders but does not eliminate vDOM diffing. Bundlephobia reports ~4.3KB gzip for react + react-dom packages alone, but actual Vite output with JSX transform + app code is 64KB gzip.

## Disqualified

### Qwik - Cannot produce single file

Qwik's optimizer forces `manualChunks`, conflicting with `vite-plugin-singlefile`. Its resumability architecture requires code splitting. See earlier research for details.

### htmx - Requires a server

htmx is server-driven: `hx-get`, `hx-post`, `hx-swap` all rely on server responses returning HTML fragments. In a Figma plugin (client-only iframe with `parent.postMessage`), htmx's core features are non-functional.

### Million.js - Archived and unmaintained

No meaningful updates since 2023. Incompatible with React 19+. Not a viable choice.

## Tier 1: No vDOM + Smallest + Reactive

### Alpine.js (~5.5KB gzip)

- **Pros**: Tiny, no build step needed, no vDOM, proxy-based reactivity, `x-data`, `x-show`, `x-for` directives in HTML
- **Cons**: HTML-attribute DX (no components, no JSX), state management limited to `Alpine.store()`, list rendering with `x-for` is verbose for complex items, TypeScript support via separate `@types/alpinejs` package
- **Best for**: Progressive enhancement, simple forms, small interactive widgets

### Petite-vue (~2.5KB gzip)

- **Pros**: Smallest option, no build step, Vue-compatible reactivity (`ref()`, `reactive()`, `watch()`), SFC-like components via `petite-vue`
- **Cons**: Very small community, limited docs, template-string or HTML-attribute DX (no JSX), no built-in component system, essentially unmaintained (last update 2023)
- **Best for**: Adding Vue-like reactivity to existing HTML with minimal overhead

### Lit (~5KB gzip)

- **Pros**: Standard Web Components, reactive properties, `css` tagged template literals for scoped styles, good TypeScript support
- **Cons**: Verbose API (`html` tagged template, `css` tagged template, `@customElement` decorator), no built-in state management (need signals add-on), class-based components feel heavy for a small plugin
- **Best for**: Design systems, embeddable widgets, projects already using Web Components

## Tier 2: Has vDOM but Small + Good DX

### React 19 + Compiler (65.10KB gzip tested)

- **Pros**: Largest ecosystem and community, excellent TypeScript support, React Compiler auto-memoizes all values/props/closures (no manual `useMemo`/`useCallback`), works with `vite-plugin-singlefile`
- **Cons**: Largest bundle by far (65KB gzip vs 10KB for SolidJS), still has virtual DOM (compiler reduces re-renders but doesn't eliminate diffing), requires `@rolldown/plugin-babel` + `babel-plugin-react-compiler` + `react-compiler-runtime` adding build complexity, slowest build time (425ms), ecosystem is overkill for a small plugin
- **Best for**: Teams already in the React ecosystem - but the bundle size penalty makes it hard to justify for a Figma plugin

### Preact + Signals (9.91KB gzip native, 12.05KB gzip with compat)

- **Pros**: Smallest tested bundle (9.91KB gzip), fastest build (91ms), React-compatible API with full ecosystem access via `preact/compat` (12.05KB gzip), Signals addon for fine-grained reactivity, good TypeScript support
- **Cons**: Still has virtual DOM (Signals help but don't eliminate it), some React APIs not supported via compat (RSC, useSyncExternalStore), `preact/compat` adds ~2KB gzip for the compatibility shim
- **Best for**: Teams familiar with React who want the smallest possible bundle with full ecosystem access

### Vue 3 runtime-only (~9KB gzip)

- **Pros**: Composition API (`ref()`, `reactive()`, `computed()`, `watch()`), proxy-based reactivity, good TypeScript support, single-file components with `<script setup>`
- **Cons**: Virtual DOM (reactive but still re-renders subtrees), larger than Alpine/Lit/Petite-vue, template compiler needed at build time
- **Best for**: Teams familiar with Vue, moderate complexity apps

## Recommendation

**For this Figma plugin, the top two choices are Preact and SolidJS:**

### Preact 10.29 + Signals (9.91KB gzip - smallest tested)

1. Smallest bundle of all tested frameworks (9.91KB gzip)
2. Fastest build time (91ms)
3. React-compatible API - largest ecosystem, most community resources
4. Signals addon for fine-grained reactivity
5. Trade-off: still has vDOM (Signals help but don't eliminate it)

### SolidJS 1.9 (10.13KB gzip - close second)

1. True fine-grained reactivity (no vDOM, no re-renders)
2. Only 8 modules transformed (minimal overhead)
3. JSX component model with good DX
4. Trade-off: smaller ecosystem than Preact/React

**Both are excellent choices.** Preact wins on size and ecosystem; SolidJS wins on reactivity model. The difference is only 0.22KB gzip.

**If exploring other alternatives:**

- **Alpine.js** - No build step, no vDOM. Trade-off: HTML-attribute DX is limiting for complex UIs.
- **React 19 + Compiler** - Largest ecosystem but 65KB gzip - hard to justify for a Figma plugin.

## Sources

- [Bundlephobia API - Preact 10.29.0](https://bundlephobia.com/api/size?package=preact@latest) - 11.5KB min, 4.8KB gzip
- [Bundlephobia API - @preact/signals 2.9.0](https://bundlephobia.com/api/size?package=@preact/signals@latest) - 9.3KB min, 3.4KB gzip
- [Vue 3 Docs - Different Builds](https://vuejs.org/guide/introduction.html#different-builds-of-vue) - Runtime only ~9KB gzip
- [Alpine.js npm](https://www.npmjs.com/package/alpinejs) - 544KB unpacked, ~15KB min, ~5.5KB gzip
- [Million.js GitHub](https://github.com/aidenybai/million) - Effectively archived, no meaningful updates
- [htmx Docs](https://htmx.org/) - Server-driven architecture
- [Qwik Docs - Advanced Vite](https://qwik.dev/docs/advanced/vite/) - Forces manualChunks
- [Bundlephobia API - react@19.2.4](https://bundlephobia.com/api/size?package=react@19) - 7.6KB min, 2.9KB gzip
- [Bundlephobia API - react-dom@19.2.4](https://bundlephobia.com/api/size?package=react-dom@19) - 3.7KB min, 1.4KB gzip
- [React Compiler Docs](https://react.dev/learn/react-compiler) - Build-time auto-memoization, no runtime overhead
