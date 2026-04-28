import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeSelector } from "../src/features/workbench/components/theme-selector";
import { loadBuiltInThemes } from "../src/features/themes/load-themes";

afterEach(() => {
  cleanup();
});

describe("ThemeSelector", () => {
  it("keeps seven featured themes and replaces the last slot with the current non-featured theme", () => {
    render(<ThemeSelector themeKey="wechat-medium" onThemeChange={vi.fn()} />);

    expect(screen.getByText("排版风格")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "默认风格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "技术风格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "高迪·有机" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nikkei 日経" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "晚点风格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "焦橙文档" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notion" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "金融时报" })).not.toBeInTheDocument();
  });

  it("shows the upgraded modal cards with theme-specific descriptions", () => {
    render(<ThemeSelector themeKey="wechat-default" onThemeChange={vi.fn()} />);

    const totalThemes = loadBuiltInThemes().length;
    fireEvent.click(screen.getByRole("button", { name: `全部 ${totalThemes} 款` }));

    expect(screen.getByRole("dialog", { name: "选择排版主题" })).toBeInTheDocument();
    expect(screen.getByText(`选择排版风格 · ${totalThemes} 款`)).toBeInTheDocument();
    expect(screen.getByText("通用稳妥的公众号默认版式，适合大多数信息型内容。")).toBeInTheDocument();
    expect(screen.getByText("更强的结构层级和论点推进，适合趋势判断和深度分析。")).toBeInTheDocument();
    expect(screen.getByText("原汁原味的官方绿底纹，满足传统阅读习惯的稳妥之选")).toBeInTheDocument();
  });
});
