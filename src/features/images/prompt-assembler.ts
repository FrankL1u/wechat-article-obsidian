import type { TypeSpecificGenerationResult } from "./type-specific-generation-types";
import styleDefinitions from "./style-definitions.jsonc";
import paletteDefinitions from "./palette-definitions.jsonc";

interface StyleDefinition {
  key: string;
  [key: string]: unknown;
}

interface StyleDefinitionFile {
  styles: StyleDefinition[];
}

interface PaletteDefinition {
  key: string;
  [key: string]: unknown;
}

interface PaletteDefinitionFile {
  palettes: PaletteDefinition[];
}

export interface FinalPromptItem {
  illustrationId: string;
  frontmatter: {
    illustration_id: string;
    type: string;
    style: string;
    palette: string;
  };
  typeSpecific: Record<string, unknown>;
  style: StyleDefinition;
  palette:
    | PaletteDefinition
    | {
        key: "default";
        mode: "follow-style";
        description: string;
      };
  aspect: "16:9";
  globalDefaults: {
    composition: string;
    colorRule: string;
    textRule: string;
  };
}

export interface FinalPromptPayload {
  prompts: FinalPromptItem[];
}

function readStyleDefinitions(): StyleDefinitionFile {
  return styleDefinitions as StyleDefinitionFile;
}

function readPaletteDefinitions(): PaletteDefinitionFile {
  return paletteDefinitions as PaletteDefinitionFile;
}

function buildFrontmatterId(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function buildGlobalDefaults() {
  return {
    composition: "Clean composition with generous white space. Simple or no background. Main elements centered or positioned by content needs.",
    colorRule:
      "Color values (#hex) and color names are rendering guidance only — do NOT display color names, hex codes, or palette labels as visible text in the image.",
    textRule: "Text should be large and prominent with handwritten-style fonts. Keep minimal, focus on keywords.",
  } as const;
}

export function resolveFinalPromptStyle(style: string): StyleDefinition {
  const definition = readStyleDefinitions().styles.find((item) => item.key === style);
  if (!definition) {
    throw new Error(`unknown_style:${style}`);
  }
  return definition;
}

export function resolveFinalPromptPalette(palette: string): FinalPromptItem["palette"] {
  if (palette === "default") {
    return {
      key: "default",
      mode: "follow-style",
      description: "Follow the selected style's default palette.",
    };
  }

  const definition = readPaletteDefinitions().palettes.find((item) => item.key === palette);
  if (!definition) {
    throw new Error(`unknown_palette:${palette}`);
  }
  return definition;
}

export function assembleFinalPromptPayload(
  result: TypeSpecificGenerationResult,
  illustrationTypeMap: Record<string, string>,
  style: string,
  palette: string,
): FinalPromptPayload {
  const styleDefinition = resolveFinalPromptStyle(style);
  const paletteDefinition = resolveFinalPromptPalette(palette);
  const globalDefaults = buildGlobalDefaults();

  return {
    prompts: result.prompts.map((item, index) => {
      const type = illustrationTypeMap[item.illustrationId];
      if (!type) {
        throw new Error("missing_illustration_type");
      }

      return {
        illustrationId: item.illustrationId,
        frontmatter: {
          illustration_id: buildFrontmatterId(index),
          type,
          style,
          palette,
        },
        typeSpecific: item.typeSpecific,
        style: styleDefinition,
        palette: paletteDefinition,
        aspect: "16:9",
        globalDefaults,
      };
    }),
  };
}
