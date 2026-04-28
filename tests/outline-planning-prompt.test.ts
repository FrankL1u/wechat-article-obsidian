import { describe, expect, it } from "vitest";
import { buildOutlinePlanningRequest } from "../src/features/images/outline-planning-prompt";

describe("buildOutlinePlanningRequest", () => {
  it("builds a single-turn request from markdown and image options", () => {
    const request = buildOutlinePlanningRequest(
      "# 标题\n\n## 核心想法\n\n这里的理念有所不同。",
      {
        coverType: "conceptual",
        style: "editorial",
        palette: "default",
        inlineMode: "minimal",
        inlineType: "framework",
      },
    );

    expect(request.system).toContain("inline illustration outline");
    expect(request.system).toContain("Position distribution balance rules");
    expect(request.system).toContain("Article type classification rules");
    expect(request.user).toContain("Article Text");
    expect(request.user).toContain("Article Types");
    expect(request.user).toContain("Illustration density");
    expect(request.user).toContain("Output Example");
    expect(request.user).toContain("这里的理念有所不同");
    expect(request.user).toContain('"type": "Technical"');
    expect(request.user).not.toContain('"scenarios"');
  });
});
