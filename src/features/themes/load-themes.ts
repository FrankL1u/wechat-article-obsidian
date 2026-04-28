import { listThemes, type ThemeKey } from "./theme-engine";
import { FEATURED_THEME_KEYS, getThemeSwatches } from "./theme-selector-metadata";

export interface BuiltInThemeSummary {
  key: ThemeKey;
  name: string;
  description: string;
  swatches: string[];
  featured: boolean;
}

export function loadBuiltInThemes(): BuiltInThemeSummary[] {
  return listThemes().map((theme) => ({
    key: theme.key,
    name: theme.name,
    description: theme.description,
    swatches: getThemeSwatches(theme.key),
    featured: FEATURED_THEME_KEYS.includes(theme.key),
  }));
}
