import { useStore } from "@nanostores/preact";
import { atom } from "nanostores";
import { memo } from "preact/compat";

function postMessage(type: string, data?: Record<string, unknown>) {
  parent.postMessage({ pluginMessage: { type, ...data } }, "*");
}

// --- Stores ---

const $selectionInfo = atom({
  count: 0,
  name: "",
  nodeType: "",
});

const $useCurrentColor = atom(false);
const $svgResult = atom<string | null>(null);
const $fileName = atom("");
const $error = atom<string | null>(null);
const $busy = atom<string | null>(null);
const $copied = atom(false);

// --- Helpers ---

function downloadSvg(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
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
  $copied.set(true);
  setTimeout(() => $copied.set(false), 1500);
}

function requestExport(action: "copy" | "download") {
  $error.set(null);
  $busy.set(action);
  postMessage("export-svg", { useCurrentColor: $useCurrentColor.get() });
}

// --- Message Listener ---

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "selection-info") {
    $selectionInfo.set({
      count: msg.count,
      name: msg.name,
      nodeType: msg.nodeType,
    });
    $error.set(null);
    if (msg.count > 0) {
      postMessage("export-svg", { useCurrentColor: $useCurrentColor.get() });
    } else {
      $svgResult.set(null);
    }
  }

  if (msg.type === "svg-result") {
    $svgResult.set(msg.svg);
    $fileName.set(msg.fileName);
    $error.set(null);

    const action = $busy.get();
    if (action === "copy") {
      copyToClipboard(msg.svg);
    } else if (action === "download") {
      downloadSvg(msg.svg, msg.fileName);
    }
    $busy.set(null);
  }

  if (msg.type === "export-error") {
    $error.set(msg.error);
    $busy.set(null);
  }
});

// --- Components ---

const NODE_TYPE_LABELS: Record<string, string> = {
  BOOLEAN_OPERATION: "Boolean",
  COMPONENT: "Component",
  COMPONENT_SET: "Component Set",
  ELLIPSE: "Ellipse",
  FRAME: "Frame",
  GROUP: "Group",
  INSTANCE: "Instance",
  LINE: "Line",
  RECTANGLE: "Rectangle",
  REGULAR_POLYGON: "Polygon",
  SECTION: "Section",
  STAR: "Star",
  TEXT: "Text",
  VECTOR: "Vector",
};

function getNodeTypeLabel(type: string): string {
  return NODE_TYPE_LABELS[type] || type;
}

const SpinnerIcon = memo(function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
});

const CopyIcon = memo(function CopyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
});

const CheckIcon = memo(function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-fg-success"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

const DownloadIcon = memo(function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15V3m0 0l-4 4m4-4l4 4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

const SelectionInfo = memo(function SelectionInfo() {
  const info = useStore($selectionInfo);
  if (info.count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-fg">
        {info.name}
      </span>
      <span className="shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-[11px] font-medium text-fg-dim">
        {getNodeTypeLabel(info.nodeType)}
      </span>
    </div>
  );
});

const Toggle = memo(function Toggle() {
  const enabled = useStore($useCurrentColor);
  const info = useStore($selectionInfo);

  function handleToggle() {
    const next = !enabled;
    $useCurrentColor.set(next);
    if (info.count > 0) {
      postMessage("export-svg", { useCurrentColor: next });
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-2">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={enabled}
          onChange={handleToggle}
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${
            enabled ? "bg-surface-brand" : "bg-edge"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>
      <span className="text-sm text-fg">Use currentColor</span>
    </label>
  );
});

function CopyButtonIcon({ busy, copied }: { busy: boolean; copied: boolean }) {
  if (busy) return <SpinnerIcon />;
  if (copied) return <CheckIcon />;
  return <CopyIcon />;
}

function CopyButtonText({ busy, copied }: { busy: boolean; copied: boolean }) {
  if (busy) return "Copying...";
  if (copied) return "Copied";
  return "Copy SVG";
}

function DownloadButtonIcon({ busy }: { busy: boolean }) {
  if (busy) return <SpinnerIcon />;
  return <DownloadIcon />;
}

function DownloadButtonText({ busy }: { busy: boolean }) {
  if (busy) return "Downloading...";
  return "Download";
}

const ActionButtons = memo(function ActionButtons() {
  const info = useStore($selectionInfo);
  const busy = useStore($busy);
  const copied = useStore($copied);

  const disabled = info.count === 0 || busy !== null;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => requestExport("copy")}
      >
        <CopyButtonIcon busy={busy === "copy"} copied={copied} />
        <CopyButtonText busy={busy === "copy"} copied={copied} />
      </button>
      <button
        type="button"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-brand px-3 py-2 text-sm font-medium text-fg-onbrand transition-colors hover:bg-surface-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => requestExport("download")}
      >
        <DownloadButtonIcon busy={busy === "download"} />
        <DownloadButtonText busy={busy === "download"} />
      </button>
    </div>
  );
});

const SvgPreview = memo(function SvgPreview() {
  const svg = useStore($svgResult);

  if (!svg) return null;

  return (
    <div
      className="max-h-40 overflow-auto rounded-lg border border-edge p-2"
      style={{ background: "var(--color-checkerboard)" }}
      // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

const ErrorDisplay = memo(function ErrorDisplay() {
  const error = useStore($error);
  if (!error) return null;

  return (
    <div className="rounded-lg bg-surface-active px-3 py-2 text-sm text-fg">
      {error}
    </div>
  );
});

// --- Main App ---

export default function App() {
  const info = useStore($selectionInfo);

  return (
    <div className="flex h-full flex-col gap-3 bg-surface-dim p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-fg-brand" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="text-sm font-semibold text-fg">Export SVG</h1>
      </div>

      {/* Selection Info */}
      <SelectionInfo />

      {/* Empty State */}
      {info.count === 0 && (
        <p className="text-sm text-fg-muted">Select a node to export</p>
      )}

      {/* Options */}
      <Toggle />

      {/* Actions */}
      <ActionButtons />

      {/* Preview */}
      <SvgPreview />

      {/* Error */}
      <ErrorDisplay />
    </div>
  );
}
