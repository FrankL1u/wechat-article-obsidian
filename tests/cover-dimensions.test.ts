import { describe, expect, it } from "vitest";
import {
  readCoverAspects,
  readCoverFonts,
  readCoverMoods,
  readCoverTextLevels,
  readCoverTypes,
} from "../src/features/images/cover-dimensions";

describe("cover-dimensions", () => {
  it("reads cover type definitions", () => {
    const definitions = readCoverTypes();

    expect(definitions.types.map((item) => item.type)).toEqual(
      expect.arrayContaining(["hero", "conceptual", "scene", "minimal"]),
    );
    expect(definitions.types[0]).toHaveProperty("description");
    expect(definitions.types[0]).toHaveProperty("bestFor");
    expect(definitions.types[0]).toHaveProperty("compositionGuideline");
  });

  it("reads mood, aspect, font, and text level definitions", () => {
    expect(readCoverMoods().moods.map((item) => item.value)).toEqual(
      expect.arrayContaining(["subtle", "balanced", "bold"]),
    );
    expect(readCoverMoods().default).toBe("balanced");
    expect(readCoverAspects().aspects.map((item) => item.value)).toEqual(
      expect.arrayContaining(["2.35:1", "16:9", "1:1"]),
    );
    expect(readCoverAspects().default).toBe("2.35:1");
    expect(readCoverFonts().fonts.map((item) => item.font)).toEqual(
      expect.arrayContaining(["clean", "handwritten", "serif", "display"]),
    );
    expect(readCoverFonts().default).toBe("clean");
    expect(readCoverTextLevels().textLevels.map((item) => item.value)).toEqual(
      expect.arrayContaining(["none", "title-only", "title-subtitle", "text-rich"]),
    );
    expect(readCoverTextLevels().default).toBe("title-only");
  });
});
