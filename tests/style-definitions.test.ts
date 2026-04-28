import { describe, expect, it } from "vitest";
import { resolveFinalPromptStyle } from "../src/features/images/prompt-assembler";

describe("style-definitions", () => {
  it("exposes scenarios instead of bestFor", () => {
    const style = resolveFinalPromptStyle("editorial") as Record<string, unknown>;

    expect(style.scenarios).toBeTruthy();
    expect(style.bestFor).toBeUndefined();
  });
});
