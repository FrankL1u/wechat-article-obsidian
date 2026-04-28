import path from "node:path";
import { pathToFileURL } from "node:url";
import type { App, TFile } from "obsidian";

function isFileSystemAdapter(adapter: unknown): adapter is { getBasePath: () => string } {
  return typeof adapter === "object" && adapter !== null && "getBasePath" in adapter && typeof (adapter as { getBasePath: unknown }).getBasePath === "function";
}

function isVaultFile(file: unknown): file is { path: string; basename: string; extension: string; stat: unknown } {
  return typeof file === "object"
    && file !== null
    && "path" in file
    && "basename" in file
    && "extension" in file
    && "stat" in file;
}

export function getVaultBasePath(app: App): string {
  if (!isFileSystemAdapter(app.vault.adapter)) {
    throw new Error("当前 Vault 适配器不支持桌面文件系统路径");
  }
  return app.vault.adapter.getBasePath();
}

export async function ensureVaultFolder(app: App, folderPath: string): Promise<void> {
  const clean = folderPath.replace(/^\/+|\/+$/g, "");
  if (!clean) return;

  const segments = clean.split("/");
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    if (!(await app.vault.adapter.exists(current))) {
      await app.vault.createFolder(current);
    }
  }
}

export function buildPreviewBaseHref(app: App, sourcePath: string, outputDirEnabled: boolean, outputDirPath: string): string {
  const vaultBasePath = getVaultBasePath(app);
  const sourceDir = path.dirname(sourcePath);
  const absoluteDir = sourceDir === "." ? vaultBasePath : path.join(vaultBasePath, sourceDir);
  const href = pathToFileURL(absoluteDir).href;
  return href.endsWith("/") ? href : `${href}/`;
}

export function resolvePreviewAssetUrl(app: App, sourcePath: string, markdownPath: string): string {
  if (/^(https?:|data:|file:)/i.test(markdownPath)) {
    return markdownPath;
  }

  const sourceDir = path.posix.dirname(sourcePath);
  const vaultRelativePath = path.posix.normalize(
    sourceDir === "." ? markdownPath : path.posix.join(sourceDir, markdownPath),
  );
  const normalized = vaultRelativePath.replace(/^\/+/, "");
  if (typeof app.vault.getAbstractFileByPath === "function" && typeof app.vault.getResourcePath === "function") {
    const file = app.vault.getAbstractFileByPath(normalized);
    if (isVaultFile(file)) {
      return app.vault.getResourcePath(file as TFile);
    }
  }

  if (typeof app.vault.adapter.getResourcePath === "function") {
    const resourcePath = app.vault.adapter.getResourcePath(normalized);
    console.warn("[wao] preview-asset-url-fallback", {
      sourcePath,
      markdownPath,
      normalized,
      via: "adapter",
      resourcePath,
    });
    return resourcePath;
  }

  const vaultBasePath = getVaultBasePath(app);
  const absolutePath = path.join(vaultBasePath, normalized);
  const resourcePath = pathToFileURL(absolutePath).href;
  console.warn("[wao] preview-asset-url-fallback", {
    sourcePath,
    markdownPath,
    normalized,
    via: "file",
    resourcePath,
  });
  return resourcePath;
}
