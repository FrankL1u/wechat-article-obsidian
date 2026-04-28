import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getOutlinePlanArtifactPath,
  getTypeSpecificArtifactPath,
  writeOutlinePlanArtifact,
  writeTypeSpecificArtifact,
} from "../src/features/images/planning-artifacts";
import { buildArticleAssetId } from "../src/features/images/article-asset-id";

describe("planning artifacts", () => {
  it("writes outline and typeSpecific snapshots into the article asset directory", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wao-outline-cache-"));
    const sourcePath = "Inbox/test.md";
    const artifactDate = new Date("2026-04-23T00:00:00Z");
    const outlinePath = getOutlinePlanArtifactPath(dir, sourcePath, artifactDate);
    const typeSpecificPath = getTypeSpecificArtifactPath(dir, sourcePath, artifactDate);

    writeOutlinePlanArtifact(dir, sourcePath, {
      articleType: "技术拆解",
      coreArguments: ["A"],
      imageCount: 1,
      outline: [],
    }, {
      sourcePath,
      inlineMode: "balanced",
      inlineType: "auto",
      style: "editorial",
      palette: "default",
      llmModel: "deepseek-chat",
      llmBaseUrl: "https://api.deepseek.com/",
    }, artifactDate);

    writeTypeSpecificArtifact(dir, sourcePath, {
      prompts: [
        {
          illustrationId: "illustration-1",
          typeSpecific: { title: "A" },
        },
      ],
    }, artifactDate);

    expect(outlinePath).toBe(path.join(dir, "_wechat-article-assets", buildArticleAssetId(sourcePath), "2026-4-23-outline.json"));
    const snapshot = JSON.parse(fs.readFileSync(outlinePath, "utf8")) as {
      input: {
        sourcePath: string;
        inlineMode: string;
        inlineType: string;
        style: string;
        palette: string;
        llmModel?: string;
        llmBaseUrl?: string;
      };
      output: { articleType: string };
    };
    expect(snapshot.input).toMatchObject({
      sourcePath,
      inlineMode: "balanced",
      inlineType: "auto",
      style: "editorial",
      palette: "default",
      llmModel: "deepseek-chat",
      llmBaseUrl: "https://api.deepseek.com/",
    });
    expect(snapshot.output.articleType).toBe("技术拆解");
    const typeSpecificSnapshot = JSON.parse(fs.readFileSync(typeSpecificPath, "utf8")) as {
      prompts: Array<{ illustrationId: string }>;
    };
    expect(typeSpecificSnapshot.prompts[0]?.illustrationId).toBe("illustration-1");
  });
});
