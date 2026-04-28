export interface MarkdownContextSnapshot {
  path: string;
  markdown: string;
}

export function selectRenderContext(
  preferredContext: MarkdownContextSnapshot | null,
  activeContext: MarkdownContextSnapshot | null,
  launchContext: MarkdownContextSnapshot | null,
): MarkdownContextSnapshot | null {
  return preferredContext ?? activeContext ?? launchContext ?? null;
}

export function selectRefreshContext(
  currentContext: MarkdownContextSnapshot | null,
  activeContext: MarkdownContextSnapshot | null,
  launchContext: MarkdownContextSnapshot | null,
): MarkdownContextSnapshot | null {
  return activeContext ?? currentContext ?? launchContext ?? null;
}
