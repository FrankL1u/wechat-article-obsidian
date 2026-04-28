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
});
