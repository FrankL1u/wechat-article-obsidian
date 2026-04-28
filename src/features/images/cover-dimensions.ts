import coverAspects from "./cover-aspects.jsonc";
import coverFonts from "./cover-fonts.jsonc";
import coverMoods from "./cover-moods.jsonc";
import coverTextLevels from "./cover-text-levels.jsonc";
import coverTypes from "./cover-types.jsonc";

export interface CoverTypeDefinition {
  type: string;
  description: string;
  bestFor: string[];
  compositionGuideline: string;
}

export interface CoverTypesFile {
  types: CoverTypeDefinition[];
}

export interface CoverMoodDefinition {
  value: string;
  contrast: string;
  saturation: string;
  weight: string;
  energy: string;
  characteristics: string[];
  useCases: string[];
  colorGuidance: string[];
}

export interface CoverMoodsFile {
  moods: CoverMoodDefinition[];
  default: string;
}

export interface CoverAspectDefinition {
  value: string;
  description: string;
}

export interface CoverAspectsFile {
  aspects: CoverAspectDefinition[];
  default: string;
}

export interface CoverFontDefinition {
  font: string;
  visualStyle: string;
  lineQuality: string;
  character: string;
  characteristics: string[];
  useCases: string[];
  promptHints: string[];
}

export interface CoverFontsFile {
  fonts: CoverFontDefinition[];
  default: string;
}

export interface CoverTextLevelDefinition {
  value: string;
  title: boolean;
  subtitle: boolean;
  tags: boolean | string;
  visualArea: string;
  useCases: string[];
  composition: string[];
  titleGuidelines?: string[];
  subtitleGuidelines?: string[];
  tagGuidelines?: string[];
}

export interface CoverTextLevelsFile {
  textLevels: CoverTextLevelDefinition[];
  default: string;
}

export function readCoverTypes(): CoverTypesFile {
  return coverTypes as CoverTypesFile;
}

export function readCoverMoods(): CoverMoodsFile {
  return coverMoods as CoverMoodsFile;
}

export function readCoverAspects(): CoverAspectsFile {
  return coverAspects as CoverAspectsFile;
}

export function readCoverFonts(): CoverFontsFile {
  return coverFonts as CoverFontsFile;
}

export function readCoverTextLevels(): CoverTextLevelsFile {
  return coverTextLevels as CoverTextLevelsFile;
}
