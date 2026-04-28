import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildConfigHash,
  buildImageId,
  buildTargetHash,
  ensureImageAssetDirectory,
  hashMarkdown,
  hashPrompt,
  type ImageRecord,
  type ProviderIdentity,
  writeImageRecord,
} from "./image-records";
import { generateImageAsset } from "./generate-images";
import { getManagedImageFilename, normalizeManagedAssetPath, toNoteRelativeMarkdownPath } from "./markdown-images";
import type { PlannedImageTarget } from "./types";

export interface CoverImageProviderSettings {
  imageProvider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  imageTimeoutSeconds: number;
}

export interface GenerateCoverImageAssetOptions {
  vaultBasePath: string;
  sourcePath: string;
  articleMarkdown: string;
  promptJson: Record<string, unknown>;
  style: string;
  palette: string;
  coverType: string;
  provider: CoverImageProviderSettings;
  date?: Date;
}

export interface GeneratedCoverImageAsset {
  imageId: string;
  kind: "cover";
  relativePath: string;
  markdownPath: string;
  record: ImageRecord;
}

function stringifyPromptJson(promptJson: Record<string, unknown>): string {
  return JSON.stringify(promptJson, null, 2);
}

export async function generateCoverImageAsset(options: GenerateCoverImageAssetOptions): Promise<GeneratedCoverImageAsset> {
  const date = options.date ?? new Date();
  const assetDir = ensureImageAssetDirectory(options.vaultBasePath, options.sourcePath);
  const articleHash = hashMarkdown(options.articleMarkdown);
  const target: PlannedImageTarget = {
    kind: "cover",
    coverType: options.coverType,
    style: options.style,
    source: "llm",
  };
  const targetHash = buildTargetHash(target);
  const configHash = buildConfigHash({
    kind: "cover",
    style: options.style,
    palette: options.palette,
    coverType: options.coverType,
  });
  const imageId = buildImageId(options.sourcePath, articleHash, targetHash, configHash);
  const prompt = stringifyPromptJson(options.promptJson);
  const visualDesign = typeof options.promptJson.visualDesign === "object" && options.promptJson.visualDesign !== null
    ? options.promptJson.visualDesign as Record<string, unknown>
    : {};
  const promptHash = hashPrompt(prompt);
  const providerIdentity: ProviderIdentity = {
    provider: options.provider.imageProvider,
    model: options.provider.model,
    baseUrl: options.provider.baseUrl,
    sizeKind: "cover",
  };

  const filename = getManagedImageFilename("cover", imageId, ".png", date);
  const generated = await generateImageAsset({
    prompt,
    outputDir: assetDir.absoluteDir,
    fileStem: path.basename(filename, ".png"),
    provider: providerIdentity.provider,
    apiKey: options.provider.apiKey,
    model: providerIdentity.model,
    baseUrl: providerIdentity.baseUrl,
    sizeKind: providerIdentity.sizeKind,
    timeoutMs: options.provider.imageTimeoutSeconds * 1000,
  });

  const relativePath = normalizeManagedAssetPath(assetDir.relativeDir, generated.relativeFilename);
  const absolutePath = path.join(options.vaultBasePath, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, generated.buffer);

  const record: ImageRecord = {
    imageId,
    kind: "cover",
    sourcePath: options.sourcePath,
    articleHash,
    targetHash,
    configHash,
    prompt,
    promptHash,
    style: options.style,
    palette: options.palette,
    coverType: options.coverType,
    coverMood: typeof visualDesign.mood === "string" ? visualDesign.mood : undefined,
    coverAspect: typeof visualDesign.aspectRatio === "string" ? visualDesign.aspectRatio : undefined,
    coverFont: typeof visualDesign.font === "string" ? visualDesign.font : undefined,
    coverTextLevel: typeof visualDesign.textLevel === "string" ? visualDesign.textLevel : undefined,
    providerIdentity,
    targetSnapshot: target,
    relativePath,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };
  writeImageRecord(assetDir.absoluteDir, imageId, record, date);

  return {
    imageId,
    kind: "cover",
    relativePath,
    markdownPath: toNoteRelativeMarkdownPath(options.sourcePath, relativePath),
    record,
  };
}
