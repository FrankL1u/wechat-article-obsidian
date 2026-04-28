import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCoverPromptInput,
  buildCoverPromptWithModel,
} from "../src/features/images/cover-prompt-model";

const SETTINGS = {
  llmEndpointType: "openai",
  llmBaseUrl: "https://api.example.com",
  llmApiKey: "sk-test",
  llmModel: "test-model",
  llmTimeoutSeconds: 60,
} as const;

describe("cover prompt model", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl;
    vi.restoreAllMocks();
  });

  it("builds the default cover prompt input from smart image options", () => {
    const input = buildCoverPromptInput({
      articleTitle: "LLM Wiki：一种新的知识库方法",
      articleContent: "# LLM Wiki\n\n这里的理念有所不同。",
      articleType: "Methodology",
      coverType: "conceptual",
      style: "editorial",
      palette: "default",
    });

    expect(input.coverType).toBe("conceptual");
    expect(input.style).toBe("editorial");
    expect(input.palette).toBe("default");
    expect(input.mood).toBe("balanced");
    expect(input.font).toBe("clean");
    expect(input.textLevel).toBe("title-only");
    expect(input.aspect).toBe("2.35:1");
  });

  it("returns a final cover prompt json from one model response", async () => {
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: "cover",
                frontmatter: {
                  type: "cover",
                  style: "editorial",
                  palette: "default",
                },
                contentContext: {
                  articleTitle: "LLM Wiki：一种新的知识库方法",
                  contentSummary: "文章解释一种持久 Wiki 作为知识中间层的方法。",
                  keywords: ["LLM Wiki", "知识库", "RAG"],
                  articleType: "Methodology",
                  language: "zh",
                },
                visualDesign: {
                  coverTheme: "Persistent knowledge layer",
                  type: "conceptual",
                  style: "editorial",
                  palette: "default",
                  font: "clean",
                  textLevel: "title-only",
                  mood: "balanced",
                  aspectRatio: "2.35:1",
                },
                textElements: {
                  instruction: "Title: LLM Wiki：一种新的知识库方法",
                },
                composition: {
                  mainVisual: "A structured wiki layer between documents and an LLM.",
                },
              }),
            },
          },
        ],
      },
      text: "",
    });
    (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl = requestUrlMock;

    const result = await buildCoverPromptWithModel(
      SETTINGS,
      buildCoverPromptInput({
        articleTitle: "LLM Wiki：一种新的知识库方法",
        articleContent: "# LLM Wiki\n\n这里的理念有所不同。",
        articleType: "Methodology",
        coverType: "conceptual",
        style: "editorial",
        palette: "default",
      }),
    );

    expect(requestUrlMock).toHaveBeenCalledOnce();
    expect(result.type).toBe("cover");
    expect(result.visualDesign.aspectRatio).toBe("2.35:1");
    expect(result.contentContext.language).toBe("zh");
  });
});
