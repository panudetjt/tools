import type { ColorFormats } from "./color";
import { gradientToColors, gradientToCssString, paintToColor } from "./color";

interface ExtractedColor {
  formats: ColorFormats;
  gradient?: string;
  nodeId: string;
  nodeName: string;
  paint?: Paint;
  property: string;
  swatch: string;
  variableName: string;
}

export async function resolveColorName(
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

export async function extractPaints(
  node: SceneNode,
  paints: readonly Paint[],
  property: string,
  field: "fills" | "strokes"
): Promise<ExtractedColor[]> {
  const results: ExtractedColor[] = [];
  for (let i = 0; i < paints.length; i += 1) {
    const paint = paints[i];
    if (!paint) continue;
    const color = paintToColor(paint);
    if (color) {
      const variableName = await resolveColorName(node, i, field);
      results.push({
        ...color,
        nodeId: node.id,
        nodeName: node.name,
        property,
        variableName,
      });
      continue;
    }
    const gradientColors = gradientToColors(paint);
    if (gradientColors.length > 0) {
      const variableName = await resolveColorName(node, i, field);
      for (const gc of gradientColors) {
        results.push({
          ...gc,
          nodeId: node.id,
          nodeName: node.name,
          property,
          variableName,
        });
      }
      const cssGradient = gradientToCssString(paint);
      if (cssGradient) {
        results.push({
          formats: { hex: "", hsl: "", oklch: "", rgb: "" },
          gradient: cssGradient,
          nodeId: node.id,
          nodeName: node.name,
          paint,
          property,
          swatch: cssGradient,
          variableName,
        });
      }
    }
  }
  return results;
}

export function getFills(node: SceneNode): readonly Paint[] | undefined {
  const { fills } = node as MinimalFillsMixin;
  return fills === figma.mixed ? undefined : fills;
}

export function getStrokes(node: SceneNode): readonly Paint[] | undefined {
  return (node as MinimalStrokesMixin).strokes;
}

export function extractFills(
  node: SceneNode,
  property: string
): Promise<ExtractedColor[]> {
  const fills = getFills(node);
  if (fills) {
    return extractPaints(node, fills, property, "fills");
  }
  return Promise.resolve([]);
}

export function extractStrokes(node: SceneNode): Promise<ExtractedColor[]> {
  const strokes = getStrokes(node);
  if (strokes) {
    return extractPaints(node, strokes, "stroke", "strokes");
  }
  return Promise.resolve([]);
}

export async function extractFromNode(
  node: SceneNode
): Promise<ExtractedColor[]> {
  const results = [
    ...(await extractFills(node, "fill")),
    ...(await extractStrokes(node)),
  ];

  if (node.type === "TEXT") {
    results.push(...(await extractFills(node, "text-color")));
  }

  return results;
}

export async function walkNode(node: SceneNode): Promise<ExtractedColor[]> {
  const results = [...(await extractFromNode(node))];

  if ("children" in node) {
    for (const child of (node as ChildrenMixin).children) {
      results.push(...(await walkNode(child)));
    }
  }

  return results;
}

figma.showUI(__html__, { height: 480, themeColors: true, width: 320 });

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
    if (!c) continue;

    if (c.gradient && c.paint) {
      const swatch = figma.createRectangle();
      swatch.name = c.variableName || c.nodeName;
      swatch.resize(SWATCH, SWATCH);
      swatch.x = x;
      swatch.y = y;
      swatch.cornerRadius = 8;
      swatch.fills = [c.paint];
      frame.appendChild(swatch);

      const label = c.variableName || c.nodeName || "Unlinked";
      const titleText = figma.createText();
      titleText.name = "Title";
      titleText.textAutoResize = "TRUNCATE";
      titleText.resize(SWATCH, 14);
      titleText.characters = label;
      titleText.fontSize = 10;
      titleText.fontName = { family: "Inter", style: "Medium" };
      titleText.x = x;
      titleText.y = y + SWATCH + 4;
      titleText.fills = [
        { color: { b: 0.11, g: 0.11, r: 0.11 }, type: "SOLID" },
      ];
      frame.appendChild(titleText);

      const cssLabel = figma.createText();
      cssLabel.name = "CSS";
      cssLabel.textAutoResize = "TRUNCATE";
      cssLabel.resize(SWATCH, 12);
      cssLabel.characters = c.gradient;
      cssLabel.fontSize = 7;
      cssLabel.fontName = { family: "Inter", style: "Regular" };
      cssLabel.x = x;
      cssLabel.y = y + SWATCH + 18;
      cssLabel.fills = [{ color: { b: 0.4, g: 0.4, r: 0.4 }, type: "SOLID" }];
      frame.appendChild(cssLabel);

      continue;
    }

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

    const label = c.variableName || c.nodeName || "Unlinked";
    const titleText = figma.createText();
    titleText.name = "Title";
    titleText.textAutoResize = "TRUNCATE";
    titleText.resize(SWATCH, 14);
    titleText.characters = label;
    titleText.fontSize = 10;
    titleText.fontName = { family: "Inter", style: "Medium" };
    titleText.x = x;
    titleText.y = y + SWATCH + 4;
    titleText.fills = [{ color: { b: 0.11, g: 0.11, r: 0.11 }, type: "SOLID" }];
    frame.appendChild(titleText);

    const hexLabel = figma.createText();
    hexLabel.name = "Hex";
    hexLabel.characters = c.formats.hex.toUpperCase();
    hexLabel.fontSize = 8;
    hexLabel.fontName = { family: "Inter", style: "Regular" };
    hexLabel.x = x;
    hexLabel.y = y + SWATCH + 18;
    hexLabel.fills = [{ color: { b: 0.4, g: 0.4, r: 0.4 }, type: "SOLID" }];
    frame.appendChild(hexLabel);
  }

  const totalH = contentY + rows * ROW_H + PAD;
  frame.resize(FRAME_W, totalH);

  figma.viewport.scrollAndZoomIntoView([frame]);
}

figma.ui.on(
  "message",
  async (msg: { colors?: ExtractedColor[]; nodeId?: string; type: string }) => {
    if (msg.type === "extract-colors") {
      void extractAndSend();
    }

    if (msg.type === "add-to-canvas" && msg.colors) {
      void createColorFrame(msg.colors);
    }

    if (msg.type === "cancel") {
      figma.closePlugin();
    }

    if (msg.type === "focus-node" && msg.nodeId) {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node && "id" in node) {
        const sceneNode = node as SceneNode;
        figma.currentPage.selection = [sceneNode];
        figma.viewport.scrollAndZoomIntoView([sceneNode]);
      }
    }
  }
);
