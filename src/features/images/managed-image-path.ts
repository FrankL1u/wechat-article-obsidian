export function parseManagedImageId(markdownPath: string): string | null {
  let normalized = markdownPath.trim().replaceAll("\\", "/");
  normalized = normalized.replace(/[?#].*$/, "");
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Ignore malformed escape sequences and keep the raw path.
  }
  const match = normalized.match(/_wechat-article-assets\/.+\/wao-(?:cover|inline)-(?:\d{4}-\d{1,2}-\d{1,2}-)?([a-f0-9]{40})\.(png|svg|jpg|jpeg|webp)$/i);
  return match?.[1] ?? null;
}

export function isManagedImagePath(markdownPath: string): boolean {
  return parseManagedImageId(markdownPath) !== null;
}
