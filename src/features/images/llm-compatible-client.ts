import type { PluginSettings } from "../../platform/obsidian/plugin-settings";

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

interface HttpResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface AnthropicMessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
}

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCompatibleSettings = Pick<
  PluginSettings,
  "llmEndpointType" | "llmBaseUrl" | "llmApiKey" | "llmModel" | "llmTimeoutSeconds"
>;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function toTimeoutMs(seconds: number | undefined): number {
  return Math.max(1, Math.trunc(seconds ?? 60)) * 1000;
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
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
      json: async () => response.json,
      text: async () => response.text,
    };
  }

  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  return {
    ok: response.ok,
    status: response.status,
    json: async () => response.json(),
    text: async () => response.text(),
  };
}

export async function requestLlmJsonContent(
  settings: LlmCompatibleSettings,
  messages: LlmMessage[],
): Promise<string> {
  return settings.llmEndpointType === "anthropic"
    ? requestAnthropicContent(settings, messages)
    : requestOpenAiContent(settings, messages);
}

async function requestOpenAiContent(settings: LlmCompatibleSettings, messages: LlmMessage[]): Promise<string> {
  const response = await httpRequest(`${normalizeBaseUrl(settings.llmBaseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.llmApiKey}`,
    },
    body: JSON.stringify({
      model: settings.llmModel,
      response_format: { type: "json_object" },
      messages,
    }),
  }, toTimeoutMs(settings.llmTimeoutSeconds));

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  const json = await response.json() as OpenAiChatResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty_llm_response");
  return content;
}

async function requestAnthropicContent(settings: LlmCompatibleSettings, messages: LlmMessage[]): Promise<string> {
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const chatMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
  const response = await httpRequest(`${normalizeBaseUrl(settings.llmBaseUrl)}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.llmApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.llmModel,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: chatMessages,
    }),
  }, toTimeoutMs(settings.llmTimeoutSeconds));

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  const json = await response.json() as AnthropicMessagesResponse;
  const content = json.content?.map((item) => item.text ?? "").join("").trim();
  if (!content) throw new Error("empty_llm_response");
  return content;
}
