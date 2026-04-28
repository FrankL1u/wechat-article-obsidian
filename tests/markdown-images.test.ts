import { describe, expect, it } from "vitest";
import {
  applyPlannedImagesToMarkdown,
  removeImageFromMarkdown,
  scanMarkdownImages,
  toNoteRelativeMarkdownPath,
} from "../src/features/images/markdown-images";
import { buildArticleAssetId } from "../src/features/images/article-asset-id";
import type { ImageRecord } from "../src/features/images/image-records";
import { extractIllustrationBlocks } from "../src/features/images/illustration-blocks";

describe("markdown image state", () => {
  const articleAssetDir = `_wechat-article-assets/${buildArticleAssetId("01-Inbox/2026-04-16/llm-wiki.md")}`;
  const markdown = `# 标题

第一段正文。

## 第二节

第二段正文。`;

  it("writes planned inline images back into markdown at paragraph and section positions", () => {
    const { paragraphs, sections } = extractIllustrationBlocks(markdown);
    const result = applyPlannedImagesToMarkdown(markdown, [
      {
        target: {
          illustrationId: "illustration-1",
          kind: "inline",
          targetKind: "section",
          targetBlockKey: sections[0]!.blockKey,
          sectionTitle: "第二节",
          inlineType: "framework",
          source: "llm",
          style: "editorial",
        },
        markdownPath: `${articleAssetDir}/wao-inline-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
        alt: "配图 1",
      },
      {
        target: {
          illustrationId: "illustration-2",
          kind: "inline",
          targetKind: "paragraph",
          targetBlockKey: paragraphs[1]!.blockKey,
          sectionTitle: "第二节",
          excerpt: "第二段正文。",
          inlineType: "scene",
          source: "llm",
          style: "editorial",
        },
        markdownPath: `${articleAssetDir}/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png`,
        alt: "配图 2",
      },
    ]);

    expect(result).toContain(`## 第二节\n\n![配图 1](${articleAssetDir}/wao-inline-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png)\n\n第二段正文。`);
    expect(result).toContain(`第二段正文。\n\n![配图 2](${articleAssetDir}/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png)`);
  });

  it("does not insert the same planned inline image more than once", () => {
    const input = `# 标题

## 核心想法

这里的理念有所不同。LLM 并非仅在查询时从原始文档中检索，而是逐步构建并维护一个持久的 wiki。

这是关键区别：wiki 是一个持久的、不断累积的产物。`;
    const { paragraphs } = extractIllustrationBlocks(input);
    const imagePath = `${articleAssetDir}/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png`;

    const result = applyPlannedImagesToMarkdown(input, [
      {
        target: {
          illustrationId: "illustration-1",
          kind: "inline",
          targetKind: "paragraph",
          targetBlockKey: paragraphs[0]!.blockKey,
          sectionTitle: "核心想法",
          excerpt: "这里的理念有所不同。LLM 并非仅在查询时从原始文档中检索，而是逐步构建并维护一个持久的 wiki。",
          inlineType: "comparison",
          source: "llm",
          style: "editorial",
        },
        markdownPath: imagePath,
        alt: "配图",
      },
    ]);

    expect(result.match(/wao-inline-cccccccccccccccccccccccccccccccccccccccc\.png/g)?.length ?? 0).toBe(1);
  });

  it("scans managed and unmanaged markdown images without old prompt metadata", () => {
    const input = `![封面图](${articleAssetDir}/wao-cover-2026-4-27-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png)

# 标题

第一段正文。

![普通图](assets/legacy.png)`;

    const records = new Map<string, ImageRecord>([
      ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
        imageId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        kind: "cover",
        sourcePath: "Inbox/test.md",
        articleHash: "hash",
        targetHash: "target",
        configHash: "config",
        prompt: "{\"prompt\":true}",
        promptHash: "prompt-hash",
        style: "editorial",
        palette: "default",
        coverType: "conceptual",
        providerIdentity: {
          provider: "qwen",
          model: "qwen-image-2.0",
          baseUrl: "https://dashscope.aliyuncs.com/api/v1",
          sizeKind: "cover",
        },
        targetSnapshot: {
          kind: "cover",
          coverType: "conceptual",
          style: "editorial",
        },
        relativePath: `${articleAssetDir}/wao-cover-2026-4-27-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      }],
    ]);

    const scanned = scanMarkdownImages(input, (imageId) => records.get(imageId) ?? null);
    expect(scanned[0]?.managed).toBe(true);
    expect(scanned[0]?.kind).toBe("cover");
    expect(scanned[1]?.managed).toBe(false);
    expect(scanned[1]?.kind).toBe("inline");
  });

  it("infers dated managed cover paths as cover images even when the record is missing", () => {
    const input = `![封面图](${articleAssetDir}/wao-cover-2026-4-27-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png)

# 标题

第一段正文。`;

    const scanned = scanMarkdownImages(input, () => null);
    expect(scanned[0]?.managed).toBe(false);
    expect(scanned[0]?.kind).toBe("cover");
  });

  it("treats leading unmanaged markdown images as inline images", () => {
    const input = `![外部图](assets/hero.png)

# 标题

第一段正文。`;

    const scanned = scanMarkdownImages(input, () => null);
    expect(scanned[0]?.managed).toBe(false);
    expect(scanned[0]?.kind).toBe("inline");
  });

  it("removes image blocks by block index", () => {
    const input = `# 标题

第一段正文。

![配图 1](${articleAssetDir}/wao-inline-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png)

第二段正文。`;

    const removed = removeImageFromMarkdown(input, 2);
    expect(removed).not.toContain("wao-inline-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png");
  });

  it("converts vault asset paths into note-relative markdown paths", () => {
    expect(
      toNoteRelativeMarkdownPath(
        "01-Inbox/2026-04-16/llm-wiki.md",
        `${articleAssetDir}/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
      ),
    ).toBe(`../../_wechat-article-assets/${buildArticleAssetId("01-Inbox/2026-04-16/llm-wiki.md")}/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`);
  });
});
