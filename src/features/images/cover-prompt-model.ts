import type { PluginSettings } from "../../platform/obsidian/plugin-settings";
import { requestLlmJsonContent } from "./llm-compatible-client";
import { buildCoverPromptRequest, type CoverPromptInput } from "./cover-prompt";

export interface CoverPromptResult {
  type: "cover";
  frontmatter: Record<string, unknown>;
  contentContext: Record<string, unknown>;
  visualDesign: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CoverPromptInputSeed {
  articleTitle: string;
  articleContent: string;
  articleType: string;
  coverType: string;
  style: string;
  palette: string;
}

function parseCoverPromptContent(content: string): CoverPromptResult {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content) as Partial<CoverPromptResult>;

  if (
    parsed.type !== "cover"
    || typeof parsed.frontmatter !== "object"
    || parsed.frontmatter === null
    || typeof parsed.contentContext !== "object"
    || parsed.contentContext === null
    || typeof parsed.visualDesign !== "object"
    || parsed.visualDesign === null
  ) {
    throw new Error("invalid_cover_prompt");
  }

  return parsed as CoverPromptResult;
}

export function buildCoverPromptInput(seed: CoverPromptInputSeed): CoverPromptInput {
  return {
    ...seed,
    mood: "balanced",
    font: "clean",
    textLevel: "title-only",
    aspect: "2.35:1",
  };
}

export async function buildCoverPromptWithModel(
  settings: Pick<PluginSettings, "llmEndpointType" | "llmBaseUrl" | "llmApiKey" | "llmModel" | "llmTimeoutSeconds">,
  input: CoverPromptInput,
): Promise<CoverPromptResult> {
  const request = buildCoverPromptRequest(input);
  const content = await requestLlmJsonContent(settings, [
    { role: "system", content: request.system },
    { role: "user", content: request.user },
  ]);

  return parseCoverPromptContent(content);
}
