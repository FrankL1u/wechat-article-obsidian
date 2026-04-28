import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildArticleAssetId } from "../src/features/images/article-asset-id";
import { readImageRecord } from "../src/features/images/image-records";
import { generateCoverImageAsset } from "../src/features/images/cover-image-generation";

const SETTINGS = {
  imageProvider: "openai",
  apiKey: "",
  model: "gpt-image-1",
  baseUrl: "https://api.openai.com/v1",
  imageTimeoutSeconds: 60,
} as const;

describe("generateCoverImageAsset", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it("writes a cover image file and image record into the article asset directory", async () => {
    const vaultBasePath = mkdtempSync(path.join(os.tmpdir(), "wao-cover-generation-"));
    tempDirs.push(vaultBasePath);

    const result = await generateCoverImageAsset({
      vaultBasePath,
      sourcePath: "01-Inbox/llm-wiki.md",
      articleMarkdown: "# LLM Wiki\n\n这里的理念有所不同。",
      promptJson: {
        type: "cover",
        frontmatter: {
          type: "cover",
          style: "editorial",
          palette: "default",
        },
        contentContext: {
          articleTitle: "LLM Wiki：一种新的知识库方法",
          articleType: "Methodology",
          language: "zh",
        },
        visualDesign: {
          type: "conceptual",
          style: "editorial",
          palette: "default",
          mood: "balanced",
          font: "clean",
          textLevel: "title-only",
          aspectRatio: "2.35:1",
        },
      },
      style: "editorial",
      palette: "default",
      coverType: "conceptual",
      provider: SETTINGS,
      date: new Date("2026-04-26T00:00:00Z"),
    });

    expect(result.kind).toBe("cover");
    expect(result.relativePath).toContain(`_wechat-article-assets/${buildArticleAssetId("01-Inbox/llm-wiki.md")}/wao-cover-2026-4-26-`);
    expect(result.relativePath.endsWith(".svg")).toBe(true);

    const absolutePath = path.join(vaultBasePath, result.relativePath);
    expect(existsSync(absolutePath)).toBe(true);
    expect(readFileSync(absolutePath, "utf8")).toContain("图片生成失败，已使用占位图");

    const record = readImageRecord(path.dirname(absolutePath), result.imageId);
    expect(record?.kind).toBe("cover");
    expect(record?.coverType).toBe("conceptual");
    expect(record?.coverMood).toBe("balanced");
    expect(record?.coverAspect).toBe("2.35:1");
    expect(record?.coverFont).toBe("clean");
    expect(record?.coverTextLevel).toBe("title-only");
    expect(record?.style).toBe("editorial");
    expect(record?.palette).toBe("default");
    expect(record?.providerIdentity.sizeKind).toBe("cover");
    expect(record?.prompt).toContain("\"type\": \"cover\"");
    expect(record?.relativePath).toBe(result.relativePath);
  });
});
