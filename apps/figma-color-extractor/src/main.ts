interface ColorInfo {
  name: string;
  hex: string;
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

function paintToColor(paint: Paint): ColorInfo | null {
  if (paint.type === "SOLID" && paint.color) {
    const { r, g, b } = paint.color;
    const a = paint.opacity === undefined ? 1 : paint.opacity;
    return {
      a,
      b,
      g,
      hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
      name: "Solid",
      r,
    };
  }
  return null;
}

function extractPaints(
  paints: readonly Paint[],
  nodeId: string,
  nodeName: string,
  property: string
): ExtractedColor[] {
  const results: ExtractedColor[] = [];
  for (const paint of paints) {
    const color = paintToColor(paint);
    if (color) {
      results.push({ ...color, nodeId, nodeName, property });
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

function extractFills(
  node: SceneNode,
  property: string,
  info: { nodeId: string; nodeName: string }
): ExtractedColor[] {
  const fills = getFills(node);
  if (fills) {
    return extractPaints(fills, info.nodeId, info.nodeName, property);
  }
  return [];
}

function extractStrokes(
  node: SceneNode,
  info: { nodeId: string; nodeName: string }
): ExtractedColor[] {
  const strokes = getStrokes(node);
  if (strokes) {
    return extractPaints(strokes, info.nodeId, info.nodeName, "stroke");
  }
  return [];
}

function extractFromNode(node: SceneNode): ExtractedColor[] {
  const info = { nodeId: node.id, nodeName: node.name };
  const results = [
    ...extractFills(node, "fill", info),
    ...extractStrokes(node, info),
  ];

  if (node.type === "TEXT") {
    results.push(...extractFills(node, "text-color", info));
  }

  return results;
}

function walkNode(node: SceneNode): ExtractedColor[] {
  const results = [...extractFromNode(node)];

  if ("children" in node) {
    for (const child of (node as ChildrenMixin).children) {
      results.push(...walkNode(child));
    }
  }

  return results;
}

figma.showUI(__html__, { height: 480, width: 320 });

figma.ui.on("message", (msg: { type: string }) => {
  if (msg.type === "extract-colors") {
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
      colors.push(...walkNode(node));
    }

    figma.ui.postMessage({ colors, error: null, type: "colors" });
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
});
