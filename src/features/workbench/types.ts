import type { InlineImageType } from "../images/types";
import type { ImageOptions } from "../images/types";

export interface ImageCard {
  id: string;
  sourceImageId?: string;
  label: string;
  path: string;
  markdownPath?: string;
  kind: "cover" | "inline";
  managed?: boolean;
  blockIndex?: number;
  targetKind?: "section" | "paragraph";
  targetBlockKey?: string;
  sectionTitle?: string;
  excerpt?: string;
  style?: string;
  palette?: string;
  coverType?: string;
  coverMood?: string;
  coverAspect?: string;
  coverFont?: string;
  coverTextLevel?: string;
  inlineType?: InlineImageType;
  isRegenerating?: boolean;
}

export interface ClientOption {
  id: string;
  author: string;
}

export interface PublishResult {
  ok: boolean;
  message: string;
}

export interface ArticlePublishStats {
  publishedAt: string;
  readCount: number;
  likeCount: number;
}

export interface AppState {
  sourcePath: string;
  themeKey: string;
  previewHtml: string;
  previewRevision: number;
  imageOptions: ImageOptions;
  imageResults: ImageCard[];
  regeneratingImageIds?: string[];
  status: "idle" | "loading" | "error" | "success";
  pendingAction: "images" | "publish" | null;
  availableClients?: ClientOption[];
  selectedClientId?: string | null;
  articlePublishStats?: ArticlePublishStats | null;
  authorHtml?: string;
  publishResult?: PublishResult | null;
}
