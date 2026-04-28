import type { PluginSettings } from "../../platform/obsidian/plugin-settings";
import { requestLlmJsonContent } from "./llm-compatible-client";
import { buildTypeSpecificGenerationRequest } from "./type-specific-generation-prompt";
import type { OutlinePlanningResult } from "./outline-planning-types";
import type { TypeSpecificGenerationResult } from "./type-specific-generation-types";
import typeSpecificTemplates from "./type-specific-templates.jsonc";

interface TypeSpecificTemplateDefinition {
  scenarios: string[];
  template: string;
  output: Record<string, string>;
}

interface TypeSpecificTemplateFile {
  templates: Record<string, TypeSpecificTemplateDefinition>;
}

export function readTypeSpecificTemplates(): TypeSpecificTemplateFile {
  return typeSpecificTemplates as TypeSpecificTemplateFile;
}

export function buildUsedTypeSpecificTemplates(result: Pick<OutlinePlanningResult, "outline">): string {
  const templateFile = readTypeSpecificTemplates();
  const usedTypes = [...new Set(result.outline.map((item) => item.inlineType))];
  const templates: Record<string, TypeSpecificTemplateDefinition> = {};
  for (const type of usedTypes) {
    const definition = templateFile.templates[type];
    if (definition) {
      templates[type] = definition;
    }
  }
  return JSON.stringify({ templates }, null, 2);
}

function parseTypeSpecificContent(content: string, allowedIds: Set<string>): TypeSpecificGenerationResult {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content) as Partial<TypeSpecificGenerationResult>;

  if (!Array.isArray(parsed.prompts)) {
    throw new Error("invalid_type_specific");
  }

  return {
    prompts: parsed.prompts.map((item) => {
      const record = item as unknown as Record<string, unknown>;
      if (typeof record.illustrationId !== "string" || typeof record.typeSpecific !== "object" || record.typeSpecific === null) {
        throw new Error("invalid_type_specific");
      }
      if (!allowedIds.has(record.illustrationId)) {
        throw new Error("invalid_type_specific");
      }
      return {
        illustrationId: record.illustrationId,
        typeSpecific: record.typeSpecific as Record<string, unknown>,
      };
    }),
  };
}

export async function buildTypeSpecificWithModel(
  settings: Pick<PluginSettings, "llmEndpointType" | "llmBaseUrl" | "llmApiKey" | "llmModel" | "llmTimeoutSeconds">,
  articleContent: string,
  outlineResult: Pick<OutlinePlanningResult, "outline">,
): Promise<TypeSpecificGenerationResult> {
  const typeSpecificTemplates = buildUsedTypeSpecificTemplates(outlineResult);
  const request = buildTypeSpecificGenerationRequest(articleContent, outlineResult, typeSpecificTemplates);
  const content = await requestLlmJsonContent(settings, [
    { role: "system", content: request.system },
    { role: "user", content: request.user },
  ]);

  return parseTypeSpecificContent(content, new Set(outlineResult.outline.map((item) => item.id)));
}
