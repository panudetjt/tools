/**
 * Supported casing styles for color name transformation.
 */
export type CaseStyle =
  | "camel"
  | "constant"
  | "header"
  | "pascal"
  | "param"
  | "snake";

/**
 * Supported language formats for color value export.
 */
export type LanguageFormat =
  | "json"
  | "css"
  | "cssVariable"
  | "sass"
  | "typescript"
  | "javascript";

/** Ordered list of all casing styles. */
const CASE_STYLES: readonly CaseStyle[] = [
  "camel",
  "constant",
  "header",
  "pascal",
  "param",
  "snake",
] as const;

/** Ordered list of all language formats. */
const LANGUAGE_FORMATS: readonly LanguageFormat[] = [
  "json",
  "css",
  "cssVariable",
  "sass",
  "typescript",
  "javascript",
] as const;

/**
 * Splits a label into words by spaces, hyphens, underscores, and camelCase
 * boundaries. Collapses consecutive separators and trims leading/trailing
 * whitespace. Handles labels containing numbers (e.g. "gray 100").
 */
function splitWords(label: string): string[] {
  const normalized = label
    .replaceAll(/[^a-zA-Z0-9\s]/g, " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/([a-zA-Z])(\d)/g, "$1 $2")
    .replaceAll(/(\d)([a-zA-Z])/g, "$1 $2")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (normalized === "") return [];
  return normalized.split(" ");
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Converts a color name/label to the specified casing style.
 *
 * Splits on spaces, hyphens, underscores, and camelCase boundaries before
 * recombining with the target casing rules.
 *
 * @param label - The raw color name/label (e.g. "brand primary", "gray 100").
 * @param style - The target casing style.
 * @returns The label transformed to the requested casing style.
 */
export function convertCase(label: string, style: CaseStyle): string {
  const words = splitWords(label);
  if (words.length === 0) return "";

  switch (style) {
    case "camel": {
      return words
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : capitalize(w.toLowerCase())
        )
        .join("");
    }
    case "constant": {
      return words.map((w) => w.toUpperCase()).join("_");
    }
    case "header": {
      return words.map((w) => capitalize(w.toLowerCase())).join("-");
    }
    case "pascal": {
      return words.map((w) => capitalize(w.toLowerCase())).join("");
    }
    case "param": {
      return words.map((w) => w.toLowerCase()).join("-");
    }
    case "snake": {
      return words.map((w) => w.toLowerCase()).join("_");
    }
    default: {
      return label;
    }
  }
}

const SYMBOL_NAMES: Record<string, string> = {
  "!": "bang",
  "#": "hash",
  $: "dollar",
  "%": "percent",
  "&": "ampersand",
  "*": "star",
  "+": "plus",
  ",": "comma",
  "-": "dash",
  ".": "dot",
  "/": "slash",
  ":": "colon",
  ";": "semicolon",
  "=": "equals",
  "?": "question",
  "@": "at",
  "\\": "backslash",
  "^": "caret",
  _: "underscore",
  "|": "pipe",
  "~": "tilde",
};

function resolveSymbolName(label: string): string {
  if (label.length === 0) return "color";
  if (label.length === 1) return SYMBOL_NAMES[label] ?? "color";
  if (new Set(label).size === 1) {
    const name = SYMBOL_NAMES[label[0]];
    return name ? `${name}${label.length}` : "color";
  }
  return "color";
}

/**
 * Sanitizes a converted name for use as an identifier in the target language.
 * - When convertCase produces an empty string (e.g. label is a symbol like "*"),
 *   resolves to a readable symbol name (e.g. "star") and applies the casing.
 * - Prefixes with "_" when the name starts with a digit and the language
 *   requires valid identifiers (CSS class, Sass, TypeScript, JavaScript).
 */
function sanitizeName(
  converted: string,
  fallback: string,
  language: LanguageFormat,
  casing: CaseStyle
): string {
  let name = converted || convertCase(resolveSymbolName(fallback), casing);
  if (language === "json" || language === "cssVariable") return name;
  if (/^[0-9]/.test(name)) name = `_${name}`;
  if (!/^[a-zA-Z_$]/.test(name)) name = `_${name}`;
  return name;
}

/**
 * Formats a color value as a single declaration in the specified language and
 * casing style. The output color value preserves the original input format
 * (HEX, RGB, HSL, or named CSS color).
 *
 * @param color - The color value string (e.g. "#FF5733", "rgb(255, 87, 51)").
 * @param label - The color name/label to use for the declaration identifier.
 * @param language - The target language format.
 * @param casing - The casing style to apply to the label.
 * @returns A single formatted declaration string.
 */
export function formatColor(
  color: string,
  label: string,
  language: LanguageFormat,
  casing: CaseStyle
): string {
  const name = sanitizeName(
    convertCase(label, casing),
    label,
    language,
    casing
  );

  switch (language) {
    case "json": {
      return `{ "${name}": "${color}" }`;
    }
    case "css": {
      return `.${name} { color: ${color}; }`;
    }
    case "cssVariable": {
      return `:root { --${name}: ${color}; }`;
    }
    case "sass": {
      return `$${name}: ${color};`;
    }
    case "typescript": {
      return `export const ${name}: string = "${color}";`;
    }
    case "javascript": {
      return `export const ${name} = "${color}";`;
    }
    default: {
      return "";
    }
  }
}

/**
 * Generates all language format x casing style combinations for a color value
 * and label. Returns a nested object keyed by language format, then by casing
 * style, with each leaf value being the formatted declaration string.
 *
 * @param color - The color value string in its original format.
 * @param label - The color name/label.
 * @returns A nested record: `{ [language]: { [casing]: formattedString } }`.
 */
export function exportAll(
  color: string,
  label: string
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const lang of LANGUAGE_FORMATS) {
    result[lang] = {};
    for (const c of CASE_STYLES) {
      result[lang][c] = formatColor(color, label, lang, c);
    }
  }

  return result;
}

/**
 * Deduplicates labels by appending a numbered suffix to subsequent duplicates.
 * First occurrence keeps the original label, subsequent ones get " 1", " 2", etc.
 */
function deduplicateLabels<T extends { label: string }>(items: T[]): T[] {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const count = counts.get(item.label) ?? 0;
    counts.set(item.label, count + 1);
    if (count === 0) return item;
    return { ...item, label: `${item.label} ${count}` };
  });
}

function formatComment(
  nodeName: string,
  property: string,
  language: LanguageFormat
): string {
  if (language === "json") return "";
  const text = `${nodeName} - ${property}`;
  if (language === "css" || language === "cssVariable") {
    return ` /* ${text} */`;
  }
  return ` // ${text}`;
}

/**
 * Formats multiple colors as combined declarations in the specified language
 * and casing style. Produces a single output string with all declarations.
 * Duplicate labels are resolved with numbered suffixes. Each line includes an
 * inline comment with the original node name (except JSON which has no comments).
 */
export function formatBulk(
  colors: {
    color: string;
    label: string;
    nodeName: string;
    property: string;
  }[],
  language: LanguageFormat,
  casing: CaseStyle
): string {
  if (colors.length === 0) return "";

  const deduped = deduplicateLabels(colors);

  switch (language) {
    case "json": {
      const entries = deduped.map(({ color, label }) => {
        const name = sanitizeName(
          convertCase(label, casing),
          label,
          language,
          casing
        );
        return `  "${name}": "${color}"`;
      });
      return `{\n${entries.join(",\n")}\n}`;
    }
    case "css": {
      return deduped
        .map(({ color, label, nodeName, property }) => {
          const name = sanitizeName(
            convertCase(label, casing),
            label,
            language,
            casing
          );
          return `.${name} { color: ${color}; }${formatComment(nodeName, property, language)}`;
        })
        .join("\n");
    }
    case "cssVariable": {
      const entries = deduped.map(({ color, label, nodeName, property }) => {
        const name = sanitizeName(
          convertCase(label, casing),
          label,
          language,
          casing
        );
        return `  --${name}: ${color}${formatComment(nodeName, property, language)}`;
      });
      return `:root {\n${entries.join(";\n")};\n}`;
    }
    case "sass": {
      return deduped
        .map(({ color, label, nodeName, property }) => {
          const name = sanitizeName(
            convertCase(label, casing),
            label,
            language,
            casing
          );
          return `$${name}: ${color};${formatComment(nodeName, property, language)}`;
        })
        .join("\n");
    }
    case "typescript": {
      return deduped
        .map(({ color, label, nodeName, property }) => {
          const name = sanitizeName(
            convertCase(label, casing),
            label,
            language,
            casing
          );
          return `export const ${name}: string = "${color}";${formatComment(nodeName, property, language)}`;
        })
        .join("\n");
    }
    case "javascript": {
      return deduped
        .map(({ color, label, nodeName, property }) => {
          const name = sanitizeName(
            convertCase(label, casing),
            label,
            language,
            casing
          );
          return `export const ${name} = "${color}";${formatComment(nodeName, property, language)}`;
        })
        .join("\n");
    }
    default: {
      return "";
    }
  }
}

/**
 * Copies the given text to the system clipboard using a hidden textarea and
 * execCommand. This works inside Figma plugin iframes where
 * navigator.clipboard is unavailable.
 *
 * @param text - The text string to copy to the clipboard.
 */
export function copyToClipboard(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.append(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
