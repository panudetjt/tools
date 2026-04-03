# Svelte 5 vs SolidJS for Figma Plugin UI

## Context

Both frameworks were evaluated for the Color Extractor plugin UI. The plugin ships as a single inlined HTML file (`vite-plugin-singlefile`) loaded in a Figma iframe - no network access, no hydration, no SEO.

## Bundle Size Comparison

|                     | Svelte 5 | SolidJS 1.9 |
| ------------------- | -------- | ----------- |
| ui.html (raw)       | 51.33 kB | 28.37 kB    |
| ui.html (gzip)      | 19.29 kB | 10.13 kB    |
| Modules transformed | 109      | 8           |
| Build time          | 187ms    | 175ms       |

SolidJS is 45% smaller raw, 47% smaller gzipped.

## Verdict: SolidJS

**Bundle size is the primary concern.** The UI loads in an iframe every time the plugin opens. Smaller payload = faster cold start. In a constrained Figma sandbox, every KB matters.

**Fine-grained reactivity reduces work per interaction.** Svelte re-runs component functions on state change. SolidJS only updates the exact DOM nodes that depend on changed signals. For a list with per-item copy feedback, this means less work.

**Fewer modules (8 vs 109)** = faster parse and eval in the sandbox.

Svelte has slightly nicer templating syntax, but that is irrelevant to end users. For an offline plugin shipping a single HTML file, SolidJS wins on size and runtime efficiency.

## Svelte-to-SolidJS Mapping

| Svelte 5                | SolidJS                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `$state()`              | `createSignal()`                                            |
| `$effect()`             | `createEffect()`                                            |
| `$derived()`            | `createMemo()`                                              |
| `{#if cond}`            | `<Show when={cond}>`                                        |
| `{#each items as item}` | `<For each={items}>{(item) => ...}</For>`                   |
| `bind:value={x}`        | `value={x()} onChange={(e) => setX(e.currentTarget.value)}` |
| `class:` directive      | template literal: `class={condition ? "a" : "b"}`           |
