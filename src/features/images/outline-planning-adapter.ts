import { extractIllustrationBlocks } from "./illustration-blocks";
import type { OutlinePlanningResult } from "./outline-planning-types";
import type { ImageOptions, InlineImageType, PlannedImageTarget } from "./types";

function normalizeMatchText(value: string): string {
  return value
    .replace(/[“”"'`*_[\]()]/g, " ")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function inferInlineType(text: string): Exclude<InlineImageType, "auto"> {
  if (/(步骤|流程|工作流|链路|阶段|过程)/.test(text)) return "flowchart";
  if (/(对比|差异|区别|优劣|A\/B|前后)/i.test(text)) return "comparison";
  if (/(框架|体系|结构|模型|模块|方法论|系统)/.test(text)) return "framework";
  if (/(时间线|阶段|历程|演化|发展|进程)/.test(text)) return "timeline";
  if (/(数据|指标|比例|增长|下降|统计|图表)/.test(text)) return "infographic";
  return "scene";
}

export function adaptOutlineToPlannedTargets(
  markdown: string,
  options: ImageOptions,
  result: OutlinePlanningResult,
): PlannedImageTarget[] {
  const { sections, paragraphs } = extractIllustrationBlocks(markdown);
  const outlineTargets: PlannedImageTarget[] = [];

  for (const item of result.outline) {
    if (item.positionType === "section") {
      const section = sections.find((candidate) =>
        normalizeMatchText(candidate.sectionTitle) === normalizeMatchText(item.sectionTitle),
      );
      if (!section) continue;

      outlineTargets.push({
        illustrationId: item.id,
        kind: "inline",
        targetKind: "section",
        targetBlockKey: section.blockKey,
        sectionTitle: section.sectionTitle,
        inlineType: item.inlineType || inferInlineType(item.visualContent),
        source: "llm",
        style: options.style,
      });
      continue;
    }

    const normalizedExcerpt = normalizeMatchText(item.excerpt);
    const paragraph = paragraphs.find((candidate) =>
      normalizeMatchText(candidate.content).includes(normalizedExcerpt)
      || normalizedExcerpt.includes(normalizeMatchText(candidate.content))
      || normalizeMatchText(candidate.excerpt).includes(normalizedExcerpt)
      || normalizedExcerpt.includes(normalizeMatchText(candidate.excerpt)),
    );
    if (!paragraph) continue;

    outlineTargets.push({
      illustrationId: item.id,
      kind: "inline",
      targetKind: "paragraph",
      targetBlockKey: paragraph.blockKey,
      sectionTitle: paragraph.sectionTitle,
      excerpt: paragraph.excerpt,
      inlineType: item.inlineType || inferInlineType(item.visualContent),
      source: "llm",
      style: options.style,
    });
  }

  return outlineTargets;
}
