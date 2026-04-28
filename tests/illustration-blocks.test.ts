import { describe, expect, it } from "vitest";
import { extractIllustrationBlocks } from "../src/features/images/illustration-blocks";

describe("extractIllustrationBlocks", () => {
  it("builds unified section and paragraph blocks from the same markdown source", () => {
    const markdown = [
      "---",
      "title: 测试文章",
      "---",
      "",
      "# 测试文章",
      "",
      "导语第一段，先抛出问题。",
      "",
      "## 核心想法",
      "",
      "这里解释为什么要做这件事。",
      "",
      "### 方法拆解",
      "",
      "这个流程分成三个步骤：先收集信息，再搭建框架，最后验证结果。",
      "",
    ].join("\n");

    const blocks = extractIllustrationBlocks(markdown);

    expect(blocks.sections).toEqual([
      expect.objectContaining({
        kind: "section",
        level: 2,
        sectionTitle: "核心想法",
      }),
      expect.objectContaining({
        kind: "section",
        level: 3,
        sectionTitle: "方法拆解",
      }),
    ]);

    expect(blocks.paragraphs).toEqual([
      expect.objectContaining({
        kind: "paragraph",
        sectionTitle: "测试文章",
        excerpt: "导语第一段，先抛出问题。",
      }),
      expect.objectContaining({
        kind: "paragraph",
        sectionTitle: "核心想法",
        excerpt: "这里解释为什么要做这件事。",
      }),
      expect.objectContaining({
        kind: "paragraph",
        sectionTitle: "方法拆解",
        excerpt: "这个流程分成三个步骤：先收集信息，再搭建框架，最后验证结果。",
      }),
    ]);
  });
});
