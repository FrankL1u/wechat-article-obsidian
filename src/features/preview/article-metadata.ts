export interface ArticleMetadata {
  title: string;
  content: string;
}

export interface ArticlePublishStats {
  publishedAt: string;
  readCount: number;
  likeCount: number;
}

function splitFrontmatter(text: string): { frontmatter: string; content: string } {
  if (!text.startsWith('---\n')) {
    return { frontmatter: '', content: text };
  }

  const end = text.indexOf('\n---', 4);
  if (end < 0) {
    return { frontmatter: '', content: text };
  }

  const boundaryEnd = text.indexOf('\n', end + 4);
  const contentStart = boundaryEnd >= 0 ? boundaryEnd + 1 : text.length;
  return {
    frontmatter: text.slice(0, contentStart),
    content: text.slice(contentStart),
  };
}

function parseFrontmatterFields(frontmatter: string): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!frontmatter) return fields;

  const body = frontmatter
    .replace(/^---\s*\n/, '')
    .replace(/\n---\s*$/m, '');

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2] ?? "";
    fields[key] = rawValue.replace(/^['"]|['"]$/g, "").trim();
  }

  return fields;
}

function readFirstField(fields: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = fields[key];
    if (value) return value;
  }
  return "";
}

function parseCount(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizePublishedAt(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return trimmed;
  return `${match[1]}-${Number(match[2])}-${Number(match[3])}`;
}

export function resolveArticlePublishStats(text: string): ArticlePublishStats | null {
  const { frontmatter } = splitFrontmatter(text);
  const fields = parseFrontmatterFields(frontmatter);
  const publishedAt = readFirstField(fields, [
    "published_at",
    "publishedAt",
    "published_date",
    "publishedDate",
    "publish_at",
    "publishAt",
    "publish_date",
    "publishDate",
    "wechat_publish_date",
    "wechatPublishedAt",
  ]);
  if (!publishedAt) return null;

  return {
    publishedAt: normalizePublishedAt(publishedAt),
    readCount: parseCount(readFirstField(fields, ["read_count", "readCount", "reads", "view_count", "viewCount"])),
    likeCount: parseCount(readFirstField(fields, ["like_count", "likeCount", "likes"])),
  };
}

export function resolveArticleMetadata(text: string): ArticleMetadata {
  const { content } = splitFrontmatter(text);
  const normalizedContent = content.replace(/^\s+/, '');
  let title = '';

  for (const line of normalizedContent.split(/\r?\n/)) {
    const stripped = line.trim();
    if (/^#\s+/.test(stripped) && !/^##\s+/.test(stripped)) {
      title = stripped.slice(2).trim();
      break;
    }
  }

  return {
    title,
    content: normalizedContent,
  };
}

export function stripPrimaryTitle(text: string): string {
  const metadata = resolveArticleMetadata(text);
  if (!metadata.title) {
    return metadata.content;
  }

  let removed = false;
  return metadata.content
    .split(/\r?\n/)
    .filter(line => {
      if (removed) return true;
      const stripped = line.trim();
      if (/^#\s+/.test(stripped) && stripped.slice(2).trim() === metadata.title) {
        removed = true;
        return false;
      }
      return true;
    })
    .join('\n');
}
