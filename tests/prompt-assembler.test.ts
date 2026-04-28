import { describe, expect, it } from "vitest";
import { assembleFinalPromptPayload } from "../src/features/images/prompt-assembler";

describe("prompt assembler", () => {
  it("assembles one prompt item from typeSpecific result and illustration type map", () => {
    const result = assembleFinalPromptPayload(
      {
        prompts: [
          {
            illustrationId: "illustration-1",
            typeSpecific: {
              title: "LLM Wiki vs Traditional RAG - Core Method Comparison",
              leftSide: ["Traditional RAG", "No persistent knowledge structure"],
              rightSide: ["LLM Wiki", "Persistent structured wiki"],
              divider: "A central vertical divider",
            },
          },
        ],
      },
      {
        "illustration-1": "comparison",
      },
      "editorial",
      "default",
    );

    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]).toMatchObject({
      illustrationId: "illustration-1",
      frontmatter: {
        illustration_id: "01",
        type: "comparison",
        style: "editorial",
        palette: "default",
      },
      typeSpecific: {
        title: "LLM Wiki vs Traditional RAG - Core Method Comparison",
      },
      style: {
        key: "editorial",
      },
      aspect: "16:9",
      globalDefaults: {
        composition: expect.any(String),
        colorRule: expect.any(String),
        textRule: expect.any(String),
      },
    });
    expect(result.prompts[0].palette).toEqual({
      key: "default",
      mode: "follow-style",
      description: "Follow the selected style's default palette.",
    });
  });

  it("uses explicit palette definition when palette is not default", () => {
    const result = assembleFinalPromptPayload(
      {
        prompts: [
          {
            illustrationId: "illustration-2",
            typeSpecific: {
              title: "Knowledge Management - Data Visualization",
              layout: "grid",
              zones: ["Zone 1", "Zone 2", "Zone 3"],
              labels: "index.md, log.md",
            },
          },
        ],
      },
      {
        "illustration-2": "infographic",
      },
      "blueprint",
      "macaron",
    );

    expect(result.prompts[0].frontmatter).toEqual({
      illustration_id: "01",
      type: "infographic",
      style: "blueprint",
      palette: "macaron",
    });
    expect(result.prompts[0].palette).toMatchObject({
      key: "macaron",
      zh: "马卡龙柔和彩块",
      title: "macaron",
    });
  });

  it("throws when illustration type map is missing an id", () => {
    expect(() =>
      assembleFinalPromptPayload(
        {
          prompts: [
            {
              illustrationId: "illustration-3",
              typeSpecific: {
                title: "System Workflow",
                layout: "left-right",
                steps: ["Ingest", "Query", "Check"],
                connections: "Arrows between steps",
              },
            },
          ],
        },
        {},
        "scientific",
        "default",
      ),
    ).toThrow("missing_illustration_type");
  });
});
