import {
  readCoverAspects,
  readCoverFonts,
  readCoverMoods,
  readCoverTextLevels,
  readCoverTypes,
} from "./cover-dimensions";
import { resolveFinalPromptPalette, resolveFinalPromptStyle } from "./prompt-assembler";

export interface CoverPromptRequest {
  system: string;
  user: string;
}

export interface CoverPromptInput {
  articleTitle: string;
  articleContent: string;
  articleType: string;
  coverType: string;
  style: string;
  palette: string;
  mood: string;
  font: string;
  textLevel: string;
  aspect: string;
}

const SYSTEM_PROMPT = `You are an AI cover image prompt engineer.

Your task is to generate a final cover image prompt for one article.

CRITICAL RULES:
1. Use the article title exactly when visible title text is included.
2. Do NOT invent, rewrite, shorten, or translate the article title.
3. Detect the article language from the title and content. Any visible text in the image must use that language.
4. Apply the confirmed cover dimensions: type, style, palette, font, text level, mood, and aspect ratio.
5. Use the provided style and palette definitions as visual guidance only.
6. Do NOT display color names, hex codes, palette labels, configuration names, or field names as visible text in the image.
7. Return only the final prompt JSON. Do not return markdown, commentary, analysis, or explanations.`;

function resolveCoverType(type: string) {
  const definition = readCoverTypes().types.find((item) => item.type === type);
  if (!definition) throw new Error(`unknown_cover_type:${type}`);
  return definition;
}

function resolveCoverMood(mood: string) {
  const definition = readCoverMoods().moods.find((item) => item.value === mood);
  if (!definition) throw new Error(`unknown_cover_mood:${mood}`);
  return definition;
}

function resolveCoverFont(font: string) {
  const definition = readCoverFonts().fonts.find((item) => item.font === font);
  if (!definition) throw new Error(`unknown_cover_font:${font}`);
  return definition;
}

function resolveCoverTextLevel(textLevel: string) {
  const definition = readCoverTextLevels().textLevels.find((item) => item.value === textLevel);
  if (!definition) throw new Error(`unknown_cover_text_level:${textLevel}`);
  return definition;
}

function resolveCoverAspect(aspect: string) {
  const definition = readCoverAspects().aspects.find((item) => item.value === aspect);
  if (!definition) throw new Error(`unknown_cover_aspect:${aspect}`);
  return definition;
}

export function buildCoverPromptRequest(input: CoverPromptInput): CoverPromptRequest {
  const coverTypeDefinition = resolveCoverType(input.coverType);
  const styleDefinition = resolveFinalPromptStyle(input.style);
  const paletteDefinition = resolveFinalPromptPalette(input.palette);
  const moodDefinition = resolveCoverMood(input.mood);
  const fontDefinition = resolveCoverFont(input.font);
  const textLevelDefinition = resolveCoverTextLevel(input.textLevel);
  const aspectDefinition = resolveCoverAspect(input.aspect);

  return {
    system: SYSTEM_PROMPT,
    user: [
      "### Article",
      "Title:",
      input.articleTitle,
      "",
      "Content:",
      input.articleContent,
      "",
      "Article type:",
      input.articleType,
      "",
      "### User Selected Options",
      "Cover type:",
      input.coverType,
      "",
      "Style:",
      input.style,
      "",
      "Palette:",
      input.palette,
      "",
      "### Program Selected Options",
      "Mood:",
      input.mood,
      "",
      "Font:",
      input.font,
      "",
      "Text level:",
      input.textLevel,
      "",
      "Aspect ratio:",
      input.aspect,
      "",
      "### Selected Definitions",
      "Cover type definition:",
      JSON.stringify(coverTypeDefinition, null, 2),
      "",
      "Style definition:",
      JSON.stringify(styleDefinition, null, 2),
      "",
      "Palette definition:",
      JSON.stringify(paletteDefinition, null, 2),
      "",
      "Mood definition:",
      JSON.stringify(moodDefinition, null, 2),
      "",
      "Font definition:",
      JSON.stringify(fontDefinition, null, 2),
      "",
      "Text level definition:",
      JSON.stringify(textLevelDefinition, null, 2),
      "",
      "Aspect definition:",
      JSON.stringify(aspectDefinition, null, 2),
      "",
      "### Output JSON Shape",
      JSON.stringify({
        type: "cover",
        frontmatter: {
          type: "cover",
          style: input.style,
          palette: input.palette,
        },
        contentContext: {
          articleTitle: input.articleTitle,
          contentSummary: "2-3 sentence summary of key points and themes",
          keywords: ["5-8 key terms extracted from content"],
          articleType: input.articleType,
          language: "detected article language, e.g. zh, en, mixed",
        },
        visualDesign: {
          coverTheme: "2-3 words visual interpretation",
          type: input.coverType,
          style: input.style,
          palette: input.palette,
          font: input.font,
          textLevel: input.textLevel,
          mood: input.mood,
          aspectRatio: input.aspect,
        },
        textElements: {
          instruction: "Text instruction based on text level",
        },
        moodApplication: {
          instruction: "Mood instruction based on mood",
        },
        fontApplication: {
          instruction: "Font instruction based on font",
        },
        composition: {
          typeComposition: "Type-specific layout and structure",
          mainVisual: "Metaphor derived from article meaning",
          layout: "Positioning based on type and aspect ratio",
          decorative: "Palette/style-specific elements that reinforce article theme",
        },
        renderingRules: {
          colorScheme: "Primary, background, and accent guidance from palette definition adjusted by mood",
          colorConstraint:
            "Color values (#hex) and color names are rendering guidance only. Do NOT display color names, hex codes, or palette labels as visible text in the image.",
          typeNotes: "Key characteristics from cover type definition",
          paletteNotes: "Key characteristics from palette definition",
          styleNotes: "Key characteristics from style definition",
        },
      }, null, 2),
    ].join("\n"),
  };
}
