import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizePluginSettings, type PluginSettings } from "../src/platform/obsidian/plugin-settings";

describe("plugin settings", () => {
  it("provides empty clients and null lastSelectedClientId by default", () => {
    expect(DEFAULT_SETTINGS.clients).toEqual([]);
    expect(DEFAULT_SETTINGS.lastSelectedClientId).toBeNull();
    expect(DEFAULT_SETTINGS.llmEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.llmEndpointType).toBe("openai");
    expect(DEFAULT_SETTINGS.llmTimeoutSeconds).toBe(60);
    expect(DEFAULT_SETTINGS.imageTimeoutSeconds).toBe(60);
  });

  it("migrates legacy planning model fields into llm fields", () => {
    const normalized = normalizePluginSettings({
      planningEnabled: false,
      planningBaseUrl: "https://example.com/v1",
      planningApiKey: "legacy-token",
      planningModel: "legacy-model",
    } as Partial<PluginSettings> & Record<string, unknown>);

    expect(normalized.llmEnabled).toBe(false);
    expect(normalized.llmBaseUrl).toBe("https://example.com/v1");
    expect(normalized.llmApiKey).toBe("legacy-token");
    expect(normalized.llmModel).toBe("legacy-model");
    expect(normalized.llmEndpointType).toBe("openai");
  });

  it("keeps supported LLM endpoint types and falls back to OpenAI-compatible", () => {
    expect(normalizePluginSettings({
      llmEndpointType: "anthropic",
    } as Partial<PluginSettings>).llmEndpointType).toBe("anthropic");

    expect(normalizePluginSettings({
      llmEndpointType: "bad-endpoint",
    } as unknown as Partial<PluginSettings>).llmEndpointType).toBe("openai");
  });

  it("keeps valid timeout settings and falls back to defaults for invalid values", () => {
    expect(normalizePluginSettings({
      llmTimeoutSeconds: 45,
      imageTimeoutSeconds: 90,
    } as Partial<PluginSettings>).llmTimeoutSeconds).toBe(45);
    expect(normalizePluginSettings({
      llmTimeoutSeconds: 45,
      imageTimeoutSeconds: 90,
    } as Partial<PluginSettings>).imageTimeoutSeconds).toBe(90);

    const normalized = normalizePluginSettings({
      llmTimeoutSeconds: 0,
      imageTimeoutSeconds: Number.NaN,
    } as Partial<PluginSettings>);

    expect(normalized.llmTimeoutSeconds).toBe(60);
    expect(normalized.imageTimeoutSeconds).toBe(60);
  });
});
