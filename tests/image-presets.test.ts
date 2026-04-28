import { describe, expect, it } from "vitest";
import {
  COVER_TYPE_OPTIONS,
  STYLE_OPTIONS,
  ensureStyleOption,
  normalizeCoverType,
  normalizeStyle,
} from "../src/features/images/presets";

describe("image style presets", () => {
  it("uses baoyu cover type labels in the cover type menu", () => {
    expect(COVER_TYPE_OPTIONS).toEqual([
      { key: "none", label: "不生成封面" },
      { key: "hero", label: "焦点视觉", aliases: ["主视觉"] },
      { key: "conceptual", label: "概念解释", aliases: ["概念型", "概念主视觉"] },
      { key: "typography", label: "标题主导", aliases: ["文字型", "字标题海报"] },
      { key: "metaphor", label: "隐喻表达", aliases: ["隐喻型", "隐喻封面"] },
      { key: "scene", label: "场景氛围", aliases: ["场景型", "场景封面"] },
      { key: "minimal", label: "极简留白", aliases: ["极简型", "极简封面"] },
    ]);
  });

  it("keeps old cover type labels as aliases", () => {
    expect(normalizeCoverType("主视觉")).toBe("hero");
    expect(normalizeCoverType("概念主视觉")).toBe("conceptual");
    expect(normalizeCoverType("字标题海报")).toBe("typography");
    expect(normalizeCoverType("隐喻封面")).toBe("metaphor");
  });

  it("uses the baoyu style set for style options", () => {
    expect(STYLE_OPTIONS.map((option) => option.key)).toEqual([
      "blueprint",
      "chalkboard",
      "editorial",
      "elegant",
      "fantasy-animation",
      "flat",
      "flat-doodle",
      "ink-notes",
      "intuition-machine",
      "minimal",
      "nature",
      "notion",
      "pixel-art",
      "playful",
      "retro",
      "scientific",
      "screen-print",
      "sketch",
      "sketch-notes",
      "vector-illustration",
      "vintage",
      "warm",
      "watercolor",
    ]);
  });

  it("maps removed plugin-only styles to the closest baoyu style keys", () => {
    expect(normalizeStyle("lofi-doodle")).toBe("flat-doodle");
    expect(normalizeStyle("multi-panel-manga")).toBe("playful");
    expect(normalizeStyle("notebook-sketch")).toBe("sketch-notes");
    expect(normalizeStyle("claymation")).toBe("playful");
  });

  it("keeps style options normalized when the current setting is a removed key", () => {
    expect(ensureStyleOption("multi-panel-manga")).toBe(STYLE_OPTIONS);
    expect(ensureStyleOption("notebook-sketch")).toBe(STYLE_OPTIONS);
  });
});
