import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("generateImageAsset", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl;
    vi.restoreAllMocks();
    while (tempDirs.length) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it("uses injected Obsidian requestUrl for remote image generation and returns png bytes", async () => {
    const outputDir = path.join(os.tmpdir(), "wao-generate-images-test");
    tempDirs.push(outputDir);
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      text: JSON.stringify({ data: [{ b64_json: Buffer.from("png-bytes").toString("base64") }] }),
      json: { data: [{ b64_json: Buffer.from("png-bytes").toString("base64") }] },
      arrayBuffer: new Uint8Array([1, 2, 3]).buffer,
      headers: {},
    });

    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrlMock }).__waoRequestUrl = requestUrlMock;

    const { generateImageAsset } = await import("../src/features/images/generate-images");
    const result = await generateImageAsset({
      prompt: "test prompt",
      outputDir,
      fileStem: "cover",
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      sizeKind: "cover",
    });

    expect(requestUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.openai.com/v1/images/generations",
        method: "POST",
        throw: false,
      }),
    );
    expect(result.relativeFilename).toBe("cover.png");
    expect(result.buffer).toEqual(Buffer.from("png-bytes"));
  });

  it("does not retry image generation POST requests when the API returns an error", async () => {
    const outputDir = path.join(os.tmpdir(), "wao-generate-images-no-retry-test");
    tempDirs.push(outputDir);
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 500,
      text: "backend overloaded",
      json: { error: "backend overloaded" },
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    });

    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrlMock }).__waoRequestUrl = requestUrlMock;

    const { generateImageAsset } = await import("../src/features/images/generate-images");
    await expect(
      generateImageAsset({
        prompt: "test prompt",
        outputDir,
        fileStem: "cover",
        provider: "openai",
        apiKey: "sk-test",
        model: "gpt-image-1",
        baseUrl: "https://self-hosted.example/v1",
        sizeKind: "cover",
        fallbackOnError: false,
      }),
    ).rejects.toThrow("HTTP 500");

    expect(requestUrlMock).toHaveBeenCalledTimes(1);
    expect(requestUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://self-hosted.example/v1/images/generations",
        method: "POST",
      }),
    );
  });

  it("downloads relative image URLs returned by OpenAI-compatible APIs", async () => {
    const outputDir = path.join(os.tmpdir(), "wao-generate-images-relative-url-test");
    tempDirs.push(outputDir);
    const imageBytes = new Uint8Array([9, 8, 7]).buffer;
    const requestUrlMock = vi.fn(async (request: { url: string }) => {
      if (request.url === "https://self-hosted.example/v1/images/generations") {
        return {
          status: 200,
          text: JSON.stringify({ data: [{ url: "/assets/result.png" }] }),
          json: { data: [{ url: "/assets/result.png" }] },
          arrayBuffer: new ArrayBuffer(0),
          headers: {},
        };
      }

      return {
        status: 200,
        text: "",
        json: {},
        arrayBuffer: imageBytes,
        headers: {},
      };
    });

    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrlMock }).__waoRequestUrl = requestUrlMock;

    const { generateImageAsset } = await import("../src/features/images/generate-images");
    const result = await generateImageAsset({
      prompt: "test prompt",
      outputDir,
      fileStem: "cover",
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://self-hosted.example/v1",
      sizeKind: "cover",
      fallbackOnError: false,
    });

    expect(requestUrlMock).toHaveBeenCalledTimes(2);
    expect(requestUrlMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "https://self-hosted.example/assets/result.png",
      }),
    );
    expect(result.relativeFilename).toBe("cover.png");
    expect(result.buffer).toEqual(Buffer.from(imageBytes));
  });

  it("decodes data image URLs without an extra download request", async () => {
    const outputDir = path.join(os.tmpdir(), "wao-generate-images-data-url-test");
    tempDirs.push(outputDir);
    const encoded = Buffer.from("png-bytes-from-data-url").toString("base64");
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      text: JSON.stringify({ data: [{ url: `data:image/png;base64,${encoded}` }] }),
      json: { data: [{ url: `data:image/png;base64,${encoded}` }] },
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    });

    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrlMock }).__waoRequestUrl = requestUrlMock;

    const { generateImageAsset } = await import("../src/features/images/generate-images");
    const result = await generateImageAsset({
      prompt: "test prompt",
      outputDir,
      fileStem: "cover",
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://self-hosted.example/v1",
      sizeKind: "cover",
      fallbackOnError: false,
    });

    expect(requestUrlMock).toHaveBeenCalledTimes(1);
    expect(result.relativeFilename).toBe("cover.png");
    expect(result.buffer).toEqual(Buffer.from("png-bytes-from-data-url"));
  });

  it("compacts structured JSON prompts before sending them to image APIs", async () => {
    const outputDir = path.join(os.tmpdir(), "wao-generate-images-compact-prompt-test");
    tempDirs.push(outputDir);
    const originalPrompt = JSON.stringify({
      illustrationId: "illustration-2",
      frontmatter: {
        type: "infographic",
        style: "fantasy-animation",
      },
      typeSpecific: {
        title: "企业 AI 瓶颈拆解图",
        layout: "放射状中心障碍图，中心是模型能力，外围是 6 个落地阻碍，右侧连接 5 类真实业务流程",
        zones: [
          "Zone 1: 模型能回答问题",
          "Zone 2: 数据、权限、流程、系统集成、员工使用习惯、ROI 证明",
          "Zone 3: 销售、法务、客服、研发、财务",
        ],
        labels: "模型能回答问题, 数据, 权限, 流程, 系统集成, 员工使用习惯, ROI 证明",
      },
      style: {
        description: "Whimsical hand-drawn animation style inspired by storybook illustration",
        designAesthetic: "x".repeat(4000),
      },
      globalDefaults: {
        composition: "x".repeat(1000),
      },
    });
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 200,
      text: JSON.stringify({ data: [{ b64_json: Buffer.from("png-bytes").toString("base64") }] }),
      json: { data: [{ b64_json: Buffer.from("png-bytes").toString("base64") }] },
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    });

    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrlMock }).__waoRequestUrl = requestUrlMock;

    const { generateImageAsset } = await import("../src/features/images/generate-images");
    await generateImageAsset({
      prompt: originalPrompt,
      outputDir,
      fileStem: "cover",
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://self-hosted.example/v1",
      sizeKind: "article",
      fallbackOnError: false,
    });

    const body = JSON.parse(requestUrlMock.mock.calls[0][0].body);
    expect(body.prompt.length).toBeLessThan(originalPrompt.length);
    expect(body.prompt.length).toBeLessThanOrEqual(1200);
    expect(body.prompt).toContain("企业 AI 瓶颈拆解图");
    expect(body.prompt).toContain("模型能回答问题");
    expect(body.prompt).not.toContain('"illustrationId"');
  });

  it("renders semantic placeholder SVG content instead of raw prompt JSON", async () => {
    const outputDir = path.join(os.tmpdir(), "wao-generate-images-placeholder-test");
    tempDirs.push(outputDir);
    const structuredPrompt = JSON.stringify({
      illustrationId: "illustration-3",
      frontmatter: {
        type: "framework",
        style: "multi-panel-manga",
      },
      typeSpecific: {
        title: "旧规则 vs 新规则",
        structure: "左右对比框架图",
        nodes: ["旧规则：模型公司只卖 API", "新规则：模型公司走进客户现场"],
        labels: "旧规则, 新规则, 客户现场",
      },
    });
    const requestUrlMock = vi.fn().mockResolvedValue({
      status: 500,
      text: "backend overloaded",
      json: { error: "backend overloaded" },
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    });

    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrlMock }).__waoRequestUrl = requestUrlMock;

    const { generateImageAsset } = await import("../src/features/images/generate-images");
    const result = await generateImageAsset({
      prompt: structuredPrompt,
      outputDir,
      fileStem: "inline",
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://self-hosted.example/v1",
      sizeKind: "article",
    });

    const svg = result.buffer.toString("utf8");
    expect(result.relativeFilename).toBe("inline.svg");
    expect(svg).toContain("图片生成失败，已使用语义占位图");
    expect(svg).toContain("画面主题：旧规则 vs 新规则");
    expect(svg).toContain("图片类型：framework");
    expect(svg).toContain("旧规则：模型公司只卖 API");
    expect(svg).not.toContain("illustrationId");
    expect(svg).not.toContain("frontmatter");
    expect(svg).not.toContain("{");
  });
});
