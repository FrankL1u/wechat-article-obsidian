import { describe, expect, it } from "vitest";
import { captureActiveMarkdownContext, captureMarkdownContext, resolveMarkdownView } from "../src/platform/obsidian/active-note-bridge";

function createMarkdownView(path: string, content: string) {
  return {
    getViewType: () => "markdown",
    file: { path },
    editor: {
      getValue: () => content,
    },
  };
}

describe("active-note-bridge", () => {
  it("falls back to the most recent markdown leaf when the active leaf is the workbench", () => {
    const markdownView = createMarkdownView("_codex/test.md", "# 标题\n\n正文");
    const workspace = {
      activeLeaf: {
        view: {
          getViewType: () => "wechat-article-workbench",
        },
      },
      getActiveViewOfType: () => null,
      getMostRecentLeaf: () => ({
        view: markdownView,
      }),
      getLeavesOfType: () => [
        {
          view: markdownView,
        },
      ],
    };

    const result = resolveMarkdownView({ workspace } as never);

    expect(result).toBe(markdownView);
  });

  it("uses the active markdown view when it is already focused", () => {
    const markdownView = createMarkdownView("_codex/test.md", "# 标题");
    const workspace = {
      activeLeaf: {
        view: markdownView,
      },
      getActiveViewOfType: () => markdownView,
      getMostRecentLeaf: () => null,
      getLeavesOfType: () => [],
    };

    const result = resolveMarkdownView({ workspace } as never);

    expect(result).toBe(markdownView);
  });

  it("falls back to the first markdown leaf when the most recent leaf is also the workbench", () => {
    const markdownView = createMarkdownView("_codex/test.md", "# 标题\n\n正文");
    const workspace = {
      activeLeaf: {
        view: {
          getViewType: () => "wechat-article-workbench",
        },
      },
      getMostRecentLeaf: () => ({
        view: {
          getViewType: () => "wechat-article-workbench",
        },
      }),
      getLeavesOfType: () => [
        {
          view: markdownView,
        },
      ],
    };

    const result = resolveMarkdownView({ workspace } as never);

    expect(result).toBe(markdownView);
  });

  it("captures markdown context for launch-time fallback", () => {
    const markdownView = createMarkdownView("_codex/test.md", "# 标题\n\n正文");
    const workspace = {
      activeLeaf: {
        view: markdownView,
      },
      getMostRecentLeaf: () => null,
      getLeavesOfType: () => [],
    };

    const result = captureMarkdownContext({ workspace } as never);

    expect(result).toEqual({
      path: "_codex/test.md",
      markdown: "# 标题\n\n正文",
    });
  });

  it("does not treat fallback markdown leaves as active markdown context", () => {
    const markdownView = createMarkdownView("_codex/test.md", "# 标题\n\n正文");
    const workspace = {
      activeLeaf: {
        view: {
          getViewType: () => "wechat-article-workbench",
        },
      },
      getMostRecentLeaf: () => ({
        view: markdownView,
      }),
      getLeavesOfType: () => [
        {
          view: markdownView,
        },
      ],
    };

    expect(captureActiveMarkdownContext({ workspace } as never)).toBeNull();
  });
});
