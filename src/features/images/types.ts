export type InlineImageMode = "none" | "minimal" | "balanced" | "per-section" | "rich";
export type InlineImageType = "auto" | "infographic" | "scene" | "flowchart" | "comparison" | "framework" | "timeline";

export interface ImageOptions {
  coverType: string;
  style: string;
  palette?: string;
  inlineMode: InlineImageMode;
  inlineType: InlineImageType;
}

export interface SectionTargetBlock {
  kind: "section";
  blockKey: string;
  level: 2 | 3;
  sectionTitle: string;
  content: string;
}

export interface ParagraphTargetBlock {
  kind: "paragraph";
  blockKey: string;
  sectionTitle: string;
  excerpt: string;
  content: string;
}

export interface CoverImageResult {
  alt: string;
  markdownPath: string;
}

export interface InlineImageResult {
  alt: string;
  markdownPath: string;
  targetBlockKey: string;
  excerpt?: string;
}

export interface PlannedImageTarget {
  illustrationId?: string;
  kind: "cover" | "inline";
  targetKind?: "section" | "paragraph";
  targetBlockKey?: string;
  sectionTitle?: string;
  excerpt?: string;
  coverType?: string;
  inlineType?: InlineImageType;
  source?: "llm";
  style: string;
}
