import { describe, expect, it } from "vitest";
import {
  extractCoverRegenerationOptions,
  rebuildCoverPromptForRegeneration,
} from "../src/features/images/cover-regeneration";

describe("cover regeneration prompt helpers", () => {
  const prompt = JSON.stringify({
    type: "cover",
    frontmatter: {
      type: "cover",
      style: "editorial",
      palette: "default",
    },
    contentContext: {
      articleTitle: "标题",
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
    textElements: {
      instruction: "Title: 标题",
    },
    moodApplication: {
      instruction: "Use medium contrast.",
    },
    fontApplication: {
      instruction: "Use clean geometric sans-serif typography.",
    },
  }, null, 2);

  it("extracts cover dimensions from a stored cover prompt", () => {
    expect(extractCoverRegenerationOptions(prompt)).toEqual({
      style: "editorial",
      palette: "default",
      coverType: "conceptual",
      mood: "balanced",
      aspect: "2.35:1",
      font: "clean",
      textLevel: "title-only",
    });
  });

  it("patches only selected cover dimensions into the stored cover prompt", () => {
    const rebuilt = JSON.parse(rebuildCoverPromptForRegeneration(prompt, {
      style: "warm",
      palette: "macaron",
      coverType: "metaphor",
      mood: "bold",
      aspect: "16:9",
      font: "display",
      textLevel: "text-rich",
    })) as {
      frontmatter: Record<string, unknown>;
      visualDesign: Record<string, unknown>;
      textElements: Record<string, unknown>;
      moodApplication: Record<string, unknown>;
      fontApplication: Record<string, unknown>;
    };

    expect(rebuilt.frontmatter.style).toBe("warm");
    expect(rebuilt.frontmatter.palette).toBe("macaron");
    expect(rebuilt.visualDesign.type).toBe("metaphor");
    expect(rebuilt.visualDesign.style).toBe("warm");
    expect(rebuilt.visualDesign.palette).toBe("macaron");
    expect(rebuilt.visualDesign.mood).toBe("bold");
    expect(rebuilt.visualDesign.aspectRatio).toBe("16:9");
    expect(rebuilt.visualDesign.font).toBe("display");
    expect(rebuilt.visualDesign.textLevel).toBe("text-rich");
    expect(rebuilt.textElements.instruction).toContain("Title / Subtitle / Tags");
    expect(rebuilt.moodApplication.instruction).toContain("high contrast");
    expect(rebuilt.fontApplication.instruction).toContain("display typography");
  });
});
