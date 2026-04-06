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
  gradient?: string;
}

function getCardId(c: ExtractedColor): string {
  if (c.gradient) return `g-${c.nodeId}-${c.property}`;
  return `${c.nodeId}-${c.property}`;
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
const $gradientMode = atom(false);

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
const $modalClosing = atom(false);
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
      if (c.gradient) return true;
      const key = merge ? stripAlpha(c.swatch) : c.swatch;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
);

const $viewColors = computed(
  [$displayColors, $gradientMode],
  (colors, gradientMode) => {
    if (!gradientMode) return colors.filter((c) => !c.gradient);
    const gradientKeys = new Set(
      colors.filter((c) => c.gradient).map((c) => `${c.nodeId}-${c.property}`)
    );
    return colors.filter(
      (c) => c.gradient || !gradientKeys.has(`${c.nodeId}-${c.property}`)
    );
  }
);

const $selectedColors = computed([$selectedIds, $viewColors], (ids, colors) =>
  colors.filter((c) => ids.has(getCardId(c)))
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
  const display = $viewColors.get();
  const current = $selectedIds.get();
  const allIds = display.map((c) => getCardId(c));
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
    $selectedIds.set(new Set(list.map((c) => getCardId(c))));
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
      stroke="currentColor"
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
      className="mx-auto text-fg-muted"
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
    <div className="flex w-full min-w-0 items-center gap-1 rounded-md px-2 py-1.5 font-mono text-[11px] text-fg-dim transition-colors duration-150 hover:bg-surface-selected hover:text-fg">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer"
        onClick={() => copyValue(value, copyId)}
        title={value}
      >
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        <span className="truncate">{value}</span>
        {copiedId === copyId ? (
          <span className="shrink-0 text-[10px] font-medium text-fg-success">
            Copied
          </span>
        ) : (
          <span className="shrink-0 text-fg-dim">
            <CopyIcon size={11} />
          </span>
        )}
      </button>
      {onDownload && (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-fg-dim transition-colors duration-150 hover:text-fg-brand cursor-pointer"
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

const TOOLBAR_DIVIDER = <div className="mx-0.5 h-4 w-px bg-edge" />;

// --- Gradient Card ---

const GradientCard = memo(function GradientCard({
  color,
}: {
  color: ExtractedColor;
}) {
  const copiedId = useStore($copiedId);
  const selectedIds = useStore($selectedIds);

  const title = color.variableName || color.nodeName || "Unlinked";
  const cardId = getCardId(color);
  const isSelected = selectedIds.has(cardId);

  return (
    <div
      className={`mb-1.5 rounded-lg border bg-surface transition-colors duration-150 ${
        isSelected
          ? "border-edge-selected ring-1 ring-surface-selected"
          : "border-edge hover:border-edge"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          type="button"
          onClick={() => toggleSelection(cardId)}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors duration-150 cursor-pointer ${
            isSelected
              ? "bg-surface-brand text-fg-onbrand"
              : "border border-edge-strong hover:border-edge-strong"
          }`}
        >
          {isSelected && <CheckIcon />}
        </button>

        <button
          type="button"
          className="h-7 w-12 shrink-0 rounded-md border border-edge shadow-sm transition-transform duration-100 hover:scale-110 cursor-pointer"
          style={{ background: color.gradient }}
          onClick={() => postMessage("focus-node", { nodeId: color.nodeId })}
          title="Focus in canvas"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-fg">{title}</p>
          <p className="truncate text-[10px] text-fg-muted">gradient</p>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-fg-muted transition-colors duration-150 hover:bg-surface-selected hover:text-fg-brand cursor-pointer"
          onClick={() => copyValue(color.gradient ?? "", `${cardId}-export`)}
          title="Copy gradient CSS"
        >
          <CopyIcon size={13} />
        </button>
      </div>

      <div className="border-t border-edge px-2.5 py-1">
        <FormatRow
          label="css"
          value={color.gradient ?? ""}
          copyId={`${cardId}-css`}
          copiedId={copiedId}
        />
      </div>
    </div>
  );
});

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
  const cardId = getCardId(color);
  const isSelected = selectedIds.has(cardId);

  return (
    <div
      className={`mb-1.5 rounded-lg border bg-surface transition-colors duration-150 ${
        isSelected
          ? "border-edge-selected ring-1 ring-surface-selected"
          : "border-edge hover:border-edge"
      }`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          type="button"
          onClick={() => toggleSelection(cardId)}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors duration-150 cursor-pointer ${
            isSelected
              ? "bg-surface-brand text-fg-onbrand"
              : "border border-edge-strong hover:border-edge-strong"
          }`}
        >
          {isSelected && <CheckIcon />}
        </button>

        <button
          type="button"
          className="h-7 w-7 shrink-0 rounded-md border border-edge shadow-sm transition-transform duration-100 hover:scale-110 cursor-pointer"
          style={{ backgroundColor: color.swatch }}
          onClick={() => postMessage("focus-node", { nodeId: color.nodeId })}
          title="Focus in canvas"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-fg">{title}</p>
          <p className="truncate text-[10px] text-fg-muted">
            {color.property === "text-color" ? "text" : color.property}
          </p>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-fg-muted transition-colors duration-150 hover:bg-surface-selected hover:text-fg-brand cursor-pointer"
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

      <div className="border-t border-edge px-2.5 py-1">
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
  const gradientMode = useStore($gradientMode);
  const activeFormats = useStore($activeFormats);
  const viewColors = useStore($viewColors);
  const selectedIds = useStore($selectedIds);
  const selectedColors = useStore($selectedColors);

  const allSelected =
    viewColors.length > 0 &&
    viewColors.every((c) => selectedIds.has(getCardId(c)));

  if (colors.length === 0) return null;

  function handleCanvas() {
    const data: ExtractedColor[] = [];
    for (const c of viewColors) {
      if (c.gradient) continue;
      if (!selectedIds.has(getCardId(c))) continue;
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
    const text = viewColors
      .map((c) => c.gradient || c.formats[activeFormats.hex ? "hex" : "rgb"])
      .join("\n");
    copyToClipboard(text);
  }

  return (
    <div className="border-b border-edge bg-surface px-3 py-2">
      {/* Row 1: Filters + formats */}
      <div className="flex items-center gap-1.5">
        <select
          value={filterProperty}
          onChange={(e) => $filterProperty.set(e.currentTarget.value)}
          className="h-6 rounded-md border border-edge bg-surface px-2 text-[11px] text-fg-dim transition-colors duration-150 hover:border-edge-strong focus:border-edge-selected focus:outline-none cursor-pointer"
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
              ? "bg-surface-active text-fg-brand"
              : "text-fg-muted hover:bg-surface-dim hover:text-fg"
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
                ? "bg-surface-active text-fg-brand"
                : "text-fg-muted hover:bg-surface-dim hover:text-fg"
            }`}
            onClick={() => $mergeAlpha.set(!mergeAlpha)}
            title="Merge colors that differ only in opacity"
          >
            Merge Alpha
          </button>
        )}

        <button
          type="button"
          className={`h-6 rounded-md px-2 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            gradientMode
              ? "bg-surface-active text-fg-brand"
              : "text-fg-muted hover:bg-surface-dim hover:text-fg"
          }`}
          onClick={() => $gradientMode.set(!gradientMode)}
          title="Show CSS gradients"
        >
          Gradient
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
                ? "bg-surface-active text-fg-brand"
                : "text-fg-muted hover:bg-surface-dim hover:text-fg"
            }`}
            onClick={() => toggleFormat(fmt)}
          >
            {fmt.toUpperCase()}
          </button>
        ))}

        {TOOLBAR_DIVIDER}

        <button
          type="button"
          onClick={() => postMessage("extract-colors")}
          className="h-6 rounded-md bg-surface-brand px-2 text-[11px] font-medium text-fg-onbrand transition-colors duration-150 hover:bg-surface-brand-hover cursor-pointer"
          title="Refresh colors"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Row 3: Selection + actions */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          className={`h-6 rounded-md px-2 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            allSelected
              ? "bg-surface-active text-fg-brand"
              : "text-fg-muted hover:bg-surface-dim hover:text-fg"
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
              className="h-6 rounded-md bg-surface-brand px-2 text-[11px] font-medium text-fg-onbrand transition-colors duration-150 hover:bg-surface-brand-hover cursor-pointer"
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => $exportModal.set({ type: "bulk" })}
              className="h-6 rounded-md bg-surface-brand px-2 text-[11px] font-medium text-fg-onbrand transition-colors duration-150 hover:bg-surface-brand-hover cursor-pointer"
            >
              Export
            </button>
          </>
        )}

        {selectedColors.length === 0 && (
          <button
            type="button"
            onClick={handleCopyAll}
            className="h-6 rounded-md bg-surface-dim px-2 text-[11px] font-medium text-fg-dim transition-colors duration-150 hover:bg-surface-raised cursor-pointer"
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
    <div className="border-t border-edge-selected bg-surface-selected px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-fg-brand">
          {selectedColors.length} selected
        </span>
        <div className="flex-1" />
        <button
          type="button"
          className="text-[11px] text-fg-dim transition-colors duration-150 hover:text-fg-brand cursor-pointer"
          onClick={clearSelection}
        >
          Clear
        </button>
      </div>
    </div>
  );
});

// --- Export Modal Internals ---

const MODAL_DURATION = 200;

function closeModal() {
  $modalClosing.set(true);
  setTimeout(() => {
    $exportModal.set(null);
    $modalClosing.set(false);
  }, MODAL_DURATION);
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  const closing = useStore($modalClosing);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${
        closing
          ? "animate-out fade-out duration-200"
          : "animate-in fade-in duration-200"
      } bg-surface-overlay`}
      onClick={closeModal}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeModal();
      }}
      role="presentation"
    >
      <div
        className={`w-full max-w-76 rounded-t-2xl bg-surface shadow-xl ${
          closing
            ? "animate-out slide-out-to-bottom fade-out duration-200"
            : "animate-in slide-in-from-bottom fade-in duration-200"
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeModal();
        }}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-edge px-4 py-3">
      <div className="flex items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={closeModal}
        className="rounded-md p-1 text-fg-muted transition-colors duration-150 hover:bg-surface-dim hover:text-fg cursor-pointer"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function FormatPicker() {
  const exportFormat = useStore($exportFormat);
  const exportLang = useStore($exportLang);

  return (
    <>
      <div className="flex items-center gap-1 border-b border-edge px-4 py-1.5">
        <span className="mr-1 text-[10px] text-fg-muted">Format:</span>
        {FORMAT_KEYS.map((fmt) => (
          <button
            key={fmt}
            type="button"
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-150 cursor-pointer ${
              exportFormat === fmt
                ? "bg-surface-active text-fg-brand"
                : "text-fg-muted hover:bg-surface-dim hover:text-fg"
            }`}
            onClick={() => $exportFormat.set(fmt)}
          >
            {fmt.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-b border-edge px-4 py-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors duration-150 cursor-pointer ${
              exportLang === lang
                ? "bg-surface-brand text-fg-onbrand"
                : "text-fg-muted hover:bg-surface-dim hover:text-fg"
            }`}
            onClick={() => $exportLang.set(lang)}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>
    </>
  );
}

// --- Export Modal Variants ---

function SingleExportModal({
  color,
  title,
}: {
  color: ExtractedColor;
  title: string;
}) {
  const exportLang = useStore($exportLang);
  const copiedId = useStore($copiedId);
  const exportFormat = useStore($exportFormat);

  const rows = CASE_STYLES.map((casing) => {
    const data = exportAll(color.formats[exportFormat], title);
    return {
      casing,
      copyId: `modal-${exportLang}-${casing}`,
      value: data[exportLang][casing],
    };
  });

  return (
    <ModalOverlay>
      <ModalHeader>
        <div
          className="h-5 w-5 rounded border border-edge shadow-sm"
          style={{ background: color.swatch }}
        />
        <h3 className="text-[12px] font-semibold text-fg">{title}</h3>
      </ModalHeader>
      <FormatPicker />
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
              downloadFile(r.value, `${title}.${ext}`);
            }}
          />
        ))}
      </div>
    </ModalOverlay>
  );
}

function BulkExportModal() {
  const exportLang = useStore($exportLang);
  const copiedId = useStore($copiedId);
  const selectedColors = useStore($selectedColors);
  const exportFormat = useStore($exportFormat);

  const rows = CASE_STYLES.map((casing) => ({
    casing,
    copyId: `modal-bulk-${exportLang}-${casing}`,
    value: formatBulk(
      selectedColors.map((c) => ({
        color: c.gradient || c.formats[exportFormat],
        label: c.variableName || c.nodeName || "Unlinked",
        nodeName: c.nodeName || "Unlinked",
        property: c.property,
      })),
      exportLang,
      casing
    ),
  }));

  return (
    <ModalOverlay>
      <ModalHeader>
        <h3 className="text-[12px] font-semibold text-fg">
          {selectedColors.length} color
          {selectedColors.length === 1 ? "" : "s"}
        </h3>
      </ModalHeader>
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2">
        {selectedColors.map((c) => (
          <div
            key={getCardId(c)}
            className="h-5 w-5 shrink-0 rounded border border-edge shadow-sm"
            style={{ background: c.swatch }}
            title={c.variableName || c.nodeName || "Unlinked"}
          />
        ))}
      </div>
      <FormatPicker />
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
              downloadFile(r.value, `colors.${ext}`);
            }}
          />
        ))}
      </div>
    </ModalOverlay>
  );
}

// --- Main App ---

export default function App() {
  const colors = useStore($colors);
  const error = useStore($error);
  const viewColors = useStore($viewColors);
  const exportModal = useStore($exportModal);

  return (
    <div className="flex h-full flex-col bg-surface-dim text-fg">
      {/* Header */}
      <div className="border-b border-edge bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <SwatchIcon />
          <h2 className="text-[13px] font-semibold text-fg">Color Extractor</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-fg-muted">
          {colors.length} color{colors.length === 1 ? "" : "s"} extracted
        </p>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center px-4 py-10">
          <EmptyIcon />
          <p className="mt-3 text-[11px] text-fg-muted">{error}</p>
          <p className="mt-1 text-[11px] text-fg-muted">
            Select elements in Figma first
          </p>
        </div>
      )}

      {/* Color List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {viewColors.length > 0
          ? viewColors.map((color) =>
              color.gradient ? (
                <GradientCard key={getCardId(color)} color={color} />
              ) : (
                <ColorCard key={getCardId(color)} color={color} />
              )
            )
          : !error && (
              <div className="flex flex-col items-center justify-center py-10">
                <EmptyIcon />
                <p className="mt-3 text-[11px] text-fg-muted">
                  No colors to display
                </p>
              </div>
            )}
      </div>

      {/* Selection bar */}
      <SelectionBar />

      {/* Export Modal */}
      {exportModal &&
        (exportModal.type === "single" ? (
          <SingleExportModal
            color={exportModal.color}
            title={exportModal.title}
          />
        ) : (
          <BulkExportModal />
        ))}
    </div>
  );
}
