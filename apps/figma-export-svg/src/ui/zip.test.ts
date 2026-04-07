import { afterAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createZip } from "./zip";

const TEST_DIR = mkdtempSync(join(tmpdir(), "zip-test-"));

afterAll(() => {
  rmSync(TEST_DIR, { force: true, recursive: true });
});

function unzip(zipPath: string, outDir: string) {
  execSync(`unzip -o "${zipPath}" -d "${outDir}"`, { stdio: "pipe" });
}

function extractAndRead(zipPath: string, fileName: string): string {
  const outDir = join(TEST_DIR, `ext-${Date.now()}`);
  unzip(zipPath, outDir);
  return readFileSync(join(outDir, fileName), "utf-8");
}

function validateZip(zipPath: string) {
  const out = execSync(`unzip -t "${zipPath}"`, {
    encoding: "utf-8",
    stdio: "pipe",
  });
  if (!out.includes("No errors detected")) {
    throw new Error(`Invalid zip: ${out}`);
  }
  return out;
}

// --- CRC32 ---

describe("crc32", () => {
  it("computes CRC32 of empty string", () => {
    // CRC32 of empty data is 0x00000000
    const blob = createZip([{ content: "", fileName: "empty.txt" }]);
    const path = join(TEST_DIR, "crc-empty.zip");
    Bun.write(path, blob);
    expect(validateZip(path)).toContain("empty.txt");
    expect(extractAndRead(path, "empty.txt")).toBe("");
  });

  it("computes correct CRC32 for known content", () => {
    const blob = createZip([
      { content: "Hello, World!", fileName: "test.txt" },
    ]);
    const path = join(TEST_DIR, "crc-known.zip");
    Bun.write(path, blob);
    expect(validateZip(path)).toContain("test.txt");
    expect(extractAndRead(path, "test.txt")).toBe("Hello, World!");
  });
});

// --- Single file ---

describe("single file zip", () => {
  it("produces valid zip with correct content", () => {
    const blob = createZip([
      { content: "Hello, World!", fileName: "hello.txt" },
    ]);
    const path = join(TEST_DIR, "single.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "hello.txt")).toBe("Hello, World!");
  });

  it("handles empty file content", () => {
    const blob = createZip([{ content: "", fileName: "empty.txt" }]);
    const path = join(TEST_DIR, "empty.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "empty.txt")).toBe("");
  });

  it("preserves unicode content", () => {
    const content = "<svg xmlns='http://www.w3.org/2000/svg'>你好世界</svg>";
    const blob = createZip([{ content, fileName: "icon.svg" }]);
    const path = join(TEST_DIR, "unicode.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "icon.svg")).toBe(content);
  });

  it("preserves SVG content exactly", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
</svg>`;
    const blob = createZip([{ content: svg, fileName: "circle.svg" }]);
    const path = join(TEST_DIR, "svg-exact.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "circle.svg")).toBe(svg);
  });
});

// --- Multiple files ---

describe("multiple file zip", () => {
  it("produces valid zip with all files", () => {
    const blob = createZip([
      { content: "A", fileName: "a.txt" },
      { content: "BB", fileName: "b.txt" },
      { content: "CCC", fileName: "c.txt" },
    ]);
    const path = join(TEST_DIR, "multi.zip");
    Bun.write(path, blob);
    const result = validateZip(path);
    expect(result).toContain("a.txt");
    expect(result).toContain("b.txt");
    expect(result).toContain("c.txt");
    expect(extractAndRead(path, "a.txt")).toBe("A");
    expect(extractAndRead(path, "b.txt")).toBe("BB");
    expect(extractAndRead(path, "c.txt")).toBe("CCC");
  });

  it("handles mix of SVG and text files", () => {
    const blob = createZip([
      { content: "<svg>icon1</svg>", fileName: "icon1.svg" },
      { content: "export function Icon1() {}", fileName: "Icon1.tsx" },
      { content: "<svg>icon2</svg>", fileName: "icon2.svg" },
      { content: "export function Icon2() {}", fileName: "Icon2.tsx" },
    ]);
    const path = join(TEST_DIR, "mixed.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "icon1.svg")).toBe("<svg>icon1</svg>");
    expect(extractAndRead(path, "Icon1.tsx")).toBe(
      "export function Icon1() {}"
    );
    expect(extractAndRead(path, "icon2.svg")).toBe("<svg>icon2</svg>");
    expect(extractAndRead(path, "Icon2.tsx")).toBe(
      "export function Icon2() {}"
    );
  });
});

// --- File names ---

describe("file names", () => {
  it("handles sanitized file names with underscores", () => {
    const blob = createZip([
      { content: "test", fileName: "my_icon_component.svg" },
    ]);
    const path = join(TEST_DIR, "sanitized.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "my_icon_component.svg")).toBe("test");
  });

  it("handles nested path-like names", () => {
    const blob = createZip([{ content: "data", fileName: "icons/star.svg" }]);
    const path = join(TEST_DIR, "nested.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "icons/star.svg")).toBe("data");
  });
});

// --- Large content ---

describe("large content", () => {
  it("handles large SVG content (10KB+)", () => {
    const paths = Array.from(
      { length: 2000 },
      (_, i) => `M${i} ${i} L${i + 10} ${i + 10}`
    ).join(" ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
    expect(svg.length).toBeGreaterThan(10_000);

    const blob = createZip([{ content: svg, fileName: "large.svg" }]);
    const path = join(TEST_DIR, "large.zip");
    Bun.write(path, blob);
    validateZip(path);
    expect(extractAndRead(path, "large.svg")).toBe(svg);
  });
});

// --- Blob metadata ---

describe("blob output", () => {
  it("returns a Blob with correct MIME type", () => {
    const blob = createZip([{ content: "test", fileName: "t.txt" }]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/zip");
  });

  it("produces non-empty output", () => {
    const blob = createZip([{ content: "test", fileName: "t.txt" }]);
    expect(blob.size).toBeGreaterThan(0);
  });
});
