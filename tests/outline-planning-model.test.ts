import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOutlineWithModel } from "../src/features/images/outline-planning-model";

const SETTINGS = {
  llmEndpointType: "openai",
  llmBaseUrl: "https://api.example.com",
  llmApiKey: "sk-test",
  llmModel: "test-model",
  llmTimeoutSeconds: 60,
} as const;

const OPTIONS = {
  coverType: "conceptual",
  style: "多格漫画说明风",
  palette: "default",
  inlineMode: "minimal",
  inlineType: "framework",
} as const;

describe("buildOutlineWithModel", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl;
    vi.restoreAllMocks();
  });

  it("returns final outline from one model response", async () => {
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                articleType: "技术拆解",
                coreArguments: ["A", "B"],
                imageCount: 1,
                outline: [
                  {
                    id: "illustration-1",
                    positionType: "paragraph",
                    locationText: "方法论解释段落",
                    excerpt: "这里的理念有所不同。",
                    sectionTitle: "核心想法",
                    purpose: "解释核心差异",
                    inlineType: "framework",
                    visualContent: "展示结构关系",
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

    const result = await buildOutlineWithModel(SETTINGS, "# 标题\n\n正文", OPTIONS);

    expect(requestUrlMock).toHaveBeenCalledOnce();
    expect(result.outline).toHaveLength(1);
    expect(result.outline[0].inlineType).toBe("framework");
  });

  it("throws when model output cannot be parsed into outline", async () => {
    (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        choices: [{ message: { content: "{\"bad\":true}" } }],
      },
      text: "",
    });

    await expect(buildOutlineWithModel(SETTINGS, "# 标题\n\n正文", OPTIONS)).rejects.toThrow("invalid_outline");
  });
});
