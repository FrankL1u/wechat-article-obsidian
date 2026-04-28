import { describe, expect, it } from "vitest";
import { readArticleTypes } from "../src/features/images/article-types";

describe("article-types", () => {
  it("reads article type definitions from jsonc", () => {
    const definitions = readArticleTypes();

    expect(definitions.article_types.length).toBeGreaterThan(0);
    expect(definitions.article_types.map((item) => item.type)).toEqual(
      expect.arrayContaining(["Technical", "Tutorial", "Methodology"]),
    );
  });
});
