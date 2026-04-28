import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/features/workbench/app";
import { loadBuiltInThemes } from "../src/features/themes/load-themes";
import type { AppState } from "../src/features/workbench/types";

function createBaseState(): AppState {
  return {
    sourcePath: "Inbox/原文.md",
    themeKey: "wechat-default",
    previewHtml: "<html></html>",
    previewRevision: 0,
    imageOptions: {
      coverType: "conceptual",
      style: "editorial",
      palette: "default",
      inlineMode: "balanced",
      inlineType: "auto",
    },
    imageResults: [],
    status: "idle",
    pendingAction: null,
    availableClients: [{ id: "liu", author: "刘Sir.2035" }],
    selectedClientId: "liu",
    publishResult: null,
  };
}

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders theme shortcuts and opens the theme modal instead of a theme dropdown", () => {
    const totalThemes = loadBuiltInThemes().length;
    const onImageOptionsChange = vi.fn();
    const onThemeChange = vi.fn();

    render(
      <App
        state={createBaseState()}
        actions={{
          onThemeChange,
          onImageOptionsChange,
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByText("Inbox/原文.md")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "技术风格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "默认风格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "高迪·有机" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nikkei 日経" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "晚点风格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "焦橙文档" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `全部 ${totalThemes} 款` })).toBeInTheDocument();
    expect(screen.queryByText("图片结果")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "智能配图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `全部 ${totalThemes} 款` }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "选择排版主题" })).getByRole("button", { name: /晚点风格/ }));
    expect(onThemeChange).toHaveBeenCalledWith("latepost-depth");
    expect(onImageOptionsChange).not.toHaveBeenCalled();
  });

  it("closes the theme modal when clicking outside", () => {
    const totalThemes = loadBuiltInThemes().length;
    render(
      <App
        state={createBaseState()}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: `全部 ${totalThemes} 款` }));
    expect(screen.getByRole("dialog", { name: "选择排版主题" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "选择排版主题" })).not.toBeInTheDocument();
  });

  it("disables primary actions and shows loading state while publish is running", () => {
    render(
      <App
        state={{
          ...createBaseState(),
          status: "loading",
          pendingAction: "publish",
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
        }}
      />,
    );

    const generateImagesButton = screen.getByRole("button", { name: "发布中" });
    const smartImageButton = screen.getByRole("button", { name: "智能配图" });

    expect(generateImagesButton).toBeDisabled();
    expect(smartImageButton).toBeDisabled();
    expect(screen.getByText("发布中")).toBeInTheDocument();
    expect(screen.getAllByTestId("wao-spinner")).toHaveLength(1);
  });

  it("disables all workbench controls except help and author when no document is loaded", () => {
    const totalThemes = loadBuiltInThemes().length;
    render(
      <App
        state={{
          ...createBaseState(),
          sourcePath: "",
          previewHtml: "<html><body>未加载内容，请选择文档</body></html>",
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "帮助" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "❤️ 关于作者" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "技术风格" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Claude" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "默认风格" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "高迪·有机" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nikkei 日経" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "晚点风格" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "焦橙文档" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Notion" })).toBeDisabled();
    expect(screen.getByRole("button", { name: `全部 ${totalThemes} 款` })).toBeDisabled();
    expect(screen.getByRole("button", { name: "智能配图" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
  });

  it("shows 未设置作者 when no client exists", () => {
    render(
      <App
        state={{
          ...createBaseState(),
          availableClients: [],
          selectedClientId: null,
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "未设置作者" })).toBeInTheDocument();
  });

  it("shows the author name without an arrow when only one client exists", () => {
    render(
      <App
        state={{
          ...createBaseState(),
          availableClients: [{ id: "liu", author: "刘Sir.2035" }],
          selectedClientId: "liu",
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "刘Sir.2035" })).toBeInTheDocument();
    expect(screen.queryByTestId("wao-author-chip-arrow")).not.toBeInTheDocument();
  });

  it("shows publish metadata next to the author only when the article is published", () => {
    const { rerender } = render(
      <App
        state={{
          ...createBaseState(),
          articlePublishStats: {
            publishedAt: "2026-3-20",
            readCount: 0,
            likeCount: 0,
          },
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText("2026-3-20")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);

    rerender(
      <App
        state={{
          ...createBaseState(),
          articlePublishStats: null,
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByText("2026-3-20")).not.toBeInTheDocument();
  });

  it("disables publish when no author account is selected", () => {
    render(
      <App
        state={{
          ...createBaseState(),
          availableClients: [],
          selectedClientId: null,
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
  });

  it("marks the selected author item when opening the multi-account menu", () => {
    render(
      <App
        state={{
          ...createBaseState(),
          availableClients: [
            { id: "liu", author: "刘Sir.2035" },
            { id: "other", author: "另一个作者" },
          ],
          selectedClientId: "liu",
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "刘Sir.2035" }));
    expect(document.querySelector(".wao-author-chip__menu-item.is-selected")?.textContent).toContain("刘Sir.2035");
  });

  it("opens the author overlay with html from state", () => {
    render(
      <App
        state={{
          ...createBaseState(),
          authorHtml: "<h1>关于作者</h1><p>来自文档的作者介绍。</p>",
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onDeleteImage: vi.fn(),
          onPublish: vi.fn(),
          onOpenSettings: vi.fn(),
          onSelectClient: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "❤️ 关于作者" }));
    expect(screen.getByRole("dialog", { name: "关于作者" })).toBeInTheDocument();
    expect(screen.getByText("来自文档的作者介绍。")).toBeInTheDocument();
  });
});
