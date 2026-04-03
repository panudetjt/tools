import { useStore } from "@nanostores/preact";
import { atom, computed } from "nanostores";
import { memo } from "preact/compat";

import { copyToClipboard, exportAll, formatBulk } from "./color-export";
import type { CaseStyle, LanguageFormat } from "./color-export";

const LANGUAGE_LABELS: Record<LanguageFormat, string> = {
  css: "CSS",
  cssVariable: "CSS Var",
  javascript: "JS",
  json: "JSON",
  sass: "Sass",
  typescript: "TS",
};

const LANGUAGES: LanguageFormat[] = [
  "json",
  "css",
  "cssVariable",
  "sass",
  "typescript",
  "javascript",
];

const CASE_STYLES: CaseStyle[] = [
  "camel",
  "constant",
  "header",
  "pascal",
  "param",
  "snake",
];

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

const LANG_EXTENSIONS: Record<LanguageFormat, string> = {
  css: "css",
  cssVariable: "css",
  javascript: "js",
  json: "json",
  sass: "scss",
  typescript: "ts",
};

function postMessage(type: string, data?: Record<string, unknown>) {
  parent.postMessage({ pluginMessage: { type, ...data } }, "*");
}

// --- Stores ---

const $colors = atom<ExtractedColor[]>([]);
const $error = atom<string | null>(null);
const $copiedId = atom<string | null>(null);
const $exportLang = atom<LanguageFormat>("cssVariable");
const $selectedIds = atom<Set<string>>(new Set());
const $filterProperty = atom("all");
const $hideDuplicates = atom(true);
const $mergeAlpha = atom(true);

function stripAlpha(hex: string): string {
  return hex.replace(/#([0-9a-f]{6})[0-9a-f]{2}/i, "#$1");
}
const $activeFormats = atom<Record<FormatKey, boolean>>({
  hex: true,
  hsl: false,
  oklch: false,
  rgb: true,
});

type ExportTarget =
  | { type: "bulk" }
  | { color: ExtractedColor; title: string; type: "single" };

const $exportModal = atom<ExportTarget | null>(null);
const $exportFormat = atom<FormatKey>("hex");

const $filteredColors = computed([$colors, $filterProperty], (colors, prop) => {
  if (prop === "all") return colors;
  return colors.filter((c) => c.property === prop);
});

const $displayColors = computed(
  [$filteredColors, $hideDuplicates, $mergeAlpha],
  (list, hide, merge) => {
    if (!hide) return list;
    const seen = new Set<string>();
    return list.filter((c) => {
      const key = merge ? stripAlpha(c.swatch) : c.swatch;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
);

const $selectedColors = computed(
  [$selectedIds, $displayColors],
  (ids, colors) => colors.filter((c) => ids.has(`${c.nodeId}-${c.property}`))
);

function copyValue(value: string, id: string) {
  copyToClipboard(value);
  $copiedId.set(id);
  setTimeout(() => {
    $copiedId.set(null);
  }, 1500);
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toggleFormat(fmt: FormatKey) {
  $activeFormats.set({
    ...$activeFormats.get(),
    [fmt]: !$activeFormats.get()[fmt],
  });
}

function toggleSelection(cardId: string) {
  const next = new Set($selectedIds.get());
  if (next.has(cardId)) next.delete(cardId);
  else next.add(cardId);
  $selectedIds.set(next);
}

function clearSelection() {
  $selectedIds.set(new Set());
}

function toggleSelectAll() {
  const display = $displayColors.get();
  const current = $selectedIds.get();
  const allIds = display.map((c) => `${c.nodeId}-${c.property}`);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => current.has(id));
  $selectedIds.set(allSelected ? new Set() : new Set(allIds));
}

// Listen for messages from main thread
window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (msg.type === "colors") {
    const list: ExtractedColor[] = msg.colors ?? [];
    $colors.set(list);
    $error.set(msg.error ?? null);
    $selectedIds.set(new Set(list.map((c) => `${c.nodeId}-${c.property}`)));
  }
});
postMessage("extract-colors");

// --- Icons ---

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="white"
      strokeWidth="2"
    >
      <path d="M2 5l2 2 4-5" />
    </svg>
  );
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function SwatchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.5" cy="6.5" r="2.5" />
      <path d="M17.2 21H7.8a2 2 0 0 1-1.4-3.4l4.7-4.7a2 2 0 0 1 2.8 0l4.7 4.7a2 2 0 0 1-1.4 3.4z" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto text-gray-300"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// --- Shared components ---

function FormatRow({
  label,
  value,
  copyId,
  copiedId,
  onDownload,
}: {
  label: string;
  value: string;
  copyId: string;
  copiedId: string | null;
  onDownload?: () => void;
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-1 rounded-md px-2 py-1.5 font-mono text-[11px] text-gray-500 transition-colors duration-150 hover:bg-indigo-50 hover:text-gray-700">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer"
        onClick={() => copyValue(value, copyId)}
        title={value}
      >
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="truncate">{value}</span>
        {copiedId === copyId ? (
          <span className="shrink-0 text-[10px] font-medium text-emerald-600">
            Copied
          </span>
        ) : (
          <span className="shrink-0 text-gray-500">
            <CopyIcon size={11} />
          </span>
        )}
      </button>
      {onDownload && (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-gray-500 transition-colors duration-150 hover:text-indigo-600 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title="Download"
        >
          <DownloadIcon />
        </button>
      )}
    </div>
  );
}

// --- Hoisted static JSX ---

const TOOLBAR_DIVIDER = <div className="mx-0.5 h-4 w-px bg-gray-200" />;

// --- Extracted Components ---

const ColorCard = memo(function ColorCard({
  color,
}: {
  color: ExtractedColor;
}) {
  const copiedId = useStore($copiedId);
  const activeFormats = useStore($activeFormats);
  const selectedIds = useStore($selectedIds);

  const title = color.variableName || color.nodeName || "Unlinked";
  const cardId = `${color.nodeId}-${color.property}`;
  const isSelected = selectedIds.has(cardId);

  return (
    <div
      className={`mb-1.5 rounded-lg border bg-white transition-colors duration-150 ${
        isSelected
          ? "border-indigo-200 ring-1 ring-indigo-100"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          type="button"
          onClick={() => toggleSelection(cardId)}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors duration-150 cursor-pointer ${
            isSelected
              ? "bg-indigo-600"
              : "border border-gray-300 hover:border-gray-400"
          }`}
        >
          {isSelected && <CheckIcon />}
        </button>

        <div
          className="h-7 w-7 shrink-0 rounded-md border border-gray-100 shadow-sm"
          style={{ backgroundColor: color.swatch }}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-gray-800">
            {title}
          </p>
          <p className="truncate text-[10px] text-gray-400">
            {color.property === "text-color" ? "text" : color.property}
          </p>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-gray-300 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-500 cursor-pointer"
          onClick={() =>
            $exportModal.set({
              color,
              title,
              type: "single",
            })
          }
          title="Export this color"
        >
          <CopyIcon size={13} />
        </button>
      </div>

      <div className="border-t border-gray-50 px-2.5 py-1">
        {FORMAT_KEYS.map((fmt) =>
          activeFormats[fmt] ? (
            <FormatRow
              key={fmt}
              label={fmt}
              value={color.formats[fmt]}
              copyId={`${color.nodeId}${color.property}${fmt}`}
              copiedId={copiedId}
            />
          ) : null
        )}
      </div>
    </div>
  );
});

const Toolbar = memo(function Toolbar() {
  const colors = useStore($colors);
  const filterProperty = useStore($filterProperty);
  const hideDuplicates = useStore($hideDuplicates);
  const mergeAlpha = useStore($mergeAlpha);
  const activeFormats = useStore($activeFormats);
  const displayColors = useStore($displayColors);
  const selectedIds = useStore($selectedIds);
  const selectedColors = useStore($selectedColors);

  const allSelected =
    displayColors.length > 0 &&
    displayColors.every((c) => selectedIds.has(`${c.nodeId}-${c.property}`));

  if (colors.length === 0) return null;

  function handleCanvas() {
    const data: ExtractedColor[] = [];
    for (const c of displayColors) {
      if (!selectedIds.has(`${c.nodeId}-${c.property}`)) continue;
      data.push({
        formats: { ...c.formats },
        nodeId: c.nodeId,
        nodeName: c.nodeName,
        property: c.property,
        swatch: c.swatch,
        variableName: c.variableName,
      });
    }
    postMessage("add-to-canvas", { colors: data });
  }

  function handleCopyAll() {
    const key = activeFormats.hex ? "hex" : "rgb";
    const text = displayColors.map((c) => c.formats[key]).join("\n");
    copyToClipboard(text);
  }

  return (
    <div className="border-b border-gray-100 bg-white px-3 py-2">
      {/* Row 1: Filters + formats */}
      <div className="flex items-center gap-1.5">
        <select
          value={filterProperty}
          onChange={(e) => $filterProperty.set(e.currentTarget.value)}
          className="h-6 rounded-md border border-gray-200 bg-white px-2 text-[11px] text-gray-600 transition-colors duration-150 hover:border-gray-300 focus:border-indigo-400 focus:outline-none cursor-pointer"
        >
          <option value="all">All</option>
          <option value="fill">Fills</option>
          <option value="stroke">Strokes</option>
          <option value="text-color">Text</option>
        </select>

        <button
          type="button"
          className={`h-6 rounded-md px-2 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            hideDuplicates
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          onClick={() => $hideDuplicates.set(!hideDuplicates)}
          title="Hide duplicate colors"
        >
          Unique
        </button>

        {hideDuplicates && (
          <button
            type="button"
            className={`h-6 rounded-md px-2 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
              mergeAlpha
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
            onClick={() => $mergeAlpha.set(!mergeAlpha)}
            title="Merge colors that differ only in opacity"
          >
            Merge Alpha
          </button>
        )}

        {TOOLBAR_DIVIDER}

        <button
          type="button"
          onClick={() => postMessage("extract-colors")}
          className="h-6 rounded-md bg-gray-900 px-2 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-gray-700 cursor-pointer"
          title="Refresh colors"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Row 2: Format */}
      <div className="mt-1.5 flex items-center gap-1.5">
        {FORMAT_KEYS.map((fmt) => (
          <button
            key={fmt}
            type="button"
            className={`h-6 rounded-md px-1.5 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
              activeFormats[fmt]
                ? "bg-gray-900 text-white"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
            onClick={() => toggleFormat(fmt)}
          >
            {fmt.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Row 3: Selection + actions */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          className={`h-6 rounded-md px-2 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            allSelected
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          onClick={toggleSelectAll}
        >
          {allSelected ? "Deselect" : "Select All"}
        </button>

        {selectedColors.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleCanvas}
              className="h-6 rounded-md bg-indigo-600 px-2 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-indigo-500 cursor-pointer"
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => $exportModal.set({ type: "bulk" })}
              className="h-6 rounded-md bg-indigo-600 px-2 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-indigo-500 cursor-pointer"
            >
              Export
            </button>
          </>
        )}

        {selectedColors.length === 0 && (
          <button
            type="button"
            onClick={handleCopyAll}
            className="h-6 rounded-md bg-gray-100 px-2 text-[11px] font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-200 cursor-pointer"
          >
            Copy All
          </button>
        )}
      </div>
    </div>
  );
});

const SelectionBar = memo(function SelectionBar() {
  const selectedColors = useStore($selectedColors);

  if (selectedColors.length === 0) return null;

  return (
    <div className="border-t border-indigo-200 bg-indigo-50/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-indigo-700">
          {selectedColors.length} selected
        </span>
        <div className="flex-1" />
        <button
          type="button"
          className="text-[11px] text-indigo-400 transition-colors duration-150 hover:text-indigo-600 cursor-pointer"
          onClick={clearSelection}
        >
          Clear
        </button>
      </div>
    </div>
  );
});

// --- Export Modal ---

function ExportModal({ target }: { target: NonNullable<ExportTarget> }) {
  const exportLang = useStore($exportLang);
  const copiedId = useStore($copiedId);
  const selectedColors = useStore($selectedColors);
  const exportFormat = useStore($exportFormat);

  const isSingle = target.type === "single";
  const count = isSingle ? 1 : selectedColors.length;
  const title = isSingle ? target.title : "";
  const swatch = isSingle ? target.color.swatch : "";

  const rows = CASE_STYLES.map((casing) => {
    let value: string;
    let copyId: string;
    if (isSingle) {
      const data = exportAll(target.color.formats[exportFormat], title);
      value = data[exportLang][casing];
      copyId = `modal-${exportLang}-${casing}`;
    } else {
      value = formatBulk(
        selectedColors.map((c) => ({
          color: c.formats[exportFormat],
          label: c.variableName || c.nodeName || "Unlinked",
        })),
        exportLang,
        casing
      );
      copyId = `modal-bulk-${exportLang}-${casing}`;
    }
    return { casing, copyId, value };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity"
      onClick={() => $exportModal.set(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") $exportModal.set(null);
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-76 rounded-t-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") $exportModal.set(null);
        }}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            {isSingle ? (
              <>
                <div
                  className="h-5 w-5 rounded border border-gray-100 shadow-sm"
                  style={{ backgroundColor: swatch }}
                />
                <h3 className="text-[12px] font-semibold text-gray-900">
                  {title}
                </h3>
              </>
            ) : (
              <h3 className="text-[12px] font-semibold text-gray-900">
                {count} color{count === 1 ? "" : "s"}
              </h3>
            )}
          </div>
          <button
            type="button"
            onClick={() => $exportModal.set(null)}
            className="rounded-md p-1 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Bulk swatches */}
        {!isSingle && (
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2">
            {selectedColors.map((c) => {
              const cid = `${c.nodeId}-${c.property}`;
              return (
                <div
                  key={cid}
                  className="h-5 w-5 shrink-0 rounded border border-gray-100 shadow-sm"
                  style={{ backgroundColor: c.swatch }}
                  title={c.variableName || c.nodeName || "Unlinked"}
                />
              );
            })}
          </div>
        )}

        {/* Color format picker */}
        <div className="flex items-center gap-1 border-b border-gray-50 px-4 py-1.5">
          <span className="mr-1 text-[10px] text-gray-400">Format:</span>
          {FORMAT_KEYS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-150 cursor-pointer ${
                exportFormat === fmt
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              onClick={() => $exportFormat.set(fmt)}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Language tabs */}
        <div className="flex flex-wrap gap-1 border-b border-gray-50 px-4 py-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors duration-150 cursor-pointer ${
                exportLang === lang
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              onClick={() => $exportLang.set(lang)}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>

        {/* Export rows */}
        <div className="max-h-70 overflow-y-auto px-2 py-1.5">
          {rows.map((r) => (
            <FormatRow
              key={r.casing}
              label={r.casing}
              value={r.value}
              copyId={r.copyId}
              copiedId={copiedId}
              onDownload={() => {
                const ext = LANG_EXTENSIONS[exportLang];
                const name = isSingle ? title : "colors";
                downloadFile(r.value, `${name}.${ext}`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const colors = useStore($colors);
  const error = useStore($error);
  const displayColors = useStore($displayColors);
  const exportModal = useStore($exportModal);

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] text-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <SwatchIcon />
          <h2 className="text-[13px] font-semibold text-gray-900">
            Color Extractor
          </h2>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400">
          {colors.length} color{colors.length === 1 ? "" : "s"} extracted
        </p>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center px-4 py-10">
          <EmptyIcon />
          <p className="mt-3 text-[11px] text-gray-400">{error}</p>
          <p className="mt-1 text-[11px] text-gray-300">
            Select elements in Figma first
          </p>
        </div>
      )}

      {/* Color List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {displayColors.length > 0
          ? displayColors.map((color) => (
              <ColorCard
                key={`${color.nodeId}-${color.property}`}
                color={color}
              />
            ))
          : !error && (
              <div className="flex flex-col items-center justify-center py-10">
                <EmptyIcon />
                <p className="mt-3 text-[11px] text-gray-400">
                  No colors to display
                </p>
              </div>
            )}
      </div>

      {/* Selection bar */}
      <SelectionBar />

      {/* Export Modal */}
      {exportModal && <ExportModal target={exportModal} />}
    </div>
  );
}
