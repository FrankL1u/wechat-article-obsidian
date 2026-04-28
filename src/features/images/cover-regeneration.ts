import { normalizeCoverType, normalizePalette, normalizeStyle } from "./presets";

export interface CoverRegenerationOptions {
  style: string;
  palette: string;
  coverType: string;
  mood: string;
  aspect: string;
  font: string;
  textLevel: string;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function textInstruction(textLevel: string): string {
  switch (textLevel) {
    case "none":
      return "No visible text elements.";
    case "title-subtitle":
      return "Title / Subtitle: use the exact article title and a concise contextual subtitle.";
    case "text-rich":
      return "Title / Subtitle / Tags: use the exact article title, a concise contextual subtitle, and 2-4 article keywords.";
    case "title-only":
    default:
      return "Title: use the exact article title only.";
  }
}

function moodInstruction(mood: string): string {
  switch (mood) {
    case "subtle":
      return "Use low contrast, muted colors, light visual weight, and a calm aesthetic.";
    case "bold":
      return "Use high contrast, vivid saturated colors, heavy visual weight, and dynamic energy.";
    case "balanced":
    default:
      return "Use medium contrast, normal saturation, and balanced visual weight.";
  }
}

function fontInstruction(font: string): string {
  switch (font) {
    case "handwritten":
      return "Use warm hand-lettered typography with organic brush strokes and a friendly personal feel.";
    case "serif":
      return "Use elegant serif typography with refined letterforms and classic editorial character.";
    case "display":
      return "Use bold decorative display typography with heavy expressive headlines.";
    case "clean":
    default:
      return "Use clean geometric sans-serif typography with modern minimal letterforms.";
  }
}

export function extractCoverRegenerationOptions(prompt: string): CoverRegenerationOptions {
  const parsed = JSON.parse(prompt) as Record<string, unknown>;
  const frontmatter = readRecord(parsed.frontmatter);
  const visualDesign = readRecord(parsed.visualDesign);

  return {
    style: normalizeStyle(readString(visualDesign.style, readString(frontmatter.style, "editorial"))),
    palette: normalizePalette(readString(visualDesign.palette, readString(frontmatter.palette, "default"))),
    coverType: normalizeCoverType(readString(visualDesign.type, "conceptual")),
    mood: readString(visualDesign.mood, "balanced"),
    aspect: readString(visualDesign.aspectRatio, "2.35:1"),
    font: readString(visualDesign.font, "clean"),
    textLevel: readString(visualDesign.textLevel, "title-only"),
  };
}

export function rebuildCoverPromptForRegeneration(prompt: string, options: CoverRegenerationOptions): string {
  const parsed = JSON.parse(prompt) as Record<string, unknown>;
  const frontmatter = readRecord(parsed.frontmatter);
  const visualDesign = readRecord(parsed.visualDesign);
  const nextStyle = normalizeStyle(options.style);
  const nextPalette = normalizePalette(options.palette);
  const nextCoverType = normalizeCoverType(options.coverType);

  const nextPrompt = {
    ...parsed,
    frontmatter: {
      ...frontmatter,
      style: nextStyle,
      palette: nextPalette,
    },
    visualDesign: {
      ...visualDesign,
      type: nextCoverType,
      style: nextStyle,
      palette: nextPalette,
      mood: options.mood,
      font: options.font,
      textLevel: options.textLevel,
      aspectRatio: options.aspect,
    },
    textElements: {
      ...readRecord(parsed.textElements),
      instruction: textInstruction(options.textLevel),
    },
    moodApplication: {
      ...readRecord(parsed.moodApplication),
      instruction: moodInstruction(options.mood),
    },
    fontApplication: {
      ...readRecord(parsed.fontApplication),
      instruction: fontInstruction(options.font),
    },
  };

  return JSON.stringify(nextPrompt, null, 2);
}
