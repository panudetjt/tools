function sendSelectionInfo() {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) {
    figma.ui.postMessage({
      count: 0,
      name: "",
      nodeType: "",
      type: "selection-info",
    });
    return;
  }
  const [first] = sel;
  if (!first) return;
  figma.ui.postMessage({
    count: sel.length,
    name: first.name,
    nodeType: first.type,
    type: "selection-info",
  });
}

function shouldReplaceColor(value: string): boolean {
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed === "none" ||
    trimmed === "currentColor" ||
    trimmed === "inherit"
  ) {
    return false;
  }
  return trimmed.indexOf("url(") !== 0;
}

function replaceColorsWithCurrent(svg: string): string {
  const attrPattern = /\b(fill|stroke|stop-color)\s*=\s*"([^"]*)"/g;
  const result = svg.replaceAll(
    attrPattern,
    function replaceAttr(_match, attrName, value) {
      const trimmed = value.trim();
      if (shouldReplaceColor(trimmed)) {
        return `${attrName}="currentColor"`;
      }
      return _match;
    }
  );

  const stylePattern = /\bstyle\s*=\s*"([^"]*)"/g;
  return result.replaceAll(
    stylePattern,
    function replaceStyle(_match, styleContent) {
      const newStyle = styleContent.replaceAll(
        /\b(fill|stroke|stop-color)\s*:\s*([^;}"']+)/g,
        function replaceStyleProp(
          propMatch: string,
          prop: string,
          value: string
        ) {
          const trimmed = value.trim();
          if (shouldReplaceColor(trimmed)) {
            return `${prop}: currentColor`;
          }
          return propMatch;
        }
      );
      return `style="${newStyle}"`;
    }
  );
}

function sanitizeFileName(name: string): string {
  return name.replaceAll(/[^a-zA-Z0-9_-]/g, "_").replaceAll(/_+/g, "_");
}

async function exportSvg(useCurrentColor: boolean) {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) {
    figma.ui.postMessage({
      error: "No node selected",
      type: "export-error",
    });
    return;
  }

  const items = [];
  for (const node of sel) {
    if (!node) continue;
    try {
      let svgString = await node.exportAsync({ format: "SVG_STRING" });
      if (useCurrentColor) {
        svgString = replaceColorsWithCurrent(svgString);
      }
      items.push({
        fileName: sanitizeFileName(node.name),
        name: node.name,
        svg: svgString,
      });
    } catch {
      // skip nodes that fail to export
    }
  }

  if (items.length === 0) {
    figma.ui.postMessage({
      error: "Export failed",
      type: "export-error",
    });
    return;
  }

  figma.ui.postMessage({
    items: items,
    type: "svg-result",
  });
}

figma.showUI(__html__, { height: 480, themeColors: true, width: 320 });

figma.on("selectionchange", sendSelectionInfo);
sendSelectionInfo();

figma.ui.on("message", (msg: { type: string; useCurrentColor?: boolean }) => {
  if (msg.type === "export-svg") {
    void exportSvg(!!msg.useCurrentColor);
  }
  if (msg.type === "cancel") {
    figma.closePlugin();
  }
});
