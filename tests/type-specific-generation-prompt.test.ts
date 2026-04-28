import { describe, expect, it } from "vitest";
import { buildTypeSpecificGenerationRequest } from "../src/features/images/type-specific-generation-prompt";

describe("buildTypeSpecificGenerationRequest", () => {
  it("builds a single-turn request for typeSpecific generation", () => {
    const request = buildTypeSpecificGenerationRequest(
      "# LLM Wiki\n\n这里的理念有所不同。LLM 并非仅在查询时从原始文档中检索，而是逐步构建并维护一个持久的 wiki。",
      {
        outline: [
          {
            id: "illustration-1",
            positionType: "paragraph",
            locationText: "核心想法部分解释差异的那一段",
            excerpt: "这里的理念有所不同。LLM 并非仅在查询时从原始文档中检索，而是逐步构建并维护一个持久的 wiki。",
            sectionTitle: "核心想法",
            purpose: "帮助读者理解核心差异",
            inlineType: "infographic",
            visualContent: "对比传统检索与 LLM Wiki 的核心差异",
          },
        ],
      },
      JSON.stringify(
        {
          templates: {
            infographic: {
              template: "TITLE: [Title] - Data Visualization",
              output: {
                title: "string",
                layout: "string",
                zones: "string[]",
                labels: "string",
              },
            },
          },
        },
        null,
        2,
      ),
    );

    expect(request.system).toContain("Return only illustrationId and typeSpecific");
    expect(request.system).toContain("Do NOT return frontmatter");
    expect(request.user).toContain("### 1. Article Text");
    expect(request.user).toContain("### 2. Outline");
    expect(request.user).toContain("### 3. Type-Specific Templates");
    expect(request.user).toContain("### 5. Output Example");
    expect(request.user).toContain("illustration-1");
    expect(request.user).toContain("TITLE: [Title] - Data Visualization");
    expect(request.user).toContain("LLM Wiki");
  });
});
