import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildArticleAssetId } from "./article-asset-id";
import type { InlineImageType, PlannedImageTarget } from "./types";

export interface ProviderIdentity {
  provider: string;
  model: string;
  baseUrl: string;
  sizeKind: "cover" | "article";
}

export interface ImageRecord {
  imageId: string;
  kind: "cover" | "inline";
  sourcePath: string;
  articleHash: string;
  targetHash: string;
  configHash: string;
  prompt: string;
  promptHash: string;
  style: string;
  palette?: string;
  coverType?: string;
  coverMood?: string;
  coverAspect?: string;
  coverFont?: string;
  coverTextLevel?: string;
  inlineType?: InlineImageType;
  providerIdentity: ProviderIdentity;
  targetSnapshot: PlannedImageTarget;
  relativePath: string;
  createdAt: string;
  lastUsedAt: string;
  regeneratedFromImageId?: string;
}

function sha1(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}

export function hashMarkdown(markdown: string): string {
  return sha1(markdown);
}

export function hashPrompt(prompt: string): string {
  return sha1(prompt);
}

export function buildTargetHash(target: unknown): string {
  return sha1(JSON.stringify(target));
}

export function buildConfigHash(config: unknown): string {
  return sha1(JSON.stringify(config));
}

export function buildImageId(sourcePath: string, articleHash: string, targetHash: string, configHash: string): string {
  return sha1([sourcePath, articleHash, targetHash, configHash].join("|"));
}

export function getImageAssetDirectory(vaultBasePath: string, sourcePath: string): { relativeDir: string; absoluteDir: string } {
  const relativeDir = path.posix.join("_wechat-article-assets", buildArticleAssetId(sourcePath));
  return {
    relativeDir,
    absoluteDir: path.join(vaultBasePath, relativeDir),
  };
}

export function ensureImageAssetDirectory(vaultBasePath: string, sourcePath: string): { relativeDir: string; absoluteDir: string } {
  const directory = getImageAssetDirectory(vaultBasePath, sourcePath);
  mkdirSync(directory.absoluteDir, { recursive: true });
  return directory;
}

export function buildArtifactDateStamp(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getImageRecordPath(articleDirAbsolutePath: string, imageId: string, date = new Date()): string {
  return path.join(articleDirAbsolutePath, `${buildArtifactDateStamp(date)}-image-record-${imageId}.json`);
}

function findLatestImageRecordPath(articleDirAbsolutePath: string, imageId: string): string | null {
  if (!existsSync(articleDirAbsolutePath)) {
    return null;
  }

  try {
    const matches = readdirSync(articleDirAbsolutePath)
      .filter((name) => name.endsWith(`-image-record-${imageId}.json`))
      .map((name) => path.join(articleDirAbsolutePath, name))
      .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
    return matches[0] ?? null;
  } catch {
    return null;
  }
}

export function writeImageRecord(articleDirAbsolutePath: string, imageId: string, record: ImageRecord, date = new Date()): void {
  mkdirSync(articleDirAbsolutePath, { recursive: true });
  writeFileSync(getImageRecordPath(articleDirAbsolutePath, imageId, date), JSON.stringify(record, null, 2), "utf8");
}

export function readImageRecord(articleDirAbsolutePath: string, imageId: string): ImageRecord | null {
  const absolutePath = findLatestImageRecordPath(articleDirAbsolutePath, imageId);
  if (!absolutePath) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(absolutePath, "utf8")) as ImageRecord;
  } catch {
    return null;
  }
}

export function touchImageRecord(articleDirAbsolutePath: string, imageId: string): void {
  const record = readImageRecord(articleDirAbsolutePath, imageId);
  if (!record) return;
  record.lastUsedAt = new Date().toISOString();
  writeImageRecord(articleDirAbsolutePath, imageId, record);
}
