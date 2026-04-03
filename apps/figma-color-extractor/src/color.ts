import {
  converter,
  formatCss,
  formatHex,
  formatHex8,
  formatRgb,
  modeHsl,
  modeOklch,
  useMode as createUseMode,
} from "culori/fn";
import type { Rgb } from "culori/fn";

const toHsl = converter("hsl");
const toOklch = converter("oklch");
const hslMode = createUseMode(modeHsl);
const oklchMode = createUseMode(modeOklch);

export interface ColorFormats {
  hex: string;
  hsl: string;
  oklch: string;
  rgb: string;
}

export function paintToColor(
  paint: Paint
): { formats: ColorFormats; swatch: string } | null {
  if (paint.type === "SOLID" && paint.color) {
    const { r, g, b } = paint.color;
    const a = paint.opacity === undefined ? 1 : paint.opacity;
    const rgb: Rgb = { alpha: a, b, g, mode: "rgb", r };
    const hasAlpha = a < 1;
    return {
      formats: {
        hex: hasAlpha ? formatHex8(rgb) : formatHex(rgb),
        hsl: formatCss(hslMode(toHsl(rgb))),
        oklch: formatCss(oklchMode(toOklch(rgb))),
        rgb: formatRgb(rgb),
      },
      swatch: hasAlpha ? formatHex8(rgb) : formatHex(rgb),
    };
  }
  return null;
}

export function gradientToColors(
  paint: Paint
): { formats: ColorFormats; swatch: string }[] {
  if (
    paint.type !== "GRADIENT_LINEAR" &&
    paint.type !== "GRADIENT_RADIAL" &&
    paint.type !== "GRADIENT_ANGULAR" &&
    paint.type !== "GRADIENT_DIAMOND"
  ) {
    return [];
  }

  const { gradientStops: stops } = paint as {
    gradientStops?: readonly { color: { b: number; g: number; r: number } }[];
  };

  if (!stops) return [];

  return stops.map((stop) => {
    const { r, g, b } = stop.color;
    const rgb: Rgb = { b, g, mode: "rgb", r };
    return {
      formats: {
        hex: formatHex(rgb),
        hsl: formatCss(hslMode(toHsl(rgb))),
        oklch: formatCss(oklchMode(toOklch(rgb))),
        rgb: formatRgb(rgb),
      },
      swatch: formatHex(rgb),
    };
  });
}

type GradientTransform = [[number, number, number], [number, number, number]];

const GRADIENT_TYPES = new Set([
  "GRADIENT_LINEAR",
  "GRADIENT_RADIAL",
  "GRADIENT_ANGULAR",
  "GRADIENT_DIAMOND",
]);

function formatStopColor(color: {
  a: number;
  b: number;
  g: number;
  r: number;
}): string {
  const rgb: Rgb = {
    alpha: color.a,
    b: color.b,
    g: color.g,
    mode: "rgb",
    r: color.r,
  };
  return formatRgb(rgb);
}

function extractAngle([[a, ,], [c, ,]]: GradientTransform): number {
  const deg = (Math.atan2(a, -c) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

export function gradientToCssString(paint: Paint): string | null {
  if (!GRADIENT_TYPES.has(paint.type)) return null;

  const { gradientStops: stops, gradientTransform: transform } = paint as {
    gradientStops?: readonly {
      color: { a: number; b: number; g: number; r: number };
      position: number;
    }[];
    gradientTransform?: GradientTransform;
  };

  if (!stops || stops.length === 0) return null;

  const colorStops = stops
    .map(
      (stop) =>
        `${formatStopColor(stop.color)} ${Math.round(stop.position * 100)}%`
    )
    .join(", ");

  switch (paint.type) {
    case "GRADIENT_LINEAR": {
      const angle = transform ? Math.round(extractAngle(transform)) : 90;
      return `linear-gradient(${angle}deg, ${colorStops})`;
    }
    case "GRADIENT_RADIAL": {
      return `radial-gradient(circle, ${colorStops})`;
    }
    case "GRADIENT_ANGULAR": {
      const angle = transform ? Math.round(extractAngle(transform)) : 0;
      return `conic-gradient(from ${angle}deg, ${colorStops})`;
    }
    case "GRADIENT_DIAMOND": {
      return `conic-gradient(from 45deg, ${colorStops})`;
    }
    default: {
      return null;
    }
  }
}
