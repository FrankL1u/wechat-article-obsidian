import { describe, expect, it } from "vitest";
import { renderAuthorMarkdown } from "../src/features/workbench/author-content";

describe("author content", () => {
  it("renders markdown and resolves Obsidian image embeds", () => {
    const html = renderAuthorMarkdown(
      "# 关于作者\n\n你好，我是**刘 Sir.2035**。\n\n![[tip-notebook-cover.png]]",
      (target) => `app://obsidian/${target}`,
    );

    expect(html).toContain("<h1>关于作者</h1>");
    expect(html).toContain("<strong>刘 Sir.2035</strong>");
    expect(html).toContain('src="app://obsidian/tip-notebook-cover.png"');
  });
});
