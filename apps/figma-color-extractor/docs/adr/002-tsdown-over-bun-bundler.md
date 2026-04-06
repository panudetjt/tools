# ADR 002: Use tsdown over Bun Bundler for Main Thread Build

**Status**: Accepted

**Date**: 2026-04-03

## Context

The plugin main thread (`src/main.ts`) is bundled into a single IIFE file (`dist/main.iife.js`) that runs in Figma's restricted JavaScript sandbox. We evaluated replacing tsdown with Bun's built-in bundler since Bun is already the project's package manager and runtime.

## Decision

Continue using tsdown. Do not migrate to Bun bundler.

## Rationale

Figma's sandbox does not support modern JavaScript syntax:

- Optional chaining (`?.`)
- Nullish coalescing (`??`)

tsdown supports targeting older ES versions via `target: "es2015"`, which downlevels these constructs into compatible code. Bun's bundler only supports three targets: `browser`, `bun`, and `node` - none of which perform ES version downleveling. A bundle targeting `browser` emits modern syntax unchanged, causing a `SyntaxError` at runtime in Figma.

## Consequences

- tsdown remains a devDependency (powered by rolldown)
- The Bun runtime is used for running scripts and as package manager, but not for bundling the main thread
- If Bun adds ES version targets in the future, this decision can be revisited

## Reference

- [Bun Bundler](https://bun.com/docs/bundler/esbuild#:~:text=No%20support%20for%20syntax%20downleveling)
