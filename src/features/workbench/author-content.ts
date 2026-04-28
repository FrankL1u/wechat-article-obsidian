import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderAuthorMarkdown(markdown: string, resolveEmbedSrc: (target: string) => string): string {
  const normalized = markdown.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, rawTarget: string) => {
    const target = rawTarget.trim();
    const src = resolveEmbedSrc(target);
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(target)}" />`;
  });

  return md.render(normalized);
}
