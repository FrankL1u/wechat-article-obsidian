import type { InlineImageMode, InlineImageType } from "./types";

interface ImageOptionPreset {
  key: string;
  label: string;
  aliases?: string[];
}

export const COVER_TYPE_OPTIONS: ImageOptionPreset[] = [
  { key: "none", label: "不生成封面" },
  { key: "hero", label: "焦点视觉", aliases: ["主视觉"] },
  { key: "conceptual", label: "概念解释", aliases: ["概念型", "概念主视觉"] },
  { key: "typography", label: "标题主导", aliases: ["文字型", "字标题海报"] },
  { key: "metaphor", label: "隐喻表达", aliases: ["隐喻型", "隐喻封面"] },
  { key: "scene", label: "场景氛围", aliases: ["场景型", "场景封面"] },
  { key: "minimal", label: "极简留白", aliases: ["极简型", "极简封面"] },
];

export const INLINE_IMAGE_MODE_OPTIONS: Array<{ key: InlineImageMode; label: string }> = [
  { key: "minimal", label: "1~2张" },
  { key: "balanced", label: "3~5张" },
  { key: "per-section", label: "按章节" },
  { key: "rich", label: "全文" },
  { key: "none", label: "不生成正文图" },
];

export const INLINE_IMAGE_TYPE_OPTIONS: Array<{ key: InlineImageType; label: string }> = [
  { key: "auto", label: "按文章内容" },
  { key: "infographic", label: "infographic（数据）" },
  { key: "scene", label: "scene（场景）" },
  { key: "flowchart", label: "flowchart（流程）" },
  { key: "comparison", label: "comparison（对比）" },
  { key: "framework", label: "framework（框架）" },
  { key: "timeline", label: "timeline（时间线）" },
];

export const PALETTE_OPTIONS: ImageOptionPreset[] = [
  { key: "default", label: "跟随风格配色" },
  { key: "macaron", label: "macaron（马卡龙）" },
  { key: "mono-ink", label: "mono-ink（黑白墨线）" },
  { key: "neon", label: "neon（霓虹）" },
  { key: "warm", label: "warm（暖调）" },
];

export const STYLE_OPTIONS: ImageOptionPreset[] = [
  { key: "blueprint", label: "技术蓝图风", aliases: ["科技媒体"] },
  { key: "chalkboard", label: "黑板手绘风" },
  { key: "editorial", label: "杂志信息图风" },
  { key: "elegant", label: "优雅杂志风" },
  { key: "fantasy-animation", label: "幻想动画风" },
  { key: "flat", label: "现代扁平插画风" },
  { key: "flat-doodle", label: "扁平涂鸦风", aliases: ["lofi-doodle"] },
  { key: "ink-notes", label: "墨迹笔记风" },
  { key: "intuition-machine", label: "直觉机器风" },
  { key: "minimal", label: "极简留白风" },
  { key: "nature", label: "自然生态风" },
  { key: "notion", label: "极简手绘线条风" },
  { key: "pixel-art", label: "像素插画风" },
  { key: "playful", label: "活泼趣味风", aliases: ["multi-panel-manga", "claymation"] },
  { key: "retro", label: "复古印刷风" },
  { key: "scientific", label: "学术精确图表风" },
  { key: "screen-print", label: "丝网印刷风" },
  { key: "sketch", label: "草图速写风" },
  { key: "sketch-notes", label: "手绘笔记风", aliases: ["notebook-sketch"] },
  { key: "vector-illustration", label: "矢量插画风" },
  { key: "vintage", label: "复古质感风" },
  { key: "warm", label: "温暖亲和风" },
  { key: "watercolor", label: "水彩柔和风" },
];

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function findPreset(options: ImageOptionPreset[], value: string): ImageOptionPreset | null {
  const normalized = normalizeToken(value);
  return (
    options.find((option) =>
      [option.key, option.label, ...(option.aliases ?? [])]
        .map(normalizeToken)
        .includes(normalized),
    ) ?? null
  );
}

export function normalizeCoverType(value: string): string {
  return findPreset(COVER_TYPE_OPTIONS, value)?.key ?? value;
}

export function normalizeStyle(value: string): string {
  return findPreset(STYLE_OPTIONS, value)?.key ?? value;
}

export function normalizePalette(value: string): string {
  return findPreset(PALETTE_OPTIONS, value)?.key ?? value;
}

export function ensureCoverTypeOption(value: string): ImageOptionPreset[] {
  const preset = findPreset(COVER_TYPE_OPTIONS, value);
  return preset ? COVER_TYPE_OPTIONS : [...COVER_TYPE_OPTIONS, { key: value, label: value }];
}

export function ensureStyleOption(value: string): ImageOptionPreset[] {
  const normalized = normalizeStyle(value);
  const preset = findPreset(STYLE_OPTIONS, normalized);
  return preset ? STYLE_OPTIONS : [...STYLE_OPTIONS, { key: normalized, label: normalized }];
}

export function ensurePaletteOption(value: string): ImageOptionPreset[] {
  const normalized = normalizePalette(value);
  const preset = findPreset(PALETTE_OPTIONS, normalized);
  return preset ? PALETTE_OPTIONS : [...PALETTE_OPTIONS, { key: normalized, label: normalized }];
}

export function normalizeInlineMode(value: string): InlineImageMode {
  const normalized = normalizeToken(value);
  if (normalized === "range-1-3" || normalized === "1~3 张") return "minimal";
  if (normalized === "range-3-5" || normalized === "3~5 张") return "balanced";
  if (normalized === "auto" || normalized === "按正文密度" || normalized === "按文章内容") return "balanced";
  return INLINE_IMAGE_MODE_OPTIONS.find((option) => option.key === value)?.key ?? "balanced";
}

export function normalizeInlineType(value: string): InlineImageType {
  return INLINE_IMAGE_TYPE_OPTIONS.find((option) => option.key === value)?.key ?? "auto";
}
