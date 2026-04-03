import { createEffect, createSignal, For, Show } from "solid-js";

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

export default function App() {
  const [colors, setColors] = createSignal<ExtractedColor[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [copiedId, setCopiedId] = createSignal<string | null>(null);
  const [filterProperty, setFilterProperty] = createSignal("all");
  const [hideDuplicates, setHideDuplicates] = createSignal(true);
  const [activeFormats, setActiveFormats] = createSignal<
    Record<FormatKey, boolean>
  >({
    hex: true,
    hsl: false,
    oklch: false,
    rgb: true,
  });

  function filteredColors(): ExtractedColor[] {
    let result = colors();
    if (filterProperty() !== "all") {
      result = result.filter((c) => c.property === filterProperty());
    }
    if (hideDuplicates()) {
      const seen = new Set<string>();
      result = result.filter((c) => {
        if (seen.has(c.swatch)) return false;
        seen.add(c.swatch);
        return true;
      });
    }
    return result;
  }

  function copyValue(value: string, id: string) {
    copyToClipboard(value);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  }

  function extract() {
    postMessage("extract-colors");
  }

  function cancel() {
    postMessage("cancel");
  }

  function copyAll() {
    const key = activeFormats().hex ? "hex" : "rgb";
    const text = filteredColors()
      .map((c) => c.formats[key])
      .join("\n");
    copyToClipboard(text);
  }

  function addToCanvas() {
    const data = filteredColors().map((c) => ({
      formats: { ...c.formats },
      nodeId: c.nodeId,
      nodeName: c.nodeName,
      property: c.property,
      swatch: c.swatch,
      variableName: c.variableName,
    }));
    postMessage("add-to-canvas", { colors: data });
  }

  function toggleFormat(fmt: FormatKey) {
    setActiveFormats((prev) => ({ ...prev, [fmt]: !prev[fmt] }));
  }

  window.addEventListener("message", (event: MessageEvent) => {
    const msg = event.data.pluginMessage;
    if (msg.type === "colors") {
      setColors(msg.colors ?? []);
      setError(msg.error ?? null);
    }
  });

  createEffect(() => {
    postMessage("extract-colors");
  });

  return (
    <div class="flex h-full flex-col bg-white">
      {/* Header */}
      <div class="border-b border-gray-200 px-4 py-3">
        <h2 class="text-sm font-semibold text-gray-900">Color Extractor</h2>
        <p class="mt-0.5 text-xs text-gray-500">
          {colors().length} color{colors().length === 1 ? "" : "s"} found
        </p>
      </div>

      {/* Filter + Actions */}
      <Show when={colors().length > 0}>
        <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
          <select
            value={filterProperty()}
            onChange={(e) => setFilterProperty(e.currentTarget.value)}
            class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
          >
            <option value="all">All</option>
            <option value="fill">Fills</option>
            <option value="stroke">Strokes</option>
            <option value="text-color">Text</option>
          </select>

          <button
            class={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              hideDuplicates()
                ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setHideDuplicates((v) => !v)}
            title="Hide duplicate colors"
          >
            Unique
          </button>

          <For each={FORMAT_KEYS}>
            {(fmt) => (
              <button
                class={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  activeFormats()[fmt]
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => toggleFormat(fmt)}
              >
                {fmt.toUpperCase()}
              </button>
            )}
          </For>

          <button
            onClick={addToCanvas}
            class="ml-auto rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
          >
            Add to Canvas
          </button>

          <button
            onClick={copyAll}
            class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            Copy All
          </button>

          <button
            onClick={extract}
            class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </Show>

      {/* Error */}
      <Show when={error()}>
        <div class="px-4 py-6 text-center">
          <p class="text-xs text-gray-500">{error()}</p>
          <p class="mt-1 text-xs text-gray-400">
            Select elements in Figma first
          </p>
        </div>
      </Show>

      {/* Color List */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={filteredColors().length > 0}
          fallback={
            <Show when={!error()} fallback={null}>
              <div class="px-4 py-6 text-center">
                <p class="text-xs text-gray-400">No colors to display</p>
              </div>
            </Show>
          }
        >
          <For each={filteredColors()}>
            {(color) => {
              const title = () => color.variableName || "Unlinked color";
              return (
                <div class="border-b border-gray-50 px-4 py-2.5">
                  {/* Header row */}
                  <div class="flex items-center gap-3">
                    <div
                      class="h-8 w-8 shrink-0 rounded-md border border-gray-200"
                      style={{ "background-color": color.swatch }}
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-gray-900">
                        {title()}
                      </p>
                      <p class="truncate text-xs text-gray-400">
                        {color.nodeName}
                      </p>
                    </div>
                    <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {color.property === "text-color"
                        ? "text"
                        : color.property}
                    </span>
                  </div>

                  {/* Format variants */}
                  <div class="mt-1 space-y-0.5 pl-11">
                    <For each={FORMAT_KEYS}>
                      {(fmt) => (
                        <Show when={activeFormats()[fmt]}>
                          <button
                            class="flex w-full items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-gray-600 transition-colors hover:bg-gray-50"
                            onClick={() =>
                              copyValue(
                                color.formats[fmt],
                                `${color.nodeId}${color.property}${fmt}`
                              )
                            }
                            title="Click to copy"
                          >
                            <span class="w-10 shrink-0 text-gray-400">
                              {fmt.toUpperCase()}
                            </span>
                            <span class="truncate">{color.formats[fmt]}</span>
                            <Show
                              when={
                                copiedId() ===
                                `${color.nodeId}${color.property}${fmt}`
                              }
                            >
                              <span class="shrink-0 text-green-600">
                                Copied!
                              </span>
                            </Show>
                          </button>
                        </Show>
                      )}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </Show>
      </div>

      {/* Footer */}
      <div class="border-t border-gray-200 px-4 py-2">
        <button
          onClick={cancel}
          class="w-full rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
