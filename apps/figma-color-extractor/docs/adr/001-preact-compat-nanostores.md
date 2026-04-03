# ADR 001: Use Preact/compat + Nanostores for Plugin UI

**Status**: Accepted

**Date**: 2026-04-03

## Context

Figma plugins run UI in an iframe loaded from a single HTML file. Bundle size directly impacts plugin load time. We evaluated six frontend frameworks/configurations for the color extractor plugin UI.

Candidates benchmarked:
- Svelte 5
- SolidJS
- React 19
- React 19 + React Compiler
- Preact (native)
- Preact + Signals
- Preact/compat
- Preact/compat + Nanostores

## Decision

Use **Preact/compat + Nanostores** for the plugin UI.

## Rationale

- Preact/compat provides React-compatible API with significantly smaller bundle than React
- Nanostores adds minimal overhead (~0.5KB) for framework-agnostic state management
- Combined bundle is competitive with SolidJS while offering React ecosystem compatibility
- Nanostores' atom-based state management scales well if plugin complexity grows

## Consequences

- React ecosystem components can be used via preact/compat layer
- State logic is portable (nanostores is framework-agnostic)
- Slightly larger than raw Preact but smaller than React by a wide margin
- Team already familiar with React patterns -- preact/compat minimizes learning curve
