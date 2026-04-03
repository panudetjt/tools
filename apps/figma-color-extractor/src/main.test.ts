import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const MIXED = Symbol("mixed");

let mockVariables: Record<string, { name: string }> = {};

function createMockFigma() {
  return {
    closePlugin: mock(() => {}),
    createFrame: mock(() => ({
      appendChild: mock(() => {}),
      cornerRadius: 0,
      fills: [],
      name: "",
      resize: mock(() => {}),
    })),
    createRectangle: mock(() => ({
      cornerRadius: 0,
      fills: [],
      name: "",
      resize: mock(() => {}),
      x: 0,
      y: 0,
    })),
    createText: mock(() => ({
      characters: "",
      fills: [],
      fontName: {},
      fontSize: 0,
      name: "",
      x: 0,
      y: 0,
    })),
    currentPage: { selection: [] as SceneNode[] },
    loadFontAsync: mock(async () => {}),
    mixed: MIXED,
    on: mock(() => {}),
    showUI: mock(() => {}),
    ui: {
      on: mock(() => {}),
      onmessage: null as ((msg: unknown) => void) | null,
      postMessage: mock(() => {}),
    },
    variables: {
      getVariableByIdAsync: mock((id: string) => mockVariables[id] || null),
    },
    viewport: { scrollAndZoomIntoView: mock(() => {}) },
  };
}

beforeEach(() => {
  mockVariables = {};
  // @ts-expect-error -- Figma global mock
  globalThis.figma = createMockFigma();
  // @ts-expect-error -- __html__ used in main.ts
  globalThis.__html__ = "<html></html>";
});

afterEach(() => {
  // @ts-expect-error -- cleanup
  delete globalThis.figma;
  // @ts-expect-error -- cleanup
  delete globalThis.__html__;
});

function makeNode(
  overrides: Partial<SceneNode> & {
    children?: SceneNode[];
    fills?: Paint[] | typeof MIXED;
    strokes?: Paint[];
  }
): SceneNode {
  const node: Record<string, unknown> = {
    boundVariables: undefined,
    id: "node-1",
    name: "TestNode",
    type: "RECTANGLE",
  };
  if (overrides.fills !== undefined) node.fills = overrides.fills;
  if (overrides.strokes !== undefined) node.strokes = overrides.strokes;
  if (overrides.boundVariables !== undefined) {
    node.boundVariables = overrides.boundVariables;
  }
  if (overrides.children !== undefined) node.children = overrides.children;
  if (overrides.id !== undefined) node.id = overrides.id;
  if (overrides.name !== undefined) node.name = overrides.name;
  if (overrides.type !== undefined) node.type = overrides.type;
  return node as unknown as SceneNode;
}

function getFillsFromNode(node: SceneNode): readonly Paint[] {
  const { fills } = node as unknown as { fills?: readonly Paint[] };
  if (!fills) throw new Error("Test node must have fills");
  return fills;
}

describe("paintToColor via extractPaints", () => {
  it("extracts solid fill colors from a node", async () => {
    const { extractPaints } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.formats.hex).toBe("#ff0000");
    expect(results[0]!.property).toBe("fill");
    expect(results[0]!.nodeName).toBe("TestNode");
    expect(results[0]!.nodeId).toBe("node-1");
  });

  it("skips non-SOLID paints without stops", async () => {
    const { extractPaints } = await import("./main");
    const node = makeNode({
      fills: [{ type: "GRADIENT_LINEAR" } as Paint],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results).toHaveLength(0);
  });

  it("extracts gradient stop colors and gradient CSS entry", async () => {
    const { extractPaints } = await import("./main");
    const node = makeNode({
      fills: [
        {
          gradientHandlePositions: [],
          gradientStops: [
            { color: { a: 1, b: 0, g: 0, r: 1 }, position: 0 },
            { color: { a: 1, b: 1, g: 0, r: 0 }, position: 1 },
          ],
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0],
          ],
          opacity: 1,
          type: "GRADIENT_LINEAR",
        } as Paint,
      ],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results).toHaveLength(3);
    expect(results[0]!.formats.hex).toBe("#ff0000");
    expect(results[1]!.formats.hex).toBe("#0000ff");
    expect(results[2]!.gradient).toContain("linear-gradient");
    expect(results[2]!.formats.hex).toBe("");
  });

  it("extracts multiple paints from a single node", async () => {
    const { extractPaints } = await import("./main");
    const node = makeNode({
      fills: [
        { color: { b: 0, g: 0, r: 1 }, type: "SOLID" },
        { color: { b: 0, g: 1, r: 0 }, type: "SOLID" },
      ],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.formats.hex).toBe("#ff0000");
    expect(results[1]!.formats.hex).toBe("#00ff00");
  });

  it("resolves variable name when bound", async () => {
    const { extractPaints } = await import("./main");
    mockVariables["var-1"] = { name: "colors/primary" };
    const node = makeNode({
      boundVariables: {
        fills: { 0: { id: "var-1", type: "VARIABLE" } },
      } as unknown as SceneNode["boundVariables"],
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.variableName).toBe("colors/primary");
  });

  it("returns empty variableName when not bound", async () => {
    const { extractPaints } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results[0]!.variableName).toBe("");
  });

  it("handles semi-transparent fills", async () => {
    const { extractPaints } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, opacity: 0.5, type: "SOLID" }],
    });
    const results = await extractPaints(
      node,
      getFillsFromNode(node),
      "fill",
      "fills"
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.formats.hex).toBe("#ff000080");
  });
});

describe("getFills", () => {
  it("returns fills when present", async () => {
    const { getFills } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 1, g: 1, r: 1 }, type: "SOLID" }],
    });
    expect(getFills(node)).toHaveLength(1);
  });

  it("returns undefined for mixed fills", async () => {
    const { getFills } = await import("./main");
    const node = makeNode({ fills: MIXED });
    expect(getFills(node)).toBeUndefined();
  });
});

describe("getStrokes", () => {
  it("returns strokes when present", async () => {
    const { getStrokes } = await import("./main");
    const node = makeNode({
      strokes: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
    });
    expect(getStrokes(node)).toHaveLength(1);
  });

  it("returns undefined when no strokes", async () => {
    const { getStrokes } = await import("./main");
    const node = makeNode({});
    expect(getStrokes(node)).toBeUndefined();
  });
});

describe("extractFills", () => {
  it("extracts from node with fills", async () => {
    const { extractFills } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
    });
    const results = await extractFills(node, "fill");
    expect(results).toHaveLength(1);
    expect(results[0]!.property).toBe("fill");
  });

  it("returns empty array for node without fills", async () => {
    const { extractFills } = await import("./main");
    const node = makeNode({});
    const results = await extractFills(node, "fill");
    expect(results).toHaveLength(0);
  });
});

describe("extractStrokes", () => {
  it("extracts from node with strokes", async () => {
    const { extractStrokes } = await import("./main");
    const node = makeNode({
      strokes: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
    });
    const results = await extractStrokes(node);
    expect(results).toHaveLength(1);
    expect(results[0]!.property).toBe("stroke");
  });

  it("returns empty array for node without strokes", async () => {
    const { extractStrokes } = await import("./main");
    const node = makeNode({});
    const results = await extractStrokes(node);
    expect(results).toHaveLength(0);
  });
});

describe("extractFromNode", () => {
  it("combines fills and strokes", async () => {
    const { extractFromNode } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
      strokes: [{ color: { b: 0, g: 1, r: 0 }, type: "SOLID" }],
    });
    const results = await extractFromNode(node);
    expect(results).toHaveLength(2);
    expect(results[0]!.property).toBe("fill");
    expect(results[1]!.property).toBe("stroke");
  });

  it("adds text-color property for TEXT nodes", async () => {
    const { extractFromNode } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
      type: "TEXT",
    });
    const results = await extractFromNode(node);
    expect(results).toHaveLength(2);
    expect(results[0]!.property).toBe("fill");
    expect(results[1]!.property).toBe("text-color");
  });

  it("does not add text-color for non-TEXT nodes", async () => {
    const { extractFromNode } = await import("./main");
    const node = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
      type: "RECTANGLE",
    });
    const results = await extractFromNode(node);
    expect(results).toHaveLength(1);
    expect(results[0]!.property).toBe("fill");
  });
});

describe("walkNode", () => {
  it("walks children recursively", async () => {
    const { walkNode } = await import("./main");
    const child = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
      id: "child-1",
      name: "Child",
    });
    const parent = makeNode({
      children: [child],
      fills: [{ color: { b: 0, g: 1, r: 0 }, type: "SOLID" }],
      id: "parent-1",
      name: "Parent",
    });
    const results = await walkNode(parent);
    expect(results).toHaveLength(2);
    expect(results[0]!.nodeName).toBe("Parent");
    expect(results[1]!.nodeName).toBe("Child");
  });

  it("handles deeply nested children", async () => {
    const { walkNode } = await import("./main");
    const leaf = makeNode({
      fills: [{ color: { b: 0, g: 0, r: 1 }, type: "SOLID" }],
      id: "leaf",
      name: "Leaf",
    });
    const mid = makeNode({
      children: [leaf],
      id: "mid",
      name: "Mid",
    });
    const root = makeNode({
      children: [mid],
      id: "root",
      name: "Root",
    });
    const results = await walkNode(root);
    expect(results).toHaveLength(1);
    expect(results[0]!.nodeName).toBe("Leaf");
  });

  it("returns empty for node without fills or strokes", async () => {
    const { walkNode } = await import("./main");
    const node = makeNode({ id: "empty", name: "Empty" });
    const results = await walkNode(node);
    expect(results).toHaveLength(0);
  });
});
