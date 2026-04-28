import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLlmJsonContent } from "../src/features/images/llm-compatible-client";

describe("requestLlmJsonContent", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl;
    vi.restoreAllMocks();
  });

  it("uses OpenAI-compatible chat completions by default", async () => {
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        choices: [{ message: { content: "{\"status\":\"ok\"}" } }],
      },
      text: "",
    });
    (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl = requestUrlMock;

    const content = await requestLlmJsonContent(
      {
        llmEndpointType: "openai",
        llmBaseUrl: "https://api.example.com/v1",
        llmApiKey: "sk-test",
        llmModel: "test-model",
        llmTimeoutSeconds: 60,
      },
      [
        { role: "system", content: "Return JSON." },
        { role: "user", content: "Ping" },
      ],
    );

    expect(content).toBe("{\"status\":\"ok\"}");
    expect(requestUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://api.example.com/v1/chat/completions",
      headers: expect.objectContaining({ Authorization: "Bearer sk-test" }),
    }));
  });

  it("uses Anthropic-compatible messages when selected", async () => {
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        content: [{ type: "text", text: "{\"status\":\"ok\"}" }],
      },
      text: "",
    });
    (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl = requestUrlMock;

    const content = await requestLlmJsonContent(
      {
        llmEndpointType: "anthropic",
        llmBaseUrl: "https://coding.dashscope.aliyuncs.com/apps/anthropic",
        llmApiKey: "sk-test",
        llmModel: "test-model",
        llmTimeoutSeconds: 60,
      },
      [
        { role: "system", content: "Return JSON." },
        { role: "user", content: "Ping" },
      ],
    );

    expect(content).toBe("{\"status\":\"ok\"}");
    expect(requestUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://coding.dashscope.aliyuncs.com/apps/anthropic/v1/messages",
      headers: expect.objectContaining({
        "x-api-key": "sk-test",
        "anthropic-version": "2023-06-01",
      }),
    }));
    expect(requestUrlMock).not.toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining("/chat/completions"),
    }));
  });
});
