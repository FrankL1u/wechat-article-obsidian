import path from "node:path";

type ProviderName = "openai" | "gemini" | "doubao" | "qwen";

interface GenerateImageOptions {
  prompt: string;
  outputDir: string;
  fileStem: string;
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  sizeKind: "cover" | "article";
  timeoutMs?: number;
  fallbackOnError?: boolean;
}

const SIZE_MAP: Record<GenerateImageOptions["sizeKind"], Record<ProviderName, string>> = {
  cover: {
    gemini: "2.35:1",
    openai: "1536x1024",
    doubao: "1280x544",
    qwen: "1880*800",
  },
  article: {
    gemini: "16:9",
    openai: "1536x1024",
    doubao: "1280x720",
    qwen: "2048*1152",
  },
};

interface HttpResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface RequestUrlResponseLike {
  status: number;
  headers: Record<string, string>;
  arrayBuffer: ArrayBuffer;
  json: unknown;
  text: string;
}

type ObsidianRequestUrl = (request: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  contentType?: string;
  body?: string | ArrayBuffer;
  throw?: boolean;
}) => Promise<RequestUrlResponseLike>;

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

async function httpRequest(url: string, init: RequestInit, timeoutMs: number): Promise<HttpResponseLike> {
  const headers = normalizeHeaders(init.headers);
  const body = typeof init.body === "string" || init.body instanceof ArrayBuffer ? init.body : undefined;
  const requestUrlImpl = (globalThis as typeof globalThis & { __waoRequestUrl?: ObsidianRequestUrl }).__waoRequestUrl;

  if (requestUrlImpl) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const response = await Promise.race([
      requestUrlImpl({
        url,
        method: init.method,
        headers,
        contentType: headers["Content-Type"] ?? headers["content-type"],
        body,
        throw: false,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
        if (typeof timer === "object" && timer !== null && "unref" in timer && typeof timer.unref === "function") {
          timer.unref();
        }
      }),
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => response.text,
      json: async () => response.json,
      arrayBuffer: async () => response.arrayBuffer,
    };
  }

  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

  return {
    ok: response.ok,
    status: response.status,
    text: async () => response.text(),
    json: async () => response.json(),
    arrayBuffer: async () => response.arrayBuffer(),
  };
}

async function httpRetry(url: string, init: RequestInit, retries = 3, timeoutMs = 120_000): Promise<HttpResponseLike> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await httpRequest(url, init, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text().then((text) => text.slice(0, 300))}`);
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      const waitMs = 2 ** (attempt - 1) * 1000;
      await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
    }
  }

  throw new Error("unreachable");
}

async function generateGemini(prompt: string, apiKey: string, aspectRatio: string, model = "imagen-3.0-generate-002", timeoutMs = 60_000): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const response = await httpRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
    },
    3,
    timeoutMs,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const predictions = (data.predictions ?? []) as Record<string, string>[];
  const base64 = predictions[0]?.bytesBase64Encoded;
  if (!base64) throw new Error(`Gemini API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(base64, "base64");
}

async function generateOpenAI(
  prompt: string,
  apiKey: string,
  size: string,
  model = "gpt-image-1",
  baseUrl = "https://api.openai.com/v1",
  timeoutMs = 60_000,
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, size, n: 1, quality: "medium" }),
    },
    3,
    timeoutMs,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`OpenAI API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  if (items[0].b64_json) return Buffer.from(items[0].b64_json, "base64");
  if (items[0].url) {
    const imageResponse = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error("OpenAI API 未返回图片数据");
}

async function generateDoubao(
  prompt: string,
  apiKey: string,
  size: string,
  model = "doubao-seedream-5-0-260128",
  baseUrl = "https://ark.cn-beijing.volces.com/api/v3",
  timeoutMs = 60_000,
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, size, n: 1, response_format: "b64_json" }),
    },
    3,
    timeoutMs,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`豆包 API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  if (items[0].b64_json) return Buffer.from(items[0].b64_json, "base64");
  if (items[0].url?.startsWith("http")) {
    const imageResponse = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error("豆包 API 未返回图片数据");
}

async function generateQwen(
  prompt: string,
  apiKey: string,
  size: string,
  model = "qwen-image-2.0-pro",
  baseUrl = "https://dashscope.aliyuncs.com/api/v1",
  timeoutMs = 60_000,
): Promise<Buffer> {
  const response = await httpRetry(
    `${baseUrl}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [{ text: prompt }],
            },
          ],
        },
        parameters: {
          size,
          watermark: false,
          prompt_extend: true,
          negative_prompt: "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节。",
        },
      }),
    },
    3,
    timeoutMs,
  );

  const data = (await response.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string }>;
        };
      }>;
    };
  };
  const imageUrl = data.output?.choices?.[0]?.message?.content?.find((item) => item.image)?.image;
  if (!imageUrl) throw new Error(`Qwen API 无返回图片 URL: ${JSON.stringify(data).slice(0, 300)}`);
  const imageResponse = await httpRetry(imageUrl, {}, 1, 60_000);
  return Buffer.from(await imageResponse.arrayBuffer());
}

async function generateBuffer(options: GenerateImageOptions): Promise<Buffer> {
  const sizeMap = SIZE_MAP[options.sizeKind];
  const provider = options.provider as ProviderName;
  const timeoutMs = options.timeoutMs ?? 60_000;

  switch (provider) {
    case "gemini":
      return generateGemini(options.prompt, options.apiKey, sizeMap.gemini, options.model || undefined, timeoutMs);
    case "openai":
      return generateOpenAI(options.prompt, options.apiKey, sizeMap.openai, options.model || undefined, options.baseUrl || undefined, timeoutMs);
    case "doubao":
      return generateDoubao(options.prompt, options.apiKey, sizeMap.doubao, options.model || undefined, options.baseUrl || undefined, timeoutMs);
    case "qwen":
      return generateQwen(options.prompt, options.apiKey, sizeMap.qwen, options.model || undefined, options.baseUrl || undefined, timeoutMs);
    default:
      throw new Error(`暂不支持的图片服务商: ${options.provider}`);
  }
}

function buildPlaceholderSvg(prompt: string): string {
  const wrappedLines = prompt
    .split(/\r?\n/)
    .flatMap((line) => {
      const normalized = line.trim();
      if (!normalized) return [""];
      const chunks: string[] = [];
      for (let index = 0; index < normalized.length; index += 28) {
        chunks.push(normalized.slice(index, index + 28));
      }
      return chunks;
    })
    .slice(0, 12);
  const bodyText = wrappedLines
    .map((line, index) => {
      const y = 232 + index * 44;
      const escaped = line
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      return `<text x="80" y="${y}" font-size="28" font-family="Arial, sans-serif" fill="#27272a">${escaped || " "}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#f4f4f5" />
  <rect x="48" y="48" width="1504" height="804" rx="24" fill="#ffffff" stroke="#d4d4d8" stroke-width="4" />
  <text x="80" y="140" font-size="42" font-family="Arial, sans-serif" fill="#18181b">图片生成失败，已使用占位图</text>
  ${bodyText}
</svg>`;
}

export async function generateImageAsset(options: GenerateImageOptions): Promise<{ buffer: Buffer; relativeFilename: string }> {
  const normalizedProvider = options.provider.trim().toLowerCase();
  if (!options.apiKey.trim()) {
    if (options.fallbackOnError === false) {
      throw new Error("missing_image_api_key");
    }
    const relativeFilename = `${options.fileStem}.svg`;
    return { buffer: Buffer.from(buildPlaceholderSvg(options.prompt), "utf8"), relativeFilename };
  }

  try {
    const buffer = await generateBuffer(options);
    return { buffer, relativeFilename: `${options.fileStem}.png` };
  } catch (error) {
    if (options.fallbackOnError === false) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const relativeFilename = `${options.fileStem}.svg`;
    return { buffer: Buffer.from(buildPlaceholderSvg(`${options.prompt}\n\n${message}`), "utf8"), relativeFilename };
  }
}
