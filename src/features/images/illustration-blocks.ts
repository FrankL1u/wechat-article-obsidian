import { resolveArticleMetadata } from "../preview/article-metadata";
import type { ParagraphTargetBlock, SectionTargetBlock } from "./types";

function cleanText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, " ")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildParagraphBlockKey(sectionTitle: string, excerpt: string, blockOrder: number): string {
  return `paragraph:${blockOrder}:${sectionTitle}:${excerpt}`.toLowerCase();
}

function buildSectionBlockKey(sectionTitle: string, level: 2 | 3, blockOrder: number): string {
  return `section:${level}:${blockOrder}:${sectionTitle}`.toLowerCase();
}

function splitParagraphBlocks(content: string, articleTitleHint?: string): ParagraphTargetBlock[] {
  const blocks: ParagraphTargetBlock[] = [];
  const documentTitle = articleTitleHint?.trim() || "导语";
  const paragraphs = content.split(/\n\s*\n/);
  let currentSectionTitle = documentTitle;
  let blockOrder = 0;

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return;

    if (/^#{1,6}\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,6}\s+/, "").trim();
      currentSectionTitle = headingText || currentSectionTitle || documentTitle;
      return;
    }

    if (/^!\[[^\]]*]\([^)]+\)\s*$/.test(trimmed) || /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      return;
    }

    const text = cleanText(paragraph);
    if (!text) return;

    const excerpt = text.slice(0, 80);
    blocks.push({
      kind: "paragraph",
      blockKey: buildParagraphBlockKey(currentSectionTitle, excerpt, blockOrder),
      sectionTitle: currentSectionTitle,
      excerpt,
      content: text,
    });
    blockOrder += 1;
  });

  return blocks;
}

function isFilteredHeading(text: string): boolean {
  return /^(注意|总结|结语|附录|参考|faq|q&a|相关阅读|延伸阅读|后记|彩蛋|致谢|评论区|互动|行动建议)$/i.test(text)
    || /(欢迎|关注|留言|评论|点赞|收藏|转发|订阅)/.test(text);
}

function extractSectionBlocks(content: string): SectionTargetBlock[] {
  const lines = content.split(/\r?\n/);
  const headings: SectionTargetBlock[] = [];
  let blockOrder = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#{2,3}\s+/.test(trimmed)) {
      const level = trimmed.startsWith("###") ? 3 : 2;
      const sectionTitle = trimmed.replace(/^#{2,3}\s+/, "").trim();
      if (!sectionTitle || isFilteredHeading(sectionTitle)) continue;

      headings.push({
        kind: "section",
        blockKey: buildSectionBlockKey(sectionTitle, level as 2 | 3, blockOrder),
        level: level as 2 | 3,
        sectionTitle,
        content: sectionTitle,
      });
      blockOrder += 1;
      continue;
    }
  }

  return headings;
}

export function extractIllustrationBlocks(markdown: string): {
  sections: SectionTargetBlock[];
  paragraphs: ParagraphTargetBlock[];
} {
  const metadata = resolveArticleMetadata(markdown);
  return {
    sections: extractSectionBlocks(metadata.content),
    paragraphs: splitParagraphBlocks(metadata.content, metadata.title),
  };
}
