import type * as cheerio from "cheerio/slim";

export function processMermaidBlocks(_$: cheerio.CheerioAPI): void {
  // Mermaid code blocks are intentionally kept as code blocks in the Obsidian plugin.
  // Rendering through a local CLI would require shell execution, which is not suitable
  // for a community plugin release.
}

export function isMermaidAvailable(): boolean {
  return false;
}
