import { generateImageAsset } from "../../features/images/generate-images";
import { requestLlmJsonContent } from "../../features/images/llm-compatible-client";
import type { PluginSettings } from "./plugin-settings";

function toTimeoutMs(seconds: number): number {
  return Math.max(1, Math.trunc(seconds)) * 1000;
}

export async function testLlmConfig(
  settings: Pick<PluginSettings, "llmEndpointType" | "llmBaseUrl" | "llmApiKey" | "llmModel" | "llmTimeoutSeconds">,
): Promise<void> {
  if (!settings.llmBaseUrl.trim()) throw new Error("missing_llm_base_url");
  if (!settings.llmApiKey.trim()) throw new Error("missing_llm_api_key");
  if (!settings.llmModel.trim()) throw new Error("missing_llm_model");

  const content = await requestLlmJsonContent(settings, [
    { role: "system", content: "Return only valid JSON." },
    { role: "user", content: "Return {\"status\":\"ok\"}." },
  ]);
  JSON.parse(content);
}

export async function testImageConfig(
  settings: Pick<PluginSettings, "imageProvider" | "apiKey" | "model" | "baseUrl" | "imageTimeoutSeconds">,
): Promise<void> {
  if (!settings.imageProvider.trim()) throw new Error("missing_image_provider");
  if (!settings.apiKey.trim()) throw new Error("missing_image_api_key");

  await generateImageAsset({
    prompt: "A minimal configuration test image: simple checkmark icon on plain white background.",
    outputDir: "",
    fileStem: "wao-config-test",
    provider: settings.imageProvider,
    apiKey: settings.apiKey,
    model: settings.model,
    baseUrl: settings.baseUrl,
    sizeKind: "article",
    timeoutMs: toTimeoutMs(settings.imageTimeoutSeconds),
    fallbackOnError: false,
  });
}
