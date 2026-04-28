import { useEffect, useRef } from "react";
import type { ImageCard } from "../types";
import { dispatchCloseAllDropdowns } from "./dropdown";
import { ThemeSelector } from "./theme-selector";
import { parseManagedImageId } from "../../images/managed-image-path";

interface PreviewFrameProps {
  reloadKey: number;
  html: string;
  themeKey: string;
  images: ImageCard[];
  onThemeChange: (themeKey: string) => void;
  onDeleteImage: (imageId: string) => void;
  onRegenerateImage?: (imageId: string) => void;
  controlsDisabled?: boolean;
}

const FRAME_STYLE_ID = "wao-frame-image-tools-style";
const FRAME_CLOSE_BOUND_DOCS = new WeakSet<Document>();
const FRAME_SCROLL_BOUND_ROOTS = new WeakSet<HTMLElement>();
const PREVIEW_SCROLL_SNAPSHOTS = new WeakMap<Document, PreviewScrollSnapshot>();

interface PreviewScrollSnapshot {
  scrollTop: number;
  maxScrollTop: number;
  atBottom: boolean;
}

export function PreviewFrame({
  reloadKey,
  html,
  themeKey,
  images,
  onThemeChange,
  onDeleteImage,
  onRegenerateImage,
  controlsDisabled = false,
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    syncPreviewRuntimeImages(iframeRef.current?.contentDocument ?? null, images, onDeleteImage, onRegenerateImage);
  }, [images, onDeleteImage, onRegenerateImage]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || typeof ResizeObserver === "undefined") {
      return;
    }

    let frameId = 0;
    const scheduleRefresh = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        restorePreviewScrollPosition(iframe.contentDocument);
        capturePreviewScrollSnapshot(iframe.contentDocument);
      });
    };

    const observer = new ResizeObserver(() => {
      scheduleRefresh();
    });
    observer.observe(iframe);
    scheduleRefresh();

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, [reloadKey, html]);

  return (
    <section
      className="wao-preview-workspace"
    >
      <div className="wao-preview-stage">
        <ThemeSelector themeKey={themeKey} onThemeChange={onThemeChange} disabled={controlsDisabled} />
        <iframe
          key={reloadKey}
          ref={iframeRef}
          className="wao-preview-frame"
          title="公众号预览"
          tabIndex={0}
          scrolling="yes"
          srcDoc={html}
          onLoad={() => {
            syncPreviewRuntimeImages(iframeRef.current?.contentDocument ?? null, images, onDeleteImage, onRegenerateImage);
            capturePreviewScrollSnapshot(iframeRef.current?.contentDocument ?? null);
          }}
          onClick={() => {
            reactivatePreviewViewport(iframeRef.current?.contentDocument ?? null);
          }}
        />
      </div>
    </section>
  );
}

export function focusPreviewViewport(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;
  iframe.focus();
  focusPreviewDocument(iframe.contentDocument);
  const userAgent = iframe.ownerDocument?.defaultView?.navigator?.userAgent ?? "";
  if (/jsdom/i.test(userAgent)) {
    return;
  }
  try {
    iframe.contentWindow?.focus?.();
  } catch {
    // Ignore environments that expose a focus function but do not implement it.
  }
}

export function refreshPreviewViewport(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;
  iframe.contentWindow?.dispatchEvent?.(new Event("resize"));
}

export function stabilizePreviewViewport(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;
  restorePreviewScrollPosition(iframe.contentDocument);
  focusPreviewViewport(iframe);
  refreshPreviewViewport(iframe);
  capturePreviewScrollSnapshot(iframe.contentDocument);
}

export function reactivatePreviewViewport(doc: Document | null): void {
  if (!doc) return;

  restorePreviewScrollPosition(doc);
  nudgePreviewScrollRoot(doc);

  const frameElement = doc.defaultView?.frameElement;
  if (frameElement instanceof HTMLIFrameElement) {
    focusPreviewViewport(frameElement);
  } else {
    focusPreviewDocument(doc);
  }
}

function focusPreviewDocument(doc: Document | null): void {
  if (!doc) return;

  const target = getPreviewScrollRoot(doc) ?? (doc.body ?? doc.documentElement) as HTMLElement | null;
  if (!target) return;

  if (target.tabIndex < 0) {
    target.tabIndex = -1;
  }

  try {
    target.focus({ preventScroll: true });
  } catch {
    try {
      target.focus();
    } catch {
      // Ignore environments that do not support focusing the iframe document.
    }
  }
}

export function syncPreviewRuntimeImages(
  doc: Document | null,
  images: ImageCard[],
  onDeleteImage: (imageId: string) => void,
  onRegenerateImage?: (imageId: string) => void,
): void {
  if (!doc) return;

  bindFrameCloseListener(doc);
  bindPreviewScrollListeners(doc);
  ensureFrameStyle(doc);
  capturePreviewScrollSnapshot(doc);

  const wrappers = new Map<string, HTMLElement>();
  doc.querySelectorAll<HTMLElement>(".wao-image-wrapper").forEach((wrapper) => {
    const imageId = wrapper.dataset.imageId;
    if (imageId) {
      wrappers.set(imageId, wrapper);
    }
  });

  const liveImageIds = new Set(images.map((image) => image.id));
  wrappers.forEach((wrapper, imageId) => {
    if (!liveImageIds.has(imageId)) {
      unwrapImageWrapper(wrapper);
      wrappers.delete(imageId);
    }
  });

  const occurrenceBySignature = new Map<string, number>();
  for (const image of images) {
    const signature = getImageSignature(image);
    const occurrenceIndex = occurrenceBySignature.get(signature) ?? 0;
    occurrenceBySignature.set(signature, occurrenceIndex + 1);

    const existing = wrappers.get(image.id);
    if (existing) {
      syncWrapperState(existing, image);
      continue;
    }

    const wrapper = wrapExistingImage(doc, image, occurrenceIndex, onDeleteImage, onRegenerateImage);
    const inserted = Boolean(wrapper);
    if (inserted) {
      wrappers.set(image.id, wrapper!);
    }
  }
}

function wrapExistingImage(
  doc: Document,
  image: ImageCard,
  occurrenceIndex: number,
  onDeleteImage: (imageId: string) => void,
  onRegenerateImage?: (imageId: string) => void,
): HTMLElement | null {
  const targetImg = findRenderedImage(doc, image, occurrenceIndex);
  if (!targetImg) return null;

  const existingWrapper = targetImg.closest<HTMLElement>(".wao-image-wrapper");
  if (existingWrapper) {
    syncWrapperState(existingWrapper, image);
    return existingWrapper;
  }

  const wrapper = doc.createElement("div");
  wrapper.className = "wao-image-wrapper";
  wrapper.dataset.imageId = image.id;

  const parent = targetImg.parentElement;
  if (!parent) return null;
  parent.insertBefore(wrapper, targetImg);
  wrapper.appendChild(targetImg);

  const controls = doc.createElement("div");
  controls.className = "wao-image-tools";

  const deleteButton = doc.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "wao-image-tools__button wao-image-tools__button--delete";
  deleteButton.setAttribute("aria-label", "删除图片");
  deleteButton.setAttribute("title", "删除图片");
  deleteButton.innerHTML = DELETE_SVG;
  deleteButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDeleteImage(image.id);
  });

  const regenerateButton = doc.createElement("button");
  regenerateButton.type = "button";
  regenerateButton.className = "wao-image-tools__button wao-image-tools__button--regenerate";
  regenerateButton.setAttribute("aria-label", "重新生成图片");
  regenerateButton.setAttribute("title", "重新生成图片");
  regenerateButton.innerHTML = REGENERATE_SVG;
  regenerateButton.disabled = !onRegenerateImage;
  regenerateButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRegenerateImage?.(image.id);
  });
  controls.appendChild(regenerateButton);

  controls.appendChild(deleteButton);
  wrapper.appendChild(controls);

  syncWrapperState(wrapper, image);
  return wrapper;
}

function findRenderedImage(doc: Document, image: ImageCard, occurrenceIndex: number): HTMLImageElement | null {
  const normalizedPath = normalizePath(image.markdownPath ?? image.path);
  const candidates = Array.from(doc.querySelectorAll<HTMLImageElement>("img"));
  const matchedCandidates = candidates.filter((candidate) => {
    const src = normalizePath(candidate.getAttribute("src") ?? candidate.src ?? "");
    return src.endsWith(normalizedPath)
      || ((parseManagedImageId(src) !== null) && parseManagedImageId(src) === (image.sourceImageId ?? image.id));
  });
  return matchedCandidates[occurrenceIndex] ?? null;
}

function syncWrapperState(wrapper: HTMLElement, image: ImageCard): void {
  wrapper.dataset.imageId = image.id;
  wrapper.classList.toggle("is-regenerating", Boolean(image.isRegenerating));

  const img = wrapper.querySelector("img");
  if (img) {
    img.setAttribute("src", image.path);
    img.setAttribute("alt", image.label);
  }

  let overlay = wrapper.querySelector<HTMLElement>(".wao-image-overlay");
  if (image.isRegenerating) {
    if (!overlay) {
      overlay = wrapper.ownerDocument.createElement("div");
      overlay.className = "wao-image-overlay";
      overlay.innerHTML = `<span class="wao-image-overlay__spinner" aria-hidden="true"></span>`;
      wrapper.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
  }
}

function normalizePath(value: string): string {
  let normalized = value.trim().replace(/^file:\/\/\/?/, "").replaceAll("\\", "/");
  normalized = normalized.replace(/[?#].*$/, "");
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Ignore malformed escape sequences and keep the raw path.
  }
  return normalized;
}

function unwrapImageWrapper(wrapper: HTMLElement): void {
  const parent = wrapper.parentElement;
  const image = wrapper.querySelector("img");
  if (parent && image) {
    parent.insertBefore(image, wrapper);
  }
  wrapper.remove();
}

function getImageSignature(image: ImageCard): string {
  if (image.sourceImageId) {
    return `managed:${image.sourceImageId}`;
  }
  return `path:${normalizePath(image.markdownPath ?? image.path)}`;
}

function bindFrameCloseListener(doc: Document): void {
  if (FRAME_CLOSE_BOUND_DOCS.has(doc)) {
    return;
  }

  FRAME_CLOSE_BOUND_DOCS.add(doc);
  doc.addEventListener("pointerdown", () => {
    dispatchCloseAllDropdowns();
  });
  doc.addEventListener("click", () => {
    reactivatePreviewViewport(doc);
  });
}

function getPreviewScrollRoot(doc: Document): HTMLElement | null {
  if (typeof doc.querySelector !== "function") {
    return null;
  }
  return doc.querySelector<HTMLElement>(".preview-scroll-root");
}

function bindPreviewScrollListeners(doc: Document): void {
  const scrollRoot = getPreviewScrollRoot(doc);
  if (!scrollRoot || FRAME_SCROLL_BOUND_ROOTS.has(scrollRoot)) {
    return;
  }

  FRAME_SCROLL_BOUND_ROOTS.add(scrollRoot);
  scrollRoot.addEventListener(
    "scroll",
    () => {
      capturePreviewScrollSnapshot(doc);
    },
    { passive: true },
  );
}

export function capturePreviewScrollSnapshot(doc: Document | null): void {
  if (!doc) return;
  const scrollRoot = getPreviewScrollRoot(doc);
  if (!scrollRoot) return;

  const maxScrollTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
  PREVIEW_SCROLL_SNAPSHOTS.set(doc, {
    scrollTop: scrollRoot.scrollTop,
    maxScrollTop,
    atBottom: maxScrollTop > 0 && maxScrollTop - scrollRoot.scrollTop <= 4,
  });
}

export function restorePreviewScrollPosition(doc: Document | null): void {
  if (!doc) return;
  const scrollRoot = getPreviewScrollRoot(doc);
  const snapshot = PREVIEW_SCROLL_SNAPSHOTS.get(doc);
  if (!scrollRoot || !snapshot) return;

  const nextMaxScrollTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
  if (nextMaxScrollTop <= 0) {
    scrollRoot.scrollTop = 0;
    return;
  }

  const nextScrollTop = snapshot.atBottom
    ? nextMaxScrollTop
    : snapshot.maxScrollTop > 0
      ? (snapshot.scrollTop / snapshot.maxScrollTop) * nextMaxScrollTop
      : 0;

  if (Math.abs(scrollRoot.scrollTop - nextScrollTop) > 1) {
    scrollRoot.scrollTop = nextScrollTop;
  }
}

function nudgePreviewScrollRoot(doc: Document | null): void {
  if (!doc) return;
  const scrollRoot = getPreviewScrollRoot(doc);
  if (!scrollRoot) return;

  const currentTop = scrollRoot.scrollTop;
  const maxScrollTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
  if (maxScrollTop <= 0) {
    return;
  }

  const nudgeTop = currentTop < maxScrollTop
    ? Math.min(currentTop + 1, maxScrollTop)
    : Math.max(currentTop - 1, 0);

  if (Math.abs(nudgeTop - currentTop) <= 0.5) {
    return;
  }

  scrollRoot.scrollTop = nudgeTop;
  scrollRoot.scrollTop = currentTop;
}

function ensureFrameStyle(doc: Document): void {
  if (doc.getElementById(FRAME_STYLE_ID)) return;
  const host = doc.head ?? doc.querySelector("head") ?? doc.documentElement;
  if (!host) return;

  const style = doc.createElement("style");
  style.id = FRAME_STYLE_ID;
  style.textContent = `
    .wao-image-wrapper {
      position: relative;
      display: block;
      width: fit-content;
      max-width: 100%;
    }

    .wao-image-wrapper img {
      display: block;
      max-width: 100%;
      width: auto;
    }

    .wao-image-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(148, 163, 184, 0.32);
      backdrop-filter: blur(1px);
      border-radius: inherit;
      z-index: 70;
      pointer-events: none;
    }

    .wao-image-overlay__spinner {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 3px solid rgba(255, 255, 255, 0.45);
      border-top-color: rgba(255, 255, 255, 0.95);
      animation: wao-image-spin 0.8s linear infinite;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.16);
    }

    .wao-image-tools {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
      z-index: 99;
    }

    .wao-image-tools__button {
      width: 32px;
      height: 32px;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      color: #16181d;
      backdrop-filter: blur(6px);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
      transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, color 0.15s ease;
    }

    .wao-image-tools__button:hover:not(:disabled) {
      background: rgba(245, 245, 250, 0.98);
      border-color: rgba(139, 92, 246, 0.5);
      color: #6d28d9;
      transform: scale(1.05);
    }

    .wao-image-tools__button:active:not(:disabled) {
      background: rgba(235, 235, 242, 0.98);
      transform: scale(1);
    }

    .wao-image-tools__button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .wao-image-tools__button svg {
      width: 14px;
      height: 14px;
    }

    .wao-image-wrapper.is-regenerating .wao-image-tools__button {
      pointer-events: none;
      opacity: 0.35;
    }

    @keyframes wao-image-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;

  host.appendChild(style);
}

const DELETE_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const REGENERATE_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>`;
