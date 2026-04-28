import { describe, expect, it } from "vitest";
import { buildPreviewBaseHref, resolvePreviewAssetUrl } from "../src/platform/obsidian/vault-output";
import { buildArticleAssetId } from "../src/features/images/article-asset-id";

function createApp(vaultRoot: string) {
  return {
    vault: {
      getAbstractFileByPath: (normalizedPath: string) => ({
        path: normalizedPath,
        basename: normalizedPath.split("/").pop() ?? "",
        extension: normalizedPath.split(".").pop() ?? "",
        stat: {},
      }),
      getResourcePath: (file: { path: string }) => `app://obsidian/${file.path}`,
      adapter: {
        getBasePath: () => vaultRoot,
        getResourcePath: (normalizedPath: string) => `app://obsidian/${normalizedPath}`,
      },
    },
  } as unknown as Parameters<typeof buildPreviewBaseHref>[0];
}

describe("vault-output", () => {
  it("builds preview base href from the current note directory", () => {
    const app = createApp("/vault");

    expect(buildPreviewBaseHref(app, "Inbox/2026-04/llm-wiki.md", false, "")).toBe(
      "file:///vault/Inbox/2026-04/",
    );
  });

  it("encodes spaces in file urls for preview iframe resolution", () => {
    const app = createApp("/Users/frank/Library/Mobile Documents/iCloud~md~obsidian/Documents/liusir2035-KB");

    expect(buildPreviewBaseHref(app, "01-Inbox/2026-04-16/llm-wiki.md", false, "")).toBe(
      "file:///Users/frank/Library/Mobile%20Documents/iCloud%7Emd%7Eobsidian/Documents/liusir2035-KB/01-Inbox/2026-04-16/",
    );
  });

  it("resolves note-relative markdown asset paths to encoded file urls", () => {
    const app = createApp("/Users/frank/Library/Mobile Documents/iCloud~md~obsidian/Documents/liusir2035-KB");
    const assetDir = buildArticleAssetId("01-Inbox/2026-04-16/llm-wiki.md");

    expect(resolvePreviewAssetUrl(app, "01-Inbox/2026-04-16/llm-wiki.md", `../../_wechat-article-assets/${assetDir}/wao-cover-abc.png`)).toBe(
      `app://obsidian/_wechat-article-assets/${assetDir}/wao-cover-abc.png`,
    );
  });
});
