# Svelte 5 vs SolidJS vs Qwik for Figma Plugin UI

## Context

Three frameworks were evaluated for the Color Extractor plugin UI. The plugin ships as a single inlined HTML file (`vite-plugin-singlefile`) loaded in a Figma iframe - no network access, no hydration, no SEO.

## Bundle Size Comparison

|                     | Svelte 5 | SolidJS 1.9 | Qwik 1.19          |
| ------------------- | -------- | ----------- | ------------------ |
| ui.html (raw)       | 51.33 kB | 28.37 kB    | N/A (multi-file)   |
| ui.html (gzip)      | 19.29 kB | 10.13 kB    | N/A (multi-file)   |
| Total (raw)         | 51.33 kB | 28.37 kB    | 89.16 kB (9 files) |
| Total (gzip)        | 19.29 kB | 10.13 kB    | 35.07 kB           |
| Modules transformed | 109      | 8           | 11                 |
| Build time          | 173ms    | 193ms       | 112ms              |

SolidJS is 45% smaller than Svelte raw, 47% smaller gzipped.
Qwik is 74% larger than Svelte and 214% larger than SolidJS.

## Qwik: Architecturally Incompatible

Qwik's optimizer **forces code splitting** (`manualChunks`) which conflicts with `vite-plugin-singlefile`'s `inlineDynamicImports`. This is by design - Qwik's core value proposition (resumability) relies on splitting code into lazy-loaded chunks.

Attempts to work around this:

- Stripping `manualChunks` via custom plugin: still fails because Qwik registers multiple entry points
- `entryStrategy: { type: "inline" }`: only inlines bootstrap code, not chunks
- `entryStrategy: { type: "single" }`: still produces multiple output files

**Qwik cannot produce a single self-contained HTML file**, which is a hard requirement for Figma plugins.

## Verdict: SolidJS

**Bundle size is the primary concern.** The UI loads in an iframe every time the plugin opens. Smaller payload = faster cold start. In a constrained Figma sandbox, every KB matters.

**Fine-grained reactivity reduces work per interaction.** Svelte re-runs component functions on state change. SolidJS only updates the exact DOM nodes that depend on changed signals. For a list with per-item copy feedback, this means less work.

**Fewer modules (8 vs 109)** = faster parse and eval in the sandbox.

**Qwik is disqualified** due to its inability to produce a single-file output. Its resumability architecture requires code splitting, which fundamentally conflicts with Figma's plugin sandbox.

## API Mapping

| Svelte 5                | SolidJS                                                     | Qwik                                     |
| ----------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `$state()`              | `createSignal()`                                            | `useSignal()`                            |
| `$effect()`             | `createEffect()`                                            | `useVisibleTask$()`                      |
| `$derived()`            | `createMemo()`                                              | `useMemo$()` / `useStore()`              |
| `{#if cond}`            | `<Show when={cond}>`                                        | `{cond && ...}`                          |
| `{#each items as item}` | `<For each={items}>{(item) => ...}</For>`                   | `{items.map((item) => ...)}`             |
| `bind:value={x}`        | `value={x()} onChange={(e) => setX(e.currentTarget.value)}` | `value={x.value} onChange$={(e) => ...}` |
| `class:` directive      | template literal: `class={condition ? "a" : "b"}`           | template literal                         |
| `component`             | function component                                          | `component$()` + `$` suffix on props     |
