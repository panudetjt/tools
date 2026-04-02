import { describe, expect, it } from "bun:test";

import { paintToColor } from "./color";

function solidPaint(r: number, g: number, b: number, opacity?: number): Paint {
  const paint: Paint & { opacity?: number } = {
    color: { b, g, r },
    type: "SOLID",
  };
  if (opacity !== undefined) paint.opacity = opacity;
  return paint;
}

function expectColor(paint: Paint): {
  formats: ReturnType<typeof paintToColor> extends null
    ? never
    : NonNullable<ReturnType<typeof paintToColor>>["formats"];
  swatch: string;
} {
  const result = paintToColor(paint);
  if (!result) {
    throw new Error(`Expected color from paint: ${JSON.stringify(paint)}`);
  }
  return result;
}

describe("paintToColor", () => {
  it("returns null for non-SOLID paint", () => {
    expect(paintToColor({ type: "GRADIENT_LINEAR" } as Paint)).toBeNull();
    expect(paintToColor({ type: "IMAGE" } as Paint)).toBeNull();
  });

  it("returns null for SOLID paint without color", () => {
    expect(paintToColor({ type: "SOLID" } as Paint)).toBeNull();
  });

  it("converts pure black", () => {
    const { formats, swatch } = expectColor(solidPaint(0, 0, 0));
    expect(formats.hex).toBe("#000000");
    expect(swatch).toBe("#000000");
    expect(formats.rgb).toBe("rgb(0, 0, 0)");
  });

  it("converts pure white", () => {
    const { formats } = expectColor(solidPaint(1, 1, 1));
    expect(formats.hex).toBe("#ffffff");
  });

  it("converts a mid-gray", () => {
    const { formats } = expectColor(solidPaint(0.5, 0.5, 0.5));
    expect(formats.hex).toBe("#808080");
  });

  it("converts a primary red", () => {
    const { formats } = expectColor(solidPaint(1, 0, 0));
    expect(formats.hex).toBe("#ff0000");
  });

  it("converts a primary green", () => {
    const { formats } = expectColor(solidPaint(0, 1, 0));
    expect(formats.hex).toBe("#00ff00");
  });

  it("converts a primary blue", () => {
    const { formats } = expectColor(solidPaint(0, 0, 1));
    expect(formats.hex).toBe("#0000ff");
  });

  it("produces all four format strings", () => {
    const { formats } = expectColor(solidPaint(0.267, 0.533, 0.8));
    expect(formats).toHaveProperty("hex");
    expect(formats).toHaveProperty("rgb");
    expect(formats).toHaveProperty("hsl");
    expect(formats).toHaveProperty("oklch");
  });

  it("hex and swatch are identical for opaque colors", () => {
    const { formats, swatch } = expectColor(solidPaint(0.1, 0.2, 0.3));
    expect(formats.hex).toBe(swatch);
  });

  it("uses hex8 format for semi-transparent colors", () => {
    const { formats, swatch } = expectColor(solidPaint(1, 0, 0, 0.5));
    expect(formats.hex).toBe("#ff000080");
    expect(swatch).toBe("#ff000080");
  });

  it("uses hex8 format for zero opacity", () => {
    const { formats } = expectColor(solidPaint(0, 0, 0, 0));
    expect(formats.hex).toBe("#00000000");
  });

  it("defaults opacity to 1 when undefined", () => {
    const paint: Paint = { color: { b: 0, g: 0, r: 1 }, type: "SOLID" };
    const { formats } = expectColor(paint);
    expect(formats.hex).toBe("#ff0000");
  });

  it("hsl format starts with hsl(", () => {
    const { formats } = expectColor(solidPaint(0.5, 0.5, 0.5));
    expect(formats.hsl).toMatch(/^hsl\(/);
  });

  it("oklch format starts with oklch(", () => {
    const { formats } = expectColor(solidPaint(0.5, 0.5, 0.5));
    expect(formats.oklch).toMatch(/^oklch\(/);
  });

  it("rgb format starts with rgb(", () => {
    const { formats } = expectColor(solidPaint(0.5, 0.5, 0.5));
    expect(formats.rgb).toMatch(/^rgb\(/);
  });

  it("alpha=1 uses standard hex not hex8", () => {
    const { formats } = expectColor(solidPaint(1, 1, 1, 1));
    expect(formats.hex).toBe("#ffffff");
  });

  it("alpha very close to 1 still uses hex8", () => {
    const { formats } = expectColor(solidPaint(1, 1, 1, 0.99));
    expect(formats.hex).toMatch(/^#ffffff[0-9a-f]{2}$/);
  });
});
