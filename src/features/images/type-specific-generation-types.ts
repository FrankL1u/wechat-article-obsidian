export interface TypeSpecificPromptItem {
  illustrationId: string;
  typeSpecific: Record<string, unknown>;
}

export interface TypeSpecificGenerationResult {
  prompts: TypeSpecificPromptItem[];
}

