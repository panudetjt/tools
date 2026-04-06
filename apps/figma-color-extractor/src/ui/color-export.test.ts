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

describe("formatColor sanitization", () => {
  const color = "#FF5733";

  describe("names starting with a digit", () => {
    const label = "100 gray";

    it("does NOT prefix with _ for JSON", () => {
      expect(formatColor(color, label, "json", "camel")).toBe(
        '{ "100Gray": "#FF5733" }'
      );
    });

    it("does NOT prefix with _ for CSS variables (custom props accept digits)", () => {
      expect(formatColor(color, label, "cssVariable", "camel")).toBe(
        ":root { --100Gray: #FF5733; }"
      );
    });

    it("prefixes with _ for CSS class", () => {
      expect(formatColor(color, label, "css", "camel")).toBe(
        "._100Gray { color: #FF5733; }"
      );
    });

    it("prefixes with _ for Sass", () => {
      expect(formatColor(color, label, "sass", "camel")).toBe(
        "$_100Gray: #FF5733;"
      );
    });

    it("prefixes with _ for TypeScript", () => {
      expect(formatColor(color, label, "typescript", "camel")).toBe(
        'export const _100Gray: string = "#FF5733";'
      );
    });

    it("prefixes with _ for JavaScript", () => {
      expect(formatColor(color, label, "javascript", "camel")).toBe(
        'export const _100Gray = "#FF5733";'
      );
    });
  });

  describe("names that are purely digits", () => {
    const label = "42";

    it("prefixes with _ for CSS class", () => {
      expect(formatColor(color, label, "css", "camel")).toBe(
        "._42 { color: #FF5733; }"
      );
    });

    it("prefixes with _ for TypeScript", () => {
      expect(formatColor(color, label, "typescript", "camel")).toBe(
        'export const _42: string = "#FF5733";'
      );
    });

    it("does NOT prefix for JSON", () => {
      expect(formatColor(color, label, "json", "camel")).toBe(
        '{ "42": "#FF5733" }'
      );
    });
  });

  describe("names with only special characters", () => {
    const label = "*";

    it("resolves to readable symbol name for JSON", () => {
      expect(formatColor(color, label, "json", "camel")).toBe(
        '{ "star": "#FF5733" }'
      );
    });

    it("resolves to readable symbol name for CSS variable", () => {
      expect(formatColor(color, label, "cssVariable", "camel")).toBe(
        ":root { --star: #FF5733; }"
      );
    });

    it("resolves to readable symbol name for CSS class", () => {
      expect(formatColor(color, label, "css", "camel")).toBe(
        ".star { color: #FF5733; }"
      );
    });

    it("resolves to readable symbol name for Sass", () => {
      expect(formatColor(color, label, "sass", "camel")).toBe(
        "$star: #FF5733;"
      );
    });

    it("resolves to readable symbol name for TypeScript", () => {
      expect(formatColor(color, label, "typescript", "camel")).toBe(
        'export const star: string = "#FF5733";'
      );
    });

    it("resolves to readable symbol name for JavaScript", () => {
      expect(formatColor(color, label, "javascript", "camel")).toBe(
        'export const star = "#FF5733";'
      );
    });
  });

  describe("names with only special characters (repeated same)", () => {
    const label = "***";

    it("resolves to symbol name with count for JSON", () => {
      expect(formatColor(color, label, "json", "camel")).toBe(
        '{ "star3": "#FF5733" }'
      );
    });

    it("resolves to symbol name with count for CSS class", () => {
      expect(formatColor(color, label, "css", "camel")).toBe(
        ".star3 { color: #FF5733; }"
      );
    });

    it("resolves to symbol name with count for TypeScript", () => {
      expect(formatColor(color, label, "typescript", "camel")).toBe(
        'export const star3: string = "#FF5733";'
      );
    });
  });

  describe("names with mixed special characters", () => {
    const label = "---///";

    it("falls back to color for JSON", () => {
      expect(formatColor(color, label, "json", "camel")).toBe(
        '{ "color": "#FF5733" }'
      );
    });

    it("falls back to color for TypeScript", () => {
      expect(formatColor(color, label, "typescript", "camel")).toBe(
        'export const color: string = "#FF5733";'
      );
    });
  });

  describe("resolved symbol names respect casing style", () => {
    const label = "*";

    it("camelCase", () => {
      expect(formatColor(color, label, "typescript", "camel")).toBe(
        'export const star: string = "#FF5733";'
      );
    });

    it("CONSTANT_CASE", () => {
      expect(formatColor(color, label, "typescript", "constant")).toBe(
        'export const STAR: string = "#FF5733";'
      );
    });

    it("Header-Case", () => {
      expect(formatColor(color, label, "css", "header")).toBe(
        ".Star { color: #FF5733; }"
      );
    });

    it("PascalCase", () => {
      expect(formatColor(color, label, "sass", "pascal")).toBe(
        "$Star: #FF5733;"
      );
    });

    it("param-case", () => {
      expect(formatColor(color, label, "css", "param")).toBe(
        ".star { color: #FF5733; }"
      );
    });

    it("snake_case", () => {
      expect(formatColor(color, label, "javascript", "snake")).toBe(
        'export const star = "#FF5733";'
      );
    });

    it("repeated symbol with PascalCase", () => {
      expect(formatColor(color, "***", "typescript", "pascal")).toBe(
        'export const Star3: string = "#FF5733";'
      );
    });

    it("repeated symbol with CONSTANT_CASE", () => {
      expect(formatColor(color, "***", "javascript", "constant")).toBe(
        'export const STAR_3 = "#FF5733";'
      );
    });
  });
});

describe("formatBulk", () => {
  const colors = [
    { color: "#FF0000", label: "red", nodeName: "Red", property: "fill" },
    {
      color: "#00FF00",
      label: "green",
      nodeName: "Green",
      property: "stroke",
    },
  ];

  it("returns empty string for empty array", () => {
    expect(formatBulk([], "json", "camel")).toBe("");
  });

  it("formats multiple colors as JSON object", () => {
    const result = formatBulk(colors, "json", "camel");
    expect(result).toBe('{\n  "red": "#FF0000",\n  "green": "#00FF00"\n}');
  });

  it("formats multiple colors as CSS classes with node name and property comments", () => {
    const result = formatBulk(colors, "css", "camel");
    expect(result).toBe(
      ".red { color: #FF0000; } /* Red - fill */\n.green { color: #00FF00; } /* Green - stroke */"
    );
  });

  it("formats multiple colors as CSS variables with node name and property comments", () => {
    const result = formatBulk(colors, "cssVariable", "camel");
    expect(result).toBe(
      ":root {\n  --red: #FF0000 /* Red - fill */;\n  --green: #00FF00 /* Green - stroke */;\n}"
    );
  });

  it("formats multiple colors as SASS variables with node name and property comments", () => {
    const result = formatBulk(colors, "sass", "camel");
    expect(result).toBe(
      "$red: #FF0000; // Red - fill\n$green: #00FF00; // Green - stroke"
    );
  });

  it("formats multiple colors as TypeScript exports with node name and property comments", () => {
    const result = formatBulk(colors, "typescript", "camel");
    expect(result).toBe(
      'export const red: string = "#FF0000"; // Red - fill\nexport const green: string = "#00FF00"; // Green - stroke'
    );
  });

  it("formats multiple colors as JavaScript exports with node name and property comments", () => {
    const result = formatBulk(colors, "javascript", "camel");
    expect(result).toBe(
      'export const red = "#FF0000"; // Red - fill\nexport const green = "#00FF00"; // Green - stroke'
    );
  });

  it("applies casing style to all labels in bulk", () => {
    const result = formatBulk(colors, "json", "constant");
    expect(result).toBe('{\n  "RED": "#FF0000",\n  "GREEN": "#00FF00"\n}');
  });
});

describe("formatBulk deduplication", () => {
  it("resolves duplicate labels with numbered suffixes", () => {
    const colors = [
      {
        color: "#FF0000",
        label: "red",
        nodeName: "Circle",
        property: "fill",
      },
      {
        color: "#00FF00",
        label: "red",
        nodeName: "Square",
        property: "fill",
      },
      {
        color: "#0000FF",
        label: "red",
        nodeName: "Triangle",
        property: "stroke",
      },
    ];
    const result = formatBulk(colors, "typescript", "camel");
    expect(result).toBe(
      'export const red: string = "#FF0000"; // Circle - fill\nexport const red1: string = "#00FF00"; // Square - fill\nexport const red2: string = "#0000FF"; // Triangle - stroke'
    );
  });

  it("keeps first occurrence unchanged, numbers subsequent ones", () => {
    const colors = [
      {
        color: "#111",
        label: "bg",
        nodeName: "Frame 1",
        property: "fill",
      },
      {
        color: "#222",
        label: "bg",
        nodeName: "Frame 2",
        property: "fill",
      },
    ];
    const result = formatBulk(colors, "sass", "camel");
    expect(result).toBe(
      "$bg: #111; // Frame 1 - fill\n$bg1: #222; // Frame 2 - fill"
    );
  });

  it("does not deduplicate across different labels", () => {
    const colors = [
      {
        color: "#111",
        label: "bg",
        nodeName: "Frame 1",
        property: "fill",
      },
      {
        color: "#222",
        label: "fg",
        nodeName: "Frame 2",
        property: "stroke",
      },
      {
        color: "#333",
        label: "bg",
        nodeName: "Frame 3",
        property: "fill",
      },
    ];
    const result = formatBulk(colors, "css", "camel");
    expect(result).toBe(
      ".bg { color: #111; } /* Frame 1 - fill */\n.fg { color: #222; } /* Frame 2 - stroke */\n.bg1 { color: #333; } /* Frame 3 - fill */"
    );
  });
});

describe("formatBulk sanitization", () => {
  describe("names starting with a digit", () => {
    const colors = [
      {
        color: "#FF0000",
        label: "100 gray",
        nodeName: "Gray 100",
        property: "fill",
      },
    ];

    it("prefixes with _ for CSS class in bulk", () => {
      const result = formatBulk(colors, "css", "camel");
      expect(result).toBe(
        "._100Gray { color: #FF0000; } /* Gray 100 - fill */"
      );
    });

    it("does NOT prefix for CSS variable in bulk", () => {
      const result = formatBulk(colors, "cssVariable", "camel");
      expect(result).toBe(
        ":root {\n  --100Gray: #FF0000 /* Gray 100 - fill */;\n}"
      );
    });

    it("does NOT prefix for JSON in bulk", () => {
      const result = formatBulk(colors, "json", "camel");
      expect(result).toBe('{\n  "100Gray": "#FF0000"\n}');
    });

    it("prefixes with _ for TypeScript in bulk", () => {
      const result = formatBulk(colors, "typescript", "camel");
      expect(result).toBe(
        'export const _100Gray: string = "#FF0000"; // Gray 100 - fill'
      );
    });
  });

  describe("names with only special characters", () => {
    const colors = [
      {
        color: "#FF0000",
        label: "*",
        nodeName: "Star Icon",
        property: "fill",
      },
    ];

    it("resolves to readable symbol name for JSON in bulk", () => {
      const result = formatBulk(colors, "json", "camel");
      expect(result).toBe('{\n  "star": "#FF0000"\n}');
    });

    it("resolves to readable symbol name for CSS class in bulk", () => {
      const result = formatBulk(colors, "css", "camel");
      expect(result).toBe(".star { color: #FF0000; } /* Star Icon - fill */");
    });

    it("resolves to readable symbol name for Sass in bulk", () => {
      const result = formatBulk(colors, "sass", "camel");
      expect(result).toBe("$star: #FF0000; // Star Icon - fill");
    });
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
