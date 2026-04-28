import { describe, expect, it } from "vitest";
import { buildCoverPromptRequest } from "../src/features/images/cover-prompt";

describe("buildCoverPromptRequest", () => {
  it("builds cover prompt system and user messages", () => {
    const request = buildCoverPromptRequest({
      articleTitle: "LLM Wiki：一种新的知识库方法",
      articleContent: "# LLM Wiki\n\n这里的理念有所不同。",
      articleType: "Methodology",
      coverType: "conceptual",
      style: "editorial",
      palette: "default",
      mood: "balanced",
      font: "clean",
      textLevel: "title-only",
      aspect: "2.35:1",
    });

    expect(request.system).toContain("AI cover image prompt engineer");
    expect(request.system).toContain("Return only the final prompt JSON");
    expect(request.system).not.toContain("rendering");

    expect(request.user).toContain("### Article");
    expect(request.user).toContain("### User Selected Options");
    expect(request.user).toContain("### Program Selected Options");
    expect(request.user).toContain("### Selected Definitions");
    expect(request.user).toContain("### Output JSON Shape");
    expect(request.user).toContain("LLM Wiki：一种新的知识库方法");
    expect(request.user).toContain("conceptual");
    expect(request.user).toContain("editorial");
    expect(request.user).toContain("2.35:1");
    expect(request.user).toContain("Concept visualization, abstract core ideas");
    expect(request.user).toContain("Magazine-style editorial infographic");
    expect(request.user).not.toContain("Rendering:");
  });
});
