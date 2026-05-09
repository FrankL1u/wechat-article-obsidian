import { normalizeClientProfiles } from "./client-profiles";

export interface ClientProfile {
  id: string;
  author: string;
  industry: string;
  targetAudience: string;
  topics: string[];
  blacklist: {
    words: string[];
    topics: string[];
  };
  wechat: {
    accountName: string;
    appid: string;
    secret: string;
  };
}

export interface PluginSettings {
  imageProvider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  llmEnabled: boolean;
  llmEndpointType: "openai" | "anthropic";
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmTimeoutSeconds: number;
  imageTimeoutSeconds: number;
  defaultCoverType: string;
  defaultStyle: string;
  outputDirEnabled: boolean;
  outputDirPath: string;
  clients: ClientProfile[];
  lastSelectedClientId: string | null;
}

type LegacyPluginSettings = Partial<PluginSettings> & {
  planningEnabled?: boolean;
  planningBaseUrl?: string;
  planningApiKey?: string;
  planningModel?: string;
  clients?: unknown[];
};

export const DEFAULT_SETTINGS: PluginSettings = {
  imageProvider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "",
  llmEnabled: true,
  llmEndpointType: "openai",
  llmBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  llmApiKey: "",
  llmModel: "qwen3.6-plus",
  llmTimeoutSeconds: 60,
  imageTimeoutSeconds: 60,
  defaultCoverType: "conceptual",
  defaultStyle: "editorial",
  outputDirEnabled: false,
  outputDirPath: "",
  clients: [],
  lastSelectedClientId: null,
};

export function normalizePluginSettings(raw: LegacyPluginSettings | null | undefined): PluginSettings {
  const input = raw ?? {};
  const clients = normalizeClientProfiles(input.clients ?? DEFAULT_SETTINGS.clients);
  const lastSelectedClientId =
    typeof input.lastSelectedClientId === "string" && clients.some((client) => client.id === input.lastSelectedClientId)
      ? input.lastSelectedClientId
      : clients[0]?.id ?? null;

  return {
    imageProvider: typeof input.imageProvider === "string" ? input.imageProvider : DEFAULT_SETTINGS.imageProvider,
    apiKey: typeof input.apiKey === "string" ? input.apiKey : DEFAULT_SETTINGS.apiKey,
    baseUrl: typeof input.baseUrl === "string" ? input.baseUrl : DEFAULT_SETTINGS.baseUrl,
    model: typeof input.model === "string" ? input.model : DEFAULT_SETTINGS.model,
    llmEnabled:
      typeof input.llmEnabled === "boolean"
        ? input.llmEnabled
        : typeof input.planningEnabled === "boolean"
          ? input.planningEnabled
          : DEFAULT_SETTINGS.llmEnabled,
    llmEndpointType: input.llmEndpointType === "anthropic" || input.llmEndpointType === "openai"
      ? input.llmEndpointType
      : DEFAULT_SETTINGS.llmEndpointType,
    llmBaseUrl:
      typeof input.llmBaseUrl === "string"
        ? input.llmBaseUrl
        : typeof input.planningBaseUrl === "string"
          ? input.planningBaseUrl
          : DEFAULT_SETTINGS.llmBaseUrl,
    llmApiKey:
      typeof input.llmApiKey === "string"
        ? input.llmApiKey
        : typeof input.planningApiKey === "string"
          ? input.planningApiKey
          : DEFAULT_SETTINGS.llmApiKey,
    llmModel:
      typeof input.llmModel === "string"
        ? input.llmModel
        : typeof input.planningModel === "string"
          ? input.planningModel
          : DEFAULT_SETTINGS.llmModel,
    llmTimeoutSeconds: normalizeTimeoutSeconds(input.llmTimeoutSeconds, DEFAULT_SETTINGS.llmTimeoutSeconds),
    imageTimeoutSeconds: normalizeTimeoutSeconds(input.imageTimeoutSeconds, DEFAULT_SETTINGS.imageTimeoutSeconds),
    defaultCoverType: typeof input.defaultCoverType === "string" ? input.defaultCoverType : DEFAULT_SETTINGS.defaultCoverType,
    defaultStyle: typeof input.defaultStyle === "string" ? input.defaultStyle : DEFAULT_SETTINGS.defaultStyle,
    outputDirEnabled: typeof input.outputDirEnabled === "boolean" ? input.outputDirEnabled : DEFAULT_SETTINGS.outputDirEnabled,
    outputDirPath: typeof input.outputDirPath === "string" ? input.outputDirPath : DEFAULT_SETTINGS.outputDirPath,
    clients,
    lastSelectedClientId,
  };
}

function normalizeTimeoutSeconds(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : fallback;
}
