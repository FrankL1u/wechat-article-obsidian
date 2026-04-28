import { describe, expect, it } from "vitest";
import { loadBuiltInThemes } from "../src/features/themes/load-themes";
import { renderPreviewDocument } from "../src/features/preview/render-preview";
import { buildArticleAssetId } from "../src/features/images/article-asset-id";

describe("render-preview", () => {
  it("loads the built-in themes from the shared toolkit source", () => {
    const themes = loadBuiltInThemes();

    expect(themes.length).toBeGreaterThan(0);
    expect(themes.some((theme) => theme.key === "wechat-default")).toBe(true);
    expect(themes.some((theme) => theme.key === "latepost-depth")).toBe(true);
  });

  it("renders article HTML with the requested theme key", () => {
    const html = renderPreviewDocument({
      markdown: "# 标题\n\n正文",
      themeKey: "wechat-default",
    });

    expect(html).toContain('data-theme-key="wechat-default"');
    expect(html).toContain("<h1");
    expect(html).toContain("标题");
    expect(html).toContain("<section");
    expect(html).toContain("text-align: center !important;");
    expect(html).not.toContain("theme-badge");
    expect(html).not.toContain("默认风格 | #2c3e50");
  });

  it("keeps the cover image above the title in preview output", () => {
    const html = renderPreviewDocument({
      markdown: "# 标题\n\n![封面](cover.png)\n\n正文",
      themeKey: "wechat-default",
    });

    const imageIndex = html.indexOf('src="cover.png"');
    const titleIndex = html.indexOf(">标题</h1>");

    expect(imageIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(-1);
    expect(imageIndex).toBeLessThan(titleIndex);
  });

  it("does not render source frontmatter when preview markdown starts with a generated cover image", () => {
    const html = renderPreviewDocument({
      markdown: "![封面](cover.png)\n\n---\nauthor: APPSO\nsource: https://example.com\n---\n\n# 标题\n\n正文",
      themeKey: "wechat-default",
    });

    expect(html).not.toContain("author: APPSO");
    expect(html).not.toContain("source: https://example.com");
    expect(html).toContain(">标题</h1>");
    expect(html).toContain("正文");
  });

  it("keeps the title before the first body paragraph when preview markdown contains a generated html cover image", () => {
    const html = renderPreviewDocument({
      markdown: '<img src="cover.png" alt="封面" />\n\n# 标题\n\n第一段',
      themeKey: "wechat-default",
    });

    const imageIndex = html.indexOf('src="cover.png"');
    const titleIndex = html.indexOf(">标题</h1>");
    const bodyIndex = html.indexOf("第一段");

    expect(imageIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(-1);
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(imageIndex).toBeLessThan(titleIndex);
    expect(titleIndex).toBeLessThan(bodyIndex);
  });

  it("rewrites markdown image sources for preview when an asset resolver is provided", () => {
    const assetDir = buildArticleAssetId("01-Inbox/2026-04-16/llm-wiki.md");
    const html = renderPreviewDocument({
      markdown: `![封面](../../_wechat-article-assets/${assetDir}/wao-cover-abc.png)\n\n# 标题\n\n正文`,
      themeKey: "wechat-default",
      resolveAssetUrl: (src) => `app://obsidian/${src.replace(/^(\.\.\/)+/, "")}`,
    });

    expect(html).toContain(`src="app://obsidian/_wechat-article-assets/${assetDir}/wao-cover-abc.png"`);
    expect(html).not.toContain(`src="../../_wechat-article-assets/${assetDir}/wao-cover-abc.png"`);
  });

  it("defines a stable iframe scroll container for preview content", () => {
    const html = renderPreviewDocument({
      markdown: "# 标题\n\n" + "正文\n\n".repeat(50),
      themeKey: "wechat-default",
    });

    expect(html).toContain("html, body {");
    expect(html).toContain("height: 100%;");
    expect(html).toContain("overflow: hidden;");
    expect(html).toContain(".preview-scroll-root {");
    expect(html).toContain("overflow-y: auto;");
    expect(html).toContain("scrollbar-gutter: stable;");
    expect(html).toContain('class="preview-scroll-root"');
  });
});
