import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { App, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import React from "react";
import ReactDOM from "react-dom/client";
import {
  buildConfigHash,
  buildImageId,
  buildTargetHash,
  ensureImageAssetDirectory,
  hashMarkdown,
  hashPrompt,
  readImageRecord,
  touchImageRecord,
  writeImageRecord,
  getImageAssetDirectory,
  type ImageRecord,
  type ProviderIdentity,
} from "../../features/images/image-records";
import { generateCoverImageAsset } from "../../features/images/cover-image-generation";
import { buildCoverPromptInput, buildCoverPromptWithModel } from "../../features/images/cover-prompt-model";
import { extractCoverRegenerationOptions, rebuildCoverPromptForRegeneration } from "../../features/images/cover-regeneration";
import { generateImageAsset } from "../../features/images/generate-images";
import { adaptOutlineToPlannedTargets } from "../../features/images/outline-planning-adapter";
import { writeOutlinePlanArtifact, writeTypeSpecificArtifact } from "../../features/images/planning-artifacts";
import { buildOutlineWithModel } from "../../features/images/outline-planning-model";
import {
  assembleFinalPromptPayload,
  resolveFinalPromptPalette,
  resolveFinalPromptStyle,
  type FinalPromptItem,
} from "../../features/images/prompt-assembler";
import {
  applyPlannedImagesToMarkdown,
  getManagedImageFilename,
  normalizeManagedAssetPath,
  replaceImagePathInMarkdown,
  toNoteRelativeMarkdownPath,
  removeImageFromMarkdown,
  scanMarkdownImages,
} from "../../features/images/markdown-images";
import {
  normalizeCoverType,
  normalizeInlineMode,
  normalizeInlineType,
  normalizePalette,
  normalizeStyle,
} from "../../features/images/presets";
import { buildTypeSpecificWithModel } from "../../features/images/type-specific-generation-model";
import type { OutlinePlanningResult } from "../../features/images/outline-planning-types";
import type { ImageOptions, InlineImageType, PlannedImageTarget } from "../../features/images/types";
import { resolveArticlePublishStats } from "../../features/preview/article-metadata";
import { renderPreviewDocument } from "../../features/preview/render-preview";
import { App as WorkbenchApp } from "../../features/workbench/app";
import type { RegenerateImageOptions } from "../../features/workbench/app";
import { renderAuthorMarkdown } from "../../features/workbench/author-content";
import { resolveEmbeddedAuthorAsset } from "../../features/workbench/embedded-author-assets";
import type { AppState, ImageCard } from "../../features/workbench/types";
import type WechatArticlePlugin from "../../main";
import { captureActiveMarkdownContext, captureMarkdownContext } from "./active-note-bridge";
import { resolveSelectedClientId } from "./client-profiles";
import type { ClientProfile } from "./plugin-settings";
import { selectRefreshContext, selectRenderContext, type MarkdownContextSnapshot } from "./render-context";
import { buildPreviewBaseHref, ensureVaultFolder, getVaultBasePath, resolvePreviewAssetUrl } from "./vault-output";
import { publishWechatDraft } from "./wechat-publish-service";

export const VIEW_TYPE_WECHAT_ARTICLE = "wechat-article-workbench";
export const WORKBENCH_DISPLAY_TEXT = "公众号编排智能体";

interface WorkingImage {
  id: string;
  sourceImageId?: string;
  label: string;
  markdownPath: string;
  kind: "cover" | "inline";
  managed: boolean;
  blockIndex: number;
  targetKind?: "section" | "paragraph";
  targetBlockKey?: string;
  sectionTitle?: string;
  excerpt?: string;
  style?: string;
  palette?: string;
  coverType?: string;
  coverMood?: string;
  coverAspect?: string;
  coverFont?: string;
  coverTextLevel?: string;
  inlineType?: InlineImageType;
}

interface ViewCacheEntry {
  sourcePath: string;
  sourceMarkdown: string;
  themeKey: string;
  previewRevision: number;
  imageOptions: ImageOptions;
  imageResults: WorkingImage[];
  regeneratingImageIds: string[];
  status: AppState["status"];
  pendingAction: AppState["pendingAction"];
  publishResult: AppState["publishResult"];
}

const EMPTY_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: transparent;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9aa0aa;
        font: 500 16px/1.6 -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", sans-serif;
        text-align: center;
      }
    </style>
  </head>
  <body>未加载内容，请选择文档</body>
</html>`;

const AUTHOR_NOTE_PATHS = [
  "work/dev/wechat-article-obsidian/关于作者文案.md",
  "关于作者文案.md",
];

function buildRegeneratedImageId(imageId: string): string {
  return createHash("sha1")
    .update(`${imageId}|${new Date().toISOString()}|${Math.random()}`)
    .digest("hex");
}

function rebuildInlinePromptForRegeneration(prompt: string, style: string, palette: string): string {
  const parsed = JSON.parse(prompt) as FinalPromptItem;
  const frontmatter = parsed.frontmatter;
  if (!frontmatter || typeof frontmatter !== "object") {
    throw new Error("invalid_image_prompt_record");
  }

  const nextPrompt: FinalPromptItem = {
    ...parsed,
    frontmatter: {
      ...frontmatter,
      style,
      palette,
    },
    style: resolveFinalPromptStyle(style),
    palette: resolveFinalPromptPalette(palette),
  };

  return JSON.stringify(nextPrompt, null, 2);
}

function readCoverOptionsFromRecord(record: ImageRecord): RegenerateImageOptions {
  if (record.kind !== "cover") {
    return {
      style: record.style,
      palette: record.palette ?? "default",
    };
  }

  try {
    const options = extractCoverRegenerationOptions(record.prompt);
    return {
      ...options,
      style: record.style || options.style,
      palette: record.palette ?? options.palette,
      coverType: record.coverType ?? options.coverType,
      mood: record.coverMood ?? options.mood,
      aspect: record.coverAspect ?? options.aspect,
      font: record.coverFont ?? options.font,
      textLevel: record.coverTextLevel ?? options.textLevel,
    };
  } catch {
    return {
      style: record.style,
      palette: record.palette ?? "default",
      coverType: record.coverType ?? "conceptual",
      mood: record.coverMood ?? "balanced",
      aspect: record.coverAspect ?? "2.35:1",
      font: record.coverFont ?? "clean",
      textLevel: record.coverTextLevel ?? "title-only",
    };
  }
}

function findVaultFileByBasename(app: App, target: string): TFile | null {
  const direct = app.vault.getAbstractFileByPath(target);
  if (direct instanceof TFile) return direct;

  const files = app.vault.getFiles?.() ?? [];
  return files.find((file) => path.basename(file.path) === target) ?? null;
}

function buildAuthorHtml(app: App): string {
  const vaultBasePath = getVaultBasePath(app);
  const absolutePath = AUTHOR_NOTE_PATHS
    .map((notePath) => path.join(vaultBasePath, notePath))
    .find((candidatePath) => existsSync(candidatePath));
  if (!absolutePath) {
    return "<p>未找到关于作者文案。</p>";
  }

  const markdown = readFileSync(absolutePath, "utf8");
  return renderAuthorMarkdown(markdown, (target) => {
    const embeddedAsset = resolveEmbeddedAuthorAsset(target);
    if (embeddedAsset) return embeddedAsset;

    const file = findVaultFileByBasename(app, target);
    return file ? app.vault.getResourcePath(file) : target;
  });
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

function extractArticleTitle(markdown: string, fallback: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(fallback, path.extname(fallback));
}

function resolveConcreteInlineType(value: InlineImageType | undefined): Exclude<InlineImageType, "auto"> {
  const normalized = normalizeInlineType(value ?? "auto");
  return normalized === "auto" ? "scene" : normalized;
}

export class WechatArticleWorkbenchView extends ItemView {
  private root: ReactDOM.Root | null = null;
  private caches = new Map<string, ViewCacheEntry>();
  private currentSourcePath: string | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: WechatArticlePlugin) {
    super(leaf);
    this.icon = "wechat-article-agent-v2";
  }

  getViewType(): string {
    return VIEW_TYPE_WECHAT_ARTICLE;
  }

  getDisplayText(): string {
    return WORKBENCH_DISPLAY_TEXT;
  }

  async onOpen(): Promise<void> {
    const contentEl = this.contentEl;
    if (!(contentEl instanceof HTMLElement)) {
      throw new Error("公众号编排智能体容器不可用");
    }

    contentEl.empty();
    this.root = ReactDOM.createRoot(contentEl);
    this.render();
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => void this.refreshFromActiveNote()));
    this.registerEvent(this.app.workspace.on("editor-change", () => void this.refreshFromActiveNote()));
    await this.refreshFromActiveNote();
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  async activateFromRibbon(): Promise<void> {
    this.render();
    await this.refreshFromActiveNote();
  }

  private ensureCache(sourcePath: string, sourceMarkdown: string): ViewCacheEntry {
    const existing = this.caches.get(sourcePath);
    if (existing) {
      existing.sourceMarkdown = sourceMarkdown;
      existing.imageResults = this.scanWorkingImages(sourcePath, sourceMarkdown);
      return existing;
    }

    const entry: ViewCacheEntry = {
      sourcePath,
      sourceMarkdown,
      themeKey: "wechat-default",
      previewRevision: 0,
      imageOptions: {
        coverType: normalizeCoverType(this.plugin.settings.defaultCoverType),
        style: normalizeStyle(this.plugin.settings.defaultStyle),
        palette: "default",
        inlineMode: "balanced",
        inlineType: "auto",
      },
      imageResults: this.scanWorkingImages(sourcePath, sourceMarkdown),
      regeneratingImageIds: [],
      status: "idle",
      pendingAction: null,
      publishResult: null,
    };
    this.caches.set(sourcePath, entry);
    return entry;
  }

  private getCurrentEntry(preferredEntry?: ViewCacheEntry | null): ViewCacheEntry | null {
    const preferredContext = preferredEntry
      ? { path: preferredEntry.sourcePath, markdown: preferredEntry.sourceMarkdown }
      : this.getCurrentContext();
    const context = selectRenderContext(
      preferredContext,
      captureMarkdownContext(this.app),
      this.plugin.consumeLaunchContext(),
    );
    if (!context) {
      return null;
    }
    return this.ensureCache(context.path, context.markdown);
  }

  private getCurrentContext(): MarkdownContextSnapshot | null {
    if (!this.currentSourcePath) {
      return null;
    }

    const entry = this.caches.get(this.currentSourcePath);
    if (!entry) {
      return null;
    }

    return {
      path: entry.sourcePath,
      markdown: entry.sourceMarkdown,
    };
  }

  private resolveSourceFile(entry: ViewCacheEntry): TFile | null {
    const target = this.app.vault.getAbstractFileByPath(entry.sourcePath);
    return target instanceof TFile ? target : null;
  }

  private scanWorkingImages(sourcePath: string, markdown: string): WorkingImage[] {
    const vaultBasePath = getVaultBasePath(this.app);
    const assetDirectory = getImageAssetDirectory(vaultBasePath, sourcePath);

    return scanMarkdownImages(markdown, (imageId) => readImageRecord(assetDirectory.absoluteDir, imageId)).map((image) => ({
      id: `${image.id}::${image.blockIndex}`,
      sourceImageId: image.managed ? image.id : undefined,
      label: image.label,
      markdownPath: image.markdownPath,
      kind: image.kind,
      managed: image.managed,
      blockIndex: image.blockIndex,
      targetKind: image.targetKind,
      targetBlockKey: image.targetBlockKey,
      sectionTitle: image.sectionTitle,
      excerpt: image.excerpt,
      style: image.style,
      palette: image.palette,
      coverType: image.coverType,
      coverMood: image.coverMood,
      coverAspect: image.coverAspect,
      coverFont: image.coverFont,
      coverTextLevel: image.coverTextLevel,
      inlineType: image.inlineType,
    }));
  }

  private buildState(entry: ViewCacheEntry): AppState {
    const selectedClientId = resolveSelectedClientId(
      this.plugin.settings.clients,
      this.plugin.settings.lastSelectedClientId,
    );
    const previewHtml = renderPreviewDocument({
      markdown: entry.sourceMarkdown,
      themeKey: entry.themeKey,
      baseHref: buildPreviewBaseHref(this.app, entry.sourcePath, this.plugin.settings.outputDirEnabled, this.plugin.settings.outputDirPath),
      resolveAssetUrl: (src) => resolvePreviewAssetUrl(this.app, entry.sourcePath, src),
    });

    const imageResults: ImageCard[] = entry.imageResults.map((image) => ({
      id: image.id,
      sourceImageId: image.sourceImageId,
      label: image.label,
      path: resolvePreviewAssetUrl(this.app, entry.sourcePath, image.markdownPath),
      markdownPath: image.markdownPath,
      kind: image.kind,
      managed: image.managed,
      blockIndex: image.blockIndex,
      targetKind: image.targetKind,
      targetBlockKey: image.targetBlockKey,
      sectionTitle: image.sectionTitle,
      excerpt: image.excerpt,
      style: image.style ?? entry.imageOptions.style,
      palette: image.palette ?? entry.imageOptions.palette ?? "default",
      coverType: image.coverType,
      coverMood: image.coverMood,
      coverAspect: image.coverAspect,
      coverFont: image.coverFont,
      coverTextLevel: image.coverTextLevel,
      inlineType: image.inlineType ?? entry.imageOptions.inlineType,
      isRegenerating: entry.regeneratingImageIds.includes(image.id),
    }));

    return {
      sourcePath: entry.sourcePath,
      themeKey: entry.themeKey,
      previewHtml,
      previewRevision: entry.previewRevision,
      imageOptions: entry.imageOptions,
      imageResults,
      regeneratingImageIds: entry.regeneratingImageIds,
      status: entry.status,
      pendingAction: entry.pendingAction,
      availableClients: this.plugin.settings.clients.map((client) => ({
        id: client.id,
        author: client.author,
      })),
      selectedClientId,
      articlePublishStats: resolveArticlePublishStats(entry.sourceMarkdown),
      authorHtml: buildAuthorHtml(this.app),
      publishResult: entry.publishResult,
    };
  }

  private render(preferredEntry?: ViewCacheEntry | null): void {
    if (!this.root) return;
    const entry = this.getCurrentEntry(preferredEntry);
    if (!entry) {
      this.currentSourcePath = null;
      this.root.render(
        <WorkbenchApp
          state={{
            sourcePath: "",
            themeKey: "wechat-default",
            previewHtml: EMPTY_PREVIEW_HTML,
            previewRevision: 0,
            imageOptions: {
              coverType: normalizeCoverType(this.plugin.settings.defaultCoverType),
              style: normalizeStyle(this.plugin.settings.defaultStyle),
              palette: "default",
              inlineMode: "balanced",
              inlineType: "auto",
            },
            imageResults: [],
            regeneratingImageIds: [],
            status: "idle",
            pendingAction: null,
            availableClients: this.plugin.settings.clients.map((client) => ({
              id: client.id,
              author: client.author,
            })),
            selectedClientId: resolveSelectedClientId(
              this.plugin.settings.clients,
              this.plugin.settings.lastSelectedClientId,
            ),
            articlePublishStats: null,
            authorHtml: buildAuthorHtml(this.app),
            publishResult: null,
          }}
          actions={{
            onThemeChange: () => undefined,
            onImageOptionsChange: () => undefined,
            onGenerateImages: () => undefined,
            onDeleteImage: () => undefined,
            onPublish: () => undefined,
            onOpenSettings: () => this.openSettings(),
            onSelectClient: (clientId) => void this.selectClient(clientId),
          }}
        />,
      );
      return;
    }

    this.currentSourcePath = entry.sourcePath;

    this.root.render(
      <WorkbenchApp
        state={this.buildState(entry)}
        actions={{
          onThemeChange: (themeKey) => {
            entry.themeKey = themeKey;
            this.render(entry);
          },
            onImageOptionsChange: (partial) => {
              entry.imageOptions = {
                ...entry.imageOptions,
              ...partial,
              coverType: normalizeCoverType(partial.coverType ?? entry.imageOptions.coverType),
              style: normalizeStyle(partial.style ?? entry.imageOptions.style),
              palette: normalizePalette(partial.palette ?? entry.imageOptions.palette ?? "default"),
              inlineMode: normalizeInlineMode(partial.inlineMode ?? entry.imageOptions.inlineMode),
              inlineType: normalizeInlineType(partial.inlineType ?? entry.imageOptions.inlineType),
            };
            this.render(entry);
            },
            onGenerateImages: () => void this.generateImages(entry),
            onDeleteImage: (imageId) => void this.deleteImage(entry, imageId),
            onRegenerateImage: (imageId, options) => void this.regenerateImage(entry, imageId, options),
            onPublish: () => void this.publish(entry),
            onOpenSettings: () => this.openSettings(),
            onSelectClient: (clientId) => void this.selectClient(clientId),
        }}
      />,
    );
  }

  private async refreshFromActiveNote(): Promise<void> {
    const activeContext = captureActiveMarkdownContext(this.app);
    const context = selectRefreshContext(
      this.getCurrentContext(),
      activeContext,
      this.plugin.consumeLaunchContext(),
    );
    if (!context) {
      this.render();
      return;
    }

    const entry = this.ensureCache(context.path, context.markdown);
    entry.sourceMarkdown = context.markdown;
    entry.imageResults = this.scanWorkingImages(context.path, context.markdown);
    this.render(entry);
  }

  private async persistMarkdown(entry: ViewCacheEntry, markdown: string): Promise<void> {
    const sourceFile = this.resolveSourceFile(entry);
    if (!sourceFile) {
      throw new Error("请先打开一篇 Markdown 文档");
    }

    await this.app.vault.modify(sourceFile, markdown);
    entry.sourceMarkdown = markdown;
    entry.previewRevision += 1;
    entry.imageResults = this.scanWorkingImages(entry.sourcePath, markdown);
    this.render(entry);
  }

  private async resolveOutline(entry: ViewCacheEntry): Promise<OutlinePlanningResult> {
    const vaultBasePath = getVaultBasePath(this.app);
    const outline = await buildOutlineWithModel(this.plugin.settings, entry.sourceMarkdown, entry.imageOptions);
    writeOutlinePlanArtifact(vaultBasePath, entry.sourcePath, outline, {
      sourcePath: entry.sourcePath,
      inlineMode: entry.imageOptions.inlineMode,
      inlineType: entry.imageOptions.inlineType,
      style: entry.imageOptions.style,
      palette: entry.imageOptions.palette,
      llmModel: this.plugin.settings.llmModel,
      llmBaseUrl: this.plugin.settings.llmBaseUrl,
    });
    return outline;
  }

  private buildIllustrationTypeMap(outline: OutlinePlanningResult): Record<string, string> {
    return Object.fromEntries(outline.outline.map((item) => [item.id, item.inlineType]));
  }

  private async materializeTarget(
    entry: ViewCacheEntry,
    target: PlannedImageTarget,
    prompt: string,
    palette: string,
  ): Promise<WorkingImage> {
    const vaultBasePath = getVaultBasePath(this.app);
    const assetDir = ensureImageAssetDirectory(vaultBasePath, entry.sourcePath);

    const articleHash = hashMarkdown(entry.sourceMarkdown);
    const targetHash = buildTargetHash(target);
    const configHash = buildConfigHash({
      kind: target.kind,
      style: target.style,
      palette,
      coverType: target.coverType,
      inlineType: target.inlineType,
    });
    const imageId = buildImageId(entry.sourcePath, articleHash, targetHash, configHash);
    const promptHash = hashPrompt(prompt);
    const record = readImageRecord(assetDir.absoluteDir, imageId);

    if (record && record.promptHash === promptHash) {
      const absolutePath = path.join(vaultBasePath, record.relativePath);
      if (existsSync(absolutePath)) {
        touchImageRecord(assetDir.absoluteDir, imageId);
        return {
          id: `${record.imageId}::-1`,
          sourceImageId: record.imageId,
          label: target.kind === "cover" ? "封面图" : "配图",
          markdownPath: toNoteRelativeMarkdownPath(entry.sourcePath, record.relativePath),
          kind: record.kind,
          managed: true,
          blockIndex: -1,
          targetKind: record.targetSnapshot.targetKind,
          targetBlockKey: record.targetSnapshot.targetBlockKey,
          sectionTitle: record.targetSnapshot.sectionTitle,
          excerpt: record.targetSnapshot.excerpt,
          style: record.style,
          palette: record.palette,
          coverType: record.coverType,
          inlineType: record.inlineType,
        };
      }
    }

    const providerIdentity: ProviderIdentity = {
      provider: this.plugin.settings.imageProvider,
      model: this.plugin.settings.model,
      baseUrl: this.plugin.settings.baseUrl,
      sizeKind: target.kind === "cover" ? "cover" : "article",
    };
    const extension = ".png";
    const filename = getManagedImageFilename(target.kind, imageId, extension);
    const generated = await generateImageAsset({
      prompt,
      outputDir: assetDir.absoluteDir,
      fileStem: path.basename(filename, extension),
      provider: providerIdentity.provider,
      apiKey: this.plugin.settings.apiKey,
      model: providerIdentity.model,
      baseUrl: providerIdentity.baseUrl,
      sizeKind: providerIdentity.sizeKind,
      timeoutMs: this.plugin.settings.imageTimeoutSeconds * 1000,
    });

    const relativePath = normalizeManagedAssetPath(assetDir.relativeDir, generated.relativeFilename);
    await ensureVaultFolder(this.app, path.posix.dirname(relativePath));
    const existingFile = this.app.vault.getAbstractFileByPath(relativePath);
    if (existingFile instanceof TFile) {
      await this.app.vault.modifyBinary(existingFile, toArrayBuffer(generated.buffer));
    } else {
      await this.app.vault.createBinary(relativePath, toArrayBuffer(generated.buffer));
    }
    const nextRecord: ImageRecord = {
      imageId,
      kind: target.kind,
      sourcePath: entry.sourcePath,
      articleHash,
      targetHash,
      configHash,
      prompt,
      promptHash,
      style: target.style,
      palette,
      coverType: target.coverType,
      inlineType: target.inlineType,
      providerIdentity,
      targetSnapshot: target,
      relativePath,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    writeImageRecord(assetDir.absoluteDir, imageId, nextRecord);

    return {
      id: `${imageId}::-1`,
      sourceImageId: imageId,
      label: target.kind === "cover" ? "封面图" : "配图",
      markdownPath: toNoteRelativeMarkdownPath(entry.sourcePath, relativePath),
      kind: target.kind,
      managed: true,
      blockIndex: -1,
      targetKind: target.targetKind,
      targetBlockKey: target.targetBlockKey,
      sectionTitle: target.sectionTitle,
      excerpt: target.excerpt,
      style: target.style,
      palette,
      coverType: target.coverType,
      inlineType: target.inlineType,
    };
  }

  private async generateImages(entry: ViewCacheEntry): Promise<void> {
    if (!this.resolveSourceFile(entry)) {
      new Notice("请先打开一篇 Markdown 文档");
      return;
    }
    if (entry.pendingAction) return;

    entry.status = "loading";
    entry.pendingAction = "images";
    this.render(entry);

    try {
      const outline = await this.resolveOutline(entry);
      let generatedCover: { target: PlannedImageTarget; markdownPath: string; alt: string } | null = null;
      if (normalizeCoverType(entry.imageOptions.coverType) !== "none") {
        try {
          const coverType = normalizeCoverType(entry.imageOptions.coverType);
          const coverPromptInput = buildCoverPromptInput({
            articleTitle: extractArticleTitle(entry.sourceMarkdown, entry.sourcePath),
            articleContent: entry.sourceMarkdown,
            articleType: outline.articleType,
            coverType,
            style: entry.imageOptions.style,
            palette: entry.imageOptions.palette ?? "default",
          });
          const coverPrompt = await buildCoverPromptWithModel(this.plugin.settings, coverPromptInput);
          const coverImage = await generateCoverImageAsset({
            vaultBasePath: getVaultBasePath(this.app),
            sourcePath: entry.sourcePath,
            articleMarkdown: entry.sourceMarkdown,
            promptJson: coverPrompt,
            style: entry.imageOptions.style,
            palette: entry.imageOptions.palette ?? "default",
            coverType,
            provider: {
              imageProvider: this.plugin.settings.imageProvider,
              apiKey: this.plugin.settings.apiKey,
              model: this.plugin.settings.model,
              baseUrl: this.plugin.settings.baseUrl,
              imageTimeoutSeconds: this.plugin.settings.imageTimeoutSeconds,
            },
          });
          generatedCover = {
            target: {
              kind: "cover",
              coverType,
              style: entry.imageOptions.style,
              source: "llm",
            },
            markdownPath: coverImage.markdownPath,
            alt: "封面图",
          };
        } catch (error) {
          console.warn("[wao] cover generation skipped", error);
          new Notice("封面生成失败，已继续生成正文图");
        }
      }

      const plan = adaptOutlineToPlannedTargets(entry.sourceMarkdown, entry.imageOptions, outline)
        .filter((target) => target.kind === "inline");
      const materialized: Array<{ target: PlannedImageTarget; markdownPath: string; alt: string }> = generatedCover ? [generatedCover] : [];
      if (!plan.length && !materialized.length) {
        throw new Error("未生成可插入正文的配图定位");
      }

      if (plan.length) {
        const typeSpecific = await buildTypeSpecificWithModel(this.plugin.settings, entry.sourceMarkdown, outline);
        writeTypeSpecificArtifact(getVaultBasePath(this.app), entry.sourcePath, typeSpecific);
        const finalPrompts = assembleFinalPromptPayload(
          typeSpecific,
          this.buildIllustrationTypeMap(outline),
          entry.imageOptions.style,
          entry.imageOptions.palette ?? "default",
        );
        const promptById = new Map(finalPrompts.prompts.map((item) => [item.illustrationId, JSON.stringify(item, null, 2)]));

        for (const target of plan) {
          if (!target.illustrationId) {
            throw new Error("missing_illustration_id");
          }
          const finalPrompt = promptById.get(target.illustrationId);
          if (!finalPrompt) {
            throw new Error(`missing_type_specific:${target.illustrationId}`);
          }

          const image = await this.materializeTarget(entry, target, finalPrompt, entry.imageOptions.palette ?? "default");
          materialized.push({
            target,
            markdownPath: image.markdownPath,
            alt: image.label,
          });
        }
      }

      const nextMarkdown = applyPlannedImagesToMarkdown(entry.sourceMarkdown, materialized);
      await this.persistMarkdown(entry, nextMarkdown);
      entry.status = "success";
      entry.pendingAction = null;
      entry.publishResult = null;
      this.render(entry);
    } catch (error) {
      entry.status = "error";
      entry.pendingAction = null;
      this.render(entry);
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private async deleteImage(entry: ViewCacheEntry, imageId: string): Promise<void> {
    const image = entry.imageResults.find((item) => item.id === imageId);
    if (!image) return;

    const nextMarkdown = removeImageFromMarkdown(entry.sourceMarkdown, image.blockIndex);
    await this.persistMarkdown(entry, nextMarkdown);
  }

  private buildUnmanagedInlineTarget(entry: ViewCacheEntry, image: WorkingImage, style: string): PlannedImageTarget {
    return {
      illustrationId: "regenerate-inline-1",
      kind: "inline",
      targetKind: image.targetKind ?? "paragraph",
      targetBlockKey: image.targetBlockKey,
      sectionTitle: image.sectionTitle,
      excerpt: image.excerpt,
      inlineType: resolveConcreteInlineType(image.inlineType ?? entry.imageOptions.inlineType),
      source: "llm",
      style,
    };
  }

  private async regenerateUnmanagedInlineImage(
    entry: ViewCacheEntry,
    image: WorkingImage,
    overrides: RegenerateImageOptions,
  ): Promise<void> {
    const nextStyle = normalizeStyle(overrides.style);
    const nextPalette = normalizePalette(overrides.palette);
    const target = this.buildUnmanagedInlineTarget(entry, image, nextStyle);
    const inlineType = resolveConcreteInlineType(target.inlineType);
    const outline: OutlinePlanningResult = {
      articleType: "Education",
      coreArguments: [],
      imageCount: 1,
      outline: [
        {
          id: target.illustrationId ?? "regenerate-inline-1",
          positionType: target.targetKind ?? "paragraph",
          locationText: target.excerpt ?? target.sectionTitle ?? image.label,
          excerpt: target.excerpt ?? image.label,
          sectionTitle: target.sectionTitle ?? "",
          purpose: "Regenerate the selected existing article image.",
          inlineType,
          visualContent: image.label,
        },
      ],
    };
    const typeSpecific = await buildTypeSpecificWithModel(this.plugin.settings, entry.sourceMarkdown, outline);
    const finalPrompts = assembleFinalPromptPayload(
      typeSpecific,
      { [outline.outline[0].id]: inlineType },
      nextStyle,
      nextPalette,
    );
    const finalPrompt = finalPrompts.prompts[0];
    if (!finalPrompt) {
      throw new Error("missing_type_specific");
    }

    const generated = await this.materializeTarget(entry, target, JSON.stringify(finalPrompt, null, 2), nextPalette);
    const nextMarkdown = replaceImagePathInMarkdown(entry.sourceMarkdown, image.blockIndex, image.label, generated.markdownPath);
    await this.persistMarkdown(entry, nextMarkdown);
  }

  private async regenerateImage(
    entry: ViewCacheEntry,
    imageId: string,
    overrides: RegenerateImageOptions,
  ): Promise<void> {
    const image = entry.imageResults.find((item) => item.id === imageId);
    if (!image) {
      new Notice("当前图片不支持重新生成");
      return;
    }
    if (entry.pendingAction) return;
    if (entry.regeneratingImageIds.includes(image.id)) return;

    entry.regeneratingImageIds = [...entry.regeneratingImageIds, image.id];
    this.render(entry);

    try {
      if (!image.managed) {
        await this.regenerateUnmanagedInlineImage(entry, image, overrides);
        entry.regeneratingImageIds = entry.regeneratingImageIds.filter((id) => id !== image.id);
        entry.status = "success";
        this.render(entry);
        return;
      }

      if (!image.sourceImageId) {
        throw new Error("missing_image_record");
      }

      const vaultBasePath = getVaultBasePath(this.app);
      const assetDir = ensureImageAssetDirectory(vaultBasePath, entry.sourcePath);
      const record = readImageRecord(assetDir.absoluteDir, image.sourceImageId);
      if (!record) {
        throw new Error("missing_image_record");
      }

      const nextStyle = normalizeStyle(overrides.style);
      const nextPalette = normalizePalette(overrides.palette);
      const previousCoverOptions = readCoverOptionsFromRecord(record);
      const nextCoverType = normalizeCoverType(overrides.coverType ?? previousCoverOptions.coverType ?? "conceptual");
      const nextCoverMood = overrides.mood ?? previousCoverOptions.mood ?? "balanced";
      const nextCoverAspect = overrides.aspect ?? previousCoverOptions.aspect ?? "2.35:1";
      const nextCoverFont = overrides.font ?? previousCoverOptions.font ?? "clean";
      const nextCoverTextLevel = overrides.textLevel ?? previousCoverOptions.textLevel ?? "title-only";
      const promptChanged = record.kind === "cover"
        ? (
          nextStyle !== normalizeStyle(previousCoverOptions.style)
          || nextPalette !== normalizePalette(previousCoverOptions.palette)
          || nextCoverType !== normalizeCoverType(previousCoverOptions.coverType ?? "conceptual")
          || nextCoverMood !== (previousCoverOptions.mood ?? "balanced")
          || nextCoverAspect !== (previousCoverOptions.aspect ?? "2.35:1")
          || nextCoverFont !== (previousCoverOptions.font ?? "clean")
          || nextCoverTextLevel !== (previousCoverOptions.textLevel ?? "title-only")
        )
        : (
          nextStyle !== normalizeStyle(record.style)
          || nextPalette !== normalizePalette(record.palette ?? "default")
        );
      const prompt = promptChanged
        ? record.kind === "cover"
          ? rebuildCoverPromptForRegeneration(record.prompt, {
            style: nextStyle,
            palette: nextPalette,
            coverType: nextCoverType,
            mood: nextCoverMood,
            aspect: nextCoverAspect,
            font: nextCoverFont,
            textLevel: nextCoverTextLevel,
          })
          : rebuildInlinePromptForRegeneration(record.prompt, nextStyle, nextPalette)
        : record.prompt;
      const promptHash = hashPrompt(prompt);
      const nextImageId = buildRegeneratedImageId(record.imageId);
      const extension = path.extname(record.relativePath) || ".png";
      const filename = getManagedImageFilename(record.kind, nextImageId, extension);
      const generated = await generateImageAsset({
        prompt,
        outputDir: assetDir.absoluteDir,
        fileStem: path.basename(filename, extension),
        provider: this.plugin.settings.imageProvider,
        apiKey: this.plugin.settings.apiKey,
        model: this.plugin.settings.model,
        baseUrl: this.plugin.settings.baseUrl,
        sizeKind: record.kind === "cover" ? "cover" : "article",
        timeoutMs: this.plugin.settings.imageTimeoutSeconds * 1000,
      });

      const nextRelativePath = normalizeManagedAssetPath(assetDir.relativeDir, generated.relativeFilename);
      await ensureVaultFolder(this.app, path.posix.dirname(nextRelativePath));
      const existingFile = this.app.vault.getAbstractFileByPath(nextRelativePath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modifyBinary(existingFile, toArrayBuffer(generated.buffer));
      } else {
        await this.app.vault.createBinary(nextRelativePath, toArrayBuffer(generated.buffer));
      }

      const nextRecord: ImageRecord = {
        ...record,
        imageId: nextImageId,
        configHash: buildConfigHash({
          kind: record.kind,
          style: nextStyle,
          palette: nextPalette,
          coverType: record.kind === "cover" ? nextCoverType : record.coverType,
          coverMood: record.kind === "cover" ? nextCoverMood : record.coverMood,
          coverAspect: record.kind === "cover" ? nextCoverAspect : record.coverAspect,
          coverFont: record.kind === "cover" ? nextCoverFont : record.coverFont,
          coverTextLevel: record.kind === "cover" ? nextCoverTextLevel : record.coverTextLevel,
          inlineType: record.inlineType,
        }),
        prompt,
        promptHash,
        style: nextStyle,
        palette: nextPalette,
        coverType: record.kind === "cover" ? nextCoverType : record.coverType,
        coverMood: record.kind === "cover" ? nextCoverMood : record.coverMood,
        coverAspect: record.kind === "cover" ? nextCoverAspect : record.coverAspect,
        coverFont: record.kind === "cover" ? nextCoverFont : record.coverFont,
        coverTextLevel: record.kind === "cover" ? nextCoverTextLevel : record.coverTextLevel,
        providerIdentity: {
          provider: this.plugin.settings.imageProvider,
          model: this.plugin.settings.model,
          baseUrl: this.plugin.settings.baseUrl,
          sizeKind: record.kind === "cover" ? "cover" : "article",
        },
        relativePath: nextRelativePath,
        targetSnapshot: {
          ...record.targetSnapshot,
          style: nextStyle,
          coverType: record.kind === "cover" ? nextCoverType : record.targetSnapshot.coverType,
        },
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        regeneratedFromImageId: record.imageId,
      };
      writeImageRecord(assetDir.absoluteDir, nextImageId, nextRecord);

      const nextMarkdownPath = toNoteRelativeMarkdownPath(entry.sourcePath, nextRelativePath);
      const nextMarkdown = replaceImagePathInMarkdown(entry.sourceMarkdown, image.blockIndex, image.label, nextMarkdownPath);

      await this.persistMarkdown(entry, nextMarkdown);
      entry.regeneratingImageIds = entry.regeneratingImageIds.filter((id) => id !== image.id);
      entry.status = "success";
      this.render(entry);
    } catch (error) {
      entry.regeneratingImageIds = entry.regeneratingImageIds.filter((id) => id !== image.id);
      entry.status = "error";
      this.render(entry);
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private openSettings(): void {
    const settingManager = (this.app as App & {
      setting?: {
        open?: () => void;
        openTabById?: (id: string) => void;
      };
    }).setting;

    settingManager?.open?.();
    const pluginId = (this.plugin as WechatArticlePlugin & { manifest?: { id?: string } }).manifest?.id;
    if (pluginId) {
      settingManager?.openTabById?.(pluginId);
    }
  }

  private getSelectedClient(): ClientProfile | null {
    const clientId = resolveSelectedClientId(this.plugin.settings.clients, this.plugin.settings.lastSelectedClientId);
    if (!clientId) {
      return null;
    }

    return this.plugin.settings.clients.find((client) => client.id === clientId) ?? null;
  }

  private async selectClient(clientId: string): Promise<void> {
    if (!this.plugin.settings.clients.some((client) => client.id === clientId)) {
      return;
    }
    if (this.plugin.settings.lastSelectedClientId === clientId) {
      return;
    }

    this.plugin.settings.lastSelectedClientId = clientId;
    await this.plugin.saveSettings();
    this.render();
  }

  private buildPublishImages(entry: ViewCacheEntry): Array<{
    path: string;
    htmlSrc?: string;
    markdownPath?: string;
    kind: "cover" | "inline";
  }> {
    const vaultBasePath = getVaultBasePath(this.app);
    const sourceDir = path.posix.dirname(entry.sourcePath);

    return entry.imageResults
      .filter((image) => !/^(https?:|data:|file:)/i.test(image.markdownPath))
      .map((image) => {
        const vaultRelativePath = path.posix.normalize(
          sourceDir === "." ? image.markdownPath : path.posix.join(sourceDir, image.markdownPath),
        ).replace(/^\/+/, "");

        return {
          kind: image.kind,
          path: path.join(vaultBasePath, vaultRelativePath),
          markdownPath: image.markdownPath,
          htmlSrc: resolvePreviewAssetUrl(this.app, entry.sourcePath, image.markdownPath),
        };
      });
  }

  private async publish(entry: ViewCacheEntry): Promise<void> {
    if (entry.pendingAction) return;

    const client = this.getSelectedClient();
    if (!client) {
      new Notice("未设置作者，请先在设置中配置账户");
      this.openSettings();
      return;
    }

    entry.status = "loading";
    entry.pendingAction = "publish";
    entry.publishResult = null;
    this.render(entry);

    try {
      const state = this.buildState(entry);
      const result = await publishWechatDraft({
        html: state.previewHtml,
        title: extractArticleTitle(entry.sourceMarkdown, entry.sourcePath),
        themeKey: entry.themeKey,
        images: this.buildPublishImages(entry),
        client,
      });
      entry.status = "success";
      entry.pendingAction = null;
      entry.publishResult = {
        ok: true,
        message: `草稿创建成功：${result.mediaId}`,
      };
      this.render(entry);
      new Notice(entry.publishResult.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      entry.status = "error";
      entry.pendingAction = null;
      entry.publishResult = {
        ok: false,
        message,
      };
      this.render(entry);
      new Notice(message);
    }
  }
}
