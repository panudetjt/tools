# Uint8Array and BlobPart Compatibility

## Problem

In TypeScript 5.7+, `Uint8Array` is generic over its buffer type: `Uint8Array<ArrayBufferLike>`. The bare name `Uint8Array` includes `SharedArrayBuffer`, but `BlobPart` only accepts `ArrayBuffer`-backed views.

```typescript
const zip = concat(...parts);
new Blob([zip]); // Error: Uint8Array<ArrayBufferLike> not assignable to BlobPart
```

## Solution

Explicitly annotate return types as `Uint8Array<ArrayBuffer>` when the function always creates `ArrayBuffer`-backed arrays (which `new Uint8Array(n)` does).

```typescript
function concat(...parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(total);
  // ...
  return result; // new Uint8Array() always returns Uint8Array<ArrayBuffer>
}
```

## Key Point

- `new Uint8Array(n)` returns `Uint8Array<ArrayBuffer>` (never `SharedArrayBuffer`)
- `Uint8Array` as a type annotation means `Uint8Array<ArrayBufferLike>` (includes `SharedArrayBuffer`)
- `BlobPart` requires `ArrayBufferView<ArrayBuffer>` (excludes `SharedArrayBuffer`)
- Use explicit `Uint8Array<ArrayBuffer>` annotations to bridge the gap
