import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { previewHtml, WeChatConverter } from "./converter";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function injectTitle(bodyHtml: string, titleHtml: string): string {
  const $ = cheerio.load(`<div id="wao-preview-root">${bodyHtml}</div>`, null, false);
  const root = $("#wao-preview-root");
  const bodyContainer = root.children("section").first();
  const target = bodyContainer.length ? bodyContainer : root;
  let lastLeadImageNode: AnyNode | null = null;

  for (const node of target.contents().toArray()) {
    if (node.type === "text" && !$(node).text().trim()) {
      continue;
    }

    if (!isLeadImageNode($, node)) {
      break;
    }

    lastLeadImageNode = node;
  }

  if (lastLeadImageNode) {
    $(lastLeadImageNode).after(titleHtml);
  } else {
    target.prepend(titleHtml);
  }

  return root.html() ?? bodyHtml;
}

function isLeadImageNode($: cheerio.CheerioAPI, node: AnyNode): boolean {
  if (node.type !== "tag") {
    return false;
  }

  if (node.tagName === "img") {
    return true;
  }

  if (node.tagName !== "p") {
    return false;
  }

  const meaningfulChildren = $(node)
    .contents()
    .toArray()
    .filter((child) => child.type !== "text" || $(child).text().trim());

  return meaningfulChildren.length === 1 && meaningfulChildren[0]?.type === "tag" && meaningfulChildren[0].tagName === "img";
}

function buildCenteredTitleStyle(baseStyle: string): string {
  const allowedPrefixes = ["font-size", "font-weight", "color", "line-height", "font-family", "letter-spacing"];
  const preserved = baseStyle
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => allowedPrefixes.some((prefix) => part.startsWith(prefix)))
    .map((part) => `${part};`);

  return [
    ...preserved,
    "text-align: center !important;",
    "margin: 0 0 28px !important;",
    "padding: 0 !important;",
    "border: 0 !important;",
  ]
    .filter(Boolean)
    .join(" ");
}

interface RenderPreviewInput {
  markdown: string;
  themeKey: string;
  baseHref?: string;
  resolveAssetUrl?: (src: string) => string;
}

function stripDeferredFrontmatter(markdown: string): string {
  const paragraphs = markdown.split(/\n\s*\n/);
  let leadImageCount = 0;

  while (leadImageCount < paragraphs.length && /^!\[[^\]]*]\([^)]+\)\s*$/.test(paragraphs[leadImageCount]?.trim() ?? "")) {
    leadImageCount += 1;
  }

  const candidate = paragraphs[leadImageCount]?.trim() ?? "";
  const candidateLines = candidate.split(/\r?\n/);
  const looksLikeFrontmatter =
    candidateLines.length >= 2 &&
    candidateLines[0] === "---" &&
    candidateLines[candidateLines.length - 1] === "---";

  if (looksLikeFrontmatter) {
    paragraphs.splice(leadImageCount, 1);
  }

  return paragraphs.join("\n\n");
}

export function renderPreviewDocument(input: RenderPreviewInput): string {
  const converter = new WeChatConverter({ themeKey: input.themeKey as never });
  const result = converter.convert(stripDeferredFrontmatter(input.markdown));
  const theme = converter.getTheme();
  const titleHtml = result.title
    ? `<h1 style="${buildCenteredTitleStyle(theme.styles.h1)}">${escapeHtml(result.title)}</h1>`
    : "";
  const bodyHtml = titleHtml ? injectTitle(result.html, titleHtml) : result.html;
  const fullHtml = previewHtml(bodyHtml, theme, input.baseHref);
  const withTheme = fullHtml.replace("<body>", `<body data-theme-key="${input.themeKey}">`);
  if (!input.resolveAssetUrl) {
    return withTheme;
  }

  const $ = cheerio.load(withTheme, null, false);
  $("img").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) return;
    $(element).attr("src", input.resolveAssetUrl!(src));
  });
  return $.html();
}
