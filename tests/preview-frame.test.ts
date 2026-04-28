import { describe, expect, it, vi } from "vitest";
import type { ImageCard } from "../src/features/workbench/types";
import {
  capturePreviewScrollSnapshot,
  focusPreviewViewport,
  refreshPreviewViewport,
  reactivatePreviewViewport,
  restorePreviewScrollPosition,
  stabilizePreviewViewport,
  syncPreviewRuntimeImages,
} from "../src/features/workbench/components/preview-frame";

function createPreviewDocument(): Document {
  const doc = document.implementation.createHTMLDocument("preview");
  doc.body.innerHTML = `
    <div class="preview-scroll-root" tabindex="-1">
      <div class="preview-container">
        <div class="preview-body">
          <section>
            <img src="_wechat-article-assets/demo/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png" alt="封面图" />
            <h1>标题</h1>
            <p>第一段正文。</p>
            <img src="_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png" alt="配图 1" />
            <p>第二段正文。</p>
          </section>
        </div>
      </div>
    </div>
  `;
  return doc;
}

describe("preview-frame runtime sync", () => {
  it("inserts cover before the title and inline image after the matched paragraph", () => {
    const doc = createPreviewDocument();
    const images: ImageCard[] = [
      {
        id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        label: "封面图",
        path: "_wechat-article-assets/demo/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
        markdownPath: "_wechat-article-assets/demo/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
        managed: true,
        kind: "cover",
      },
      {
        id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        label: "配图 1",
        path: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        markdownPath: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        managed: true,
        kind: "inline",
        targetKind: "paragraph",
        targetBlockKey: "paragraph:0:标题:第一段正文。",
        excerpt: "第一段正文。",
      },
    ];

    syncPreviewRuntimeImages(doc, images, vi.fn());

    const wrappers = doc.querySelectorAll(".wao-image-wrapper");
    expect(wrappers).toHaveLength(2);
    expect(doc.querySelector("section")?.firstElementChild).toBe(wrappers[0]);
    expect(doc.querySelector("p")?.nextElementSibling).toBe(wrappers[1]);
  });

  it("updates existing wrapper in place and removes stale wrappers", () => {
    const doc = createPreviewDocument();
    const images: ImageCard[] = [
      {
        id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        label: "配图 1",
        path: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        markdownPath: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        managed: true,
        kind: "inline",
        targetKind: "paragraph",
        targetBlockKey: "paragraph:0:标题:第一段正文。",
        excerpt: "第一段正文。",
      },
    ];

    syncPreviewRuntimeImages(doc, images, vi.fn());
    const wrapper = doc.querySelector<HTMLElement>(".wao-image-wrapper[data-image-id='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb']");
    expect(wrapper).toBeTruthy();
    const originalParent = wrapper?.parentElement;

    syncPreviewRuntimeImages(
      doc,
      [{ ...images[0], path: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png" }],
      vi.fn(),
    );

    const updated = doc.querySelector<HTMLElement>(".wao-image-wrapper[data-image-id='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb']");
    expect(updated?.parentElement).toBe(originalParent);
    expect(updated?.querySelector("img")?.getAttribute("src")).toContain("wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png");
    syncPreviewRuntimeImages(doc, [], vi.fn());
    expect(doc.querySelector(".wao-image-wrapper")).toBeNull();
    const imageSources = Array.from(doc.querySelectorAll("img")).map((img) => img.getAttribute("src") ?? "");
    expect(imageSources).toContain("_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png");
  });

  it("wraps duplicate managed image instances independently by occurrence order", () => {
    const doc = document.implementation.createHTMLDocument("preview");
    doc.body.innerHTML = `
      <section>
        <p>第一段正文。</p>
        <img src="_wechat-article-assets/demo/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png" alt="配图" />
        <p>第二段正文。</p>
        <img src="_wechat-article-assets/demo/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png" alt="配图" />
      </section>
    `;

    const images: ImageCard[] = [
      {
        id: "cccccccccccccccccccccccccccccccccccccccc::2",
        sourceImageId: "cccccccccccccccccccccccccccccccccccccccc",
        label: "配图",
        path: "_wechat-article-assets/demo/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png",
        markdownPath: "_wechat-article-assets/demo/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png",
        managed: true,
        kind: "inline",
        blockIndex: 2,
      },
      {
        id: "cccccccccccccccccccccccccccccccccccccccc::4",
        sourceImageId: "cccccccccccccccccccccccccccccccccccccccc",
        label: "配图",
        path: "_wechat-article-assets/demo/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png",
        markdownPath: "_wechat-article-assets/demo/wao-inline-cccccccccccccccccccccccccccccccccccccccc.png",
        managed: true,
        kind: "inline",
        blockIndex: 4,
      },
    ];

    syncPreviewRuntimeImages(doc, images, vi.fn());

    const wrappers = doc.querySelectorAll(".wao-image-wrapper");
    expect(wrappers).toHaveLength(2);
    expect((wrappers[0] as HTMLElement).dataset.imageId).toBe("cccccccccccccccccccccccccccccccccccccccc::2");
    expect((wrappers[1] as HTMLElement).dataset.imageId).toBe("cccccccccccccccccccccccccccccccccccccccc::4");
  });

  it("matches managed preview images when resource urls include query params", () => {
    const doc = document.implementation.createHTMLDocument("preview");
    doc.body.innerHTML = `
      <section>
        <img src="app://obsidian/_wechat-article-assets/demo/wao-cover-dddddddddddddddddddddddddddddddddddddddd.png?166666" alt="封面图" />
      </section>
    `;

    const images: ImageCard[] = [
      {
        id: "dddddddddddddddddddddddddddddddddddddddd::0",
        sourceImageId: "dddddddddddddddddddddddddddddddddddddddd",
        label: "封面图",
        path: "app://obsidian/_wechat-article-assets/demo/wao-cover-dddddddddddddddddddddddddddddddddddddddd.png?166666",
        markdownPath: "../../_wechat-article-assets/demo/wao-cover-dddddddddddddddddddddddddddddddddddddddd.png",
        managed: true,
        kind: "cover",
      },
    ];

    syncPreviewRuntimeImages(doc, images, vi.fn());

    const wrapper = doc.querySelector<HTMLElement>(".wao-image-wrapper");
    expect(wrapper).toBeTruthy();
    expect(wrapper?.dataset.imageId).toBe("dddddddddddddddddddddddddddddddddddddddd::0");
    expect(wrapper?.querySelector(".wao-image-tools")).toBeTruthy();
  });

  it("shows regenerate button for managed and unmanaged images", () => {
    const doc = createPreviewDocument();
    doc.body.querySelector("section")?.insertAdjacentHTML("beforeend", `<img src="assets/legacy.png" alt="外部图" />`);
    const images: ImageCard[] = [
      {
        id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        label: "封面图",
        path: "_wechat-article-assets/demo/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
        markdownPath: "_wechat-article-assets/demo/wao-cover-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
        managed: true,
        kind: "cover",
      },
      {
        id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        label: "配图 1",
        path: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        markdownPath: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        managed: true,
        kind: "inline",
        targetKind: "paragraph",
        targetBlockKey: "paragraph:0:标题:第一段正文。",
        excerpt: "第一段正文。",
      },
      {
        id: "2:assets/legacy.png::2",
        label: "外部图",
        path: "assets/legacy.png",
        markdownPath: "assets/legacy.png",
        managed: false,
        kind: "inline",
      },
    ];

    syncPreviewRuntimeImages(doc, images, vi.fn(), vi.fn());

    const wrappers = Array.from(doc.querySelectorAll<HTMLElement>(".wao-image-wrapper"));
    expect(wrappers).toHaveLength(3);
    expect(wrappers[0]?.querySelector(".wao-image-tools__button--regenerate")).toBeTruthy();
    expect(wrappers[1]?.querySelector(".wao-image-tools__button--regenerate")).toBeTruthy();
    expect(wrappers[2]?.querySelector(".wao-image-tools__button--regenerate")).toBeTruthy();
  });

  it("adds a semi-transparent loading overlay when an image is regenerating", () => {
    const doc = createPreviewDocument();
    const images: ImageCard[] = [
      {
        id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        label: "配图 1",
        path: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        markdownPath: "_wechat-article-assets/demo/wao-inline-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
        managed: true,
        kind: "inline",
        isRegenerating: true,
        targetKind: "paragraph",
        targetBlockKey: "paragraph:0:标题:第一段正文。",
        excerpt: "第一段正文。",
      },
    ];

    syncPreviewRuntimeImages(doc, images, vi.fn(), vi.fn());

    const wrapper = doc.querySelector<HTMLElement>(".wao-image-wrapper");
    expect(wrapper?.classList.contains("is-regenerating")).toBe(true);
    expect(wrapper?.querySelector(".wao-image-overlay")).toBeTruthy();
    expect(wrapper?.querySelector(".wao-image-overlay__spinner")).toBeTruthy();
  });

  it("focuses the iframe viewport when preview interaction resumes", () => {
    const iframe = document.createElement("iframe");
    const focus = vi.fn();
    const windowFocus = vi.fn();
    const scrollRootFocus = vi.fn();
    const contentDocument = document.implementation.createHTMLDocument("preview");
    const scrollRoot = document.createElement("div");
    scrollRoot.className = "preview-scroll-root";
    scrollRoot.focus = scrollRootFocus;
    contentDocument.body.appendChild(scrollRoot);
    iframe.focus = focus;
    Object.defineProperty(iframe, "contentDocument", {
      value: contentDocument,
      configurable: true,
    });
    Object.defineProperty(iframe, "contentWindow", {
      value: { focus: windowFocus },
      configurable: true,
    });

    focusPreviewViewport(iframe);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(scrollRoot.tabIndex).toBe(-1);
    expect(scrollRootFocus).toHaveBeenCalledTimes(1);
    expect(windowFocus).toHaveBeenCalledTimes(0);
  });

  it("dispatches a resize event into the iframe viewport after host resizing", () => {
    const iframe = document.createElement("iframe");
    const dispatchEvent = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { dispatchEvent },
      configurable: true,
    });

    refreshPreviewViewport(iframe);

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe("resize");
  });

  it("stabilizes the iframe viewport by focusing it and dispatching resize together", () => {
    const iframe = document.createElement("iframe");
    const focus = vi.fn();
    const windowFocus = vi.fn();
    const dispatchEvent = vi.fn();
    const scrollRootFocus = vi.fn();
    const contentDocument = document.implementation.createHTMLDocument("preview");
    const scrollRoot = document.createElement("div");
    scrollRoot.className = "preview-scroll-root";
    scrollRoot.focus = scrollRootFocus;
    contentDocument.body.appendChild(scrollRoot);
    iframe.focus = focus;
    Object.defineProperty(iframe, "contentDocument", {
      value: contentDocument,
      configurable: true,
    });
    Object.defineProperty(iframe, "contentWindow", {
      value: { focus: windowFocus, dispatchEvent },
      configurable: true,
    });

    stabilizePreviewViewport(iframe);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(scrollRoot.tabIndex).toBe(-1);
    expect(scrollRootFocus).toHaveBeenCalledTimes(1);
    expect(windowFocus).toHaveBeenCalledTimes(0);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe("resize");
  });

  it("restores proportional scroll position after preview resize", () => {
    const doc = document.implementation.createHTMLDocument("preview");
    const scrollRoot = doc.createElement("div");
    scrollRoot.className = "preview-scroll-root";
    doc.body.appendChild(scrollRoot);

    let scrollTop = 200;
    let scrollHeight = 500;
    Object.defineProperty(scrollRoot, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(scrollRoot, "clientHeight", {
      get: () => 100,
      configurable: true,
    });
    Object.defineProperty(scrollRoot, "scrollHeight", {
      get: () => scrollHeight,
      configurable: true,
    });

    capturePreviewScrollSnapshot(doc);

    scrollHeight = 300;
    restorePreviewScrollPosition(doc);

    expect(scrollTop).toBe(100);
  });

  it("keeps the preview pinned to bottom after resize when it was already at bottom", () => {
    const doc = document.implementation.createHTMLDocument("preview");
    const scrollRoot = doc.createElement("div");
    scrollRoot.className = "preview-scroll-root";
    doc.body.appendChild(scrollRoot);

    let scrollTop = 400;
    let scrollHeight = 500;
    Object.defineProperty(scrollRoot, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(scrollRoot, "clientHeight", {
      get: () => 100,
      configurable: true,
    });
    Object.defineProperty(scrollRoot, "scrollHeight", {
      get: () => scrollHeight,
      configurable: true,
    });

    capturePreviewScrollSnapshot(doc);

    scrollHeight = 350;
    restorePreviewScrollPosition(doc);

    expect(scrollTop).toBe(250);
  });

  it("reactivates preview scrolling on click without consuming pointerdown", () => {
    const scrollRootFocus = vi.fn();
    const contentDocument = document.implementation.createHTMLDocument("preview");
    const scrollRoot = contentDocument.createElement("div");
    scrollRoot.className = "preview-scroll-root";
    scrollRoot.focus = scrollRootFocus;
    contentDocument.body.appendChild(scrollRoot);

    let scrollTop = 120;
    let scrollHeight = 500;
    Object.defineProperty(scrollRoot, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });
    Object.defineProperty(scrollRoot, "clientHeight", {
      get: () => 100,
      configurable: true,
    });
    Object.defineProperty(scrollRoot, "scrollHeight", {
      get: () => scrollHeight,
      configurable: true,
    });

    syncPreviewRuntimeImages(contentDocument, [], vi.fn());
    scrollHeight = 450;

    contentDocument.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    expect(scrollRootFocus).toHaveBeenCalledTimes(0);
    expect(scrollTop).toBe(120);

    contentDocument.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(scrollRootFocus).toHaveBeenCalledTimes(1);
    expect(scrollTop).toBe(105);
  });
});
