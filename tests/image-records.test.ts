import { mkdtempSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildArtifactDateStamp,
  buildConfigHash,
  buildImageId,
  buildTargetHash,
  getImageAssetDirectory,
  getImageRecordPath,
  readImageRecord,
  writeImageRecord,
} from "../src/features/images/image-records";
import { buildArticleAssetId } from "../src/features/images/article-asset-id";
import { parseManagedImageId } from "../src/features/images/managed-image-path";

describe("image record helpers", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it("builds stable image ids from source, target, and config hashes", () => {
    const targetHash = buildTargetHash({ targetBlockKey: "paragraph:3:方法拆解:流程", inlineType: "flowchart" });
    const configHash = buildConfigHash({ style: "editorial", palette: "default", inlineType: "flowchart" });
    const keyA = buildImageId("Inbox/test.md", "article-hash", targetHash, configHash);
    const keyB = buildImageId("Inbox/test.md", "article-hash", targetHash, configHash);

    expect(keyA).toBe(keyB);
  });

  it("reads and writes dated image records inside the article asset directory", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "wao-image-records-"));
    tempDirs.push(tempDir);
    const imageId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const recordDate = new Date("2026-04-23T00:00:00Z");

    const sourcePath = "Inbox/test.md";
    const directory = getImageAssetDirectory("/vault", sourcePath);
    expect(directory.relativeDir).toBe(`_wechat-article-assets/${buildArticleAssetId("Inbox/test.md")}`);

    writeImageRecord(tempDir, imageId, {
      imageId,
      kind: "inline",
      sourcePath,
      articleHash: "article",
      targetHash: "target",
      configHash: "config",
      prompt: "{\"prompt\":true}",
      promptHash: "prompt-hash",
      style: "editorial",
      palette: "default",
      inlineType: "flowchart",
      providerIdentity: {
        provider: "qwen",
        model: "qwen-image-2.0",
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        sizeKind: "article",
      },
      targetSnapshot: {
        kind: "inline",
        targetKind: "paragraph",
        targetBlockKey: "paragraph:1:第二节:第二段",
        sectionTitle: "第二节",
        excerpt: "第二段",
        inlineType: "flowchart",
        style: "editorial",
        source: "llm",
      },
      relativePath: `_wechat-article-assets/${buildArticleAssetId(sourcePath)}/wao-inline-2026-4-23-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    }, recordDate);

    expect(existsSync(getImageRecordPath(tempDir, imageId, recordDate))).toBe(true);
    expect(readImageRecord(tempDir, imageId)?.palette).toBe("default");
    expect(parseManagedImageId(`_wechat-article-assets/${buildArticleAssetId(sourcePath)}/wao-inline-2026-4-23-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png`)).toBe(imageId);
    expect(getImageRecordPath(tempDir, imageId, recordDate)).toContain(`${buildArtifactDateStamp(recordDate)}-image-record-${imageId}.json`);
  });
});
