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
  const name = convertCase(label, casing);

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
 * Formats multiple colors as combined declarations in the specified language
 * and casing style. Produces a single output string with all declarations.
 */
export function formatBulk(
  colors: { color: string; label: string }[],
  language: LanguageFormat,
  casing: CaseStyle
): string {
  if (colors.length === 0) return "";

  switch (language) {
    case "json": {
      const entries = colors.map(({ color, label }) => {
        const name = convertCase(label, casing);
        return `  "${name}": "${color}"`;
      });
      return `{\n${entries.join(",\n")}\n}`;
    }
    case "css": {
      return colors
        .map(({ color, label }) => {
          const name = convertCase(label, casing);
          return `.${name} { color: ${color}; }`;
        })
        .join("\n");
    }
    case "cssVariable": {
      const entries = colors.map(({ color, label }) => {
        const name = convertCase(label, casing);
        return `  --${name}: ${color}`;
      });
      return `:root {\n${entries.join(";\n")};\n}`;
    }
    case "sass": {
      return colors
        .map(({ color, label }) => {
          const name = convertCase(label, casing);
          return `$${name}: ${color};`;
        })
        .join("\n");
    }
    case "typescript": {
      return colors
        .map(({ color, label }) => {
          const name = convertCase(label, casing);
          return `export const ${name}: string = "${color}";`;
        })
        .join("\n");
    }
    case "javascript": {
      return colors
        .map(({ color, label }) => {
          const name = convertCase(label, casing);
          return `export const ${name} = "${color}";`;
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
