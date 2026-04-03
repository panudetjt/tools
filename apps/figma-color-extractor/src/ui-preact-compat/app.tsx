import { useState, useEffect, useCallback } from "react";

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

type FormatKey = keyof ColorFormats;

const FORMAT_KEYS: FormatKey[] = ["hex", "rgb", "hsl", "oklch"];

function postMessage(type: string, data?: Record<string, unknown>) {
  parent.postMessage({ pluginMessage: { type, ...data } }, "*");
}

function copyToClipboard(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.append(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

function getFilteredColors(
  colors: ExtractedColor[],
  filterProperty: string,
  hideDuplicates: boolean
) {
  let result = colors;
  if (filterProperty !== "all") {
    result = result.filter((c) => c.property === filterProperty);
  }
  if (hideDuplicates) {
    const seen = new Set<string>();
    result = result.filter((c) => {
      if (seen.has(c.swatch)) return false;
      seen.add(c.swatch);
      return true;
    });
  }
  return result;
}

export default function App() {
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterProperty, setFilterProperty] = useState("all");
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [activeFormats, setActiveFormats] = useState<
    Record<FormatKey, boolean>
  >({
    hex: true,
    hsl: false,
    oklch: false,
    rgb: true,
  });

  const filteredColors = getFilteredColors(
    colors,
    filterProperty,
    hideDuplicates
  );

  const copyValue = useCallback((value: string, id: string) => {
    copyToClipboard(value);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  }, []);

  const toggleFormat = useCallback((fmt: FormatKey) => {
    setActiveFormats((prev) => ({ ...prev, [fmt]: !prev[fmt] }));
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const msg = event.data.pluginMessage;
      if (msg.type === "colors") {
        setColors(msg.colors ?? []);
        setError(msg.error ?? null);
      }
    }
    window.addEventListener("message", handleMessage);
    postMessage("extract-colors");
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Color Extractor</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {colors.length} color{colors.length === 1 ? "" : "s"} found
        </p>
      </div>

      {/* Filter + Actions */}
      {colors.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.currentTarget.value)}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
          >
            <option value="all">All</option>
            <option value="fill">Fills</option>
            <option value="stroke">Strokes</option>
            <option value="text-color">Text</option>
          </select>

          <button
            type="button"
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              hideDuplicates
                ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setHideDuplicates((v) => !v)}
            title="Hide duplicate colors"
          >
            Unique
          </button>

          {FORMAT_KEYS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                activeFormats[fmt]
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => toggleFormat(fmt)}
            >
              {fmt.toUpperCase()}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              const data = filteredColors.map((c) => ({
                formats: { ...c.formats },
                nodeId: c.nodeId,
                nodeName: c.nodeName,
                property: c.property,
                swatch: c.swatch,
                variableName: c.variableName,
              }));
              postMessage("add-to-canvas", { colors: data });
            }}
            className="ml-auto rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
          >
            Add to Canvas
          </button>

          <button
            type="button"
            onClick={() => {
              const key = activeFormats.hex ? "hex" : "rgb";
              const text = filteredColors.map((c) => c.formats[key]).join("\n");
              copyToClipboard(text);
            }}
            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            Copy All
          </button>

          <button
            type="button"
            onClick={() => postMessage("extract-colors")}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-gray-500">{error}</p>
          <p className="mt-1 text-xs text-gray-400">
            Select elements in Figma first
          </p>
        </div>
      )}

      {/* Color List */}
      <div className="flex-1 overflow-y-auto">
        {filteredColors.length > 0
          ? filteredColors.map((color) => {
              const title = color.variableName || "Unlinked color";
              return (
                <div
                  key={`${color.nodeId}-${color.property}`}
                  className="border-b border-gray-50 px-4 py-2.5"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 shrink-0 rounded-md border border-gray-200"
                      style={{ backgroundColor: color.swatch }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900">
                        {title}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {color.nodeName}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {color.property === "text-color"
                        ? "text"
                        : color.property}
                    </span>
                  </div>

                  {/* Format variants */}
                  <div className="mt-1 space-y-0.5 pl-11">
                    {FORMAT_KEYS.map((fmt) =>
                      activeFormats[fmt] ? (
                        <button
                          key={fmt}
                          type="button"
                          className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-gray-600 transition-colors hover:bg-gray-50"
                          onClick={() =>
                            copyValue(
                              color.formats[fmt],
                              `${color.nodeId}${color.property}${fmt}`
                            )
                          }
                          title="Click to copy"
                        >
                          <span className="w-10 shrink-0 text-gray-400">
                            {fmt.toUpperCase()}
                          </span>
                          <span className="truncate">{color.formats[fmt]}</span>
                          {copiedId ===
                            `${color.nodeId}${color.property}${fmt}` && (
                            <span className="shrink-0 text-green-600">
                              Copied!
                            </span>
                          )}
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              );
            })
          : !error && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-gray-400">No colors to display</p>
              </div>
            )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2">
        <button
          type="button"
          onClick={() => postMessage("cancel")}
          className="w-full rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
