import { generateTheme, type ThemeKey } from "./theme-engine";

export const FEATURED_THEME_KEYS: ThemeKey[] = [
  "wechat-default",
  "wechat-tech",
  "wechat-anthropic",
  "gaudi-organic",
  "nikkei",
  "latepost-depth",
  "warm-docs",
  "wechat-medium",
];

const THEME_SWATCH_OVERRIDES: Partial<Record<ThemeKey, string[]>> = {
  lemonde: ["#fffef9", "#1a1a1a", "#2c2c2c", "#e0e0e0"],
};

function normalizeHex(hex: string): string {
  const value = hex.replace("#", "").trim();
  if (value.length === 3) {
    return `#${value.split("").map((part) => `${part}${part}`).join("")}`;
  }
  return `#${value.slice(0, 6)}`;
}

function mixColor(hex: string, target: string, ratio: number): string {
  const source = normalizeHex(hex);
  const dest = normalizeHex(target);
  const from = Number.parseInt(source.slice(1), 16);
  const to = Number.parseInt(dest.slice(1), 16);
  const r = Math.round(((from >> 16) & 0xff) * (1 - ratio) + ((to >> 16) & 0xff) * ratio);
  const g = Math.round(((from >> 8) & 0xff) * (1 - ratio) + ((to >> 8) & 0xff) * ratio);
  const b = Math.round((from & 0xff) * (1 - ratio) + (to & 0xff) * ratio);
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function toRgb(hex: string) {
  const normalized = normalizeHex(hex);
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function scoreAccent(hex: string, kind: "background" | "border" | "color") {
  const { r, g, b } = toRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  const luminance = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;

  let score = kind === "border" ? 3 : kind === "background" ? 2 : 1;
  score += chroma * 8;

  if (luminance > 0.94) score -= 6;
  else if (luminance > 0.86) score -= 4;
  else if (luminance > 0.78) score -= 2;

  if (chroma < 0.05) score -= 2;
  else if (chroma > 0.18) score += 2;

  if (luminance < 0.08) score -= 1;

  return score;
}

function extractAccentColor(themeKey: ThemeKey): string {
  const { styles, color } = generateTheme({ themeKey });
  const candidates = [
    styles.h2,
    styles.h1,
    styles.h3,
    styles.h4,
    styles.strong,
    styles.blockquote,
    styles.a,
    styles.hr,
    styles.th,
  ];
  const patterns: Array<{ kind: "background" | "border" | "color"; regex: RegExp }> = [
    { kind: "background", regex: /background(?:-color)?:\s*(#[0-9a-fA-F]{3,8})/g },
    { kind: "border", regex: /border(?:-left|-right|-top|-bottom)?(?:-color)?:\s*[^#;]*?(#[0-9a-fA-F]{3,8})/g },
    { kind: "color", regex: /color:\s*(#[0-9a-fA-F]{3,8})/g },
  ];
  let best: { hex: string; score: number } | null = null;

  for (const { kind, regex } of patterns) {
    for (const value of candidates) {
      if (!value) continue;
      for (const match of value.matchAll(regex)) {
        const hex = normalizeHex(match[1]);
        const score = scoreAccent(hex, kind);
        if (!best || score > best.score) {
          best = { hex, score };
        }
      }
    }
  }

  return best?.hex ?? normalizeHex(color);
}
export function getThemeSwatches(themeKey: ThemeKey): string[] {
  const override = THEME_SWATCH_OVERRIDES[themeKey];
  if (override) {
    return override;
  }

  const primary = extractAccentColor(themeKey);
  return [
    mixColor(primary, "#ffffff", 0.92),
    "#17181c",
    primary,
    mixColor(primary, "#17181c", 0.82),
  ];
}
