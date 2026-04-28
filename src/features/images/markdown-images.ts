import path from "node:path";
import { buildArtifactDateStamp, type ImageRecord } from "./image-records";
import { extractIllustrationBlocks } from "./illustration-blocks";
import { isManagedImagePath, parseManagedImageId } from "./managed-image-path";
import type { PlannedImageTarget, InlineImageType } from "./types";

export interface ParsedMarkdownImage {
  id: string;
  label: string;
  markdownPath: string;
  alt: string;
  kind: "cover" | "inline";
  managed: boolean;
  blockIndex: number;
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
}

interface MarkdownBlock {
  raw: string;
  type: "image" | "heading" | "text" | "other";
  image?: { alt: string; path: string };
}

interface BlockTargetContext {
  targetKind: "section" | "paragraph";
  targetBlockKey: string;
  sectionTitle: string;
  excerpt?: string;
}

function splitFrontmatter(text: string): { frontmatter: string; content: string } {
  if (!text.startsWith("---\n")) {
    return { frontmatter: "", content: text };
  }

  const end = text.indexOf("\n---", 4);
  if (end < 0) {
    return { frontmatter: "", content: text };
  }

  const boundaryEnd = text.indexOf("\n", end + 4);
  const contentStart = boundaryEnd >= 0 ? boundaryEnd + 1 : text.length;
  return {
    frontmatter: text.slice(0, contentStart),
    content: text.slice(contentStart),
  };
}

function normalizeParagraphText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseBlocks(markdown: string): { frontmatter: string; blocks: MarkdownBlock[] } {
  const { frontmatter, content } = splitFrontmatter(markdown);
  const blocks = content
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map<MarkdownBlock>((raw) => {
      const imageMatch = raw.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      if (imageMatch) {
        return {
          raw,
          type: "image",
          image: {
            alt: imageMatch[1] ?? "",
            path: imageMatch[2] ?? "",
          },
        };
      }

      if (/^#{1,6}\s+/.test(raw)) {
        return { raw, type: "heading" };
      }

      if (normalizeParagraphText(raw)) {
        return { raw, type: "text" };
      }

      return { raw, type: "other" };
    });

  return { frontmatter, blocks };
}

function serializeBlocks(frontmatter: string, blocks: MarkdownBlock[]): string {
  const body = blocks.map((block) => block.raw).join("\n\n");
  return `${frontmatter}${frontmatter && body ? "\n" : ""}${body}${body ? "\n" : ""}`;
}

function buildImageMarkdown(alt: string, markdownPath: string): string {
  return `![${alt}](${markdownPath.trim()})`;
}

function inferManagedKindFromPath(markdownPath: string): "cover" | "inline" | null {
  if (/\/wao-cover-(?:\d{4}-\d{1,2}-\d{1,2}-)?[a-f0-9]{40}\./i.test(markdownPath)) return "cover";
  if (/\/wao-inline-(?:\d{4}-\d{1,2}-\d{1,2}-)?[a-f0-9]{40}\./i.test(markdownPath)) return "inline";
  return null;
}

function buildBlockTargetContexts(markdown: string, blocks: MarkdownBlock[]): Map<number, BlockTargetContext> {
  const contexts = new Map<number, BlockTargetContext>();
  const { sections, paragraphs } = extractIllustrationBlocks(markdown);
  let sectionCursor = 0;
  let paragraphCursor = 0;

  blocks.forEach((block, blockIndex) => {
    if (block.type === "heading") {
      const headingMatch = block.raw.match(/^(#{2,3})\s+(.+)$/);
      if (!headingMatch) return;
      const headingLevel = headingMatch[1]?.length === 3 ? 3 : 2;
      const headingText = headingMatch[2]?.trim() ?? "";
      const candidate = sections[sectionCursor];
      if (!candidate) return;
      if (candidate.level !== headingLevel) return;
      if (normalizeHeadingText(candidate.sectionTitle) !== normalizeHeadingText(headingText)) return;

      contexts.set(blockIndex, {
        targetKind: "section",
        targetBlockKey: candidate.blockKey,
        sectionTitle: candidate.sectionTitle,
      });
      sectionCursor += 1;
      return;
    }

    if (block.type === "text") {
      const candidate = paragraphs[paragraphCursor];
      if (!candidate) return;
      contexts.set(blockIndex, {
        targetKind: "paragraph",
        targetBlockKey: candidate.blockKey,
        sectionTitle: candidate.sectionTitle,
        excerpt: candidate.excerpt,
      });
      paragraphCursor += 1;
    }
  });

  return contexts;
}

function findNearestTargetContext(
  contexts: Map<number, BlockTargetContext>,
  imageBlockIndex: number,
): Partial<BlockTargetContext> {
  for (let index = imageBlockIndex - 1; index >= 0; index -= 1) {
    const context = contexts.get(index);
    if (context) return context;
  }
  return {};
}

export function scanMarkdownImages(
  markdown: string,
  resolveRecord: (imageId: string) => ImageRecord | null,
): ParsedMarkdownImage[] {
  const { blocks } = parseBlocks(markdown);
  const contexts = buildBlockTargetContexts(markdown, blocks);

  return blocks.flatMap((block, blockIndex) => {
    if (block.type !== "image" || !block.image) return [];

    const markdownPath = block.image.path.trim();
    const imageId = parseManagedImageId(markdownPath);
    const record = imageId ? resolveRecord(imageId) : null;
    const managed = Boolean(imageId && record);
    const isManagedName = isManagedImagePath(markdownPath);
    const inferredKind = managed
      ? record!.kind
      : isManagedName
        ? (inferManagedKindFromPath(markdownPath) ?? "inline")
        : "inline";
    const context = inferredKind === "inline" ? findNearestTargetContext(contexts, blockIndex) : {};

    return [
      {
        id: imageId ?? `${blockIndex}:${markdownPath}`,
        label: block.image.alt || (inferredKind === "cover" ? "封面图" : "配图"),
        markdownPath,
        alt: block.image.alt || (inferredKind === "cover" ? "封面图" : "配图"),
        kind: inferredKind,
        managed,
        blockIndex,
        targetKind: record?.targetSnapshot.kind === "inline" ? record.targetSnapshot.targetKind : undefined,
        targetBlockKey: record?.targetSnapshot.kind === "inline" ? record.targetSnapshot.targetBlockKey : undefined,
        sectionTitle: record?.targetSnapshot.sectionTitle ?? context.sectionTitle,
        excerpt: record?.targetSnapshot.excerpt ?? context.excerpt,
        style: record?.style,
        palette: record?.palette,
        coverType: record?.coverType,
        coverMood: record?.coverMood,
        coverAspect: record?.coverAspect,
        coverFont: record?.coverFont,
        coverTextLevel: record?.coverTextLevel,
        inlineType: record?.inlineType,
      },
    ];
  });
}

export function removeImageFromMarkdown(markdown: string, blockIndex: number): string {
  const { frontmatter, blocks } = parseBlocks(markdown);
  if (blockIndex < 0 || blockIndex >= blocks.length) return markdown;
  blocks.splice(blockIndex, 1);
  return serializeBlocks(frontmatter, blocks);
}

export function replaceImagePathInMarkdown(markdown: string, blockIndex: number, alt: string, markdownPath: string): string {
  const { frontmatter, blocks } = parseBlocks(markdown);
  const block = blocks[blockIndex];
  if (!block || block.type !== "image") {
    return markdown;
  }
  block.raw = buildImageMarkdown(alt, markdownPath);
  block.image = { alt, path: markdownPath };
  return serializeBlocks(frontmatter, blocks);
}

export function removeManagedImagesFromMarkdown(markdown: string): string {
  const { frontmatter, blocks } = parseBlocks(markdown);
  const retained = blocks.filter((block) => !(block.type === "image" && block.image && isManagedImagePath(block.image.path)));
  return serializeBlocks(frontmatter, retained);
}

export function applyPlannedImagesToMarkdown(
  markdown: string,
  images: Array<{ target: PlannedImageTarget; markdownPath: string; alt: string }>,
): string {
  const cleaned = removeManagedImagesFromMarkdown(markdown);
  const { frontmatter, blocks } = parseBlocks(cleaned);
  const contexts = buildBlockTargetContexts(cleaned, blocks);

  const coverImages = images.filter((image) => image.target.kind === "cover");
  const pendingInlineImages = images.filter((image) => image.target.kind === "inline");
  const outputBlocks: MarkdownBlock[] = [];

  if (coverImages[0]) {
    outputBlocks.push({
      raw: buildImageMarkdown(coverImages[0].alt, coverImages[0].markdownPath),
      type: "image",
      image: { alt: coverImages[0].alt, path: coverImages[0].markdownPath },
    });
  }

  for (const [blockIndex, block] of blocks.entries()) {
    outputBlocks.push(block);
    const context = contexts.get(blockIndex);
    if (!context) continue;
    const normalized = block.type === "text" ? normalizeParagraphText(block.raw) : "";

    const matchedIndexes: number[] = [];
    const matched = pendingInlineImages.filter((image, index) => {
      if (image.target.targetBlockKey && image.target.targetBlockKey === context.targetBlockKey) {
        matchedIndexes.push(index);
        return true;
      }

      if (image.target.targetKind && image.target.targetKind !== context.targetKind) {
        return false;
      }

      if (context.targetKind === "section") {
        const isMatched = image.target.sectionTitle === context.sectionTitle;
        if (isMatched) matchedIndexes.push(index);
        return isMatched;
      }

      const excerpt = normalizeParagraphText(image.target.excerpt ?? "");
      const isMatched = excerpt ? normalized.includes(excerpt) : image.target.sectionTitle === context.sectionTitle;
      if (isMatched) matchedIndexes.push(index);
      return isMatched;
    });

    for (const image of matched) {
      outputBlocks.push({
        raw: buildImageMarkdown(image.alt, image.markdownPath),
        type: "image",
        image: { alt: image.alt, path: image.markdownPath },
      });
    }

    for (const index of matchedIndexes.sort((left, right) => right - left)) {
      pendingInlineImages.splice(index, 1);
    }
  }

  return serializeBlocks(frontmatter, outputBlocks);
}

export function getManagedImageFilename(kind: "cover" | "inline", imageId: string, extension = ".png", date = new Date()): string {
  return `wao-${kind}-${buildArtifactDateStamp(date)}-${imageId}${extension}`;
}

export function normalizeManagedAssetPath(relativeDir: string, filename: string): string {
  return path.posix.join(relativeDir, filename).replace(/\\/g, "/");
}

export function toNoteRelativeMarkdownPath(sourcePath: string, assetRelativePath: string): string {
  const noteDir = path.posix.dirname(sourcePath);
  const relative = path.posix.relative(noteDir === "." ? "" : noteDir, assetRelativePath);
  return relative || path.posix.basename(assetRelativePath);
}
