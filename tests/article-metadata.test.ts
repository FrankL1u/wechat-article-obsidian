import { describe, expect, it } from "vitest";
import { resolveArticlePublishStats } from "../src/features/preview/article-metadata";

describe("article metadata", () => {
  it("extracts publish date, read count, and like count from frontmatter", () => {
    expect(resolveArticlePublishStats(`---
published_at: 2026-3-20
read_count: 12
like_count: 3
---

# 标题`)).toEqual({
      publishedAt: "2026-3-20",
      readCount: 12,
      likeCount: 3,
    });
  });

  it("does not expose publish stats when the article has no publish date", () => {
    expect(resolveArticlePublishStats("# 标题\n\n正文")).toBeNull();
    expect(resolveArticlePublishStats(`---
read_count: 12
like_count: 3
---

# 标题`)).toBeNull();
  });
});
