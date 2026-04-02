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

interface ColorFormats {
  hex: string;
  hsl: string;
  oklch: string;
  rgb: string;
}

interface ExtractedColor {
  formats: ColorFormats;
  nodeId: string;
  nodeName: string;
  property: string;
  swatch: string;
  variableName: string;
}

async function resolveColorName(
  node: SceneNode,
  index: number,
  field: "fills" | "strokes"
): Promise<string> {
  const bv = node.boundVariables;
  if (bv) {
    const aliases = bv[field];
    if (aliases && aliases[index]) {
      const v = await figma.variables.getVariableByIdAsync(aliases[index].id);
      if (v) return v.name;
    }
  }
  return "";
}

function paintToColor(
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

async function extractPaints(
  node: SceneNode,
  paints: readonly Paint[],
  property: string,
  field: "fills" | "strokes"
): Promise<ExtractedColor[]> {
  const results: ExtractedColor[] = [];
  for (let i = 0; i < paints.length; i += 1) {
    const color = paintToColor(paints[i]);
    if (color) {
      const variableName = await resolveColorName(node, i, field);
      results.push({
        ...color,
        nodeId: node.id,
        nodeName: node.name,
        property,
        variableName,
      });
    }
  }
  return results;
}

function getFills(node: SceneNode): readonly Paint[] | undefined {
  const { fills } = node as MinimalFillsMixin;
  return fills === figma.mixed ? undefined : fills;
}

function getStrokes(node: SceneNode): readonly Paint[] | undefined {
  return (node as MinimalStrokesMixin).strokes;
}

async function extractFills(
  node: SceneNode,
  property: string
): Promise<ExtractedColor[]> {
  const fills = getFills(node);
  if (fills) {
    return await extractPaints(node, fills, property, "fills");
  }
  return [];
}

async function extractStrokes(node: SceneNode): Promise<ExtractedColor[]> {
  const strokes = getStrokes(node);
  if (strokes) {
    return await extractPaints(node, strokes, "stroke", "strokes");
  }
  return [];
}

async function extractFromNode(node: SceneNode): Promise<ExtractedColor[]> {
  const results = [
    ...(await extractFills(node, "fill")),
    ...(await extractStrokes(node)),
  ];

  if (node.type === "TEXT") {
    results.push(...(await extractFills(node, "text-color")));
  }

  return results;
}

async function walkNode(node: SceneNode): Promise<ExtractedColor[]> {
  const results = [...(await extractFromNode(node))];

  if ("children" in node) {
    for (const child of (node as ChildrenMixin).children) {
      results.push(...(await walkNode(child)));
    }
  }

  return results;
}

figma.showUI(__html__, { height: 480, width: 320 });

async function extractAndSend() {
  const { selection } = figma.currentPage;

  if (selection.length === 0) {
    figma.ui.postMessage({
      colors: [],
      error: "No selection",
      type: "colors",
    });
    return;
  }

  const colors: ExtractedColor[] = [];
  for (const node of selection) {
    colors.push(...(await walkNode(node)));
  }

  figma.ui.postMessage({ colors, error: null, type: "colors" });
}

figma.on("selectionchange", extractAndSend);

async function createColorFrame(colors: ExtractedColor[]) {
  if (colors.length === 0) return;

  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
  ]);

  const SWATCH = 64;
  const GAP = 16;
  const PAD = 24;
  const ROW_H = SWATCH + 28;
  const FRAME_W = 420;
  const COLS = 4;
  const rows = Math.ceil(colors.length / COLS);

  const frame = figma.createFrame();
  frame.name = "Color Palette";
  frame.resize(FRAME_W, PAD);
  frame.fills = [{ color: { b: 1, g: 1, r: 1 }, type: "SOLID" }];
  frame.cornerRadius = 8;

  const title = figma.createText();
  title.name = "Title";
  title.characters = "Color Palette";
  title.fontSize = 16;
  title.fontName = { family: "Inter", style: "Semi Bold" };
  title.x = PAD;
  title.y = 12;
  title.fills = [{ color: { b: 0.11, g: 0.11, r: 0.11 }, type: "SOLID" }];
  frame.appendChild(title);

  const contentY = 44;

  for (let i = 0; i < colors.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (SWATCH + GAP);
    const y = contentY + row * ROW_H;
    const c = colors[i];

    const swatch = figma.createRectangle();
    swatch.name = c.variableName || c.formats.hex;
    swatch.resize(SWATCH, SWATCH);
    swatch.x = x;
    swatch.y = y;
    swatch.cornerRadius = 8;
    const hex = c.formats.hex.replace("#", "");
    const cr = Number.parseInt(hex.slice(0, 2), 16) / 255;
    const cg = Number.parseInt(hex.slice(2, 4), 16) / 255;
    const cb = Number.parseInt(hex.slice(4, 6), 16) / 255;
    swatch.fills = [{ color: { b: cb, g: cg, r: cr }, type: "SOLID" }];
    frame.appendChild(swatch);

    const label = figma.createText();
    label.name = "Label";
    label.characters = c.formats.hex.toUpperCase();
    label.fontSize = 10;
    label.fontName = { family: "Inter", style: "Medium" };
    label.x = x;
    label.y = y + SWATCH + 4;
    label.fills = [{ color: { b: 0.4, g: 0.4, r: 0.4 }, type: "SOLID" }];
    frame.appendChild(label);

    if (c.variableName) {
      const varName = figma.createText();
      varName.name = "Variable";
      varName.characters = c.variableName;
      varName.fontSize = 8;
      varName.fontName = { family: "Inter", style: "Regular" };
      varName.x = x;
      varName.y = y + SWATCH + 18;
      varName.fills = [{ color: { b: 0.6, g: 0.6, r: 0.6 }, type: "SOLID" }];
      frame.appendChild(varName);
    }
  }

  const totalH = contentY + rows * ROW_H + PAD;
  frame.resize(FRAME_W, totalH);

  figma.viewport.scrollAndZoomIntoView([frame]);
}

figma.ui.on("message", (msg: { type: string; colors?: ExtractedColor[] }) => {
  if (msg.type === "extract-colors") {
    extractAndSend();
  }

  if (msg.type === "add-to-canvas" && msg.colors) {
    createColorFrame(msg.colors);
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
});
