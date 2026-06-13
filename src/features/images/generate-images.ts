import { getObsidianRequestUrl, type RequestUrlResponseLike } from "../../platform/obsidian/request-url-registry";

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
  const requestUrlImpl = getObsidianRequestUrl();

  if (requestUrlImpl) {
    let timer: number | null = null;
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
        timer = window.setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]).finally(() => {
      if (timer) window.clearTimeout(timer);
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: () => Promise.resolve(response.text),
      json: () => Promise.resolve(response.json),
      arrayBuffer: () => Promise.resolve(response.arrayBuffer),
    };
  }

  throw new Error("Obsidian requestUrl is not available");
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
      await new Promise((resolveWait) => window.setTimeout(resolveWait, waitMs));
    }
  }

  throw new Error("unreachable");
}

function resolveReturnedImageUrl(imageUrl: string, requestBaseUrl: string): string {
  if (imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }
  return new URL(imageUrl, requestBaseUrl.endsWith("/") ? requestBaseUrl : `${requestBaseUrl}/`).toString();
}

function decodeDataImageUrl(imageUrl: string): Buffer | null {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(imageUrl);
  return match ? Buffer.from(match[1], "base64") : null;
}

async function downloadImageUrl(imageUrl: string, requestBaseUrl: string, timeoutMs = 60_000): Promise<Buffer> {
  const resolvedUrl = resolveReturnedImageUrl(imageUrl, requestBaseUrl);
  const dataImage = decodeDataImageUrl(resolvedUrl);
  if (dataImage) {
    return dataImage;
  }
  const imageResponse = await httpRetry(resolvedUrl, {}, 1, timeoutMs);
  return Buffer.from(await imageResponse.arrayBuffer());
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;
}

function summarizePromptForPlaceholder(prompt: string, errorMessage?: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(prompt);
  } catch {
    const normalized = prompt.replace(/\s+/g, " ").trim();
    return [
      errorMessage ? `失败原因：${errorMessage}` : "",
      normalized ? `画面意图：${truncateText(normalized, 120)}` : "画面意图：根据当前文章内容生成配图",
    ].filter(Boolean);
  }

  if (!parsed || typeof parsed !== "object") {
    return [errorMessage ? `失败原因：${errorMessage}` : "画面意图：根据当前文章内容生成配图"].filter(Boolean);
  }

  const data = parsed as Record<string, unknown>;
  const frontmatter = data.frontmatter && typeof data.frontmatter === "object"
    ? data.frontmatter as Record<string, unknown>
    : {};
  const typeSpecific = data.typeSpecific && typeof data.typeSpecific === "object"
    ? data.typeSpecific as Record<string, unknown>
    : {};
  const visualDesign = data.visualDesign && typeof data.visualDesign === "object"
    ? data.visualDesign as Record<string, unknown>
    : {};
  const contentContext = data.contentContext && typeof data.contentContext === "object"
    ? data.contentContext as Record<string, unknown>
    : {};

  const title = readString(typeSpecific.title)
    || readString(visualDesign.title)
    || readString(contentContext.articleTitle)
    || "当前文章配图";
  const imageType = readString(frontmatter.type) || readString(visualDesign.type) || readString(data.type) || "illustration";
  const layout = readString(typeSpecific.layout)
    || readString(typeSpecific.structure)
    || readString(typeSpecific.direction)
    || readString(visualDesign.composition);
  const labels = readString(typeSpecific.labels) || readString(visualDesign.text);
  const zones = readStringArray(typeSpecific.zones);
  const steps = readStringArray(typeSpecific.steps);
  const nodes = readStringArray(typeSpecific.nodes);
  const leftSide = readStringArray(typeSpecific.leftSide);
  const rightSide = readStringArray(typeSpecific.rightSide);
  const events = readStringArray(typeSpecific.events);
  const focalPoint = readString(typeSpecific.focalPoint);

  return [
    errorMessage ? `失败原因：${errorMessage}` : "",
    `画面主题：${truncateText(title, 80)}`,
    `图片类型：${imageType}`,
    layout ? `画面结构：${truncateText(layout, 110)}` : "",
    focalPoint ? `视觉焦点：${truncateText(focalPoint, 100)}` : "",
    zones.length ? `主要分区：${truncateText(zones.join(" / "), 130)}` : "",
    steps.length ? `流程步骤：${truncateText(steps.join(" → "), 130)}` : "",
    nodes.length ? `核心节点：${truncateText(nodes.join(" / "), 130)}` : "",
    leftSide.length || rightSide.length ? `对比内容：${truncateText([...leftSide, ...rightSide].join(" / "), 130)}` : "",
    events.length ? `时间线：${truncateText(events.join(" → "), 130)}` : "",
    labels ? `可见标签：${truncateText(labels, 110)}` : "",
  ].filter(Boolean);
}

function compactStructuredImagePrompt(prompt: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(prompt);
  } catch {
    return prompt;
  }

  if (!parsed || typeof parsed !== "object") {
    return prompt;
  }

  const data = parsed as Record<string, unknown>;
  const frontmatter = data.frontmatter && typeof data.frontmatter === "object"
    ? data.frontmatter as Record<string, unknown>
    : {};
  const typeSpecific = data.typeSpecific && typeof data.typeSpecific === "object"
    ? data.typeSpecific as Record<string, unknown>
    : {};
  const style = data.style && typeof data.style === "object"
    ? data.style as Record<string, unknown>
    : {};
  const visualDesign = data.visualDesign && typeof data.visualDesign === "object"
    ? data.visualDesign as Record<string, unknown>
    : {};
  const renderingRules = data.renderingRules && typeof data.renderingRules === "object"
    ? data.renderingRules as Record<string, unknown>
    : {};

  const promptType = readString(data.type) || readString(frontmatter.type) || readString(visualDesign.type) || "illustration";
  const title = readString(typeSpecific.title) || readString(data.title) || readString(visualDesign.title);
  const layout = readString(typeSpecific.layout) || readString(visualDesign.composition) || readString(renderingRules.typeNotes);
  const zones = readStringArray(typeSpecific.zones);
  const labels = readString(typeSpecific.labels) || readString(visualDesign.text);
  const styleDescription = readString(style.description)
    || readString(style.designAesthetic)
    || readString(renderingRules.styleNotes);
  const colorNotes = readString(renderingRules.colorScheme) || readString(renderingRules.paletteNotes);
  const visualElements = readString(visualDesign.visualElements);

  const lines = [
    `Create a WeChat article image. Type: ${promptType}.`,
    title ? `Title or concept: ${title}.` : "",
    layout ? `Main composition: ${layout}.` : "",
    zones.length ? `Content zones: ${zones.join(" / ")}.` : "",
    labels ? `Allowed visible text labels: ${labels}.` : "",
    visualElements ? `Key visual elements: ${visualElements}.` : "",
    styleDescription ? `Style: ${styleDescription}.` : "",
    colorNotes ? `Color direction: ${colorNotes}.` : "",
    "Use a clean composition with generous white space. Do not show color names, hex codes, UI controls, watermarks, brand logos, or extra explanatory text.",
  ].filter(Boolean);

  const compacted = truncateText(lines.join("\n"), 1200);
  return compacted.length < prompt.length ? compacted : prompt;
}

async function generateGemini(prompt: string, apiKey: string, aspectRatio: string, model = "imagen-3.0-generate-002", timeoutMs = 60_000): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const imagePrompt = compactStructuredImagePrompt(prompt);
  const response = await httpRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
    },
    1,
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
  const requestUrl = `${baseUrl}/images/generations`;
  const imagePrompt = compactStructuredImagePrompt(prompt);
  const response = await httpRetry(
    requestUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt: imagePrompt, size, n: 1, quality: "medium" }),
    },
    1,
    timeoutMs,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`OpenAI API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  if (items[0].b64_json) return Buffer.from(items[0].b64_json, "base64");
  if (items[0].url) {
    return downloadImageUrl(items[0].url, requestUrl, 60_000);
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
  const requestUrl = `${baseUrl}/images/generations`;
  const imagePrompt = compactStructuredImagePrompt(prompt);
  const response = await httpRetry(
    requestUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt: imagePrompt, size, n: 1, response_format: "b64_json" }),
    },
    1,
    timeoutMs,
  );

  const data = (await response.json()) as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`豆包 API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  if (items[0].b64_json) return Buffer.from(items[0].b64_json, "base64");
  if (items[0].url) {
    return downloadImageUrl(items[0].url, requestUrl, 60_000);
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
  const requestUrl = `${baseUrl}/services/aigc/multimodal-generation/generation`;
  const imagePrompt = compactStructuredImagePrompt(prompt);
  const response = await httpRetry(
    requestUrl,
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
              content: [{ text: imagePrompt }],
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
    1,
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
  return downloadImageUrl(imageUrl, requestUrl, 60_000);
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

function buildPlaceholderSvg(prompt: string, errorMessage?: string): string {
  const wrappedLines = summarizePromptForPlaceholder(prompt, errorMessage)
    .flatMap((line) => {
      const normalized = line.trim();
      if (!normalized) return [""];
      const chunks: string[] = [];
      for (let index = 0; index < normalized.length; index += 28) {
        chunks.push(normalized.slice(index, index + 28));
      }
      return chunks;
    })
    .slice(0, 13);
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
  <rect width="1600" height="900" fill="#f8fafc" />
  <rect x="48" y="48" width="1504" height="804" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" />
  <rect x="84" y="84" width="1432" height="86" rx="18" fill="#eff6ff" />
  <text x="120" y="140" font-size="42" font-family="Arial, sans-serif" fill="#1e293b">图片生成失败，已使用语义占位图</text>
  <text x="120" y="184" font-size="22" font-family="Arial, sans-serif" fill="#64748b">下方展示原计划图片内容，不展示生成 prompt 或 JSON。</text>
  ${bodyText}
</svg>`;
}

export async function generateImageAsset(options: GenerateImageOptions): Promise<{ buffer: Buffer; relativeFilename: string }> {
  if (!options.apiKey.trim()) {
    if (options.fallbackOnError === false) {
      throw new Error("missing_image_api_key");
    }
    const relativeFilename = `${options.fileStem}.svg`;
    return { buffer: Buffer.from(buildPlaceholderSvg(options.prompt, "缺少图片 API Key"), "utf8"), relativeFilename };
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
    return { buffer: Buffer.from(buildPlaceholderSvg(options.prompt, message), "utf8"), relativeFilename };
  }
}
