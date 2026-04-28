import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTypeSpecificWithModel,
  buildUsedTypeSpecificTemplates,
  readTypeSpecificTemplates,
} from "../src/features/images/type-specific-generation-model";

const SETTINGS = {
  llmEndpointType: "openai",
  llmBaseUrl: "https://api.example.com",
  llmApiKey: "sk-test",
  llmModel: "test-model",
  llmTimeoutSeconds: 60,
} as const;

describe("type-specific generation model", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl;
    vi.restoreAllMocks();
  });

  it("reads type-specific templates from jsonc", () => {
    const templates = readTypeSpecificTemplates();
    expect(templates.templates.infographic).toBeTruthy();
    expect(templates.templates.infographic.scenarios).toEqual(
      expect.arrayContaining(["Tech, AI, programming, development, code"]),
    );
    expect(templates.templates.framework.output.nodes).toBe("string[]");
  });

  it("includes only used templates", () => {
    const used = buildUsedTypeSpecificTemplates({
      outline: [
        {
          id: "illustration-1",
          positionType: "paragraph",
          locationText: "位置",
          excerpt: "摘录",
          sectionTitle: "章节",
          purpose: "目的",
          inlineType: "framework",
          visualContent: "内容",
        },
      ],
    });

    expect(used).toContain("\"framework\"");
    expect(used).not.toContain("\"timeline\"");
  });

  it("returns typeSpecific payload from one model response", async () => {
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                prompts: [
                  {
                    illustrationId: "illustration-1",
                    typeSpecific: {
                      title: "LLM Wiki - Data Visualization",
                      layout: "side-by-side comparison layout",
                      zones: [
                        "Zone 1 (Left): Traditional retrieval over raw documents",
                        "Zone 2 (Right): Persistent structured wiki maintained over time",
                      ],
                      labels: "raw documents, structured wiki",
                    },
                  },
                ],
              }),
            },
          },
        ],
      },
      text: "",
    });
    (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl = requestUrlMock;

    const result = await buildTypeSpecificWithModel(
      SETTINGS,
      "# LLM Wiki\n\n这里的理念有所不同。",
      {
        outline: [
          {
            id: "illustration-1",
            positionType: "paragraph",
            locationText: "方法论解释段落",
            excerpt: "这里的理念有所不同。",
            sectionTitle: "核心想法",
            purpose: "解释核心差异",
            inlineType: "infographic",
            visualContent: "展示结构关系",
          },
        ],
      },
    );

    expect(requestUrlMock).toHaveBeenCalledOnce();
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].illustrationId).toBe("illustration-1");
    expect(result.prompts[0].typeSpecific.title).toBe("LLM Wiki - Data Visualization");
  });
});
