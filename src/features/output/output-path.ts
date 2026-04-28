import path from "node:path";

interface ResolveOutputDirectoryInput {
  sourcePath: string;
  outputDirEnabled: boolean;
  outputDirPath: string;
  vaultRoot: string;
}

export function resolveOutputDirectory(input: ResolveOutputDirectoryInput): string {
  if (!input.outputDirEnabled || !input.outputDirPath.trim()) {
    const sourceDir = path.posix.dirname(input.sourcePath);
    return sourceDir === "." ? "" : sourceDir;
  }

  const normalized = input.outputDirPath.trim().replaceAll("\\", "/");
  if (path.isAbsolute(normalized)) {
    const relative = path.relative(input.vaultRoot, normalized).replaceAll("\\", "/");
    if (relative.startsWith("..")) {
      throw new Error("输出目录必须位于当前 Vault 内");
    }
    return relative === "." ? "" : relative;
  }

  return normalized.replace(/^\/+/, "");
}

export function buildOutputFilename(sourceName: string, now: Date): string {
  const ext = path.extname(sourceName) || ".md";
  const baseName = path.basename(sourceName, path.extname(sourceName));
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `${baseName}-wechat-${yyyy}${mm}${dd}-${hh}${min}${ext}`;
}
