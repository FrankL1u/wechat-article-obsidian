import type { InlineImageType } from "./types";

export type OutlinePositionType = "section" | "paragraph";

export interface OutlineItem {
  id: string;
  positionType: OutlinePositionType;
  locationText: string;
  excerpt: string;
  sectionTitle: string;
  purpose: string;
  inlineType: Exclude<InlineImageType, "auto">;
  visualContent: string;
}

export interface OutlinePlanningResult {
  articleType: string;
  coreArguments: string[];
  imageCount: number;
  outline: OutlineItem[];
}
