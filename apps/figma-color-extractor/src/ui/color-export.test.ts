import { describe, expect, it } from "bun:test";

import {
  convertCase,
  exportAll,
  formatBulk,
  formatColor,
} from "./color-export";
import type { CaseStyle, LanguageFormat } from "./color-export";

describe("convertCase", () => {
  it("converts to camelCase", () => {
    expect(convertCase("brand primary", "camel")).toBe("brandPrimary");
  });

  it("converts to CONSTANT_CASE", () => {
    expect(convertCase("brand primary", "constant")).toBe("BRAND_PRIMARY");
  });

  it("converts to Header-Case", () => {
    expect(convertCase("brand primary", "header")).toBe("Brand-Primary");
  });

  it("converts to PascalCase", () => {
    expect(convertCase("brand primary", "pascal")).toBe("BrandPrimary");
  });

  it("converts to param-case", () => {
    expect(convertCase("brand primary", "param")).toBe("brand-primary");
  });

  it("converts to snake_case", () => {
    expect(convertCase("brand primary", "snake")).toBe("brand_primary");
  });

  it("splits on hyphens", () => {
    expect(convertCase("brand-primary", "camel")).toBe("brandPrimary");
  });

  it("splits on underscores", () => {
    expect(convertCase("brand_primary", "camel")).toBe("brandPrimary");
  });

  it("splits on camelCase boundaries", () => {
    expect(convertCase("brandPrimary", "camel")).toBe("brandPrimary");
  });

  it("handles numbers as word boundaries", () => {
    expect(convertCase("gray 100", "camel")).toBe("gray100");
  });

  it("sanitizes special characters like slashes", () => {
    expect(convertCase("schemes/primary", "camel")).toBe("schemesPrimary");
  });

  it("sanitizes dots and other punctuation", () => {
    expect(convertCase("colors.bg.dark", "snake")).toBe("colors_bg_dark");
  });

  it("collapses multiple separators", () => {
    expect(convertCase("brand--primary", "camel")).toBe("brandPrimary");
  });

  it("returns empty string for empty input", () => {
    expect(convertCase("", "camel")).toBe("");
  });

  it("returns empty string for only special characters", () => {
    expect(convertCase("---///", "camel")).toBe("");
  });

  it("handles single word", () => {
    expect(convertCase("brand", "camel")).toBe("brand");
  });

  it("handles already-correct casing as input", () => {
    expect(convertCase("BrandPrimary", "snake")).toBe("brand_primary");
  });
});

describe("formatColor", () => {
  const color = "#FF5733";
  const label = "brand primary";

  it("formats as JSON", () => {
    expect(formatColor(color, label, "json", "camel")).toBe(
      '{ "brandPrimary": "#FF5733" }'
    );
  });

  it("formats as CSS class", () => {
    expect(formatColor(color, label, "css", "camel")).toBe(
      ".brandPrimary { color: #FF5733; }"
    );
  });

  it("formats as CSS variable", () => {
    expect(formatColor(color, label, "cssVariable", "camel")).toBe(
      ":root { --brandPrimary: #FF5733; }"
    );
  });

  it("formats as SASS variable", () => {
    expect(formatColor(color, label, "sass", "camel")).toBe(
      "$brandPrimary: #FF5733;"
    );
  });

  it("formats as TypeScript export", () => {
    expect(formatColor(color, label, "typescript", "camel")).toBe(
      'export const brandPrimary: string = "#FF5733";'
    );
  });

  it("formats as JavaScript export", () => {
    expect(formatColor(color, label, "javascript", "camel")).toBe(
      'export const brandPrimary = "#FF5733";'
    );
  });

  it("preserves RGB format", () => {
    expect(formatColor("rgb(255, 87, 51)", label, "json", "camel")).toBe(
      '{ "brandPrimary": "rgb(255, 87, 51)" }'
    );
  });

  it("preserves HSL format", () => {
    expect(formatColor("hsl(11, 100%, 60%)", label, "json", "camel")).toBe(
      '{ "brandPrimary": "hsl(11, 100%, 60%)" }'
    );
  });
});

describe("formatBulk", () => {
  const colors = [
    { color: "#FF0000", label: "red" },
    { color: "#00FF00", label: "green" },
  ];

  it("returns empty string for empty array", () => {
    expect(formatBulk([], "json", "camel")).toBe("");
  });

  it("formats multiple colors as JSON object", () => {
    const result = formatBulk(colors, "json", "camel");
    expect(result).toBe('{\n  "red": "#FF0000",\n  "green": "#00FF00"\n}');
  });

  it("formats multiple colors as CSS classes", () => {
    const result = formatBulk(colors, "css", "camel");
    expect(result).toBe(".red { color: #FF0000; }\n.green { color: #00FF00; }");
  });

  it("formats multiple colors as CSS variables", () => {
    const result = formatBulk(colors, "cssVariable", "camel");
    expect(result).toBe(":root {\n  --red: #FF0000;\n  --green: #00FF00;\n}");
  });

  it("formats multiple colors as SASS variables", () => {
    const result = formatBulk(colors, "sass", "camel");
    expect(result).toBe("$red: #FF0000;\n$green: #00FF00;");
  });

  it("formats multiple colors as TypeScript exports", () => {
    const result = formatBulk(colors, "typescript", "camel");
    expect(result).toBe(
      'export const red: string = "#FF0000";\nexport const green: string = "#00FF00";'
    );
  });

  it("formats multiple colors as JavaScript exports", () => {
    const result = formatBulk(colors, "javascript", "camel");
    expect(result).toBe(
      'export const red = "#FF0000";\nexport const green = "#00FF00";'
    );
  });

  it("applies casing style to all labels in bulk", () => {
    const result = formatBulk(colors, "json", "constant");
    expect(result).toBe('{\n  "RED": "#FF0000",\n  "GREEN": "#00FF00"\n}');
  });
});

describe("exportAll", () => {
  it("returns all language and casing combinations", () => {
    const result = exportAll("#FF5733", "brand primary");

    const languages: LanguageFormat[] = [
      "json",
      "css",
      "cssVariable",
      "sass",
      "typescript",
      "javascript",
    ];
    const casings: CaseStyle[] = [
      "camel",
      "constant",
      "header",
      "pascal",
      "param",
      "snake",
    ];

    for (const lang of languages) {
      expect(result[lang]).toBeDefined();
      for (const c of casings) {
        expect(result[lang][c]).toBeDefined();
        expect(typeof result[lang][c]).toBe("string");
        expect(result[lang][c].length).toBeGreaterThan(0);
      }
    }
  });

  it("has exactly 6 languages and 6 casings", () => {
    const result = exportAll("#000", "x");
    expect(Object.keys(result)).toHaveLength(6);
    for (const lang of Object.keys(result)) {
      expect(Object.keys(result[lang])).toHaveLength(6);
    }
  });
});
