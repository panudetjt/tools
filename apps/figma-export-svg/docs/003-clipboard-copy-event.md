# 003: Clipboard Copy Without DOM Manipulation

## Context

The Figma plugin UI runs in an iframe. Manipulating `document.body` (appending a textarea, selecting text) to copy via `document.execCommand("copy")` caused the entire UI to blink/re-render. Figma's plugin system detects DOM mutations and selection changes, triggering unwanted re-renders.

## Decision

Use the ClipboardEvent API to intercept `document.execCommand("copy")` and set clipboard data via `e.clipboardData.setData()` instead of creating a temporary textarea.

## Approach

```typescript
function copyToClipboard(text: string) {
  const handler = (e: ClipboardEvent) => {
    const clipboard = e.clipboardData;
    if (!clipboard) return;
    clipboard.setData("text/plain", text);
    e.preventDefault();
  };
  document.addEventListener("copy", handler);
  document.execCommand("copy");
  document.removeEventListener("copy", handler);
}
```

- No textarea created, no `document.body` mutation
- No `ta.select()` call, so no browser selection change
- `navigator.clipboard.writeText()` does not work in Figma's plugin iframe
- `document.execCommand("copy")` is deprecated but still the only reliable method in this context

## Why Not Alternatives

- `navigator.clipboard.writeText()` - Not available in Figma's plugin iframe
- `showSaveFilePicker()` / File System Access API - May not be available in plugin iframe, requires user gesture context that's lost through async message passing
- Textarea approach - Causes DOM mutation and selection change that triggers Figma-side re-renders
