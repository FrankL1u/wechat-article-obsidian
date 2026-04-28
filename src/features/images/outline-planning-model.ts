import type { PluginSettings } from "../../platform/obsidian/plugin-settings";
import { requestLlmJsonContent } from "./llm-compatible-client";
import { buildOutlinePlanningRequest } from "./outline-planning-prompt";
import type { OutlinePlanningResult } from "./outline-planning-types";
import type { ImageOptions } from "./types";

function parseOutlineContent(content: string): OutlinePlanningResult {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content) as Partial<OutlinePlanningResult>;

  if (
    typeof parsed.articleType !== "string"
    || !Array.isArray(parsed.coreArguments)
    || !Array.isArray(parsed.outline)
  ) {
    throw new Error("invalid_outline");
  }

  return {
    articleType: parsed.articleType,
    coreArguments: parsed.coreArguments.filter((item): item is string => typeof item === "string"),
    imageCount: typeof parsed.imageCount === "number" ? parsed.imageCount : parsed.outline.length,
    outline: parsed.outline.map((item, index) => {
      const record = item as unknown as Record<string, unknown>;
      if (
        (record.positionType !== "section" && record.positionType !== "paragraph")
        || typeof record.locationText !== "string"
        || typeof record.excerpt !== "string"
        || typeof record.sectionTitle !== "string"
        || typeof record.purpose !== "string"
        || typeof record.inlineType !== "string"
        || typeof record.visualContent !== "string"
      ) {
        throw new Error("invalid_outline");
      }

      return {
        id: typeof record.id === "string" ? record.id : `illustration-${index + 1}`,
        positionType: record.positionType,
        locationText: record.locationText,
        excerpt: record.excerpt,
        sectionTitle: record.sectionTitle,
        purpose: record.purpose,
        inlineType: record.inlineType as OutlinePlanningResult["outline"][number]["inlineType"],
        visualContent: record.visualContent,
      };
    }),
  };
}

export async function buildOutlineWithModel(
  settings: Pick<PluginSettings, "llmEndpointType" | "llmBaseUrl" | "llmApiKey" | "llmModel" | "llmTimeoutSeconds">,
  markdown: string,
  options: ImageOptions,
): Promise<OutlinePlanningResult> {
  const request = buildOutlinePlanningRequest(markdown, options);
  const content = await requestLlmJsonContent(settings, [
    { role: "system", content: request.system },
    { role: "user", content: request.user },
  ]);

  return parseOutlineContent(content);
}
