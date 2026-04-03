import { describe, expect, it } from "bun:test";

import { gradientToColors, gradientToCssString, paintToColor } from "./color";

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

function gradientPaint(
  type: string,
  stops: {
    color: { a: number; b: number; g: number; r: number };
    position: number;
  }[]
): Paint {
  return {
    gradientHandlePositions: [],
    gradientStops: stops,
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
    opacity: 1,
    type: type as Paint["type"],
  } as Paint;
}

describe("gradientToColors", () => {
  it("returns empty array for non-gradient paint", () => {
    expect(gradientToColors({ type: "SOLID" } as Paint)).toHaveLength(0);
  });

  it("returns empty array for gradient without stops", () => {
    expect(gradientToColors(gradientPaint("GRADIENT_LINEAR", []))).toHaveLength(
      0
    );
  });

  it("returns empty array for IMAGE paint", () => {
    expect(gradientToColors({ type: "IMAGE" } as Paint)).toHaveLength(0);
  });

  it("extracts colors from gradient stops", () => {
    const paint = gradientPaint("GRADIENT_LINEAR", [
      { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
      { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
    ]);
    const colors = gradientToColors(paint);
    expect(colors).toHaveLength(2);
    expect(colors[0]!.formats.hex).toBe("#ff0000");
    expect(colors[1]!.formats.hex).toBe("#0000ff");
  });

  it("produces all four format strings per stop", () => {
    const paint = gradientPaint("GRADIENT_RADIAL", [
      { color: { a: 1, b: 0.8, g: 0.533, r: 0.267 }, position: 0 },
    ]);
    const colors = gradientToColors(paint);
    expect(colors).toHaveLength(1);
    expect(colors[0]!.formats).toHaveProperty("hex");
    expect(colors[0]!.formats).toHaveProperty("rgb");
    expect(colors[0]!.formats).toHaveProperty("hsl");
    expect(colors[0]!.formats).toHaveProperty("oklch");
  });

  it("handles all gradient types", () => {
    const stops = [{ color: { a: 1, b: 0, g: 1, r: 0 }, position: 0 }];
    for (const type of [
      "GRADIENT_LINEAR",
      "GRADIENT_RADIAL",
      "GRADIENT_ANGULAR",
      "GRADIENT_DIAMOND",
    ]) {
      const paint = gradientPaint(type, stops);
      expect(gradientToColors(paint)).toHaveLength(1);
      expect(gradientToColors(paint)[0]!.formats.hex).toBe("#00ff00");
    }
  });
});

function gradientPaintWithTransform(
  type: string,
  stops: {
    color: { a: number; b: number; g: number; r: number };
    position: number;
  }[],
  transform: [[number, number, number], [number, number, number]]
): Paint {
  return {
    gradientHandlePositions: [],
    gradientStops: stops,
    gradientTransform: transform,
    opacity: 1,
    type: type as Paint["type"],
  } as Paint;
}

describe("gradientToCssString", () => {
  it("returns null for non-gradient paint", () => {
    expect(gradientToCssString({ type: "SOLID" } as Paint)).toBeNull();
  });

  it("returns null for gradient without stops", () => {
    expect(
      gradientToCssString(gradientPaint("GRADIENT_LINEAR", []))
    ).toBeNull();
  });

  it("returns null for IMAGE paint", () => {
    expect(gradientToCssString({ type: "IMAGE" } as Paint)).toBeNull();
  });

  it("linear gradient with identity transform is 90deg", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_LINEAR",
      [
        { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
        { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toBe(
      "linear-gradient(90deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)"
    );
  });

  it("linear gradient with 180deg rotation", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_LINEAR",
      [
        { color: { a: 1, b: 0, g: 1, r: 0 }, position: 0 },
        { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toContain("linear-gradient(180deg,");
  });

  it("radial gradient uses circle keyword", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_RADIAL",
      [
        { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
        { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toMatch(/^radial-gradient\(circle,/);
  });

  it("angular gradient uses conic-gradient", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_ANGULAR",
      [
        { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
        { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toMatch(/^conic-gradient\(from 90deg,/);
  });

  it("diamond gradient uses conic-gradient approximation", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_DIAMOND",
      [
        { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
        { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toMatch(/^conic-gradient\(from 45deg,/);
  });

  it("stop with alpha uses rgba", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_LINEAR",
      [{ color: { a: 0.5, b: 0, g: 0, r: 1 }, position: 0.5 }],
      [
        [1, 0, 0],
        [0, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toContain("50%");
    expect(css).toContain("0.5)");
  });

  it("multiple stops with various positions", () => {
    const paint = gradientPaintWithTransform(
      "GRADIENT_LINEAR",
      [
        { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
        { color: { a: 1, b: 0, g: 1, r: 0 }, position: 0.5 },
        { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
      ]
    );
    const css = gradientToCssString(paint);
    expect(css).toContain("0%,");
    expect(css).toContain("50%,");
    expect(css).toContain("100%");
  });
});
