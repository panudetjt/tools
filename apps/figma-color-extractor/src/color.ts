import {
  converter,
  formatCss,
  formatHex,
  formatHex8,
  formatRgb,
  modeHsl,
  modeOklch,
  useMode,
} from "culori/fn";
import type { Rgb } from "culori/fn";

const toHsl = converter("hsl");
const toOklch = converter("oklch");
const hslMode = useMode(modeHsl);
const oklchMode = useMode(modeOklch);

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
