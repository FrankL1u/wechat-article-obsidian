import { describe, expect, it } from "vitest";
import { adaptOutlineToPlannedTargets } from "../src/features/images/outline-planning-adapter";
import type { OutlinePlanningResult } from "../src/features/images/outline-planning-types";
import type { ImageOptions } from "../src/features/images/types";

const OPTIONS: ImageOptions = {
  coverType: "conceptual",
  style: "editorial",
  palette: "default",
  inlineMode: "minimal",
  inlineType: "auto",
};

describe("adaptOutlineToPlannedTargets", () => {
  it("maps paragraph outline items back to paragraph block keys", () => {
    const markdown = [
      "# 一篇文章",
      "",
      "## 方法拆解",
      "",
      "这个流程分成三个步骤：先收集信息，再搭建框架，最后验证结果。",
    ].join("\n");

    const outline: OutlinePlanningResult = {
      articleType: "技术拆解",
      coreArguments: ["A"],
      imageCount: 1,
      outline: [
        {
          id: "illustration-1",
          positionType: "paragraph",
          locationText: "方法拆解第一段",
          excerpt: "这个流程分成三个步骤：先收集信息，再搭建框架，最后验证结果。",
          sectionTitle: "方法拆解",
          purpose: "解释流程",
          inlineType: "flowchart",
          visualContent: "展示三步流程",
        },
      ],
    };

    const plan = adaptOutlineToPlannedTargets(markdown, OPTIONS, outline);
    const inline = plan.find((item) => item.kind === "inline");

    expect(inline).toMatchObject({
      kind: "inline",
      targetKind: "paragraph",
      sectionTitle: "方法拆解",
      excerpt: "这个流程分成三个步骤：先收集信息，再搭建框架，最后验证结果。",
      inlineType: "flowchart",
    });
    expect(inline?.targetBlockKey).toContain("paragraph:");
  });

  it("matches paragraph outline excerpts even when markdown emphasis and punctuation differ", () => {
    const markdown = [
      "# 一篇文章",
      "",
      "## 核心想法",
      "",
      "这里的理念有所不同。LLM 并非仅在查询时从原始文档中检索，而是 **逐步构建并维护一个持久的 wiki** ——一个结构化的、相互关联的 markdown 文件集合。",
    ].join("\n");

    const outline: OutlinePlanningResult = {
      articleType: "技术拆解",
      coreArguments: ["A"],
      imageCount: 1,
      outline: [
        {
          id: "illustration-1",
          positionType: "paragraph",
          locationText: "解释核心方法差异的那一段",
          excerpt: "这里的理念有所不同。LLM 并非仅在查询时从原始文档中检索，而是逐步构建并维护一个持久的 wiki。",
          sectionTitle: "核心想法",
          purpose: "解释核心差异",
          inlineType: "comparison",
          visualContent: "展示传统 RAG 与持久 wiki 的区别",
        },
      ],
    };

    const plan = adaptOutlineToPlannedTargets(markdown, OPTIONS, outline);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.targetKind).toBe("paragraph");
    expect(plan[0]?.sectionTitle).toBe("核心想法");
  });

  it("maps section outline items back to section block keys", () => {
    const markdown = [
      "# 一篇文章",
      "",
      "## 架构",
      "",
      "正文一。",
    ].join("\n");

    const outline: OutlinePlanningResult = {
      articleType: "技术拆解",
      coreArguments: ["A"],
      imageCount: 1,
      outline: [
        {
          id: "illustration-1",
          positionType: "section",
          locationText: "架构章节标题后",
          excerpt: "",
          sectionTitle: "架构",
          purpose: "解释架构",
          inlineType: "framework",
          visualContent: "展示整体模块关系",
        },
      ],
    };

    const plan = adaptOutlineToPlannedTargets(markdown, OPTIONS, outline);
    const inline = plan.find((item) => item.kind === "inline");

    expect(inline).toMatchObject({
      kind: "inline",
      targetKind: "section",
      sectionTitle: "架构",
      inlineType: "framework",
    });
    expect(inline?.targetBlockKey).toContain("section:");
  });
});
