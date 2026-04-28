import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("plugin styles", () => {
  it("ships a self-contained root styles.css without runtime imports", () => {
    const rootPath = path.resolve(process.cwd(), "styles.css");
    const css = readFileSync(rootPath, "utf8");

    expect(css).not.toMatch(/@import\s+/);
    expect(css).toContain("src/features/workbench/styles/design-tokens.css");
    expect(css).toContain(".wao-dropdown__trigger");
    expect(css).toContain(".wao-primary-button");
  });
});
