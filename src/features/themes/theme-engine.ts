/**
 * Static editorial theme presets.
 *
 * Theme source data lives in `theme-presets.ts`, generated from the reference
 * theme library. These presets are treated as verified source-of-truth styles
 * and should be preserved as authored unless the converter contract requires
 * a fallback field to exist.
 */

import { RAW_THEME_PRESETS, type RawThemeKey } from './theme-presets.js';

export const PRESET_COLORS: Record<string, string> = {
  'wechat-blue': '#3498db',
  'wechat-red': '#d32f2f',
  'wechat-tech': '#0066cc',
  'anthropic-clay': '#c15f3c',
  'ft-burgundy': '#990f3d',
  'apple-gray': '#1d1d1f',
  'guardian-blue': '#052962',
  'lemonde-ink': '#1f1f1f',
};

export const PRESET_COLOR_LIST = Object.values(PRESET_COLORS);
export const DEFAULT_COLOR = '#0066cc';
export const DEFAULT_THEME: ThemeKey = 'wechat-tech';

export type ThemeKey = RawThemeKey;
export type HeadingSize = 'minus2' | 'minus1' | 'standard' | 'plus1';
export type ParagraphSpacing = 'compact' | 'normal' | 'loose';
export type FontFamily = 'default' | 'optima' | 'serif';

export interface ThemeStyles {
  container: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  p: string;
  strong: string;
  em: string;
  strike: string;
  u: string;
  a: string;
  ul: string;
  ol: string;
  li: string;
  liText: string;
  taskList: string;
  taskListItem: string;
  taskListItemCheckbox: string;
  blockquote: string;
  code: string;
  pre: string;
  hr: string;
  img: string;
  tableWrapper: string;
  table: string;
  th: string;
  td: string;
  tr: string;
  codeBlockPre: string;
  codeBlockCode: string;
}

export interface Theme {
  name: string;
  key: ThemeKey;
  description: string;
  color: string;
  styles: ThemeStyles;
}

export interface ThemeOptions {
  themeKey?: ThemeKey;
  color?: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  headingSize?: HeadingSize;
  paragraphSpacing?: ParagraphSpacing;
}

const MONO_FONT =
  'SFMono-Regular, SF Mono, Menlo, Consolas, Monaco, Courier New, monospace';

function normalizeStyle(style: string | undefined): string {
  return (style ?? '')
    .replace(/;;+/g, ';')
    .replace(/^\s*;\s*/g, '')
    .replace(/\s*;\s*$/g, '')
    .trim();
}

function inferPrimaryColor(styles: Record<string, string>): string {
  const searchOrder = [styles.h1, styles.h2, styles.strong, styles.a, styles.blockquote];
  for (const value of searchOrder) {
    const match = value?.match(/color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
    if (match) return match[1];
    const bg = value?.match(/background-color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
    if (bg) return bg[1];
    const border = value?.match(/border(?:-left|-bottom|-top)?\s*:\s*[^#;]*(#[0-9a-fA-F]{3,8})/);
    if (border) return border[1];
  }
  return DEFAULT_COLOR;
}

function completeStyles(source: Record<string, string>): ThemeStyles {
  const pre = normalizeStyle(source.pre);
  const primaryColor = inferPrimaryColor(source);
  return {
    container: normalizeStyle(source.container),
    h1: normalizeStyle(source.h1),
    h2: normalizeStyle(source.h2),
    h3: normalizeStyle(source.h3),
    h4: normalizeStyle(source.h4),
    h5: normalizeStyle(source.h5),
    h6: normalizeStyle(source.h6),
    p: normalizeStyle(source.p),
    strong: normalizeStyle(source.strong),
    em: normalizeStyle(source.em),
    strike: 'text-decoration: line-through; color: #888888 !important;',
    u: 'text-decoration: underline; text-underline-offset: 3px;',
    a: normalizeStyle(source.a),
    ul: normalizeStyle(source.ul),
    ol: normalizeStyle(source.ol),
    li: normalizeStyle(source.li),
    liText: normalizeStyle(source.p)
      .replace(/margin[^;]*!important;?/gi, '')
      .replace(/margin[^;]*;?/gi, '')
      .trim(),
    taskList: 'margin: 18px 0; padding-left: 0; list-style: none;',
    taskListItem: 'margin: 10px 0; line-height: 1.8 !important; list-style: none;',
    taskListItemCheckbox: `accent-color: ${primaryColor};`,
    blockquote: normalizeStyle(source.blockquote),
    code: normalizeStyle(source.code),
    pre,
    hr: normalizeStyle(source.hr),
    img: normalizeStyle(source.img),
    tableWrapper: 'width: 100%; overflow-x: auto; margin: 24px 0;',
    table: normalizeStyle(source.table),
    th: normalizeStyle(source.th),
    td: normalizeStyle(source.td),
    tr: normalizeStyle(source.tr),
    codeBlockPre: pre,
    codeBlockCode: `font-family: ${MONO_FONT}; font-size: 14px; line-height: 1.6 !important; color: inherit;`,
  };
}

const THEMES: Record<ThemeKey, Theme> = Object.fromEntries(
  Object.entries(RAW_THEME_PRESETS).map(([key, preset]) => [
    key,
    {
      key: key as ThemeKey,
      name: preset.name,
      description: preset.description,
      color: inferPrimaryColor(preset.styles),
      styles: completeStyles(preset.styles),
    },
  ]),
) as Record<ThemeKey, Theme>;

export function generateTheme(options: ThemeOptions = {}): Theme {
  const key = options.themeKey && options.themeKey in THEMES ? options.themeKey : DEFAULT_THEME;
  return THEMES[key as ThemeKey];
}

export function listThemes(): Array<{ key: ThemeKey; name: string; description: string }> {
  return Object.values(THEMES).map(theme => ({
    key: theme.key,
    name: theme.name,
    description: theme.description,
  }));
}

export function listPresetColors(): Record<string, string> {
  return { ...PRESET_COLORS };
}
