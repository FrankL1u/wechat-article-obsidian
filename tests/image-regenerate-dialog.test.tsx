import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageRegenerateDialog } from "../src/features/workbench/components/image-regenerate-dialog";

afterEach(() => {
  cleanup();
});

describe("ImageRegenerateDialog", () => {
  it("renders only style and palette options for inline image regeneration", () => {
    render(
      <ImageRegenerateDialog
        open
        image={{
          id: "img-1",
          sourceImageId: "img-1",
          label: "配图 1",
          path: "/demo.png",
          markdownPath: "demo.png",
          managed: true,
          kind: "inline",
          style: "editorial",
          palette: "default",
          sectionTitle: "核心想法",
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "重新生成图片" })).toBeInTheDocument();
    expect(screen.queryByText("只处理当前正文图。默认沿用原 prompt，再次生成时只允许调整风格和配色。")).not.toBeInTheDocument();
    expect(screen.queryByText("图片：配图 1")).not.toBeInTheDocument();
    expect(screen.queryByText("章节：核心想法")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^风格：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /配色：/ })).toBeInTheDocument();
    expect(screen.queryByText("正文图类型")).not.toBeInTheDocument();
  });

  it("submits selected style and palette", () => {
    const onConfirm = vi.fn();

    render(
      <ImageRegenerateDialog
        open
        image={{
          id: "img-1",
          sourceImageId: "img-1",
          label: "配图 1",
          path: "/demo.png",
          markdownPath: "demo.png",
          managed: true,
          kind: "inline",
          style: "editorial",
          palette: "default",
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /风格：/ }));
    fireEvent.click(screen.getByRole("option", { name: "温暖亲和风" }));
    fireEvent.click(screen.getByRole("button", { name: /配色：/ }));
    fireEvent.click(screen.getByRole("option", { name: "warm（暖调）" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    expect(onConfirm).toHaveBeenCalledWith({
      style: "warm",
      palette: "warm",
    });
  });

  it("renders cover regeneration fields and submits all cover dimensions", () => {
    const onConfirm = vi.fn();

    render(
      <ImageRegenerateDialog
        open
        image={{
          id: "cover-1",
          sourceImageId: "cover-1",
          label: "封面图",
          path: "/cover.png",
          markdownPath: "cover.png",
          managed: true,
          kind: "cover",
          style: "editorial",
          palette: "default",
          coverType: "conceptual",
          coverMood: "balanced",
          coverAspect: "2.35:1",
          coverFont: "clean",
          coverTextLevel: "title-only",
        }}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("button", { name: /^风格：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /配色：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /封面类型：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /情绪：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /比例：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /字体风格：/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /层级：/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /封面类型：/ }));
    fireEvent.click(screen.getByRole("option", { name: "隐喻表达" }));
    fireEvent.click(screen.getByRole("button", { name: /情绪：/ }));
    fireEvent.click(screen.getByRole("option", { name: "强烈" }));
    fireEvent.click(screen.getByRole("button", { name: /比例：/ }));
    fireEvent.click(screen.getByRole("option", { name: "横版 16:9" }));
    fireEvent.click(screen.getByRole("button", { name: /字体风格：/ }));
    fireEvent.click(screen.getByRole("option", { name: "醒目标题" }));
    fireEvent.click(screen.getByRole("button", { name: /层级：/ }));
    fireEvent.click(screen.getByRole("option", { name: "标题+副标题+标签" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    expect(onConfirm).toHaveBeenCalledWith({
      style: "editorial",
      palette: "default",
      coverType: "metaphor",
      mood: "bold",
      aspect: "16:9",
      font: "display",
      textLevel: "text-rich",
    });
  });
});
