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

figma.ui.on("message", (msg: { type: string }) => {
  if (msg.type === "extract-colors") {
    extractAndSend();
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
});
