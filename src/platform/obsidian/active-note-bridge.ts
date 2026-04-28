import type { App, TFile } from "obsidian";

interface MarkdownLikeView {
  getViewType?: () => string;
  file?: TFile | { path: string } | null;
  editor?: {
    getValue: () => string;
  } | null;
}

function isMarkdownView(view: MarkdownLikeView | null | undefined): view is MarkdownLikeView {
  return view?.getViewType?.() === "markdown";
}

export function resolveActiveMarkdownView(app: App): MarkdownLikeView | null {
  const activeView = app.workspace.activeLeaf?.view as MarkdownLikeView | undefined;
  return isMarkdownView(activeView) ? activeView : null;
}

export function resolveMarkdownView(app: App): MarkdownLikeView | null {
  const activeView = resolveActiveMarkdownView(app);
  if (activeView) {
    return activeView;
  }

  const mostRecentView = app.workspace.getMostRecentLeaf?.()?.view as MarkdownLikeView | undefined;
  if (isMarkdownView(mostRecentView)) {
    return mostRecentView;
  }

  const firstMarkdownLeaf = app.workspace.getLeavesOfType("markdown")[0];
  const firstMarkdownView = firstMarkdownLeaf?.view as MarkdownLikeView | undefined;
  if (isMarkdownView(firstMarkdownView)) {
    return firstMarkdownView;
  }

  return null;
}

export function getActiveMarkdownView(app: App): MarkdownLikeView | null {
  return resolveMarkdownView(app);
}

export function getActiveFile(app: App): TFile | null {
  return (resolveMarkdownView(app)?.file as TFile | null | undefined) ?? null;
}

export function getLiveMarkdown(app: App): string {
  return resolveMarkdownView(app)?.editor?.getValue() ?? "";
}

export interface MarkdownContext {
  path: string;
  markdown: string;
}

export function captureMarkdownContext(app: App): MarkdownContext | null {
  const view = resolveMarkdownView(app);
  const file = (view?.file as TFile | null | undefined) ?? null;
  const markdown = view?.editor?.getValue() ?? "";
  if (!file?.path) return null;

  return {
    path: file.path,
    markdown,
  };
}

export function captureActiveMarkdownContext(app: App): MarkdownContext | null {
  const view = resolveActiveMarkdownView(app);
  const file = (view?.file as TFile | null | undefined) ?? null;
  const markdown = view?.editor?.getValue() ?? "";
  if (!file?.path) return null;

  return {
    path: file.path,
    markdown,
  };
}
