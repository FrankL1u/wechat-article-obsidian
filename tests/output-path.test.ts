import { describe, expect, it } from "vitest";
import { buildOutputFilename, resolveOutputDirectory } from "../src/features/output/output-path";

describe("output-path", () => {
  it("uses the source directory when custom output is disabled", () => {
    const result = resolveOutputDirectory({
      sourcePath: "Inbox/原文.md",
      outputDirEnabled: false,
      outputDirPath: "",
      vaultRoot: "/vault",
    });

    expect(result).toBe("Inbox");
  });

  it("resolves vault-relative output paths against the vault root", () => {
    const result = resolveOutputDirectory({
      sourcePath: "Inbox/原文.md",
      outputDirEnabled: true,
      outputDirPath: "公众号/输出",
      vaultRoot: "/vault",
    });

    expect(result).toBe("公众号/输出");
  });

  it("accepts an absolute path only when it stays inside the current vault", () => {
    const result = resolveOutputDirectory({
      sourcePath: "Inbox/原文.md",
      outputDirEnabled: true,
      outputDirPath: "/vault/公众号/输出",
      vaultRoot: "/vault",
    });

    expect(result).toBe("公众号/输出");
  });

  it("rejects an absolute path outside the current vault", () => {
    expect(() =>
      resolveOutputDirectory({
        sourcePath: "Inbox/原文.md",
        outputDirEnabled: true,
        outputDirPath: "/other/公众号/输出",
        vaultRoot: "/vault",
      }),
    ).toThrowError("输出目录必须位于当前 Vault 内");
  });

  it("builds the article filename with the wechat suffix and minute timestamp", () => {
    const result = buildOutputFilename("原文.md", new Date("2026-04-20T14:30:00+08:00"));

    expect(result).toBe("原文-wechat-20260420-1430.md");
  });
});
