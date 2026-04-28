import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TFile, WorkspaceLeaf } from "obsidian";
import { getImageAssetDirectory, writeImageRecord } from "../src/features/images/image-records";
import { DEFAULT_SETTINGS } from "../src/platform/obsidian/plugin-settings";
import { selectRefreshContext, selectRenderContext } from "../src/platform/obsidian/render-context";
import { WechatArticleWorkbenchView } from "../src/platform/obsidian/workbench-view";

const { publishWechatDraft } = vi.hoisted(() => ({
  publishWechatDraft: vi.fn(),
}));
const {
  buildCoverPromptInput,
  buildCoverPromptWithModel,
  generateCoverImageAsset,
  buildOutlineWithModel,
  buildTypeSpecificWithModel,
} = vi.hoisted(() => ({
  buildCoverPromptInput: vi.fn((input) => ({
    ...input,
    mood: "balanced",
    font: "clean",
    textLevel: "title-only",
    aspect: "2.35:1",
  })),
  buildCoverPromptWithModel: vi.fn(),
  generateCoverImageAsset: vi.fn(),
  buildOutlineWithModel: vi.fn(),
  buildTypeSpecificWithModel: vi.fn(),
}));

vi.mock("../src/platform/obsidian/wechat-publish-service", () => ({
  publishWechatDraft,
}));
vi.mock("../src/features/images/cover-prompt-model", () => ({
  buildCoverPromptInput,
  buildCoverPromptWithModel,
}));
vi.mock("../src/features/images/cover-image-generation", () => ({
  generateCoverImageAsset,
}));
vi.mock("../src/features/images/outline-planning-model", () => ({
  buildOutlineWithModel,
}));
vi.mock("../src/features/images/type-specific-generation-model", () => ({
  buildTypeSpecificWithModel,
}));

describe("workbench-view render context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the in-memory entry snapshot over active editor markdown", () => {
    const preferred = {
      path: "01-Inbox/llm-wiki.md",
      markdown: "# 标题\n\n![封面图](../../_wechat-article-assets/llm-wiki/wao-cover-a.png)",
    };
    const active = {
      path: "01-Inbox/llm-wiki.md",
      markdown: "# 标题\n\n旧内容",
    };

    expect(selectRenderContext(preferred, active, null)).toEqual(preferred);
  });

  it("falls back to active markdown context and then launch context", () => {
    const active = {
      path: "01-Inbox/llm-wiki.md",
      markdown: "# 标题\n\n正文",
    };
    const launch = {
      path: "01-Inbox/fallback.md",
      markdown: "# 回退",
    };

    expect(selectRenderContext(null, active, launch)).toEqual(active);
    expect(selectRenderContext(null, null, launch)).toEqual(launch);
    expect(selectRenderContext(null, null, null)).toBeNull();
  });

  it("preserves the current entry when there is no active markdown context", () => {
    const current = {
      path: "01-Inbox/llm-wiki.md",
      markdown: "# 标题\n\n![封面图](../../_wechat-article-assets/llm-wiki/wao-cover-a.png)",
    };
    const launch = {
      path: "01-Inbox/fallback.md",
      markdown: "# 回退",
    };

    expect(selectRefreshContext(current, null, launch)).toEqual(current);
  });

  it("switches to the active markdown context when another markdown note is focused", () => {
    const current = {
      path: "01-Inbox/current.md",
      markdown: "# 当前",
    };
    const active = {
      path: "01-Inbox/next.md",
      markdown: "# 新文档",
    };

    expect(selectRefreshContext(current, active, null)).toEqual(active);
  });

  it("hydrates selected client state from plugin settings into the rendered app", () => {
    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const plugin = createPlugin({
      clients: [
        {
          id: "liu",
          author: "刘Sir.2035",
          industry: "",
          targetAudience: "",
          topics: [],
          blacklist: { words: [], topics: [] },
          wechat: { accountName: "主号", appid: "wx123", secret: "sec456" },
        },
      ],
      lastSelectedClientId: "liu",
    });
    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(createEntry());

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as { props: { state: { selectedClientId: string | null; availableClients: Array<{ id: string; author: string }> } } };
    expect(appNode.props.state.selectedClientId).toBe("liu");
    expect(appNode.props.state.availableClients).toEqual([{ id: "liu", author: "刘Sir.2035" }]);
  });

  it("forwards the current preview html and selected client to the publish service", async () => {
    publishWechatDraft.mockResolvedValue({ mediaId: "draft-123" });

    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const plugin = createPlugin({
      clients: [
        {
          id: "liu",
          author: "刘Sir.2035",
          industry: "",
          targetAudience: "",
          topics: [],
          blacklist: { words: [], topics: [] },
          wechat: { accountName: "主号", appid: "wx123", secret: "sec456" },
        },
      ],
      lastSelectedClientId: "liu",
    });
    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(createEntry());

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as { props: { actions: { onPublish: () => Promise<void> } } };
    await appNode.props.actions.onPublish();

    expect(publishWechatDraft).toHaveBeenCalledWith(expect.objectContaining({
      client: expect.objectContaining({ id: "liu", author: "刘Sir.2035" }),
      html: expect.stringContaining("<h1"),
      title: "标题",
    }));
  });

  it("generates and stores a cover asset when smart image cover type is enabled", async () => {
    buildOutlineWithModel.mockResolvedValue({
      articleType: "Methodology",
      coreArguments: ["核心论点"],
      imageCount: 1,
      outline: [
        {
          id: "illustration-1",
          positionType: "paragraph",
          locationText: "正文第一段",
          excerpt: "正文第一段",
          sectionTitle: "标题",
          purpose: "解释方法",
          inlineType: "framework",
          visualContent: "结构图",
        },
      ],
    });
    buildTypeSpecificWithModel.mockResolvedValue({
      prompts: [
        {
          illustrationId: "illustration-1",
          typeSpecific: {
            title: "结构图",
            structure: "layered framework",
            nodes: ["A", "B"],
            relationships: "A to B",
          },
        },
      ],
    });
    buildCoverPromptWithModel.mockResolvedValue({
      type: "cover",
      frontmatter: { type: "cover", style: "editorial", palette: "default" },
      contentContext: { articleTitle: "标题", articleType: "Methodology", language: "zh" },
      visualDesign: {
        type: "conceptual",
        style: "editorial",
        palette: "default",
        mood: "balanced",
        font: "clean",
        textLevel: "title-only",
        aspectRatio: "2.35:1",
      },
    });
    generateCoverImageAsset.mockResolvedValue({
      imageId: "cover-image",
      kind: "cover",
      relativePath: "_wechat-article-assets/demo/wao-cover-2026-4-26-cover-image.svg",
      markdownPath: "../_wechat-article-assets/demo/wao-cover-2026-4-26-cover-image.svg",
      record: {},
    });

    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const modify = vi.fn().mockResolvedValue(undefined);
    const plugin = createPlugin({
      defaultCoverType: "conceptual",
      defaultStyle: "editorial",
      apiKey: "",
    }, { modify });
    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };
    const entry = createEntry();

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(entry);

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as { props: { actions: { onGenerateImages: () => Promise<void> | void } } };
    await appNode.props.actions.onGenerateImages();

    await vi.waitFor(() => {
      expect(buildCoverPromptInput).toHaveBeenCalled();
    });
    expect(buildCoverPromptInput).toHaveBeenCalledWith(expect.objectContaining({
      articleTitle: "标题",
      articleType: "Methodology",
      coverType: "conceptual",
      style: "editorial",
      palette: "default",
    }));
    expect(buildCoverPromptWithModel).toHaveBeenCalledOnce();
    expect(generateCoverImageAsset).toHaveBeenCalledWith(expect.objectContaining({
      sourcePath: "Inbox/原文.md",
      coverType: "conceptual",
      style: "editorial",
      palette: "default",
      promptJson: expect.objectContaining({ type: "cover" }),
    }));
    await vi.waitFor(() => {
      expect(modify).toHaveBeenCalled();
    });
    expect(modify.mock.calls.at(-1)?.[1]).toContain("wao-cover-2026-4-26-cover-image.svg");
    expect(modify.mock.calls.at(-1)?.[1]).toContain("wao-inline");
  });

  it("continues inline image generation when cover generation fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    buildOutlineWithModel.mockResolvedValue({
      articleType: "Methodology",
      coreArguments: ["核心论点"],
      imageCount: 1,
      outline: [
        {
          id: "illustration-1",
          positionType: "paragraph",
          locationText: "正文第一段",
          excerpt: "正文第一段",
          sectionTitle: "标题",
          purpose: "解释方法",
          inlineType: "framework",
          visualContent: "结构图",
        },
      ],
    });
    buildTypeSpecificWithModel.mockResolvedValue({
      prompts: [
        {
          illustrationId: "illustration-1",
          typeSpecific: {
            title: "结构图",
            structure: "layered framework",
            nodes: ["A", "B"],
            relationships: "A to B",
          },
        },
      ],
    });
    buildCoverPromptWithModel.mockRejectedValue(new Error("cover_prompt_failed"));

    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const modify = vi.fn().mockResolvedValue(undefined);
    const plugin = createPlugin({
      defaultCoverType: "conceptual",
      defaultStyle: "editorial",
      apiKey: "",
    }, { modify });
    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };
    const entry = createEntry();

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(entry);

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as { props: { actions: { onGenerateImages: () => Promise<void> | void } } };
    await appNode.props.actions.onGenerateImages();

    await vi.waitFor(() => {
      expect(modify).toHaveBeenCalled();
    });
    expect(generateCoverImageAsset).not.toHaveBeenCalled();
    expect(modify.mock.calls.at(-1)?.[1]).toContain("wao-inline");
    expect(modify.mock.calls.at(-1)?.[1]).not.toContain("wao-cover");
    warnSpy.mockRestore();
  });

  it("generates a cover without requiring inline image targets", async () => {
    buildOutlineWithModel.mockResolvedValue({
      articleType: "Methodology",
      coreArguments: ["核心论点"],
      imageCount: 0,
      outline: [],
    });
    buildCoverPromptWithModel.mockResolvedValue({
      type: "cover",
      frontmatter: { type: "cover", style: "editorial", palette: "default" },
      contentContext: { articleTitle: "标题", articleType: "Methodology", language: "zh" },
      visualDesign: {
        type: "conceptual",
        style: "editorial",
        palette: "default",
        mood: "balanced",
        font: "clean",
        textLevel: "title-only",
        aspectRatio: "2.35:1",
      },
    });
    generateCoverImageAsset.mockResolvedValue({
      imageId: "cover-only-image",
      kind: "cover",
      relativePath: "_wechat-article-assets/demo/wao-cover-2026-4-27-cover-only-image.svg",
      markdownPath: "../_wechat-article-assets/demo/wao-cover-2026-4-27-cover-only-image.svg",
      record: {},
    });

    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const modify = vi.fn().mockResolvedValue(undefined);
    const plugin = createPlugin({
      defaultCoverType: "conceptual",
      defaultStyle: "editorial",
      apiKey: "",
    }, { modify });
    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };
    const entry = {
      ...createEntry(),
      imageOptions: {
        ...createEntry().imageOptions,
        inlineMode: "none",
      },
    };

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(entry);

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as { props: { actions: { onGenerateImages: () => Promise<void> | void } } };
    await appNode.props.actions.onGenerateImages();

    await vi.waitFor(() => {
      expect(modify).toHaveBeenCalled();
    });
    expect(buildCoverPromptWithModel).toHaveBeenCalledOnce();
    expect(generateCoverImageAsset).toHaveBeenCalledOnce();
    expect(buildTypeSpecificWithModel).not.toHaveBeenCalled();
    const nextMarkdown = modify.mock.calls.at(-1)?.[1] as string;
    expect(nextMarkdown).toContain("wao-cover-2026-4-27-cover-only-image.svg");
    expect(nextMarkdown).not.toContain("wao-inline");
  });

  it("regenerates a managed cover image and replaces only the cover markdown path", async () => {
    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const modify = vi.fn().mockResolvedValue(undefined);
    const createBinary = vi.fn().mockResolvedValue(undefined);
    const modifyBinary = vi.fn().mockResolvedValue(undefined);
    const plugin = createPlugin({
      defaultCoverType: "conceptual",
      defaultStyle: "editorial",
      apiKey: "",
    }, { modify, createBinary, modifyBinary });
    const vaultBasePath = plugin.app.vault.adapter.getBasePath();
    const sourcePath = "Inbox/原文.md";
    const imageId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const assetDir = getImageAssetDirectory(vaultBasePath, sourcePath);
    const oldRelativePath = `${assetDir.relativeDir}/wao-cover-2026-4-27-${imageId}.svg`;
    writeImageRecord(assetDir.absoluteDir, imageId, {
      imageId,
      kind: "cover",
      sourcePath,
      articleHash: "article",
      targetHash: "target",
      configHash: "config",
      prompt: JSON.stringify({
        type: "cover",
        frontmatter: { type: "cover", style: "editorial", palette: "default" },
        contentContext: { articleTitle: "标题", articleType: "Methodology", language: "zh" },
        visualDesign: {
          type: "conceptual",
          style: "editorial",
          palette: "default",
          mood: "balanced",
          font: "clean",
          textLevel: "title-only",
          aspectRatio: "2.35:1",
        },
      }, null, 2),
      promptHash: "prompt",
      style: "editorial",
      palette: "default",
      coverType: "conceptual",
      coverMood: "balanced",
      coverAspect: "2.35:1",
      coverFont: "clean",
      coverTextLevel: "title-only",
      providerIdentity: {
        provider: "openai",
        model: "gpt-image-1",
        baseUrl: "https://api.openai.com/v1",
        sizeKind: "cover",
      },
      targetSnapshot: {
        kind: "cover",
        coverType: "conceptual",
        style: "editorial",
        source: "llm",
      },
      relativePath: oldRelativePath,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };
    const entry = {
      ...createEntry(),
      sourceMarkdown: `![封面图](../${oldRelativePath})\n\n# 标题\n\n正文第一段`,
    };

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(entry);

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as {
      props: {
        state: { imageResults: Array<{ id: string; kind: string }> };
        actions: { onRegenerateImage?: (imageId: string, options: Record<string, string>) => void };
      };
    };
    const cover = appNode.props.state.imageResults.find((image) => image.kind === "cover");
    expect(cover).toBeTruthy();

    appNode.props.actions.onRegenerateImage?.(cover!.id, {
      style: "warm",
      palette: "macaron",
      coverType: "metaphor",
      mood: "bold",
      aspect: "16:9",
      font: "display",
      textLevel: "text-rich",
    });

    await vi.waitFor(() => {
      expect(modify).toHaveBeenCalled();
    });
    const nextMarkdown = modify.mock.calls.at(-1)?.[1] as string;
    expect(nextMarkdown).toContain("wao-cover-");
    expect(nextMarkdown).not.toContain(`wao-cover-2026-4-27-${imageId}.svg`);
    expect(nextMarkdown).toContain("正文第一段");
    expect(createBinary.mock.calls.length + modifyBinary.mock.calls.length).toBeGreaterThan(0);
  });

  it("regenerates an unmanaged markdown image as an inline image and replaces only that path", async () => {
    buildTypeSpecificWithModel.mockResolvedValue({
      prompts: [
        {
          illustrationId: "regenerate-inline-1",
          typeSpecific: {
            title: "正文配图",
            scene: "single explanatory illustration based on the nearby paragraph",
            labels: "关键概念",
          },
        },
      ],
    });

    const leaf = new WorkspaceLeaf();
    const renderSpy = vi.fn();
    const modify = vi.fn().mockResolvedValue(undefined);
    const createBinary = vi.fn().mockResolvedValue(undefined);
    const modifyBinary = vi.fn().mockResolvedValue(undefined);
    const plugin = createPlugin({
      defaultStyle: "editorial",
      apiKey: "",
    }, { modify, createBinary, modifyBinary });
    const view = new WechatArticleWorkbenchView(leaf, plugin as never) as unknown as {
      app: unknown;
      root: { render: (node: unknown) => void; unmount: () => void };
      render: (entry: ViewCacheEntry) => void;
    };
    const entry = {
      ...createEntry(),
      sourceMarkdown: `# 标题

第一段正文，解释一个适合配图的核心概念。

![外部图](assets/legacy.png)

第二段正文。`,
    };

    view.app = plugin.app;
    view.root = { render: renderSpy, unmount: vi.fn() };
    view.render(entry);

    const appNode = renderSpy.mock.calls.at(-1)?.[0] as {
      props: {
        state: { imageResults: Array<{ id: string; kind: string; managed?: boolean }> };
        actions: { onRegenerateImage?: (imageId: string, options: Record<string, string>) => void };
      };
    };
    const image = appNode.props.state.imageResults.find((item) => item.managed === false);
    expect(image).toBeTruthy();
    expect(image?.kind).toBe("inline");

    appNode.props.actions.onRegenerateImage?.(image!.id, {
      style: "warm",
      palette: "macaron",
    });

    await vi.waitFor(() => {
      expect(modify).toHaveBeenCalled();
    });
    expect(buildTypeSpecificWithModel).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("第一段正文"),
      expect.objectContaining({
        outline: [
          expect.objectContaining({
            id: "regenerate-inline-1",
            inlineType: "scene",
          }),
        ],
      }),
    );
    const nextMarkdown = modify.mock.calls.at(-1)?.[1] as string;
    expect(nextMarkdown).not.toContain("assets/legacy.png");
    expect(nextMarkdown).toContain("wao-inline-");
    expect(nextMarkdown).toContain("第二段正文。");
    expect(createBinary.mock.calls.length + modifyBinary.mock.calls.length).toBeGreaterThan(0);
  });
});

interface ViewCacheEntry {
  sourcePath: string;
  sourceMarkdown: string;
  themeKey: string;
  previewRevision: number;
  imageOptions: {
    coverType: string;
    style: string;
    palette: string;
    inlineMode: string;
    inlineType: string;
  };
  imageResults: unknown[];
  status: "idle" | "loading" | "error" | "success";
  pendingAction: "images" | "publish" | null;
}

function createEntry(): ViewCacheEntry {
  return {
    sourcePath: "Inbox/原文.md",
    sourceMarkdown: "# 标题\n\n正文第一段",
    themeKey: "wechat-default",
    previewRevision: 0,
    imageOptions: {
      coverType: "conceptual",
      style: "editorial",
      palette: "default",
      inlineMode: "balanced",
      inlineType: "auto",
    },
    imageResults: [],
    status: "idle",
    pendingAction: null,
  };
}

function createPlugin(overrides: Partial<typeof DEFAULT_SETTINGS>, vaultOverrides: Record<string, unknown> = {}) {
  const vaultBasePath = mkdtempSync(path.join(os.tmpdir(), "wao-workbench-view-"));
  const files = new Map<string, unknown>();
  const sourceFile = new TFile();
  sourceFile.path = "Inbox/原文.md";
  (sourceFile as TFile & { basename: string; extension: string; stat: unknown }).basename = "原文";
  (sourceFile as TFile & { basename: string; extension: string; stat: unknown }).extension = "md";
  (sourceFile as TFile & { basename: string; extension: string; stat: unknown }).stat = { ctime: 0, mtime: 0, size: 0 };
  files.set("Inbox/原文.md", sourceFile);
  for (const filePath of [
    "_wechat-article-assets/demo/wao-cover-2026-4-26-cover-image.svg",
    "_wechat-article-assets/b9102176bb6c5b33/wao-inline-2026-4-26-4c2c2b196095b23f28e42032dd34b7c8312e7664.svg",
    "_wechat-article-assets/b9102176bb6c5b33/wao-inline-2026-4-27-4c2c2b196095b23f28e42032dd34b7c8312e7664.svg",
  ]) {
    const file = new TFile();
    file.path = filePath;
    (file as TFile & { basename: string; extension: string; stat: unknown }).basename = path.basename(filePath, path.extname(filePath));
    (file as TFile & { basename: string; extension: string; stat: unknown }).extension = path.extname(filePath).slice(1);
    (file as TFile & { basename: string; extension: string; stat: unknown }).stat = { ctime: 0, mtime: 0, size: 0 };
    files.set(filePath, file);
  }
  return {
    app: {
      workspace: {
        activeLeaf: null,
        getMostRecentLeaf: () => null,
        getLeavesOfType: () => [],
      },
      vault: {
        adapter: {
          getBasePath: () => vaultBasePath,
          getResourcePath: (target: string) => `app://obsidian/${target}`,
          exists: vi.fn().mockResolvedValue(true),
        },
        getAbstractFileByPath: (target: string) => {
          const existing = files.get(target);
          if (existing) return existing;
          if (target.startsWith("_wechat-article-assets/")) {
            const file = new TFile();
            file.path = target;
            (file as TFile & { basename: string; extension: string; stat: unknown }).basename = path.basename(target, path.extname(target));
            (file as TFile & { basename: string; extension: string; stat: unknown }).extension = path.extname(target).slice(1);
            (file as TFile & { basename: string; extension: string; stat: unknown }).stat = { ctime: 0, mtime: 0, size: 0 };
            files.set(target, file);
            return file;
          }
          return null;
        },
        getResourcePath: (file: { path: string }) => `app://obsidian/${file.path}`,
        modify: vi.fn().mockResolvedValue(undefined),
        createBinary: vi.fn().mockResolvedValue(undefined),
        modifyBinary: vi.fn().mockResolvedValue(undefined),
        createFolder: vi.fn().mockResolvedValue(undefined),
        ...vaultOverrides,
      },
    },
    settings: {
      ...DEFAULT_SETTINGS,
      ...overrides,
    },
    consumeLaunchContext: () => null,
  };
}
