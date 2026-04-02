interface ColorInfo {
  hex: string;
  name: string;
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ExtractedColor extends ColorInfo {
  nodeId: string;
  nodeName: string;
  property: string;
}

function toHex(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");
}

async function resolveColorName(
  node: SceneNode,
  paint: Paint,
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

async function paintToColor(
  node: SceneNode,
  paint: Paint,
  index: number,
  field: "fills" | "strokes"
): Promise<ColorInfo | null> {
  if (paint.type === "SOLID" && paint.color) {
    const { r, g, b } = paint.color;
    const a = paint.opacity === undefined ? 1 : paint.opacity;
    const colorName = await resolveColorName(node, paint, index, field);
    return {
      a,
      b,
      g,
      hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
      name: colorName,
      r,
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
    const color = await paintToColor(node, paints[i], i, field);
    if (color) {
      const { name } = color;
      const nodeName = name ? `${node.name} / ${name}` : node.name;
      results.push({ ...color, nodeId: node.id, nodeName, property });
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
