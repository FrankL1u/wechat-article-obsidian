# WeChat Article Obsidian Plugin V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Obsidian plugin that opens a right-side workbench for live WeChat HTML preview, theme switching, image generation, and new Markdown article output from the active note.

**Architecture:** Use a dual-entry structure: an Obsidian host layer mounts a React workbench inside an `ItemView`, while a Vite web entry runs the same UI with mock data for fast iteration. Shared core modules own theme loading, preview rendering, image planning/generation coordination, output path resolution, and Markdown article assembly so most logic stays testable outside Obsidian.

**Tech Stack:** TypeScript, React, Vite, Vitest, esbuild, Obsidian Plugin API

---

当前目录不是 git 仓库，因此本计划不包含 commit 步骤。等仓库初始化后，再把任务分段提交。

## File Structure

### Root build and packaging

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `manifest.json`
- Create: `versions.json`
- Create: `styles.css`
- Create: `.gitignore`

### Plugin host files

- Create: `src/main.ts`
- Create: `src/obsidian/view.tsx`
- Create: `src/obsidian/settings-tab.ts`
- Create: `src/obsidian/plugin-settings.ts`
- Create: `src/obsidian/active-note-bridge.ts`
- Create: `src/obsidian/vault-output.ts`

### Shared core files

- Create: `src/core/theme/builtin-themes.json`
- Create: `src/core/theme/load-themes.ts`
- Create: `src/core/preview/render-preview.ts`
- Create: `src/core/images/types.ts`
- Create: `src/core/images/plan-images.ts`
- Create: `src/core/images/build-article.ts`
- Create: `src/core/output/output-path.ts`

### UI files

- Create: `src/ui/app.tsx`
- Create: `src/ui/types.ts`
- Create: `src/ui/components/toolbar.tsx`
- Create: `src/ui/components/preview-frame.tsx`
- Create: `src/ui/components/image-options-form.tsx`
- Create: `src/ui/components/image-result-list.tsx`
- Create: `src/ui/components/status-banner.tsx`

### Web-dev entry

- Create: `src/web/main.tsx`
- Create: `src/web/mock-api.ts`

### Tests

- Create: `tests/output-path.test.ts`
- Create: `tests/render-preview.test.ts`
- Create: `tests/build-article.test.ts`
- Create: `tests/app.test.tsx`

## Task 1: Bootstrap the plugin workspace and build pipeline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `manifest.json`
- Create: `versions.json`
- Create: `styles.css`
- Create: `.gitignore`

- [ ] **Step 1: Create the root package definition**

```json
{
  "name": "wechat-article-obsidian",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:web": "vite",
    "build:web": "vite build",
    "build:plugin": "node esbuild.config.mjs",
    "build": "npm run build:web && npm run build:plugin",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.15.3",
    "@vitejs/plugin-react": "^4.4.1",
    "esbuild": "^0.25.2",
    "jsdom": "^26.1.0",
    "obsidian": "^1.8.10",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.8.3",
    "vite": "^6.3.2",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Add TypeScript and bundler configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

```js
// esbuild.config.mjs
import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", "@codemirror/commands"],
  format: "cjs",
  platform: "browser",
  target: "es2022",
  sourcemap: "inline",
});
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
});
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Add Obsidian packaging files**

```json
// manifest.json
{
  "id": "wechat-article-obsidian",
  "name": "WeChat Article Obsidian",
  "version": "0.1.0",
  "minAppVersion": "1.6.0",
  "description": "Preview the active note as a WeChat article, generate images, and output a new Markdown article.",
  "author": "Frank",
  "authorUrl": "",
  "isDesktopOnly": true
}
```

```json
// versions.json
{
  "0.1.0": "1.6.0"
}
```

```css
/* styles.css */
.wechat-article-workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
}
```

```gitignore
node_modules
dist
.DS_Store
.userdata
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`  
Expected: install completes with `added` package output and no `ERR!`.

- [ ] **Step 5: Verify the toolchain**

Run: `npm run typecheck`  
Expected: exits `0` with no TypeScript errors.

Run: `npm run test`  
Expected: `No test files found`, because tests are added in later tasks.

## Task 2: Implement settings and output path rules with tests

**Files:**
- Create: `src/obsidian/plugin-settings.ts`
- Create: `src/core/output/output-path.ts`
- Test: `tests/output-path.test.ts`

- [ ] **Step 1: Write the failing tests for output rules**

```ts
// tests/output-path.test.ts
import { describe, expect, it } from "vitest";
import { buildOutputFilename, resolveOutputDirectory } from "../src/core/output/output-path";

describe("output-path", () => {
  it("uses the source directory when custom output is disabled", () => {
    const result = resolveOutputDirectory({
      sourcePath: "Inbox/原文.md",
      outputDirEnabled: false,
      outputDirPath: "",
      vaultRoot: "/vault",
    });
    expect(result).toBe("Inbox");
  });

  it("resolves vault-relative output paths against the vault root", () => {
    const result = resolveOutputDirectory({
      sourcePath: "Inbox/原文.md",
      outputDirEnabled: true,
      outputDirPath: "公众号/输出",
      vaultRoot: "/vault",
    });
    expect(result).toBe("公众号/输出");
  });

  it("builds the article filename with the wechat suffix and minute timestamp", () => {
    const result = buildOutputFilename("原文.md", new Date("2026-04-20T14:30:00+08:00"));
    expect(result).toBe("原文-wechat-20260420-1430.md");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- tests/output-path.test.ts`  
Expected: FAIL with `Cannot find module '../src/core/output/output-path'`.

- [ ] **Step 3: Implement the settings schema and output path helpers**

```ts
// src/obsidian/plugin-settings.ts
export interface PluginSettings {
  imageProvider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultCoverType: string;
  defaultStyle: string;
  defaultCreativeDirection: string;
  outputDirEnabled: boolean;
  outputDirPath: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  imageProvider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "",
  defaultCoverType: "概念型",
  defaultStyle: "科技媒体",
  defaultCreativeDirection: "贴近文章语气",
  outputDirEnabled: false,
  outputDirPath: "",
};
```

```ts
// src/core/output/output-path.ts
import path from "node:path";

interface ResolveOutputDirectoryInput {
  sourcePath: string;
  outputDirEnabled: boolean;
  outputDirPath: string;
  vaultRoot: string;
}

export function resolveOutputDirectory(input: ResolveOutputDirectoryInput): string {
  if (!input.outputDirEnabled || !input.outputDirPath.trim()) {
    const sourceDir = path.posix.dirname(input.sourcePath);
    return sourceDir === "." ? "" : sourceDir;
  }

  const normalized = input.outputDirPath.trim().replaceAll("\\", "/");
  if (path.isAbsolute(normalized)) {
    const relative = path.relative(input.vaultRoot, normalized).replaceAll("\\", "/");
    if (relative.startsWith("..")) {
      throw new Error("输出目录必须位于当前 Vault 内");
    }
    return relative === "." ? "" : relative;
  }

  return normalized.replace(/^\/+/, "");
}

export function buildOutputFilename(sourceName: string, now: Date): string {
  const ext = path.extname(sourceName);
  const base = path.basename(sourceName, ext);
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const hh = `${now.getHours()}`.padStart(2, "0");
  const min = `${now.getMinutes()}`.padStart(2, "0");
  return `${base}-wechat-${yyyy}${mm}${dd}-${hh}${min}${ext || ".md"}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- tests/output-path.test.ts`  
Expected: PASS with `3 passed`.

## Task 3: Implement theme loading and preview rendering with tests

**Files:**
- Create: `src/core/theme/builtin-themes.json`
- Create: `src/core/theme/load-themes.ts`
- Create: `src/core/preview/render-preview.ts`
- Test: `tests/render-preview.test.ts`

- [ ] **Step 1: Write the failing tests for theme loading and preview rendering**

```ts
// tests/render-preview.test.ts
import { describe, expect, it } from "vitest";
import { loadBuiltInThemes } from "../src/core/theme/load-themes";
import { renderPreviewDocument } from "../src/core/preview/render-preview";

describe("render-preview", () => {
  it("loads at least one built-in theme", () => {
    const themes = loadBuiltInThemes();
    expect(themes.length).toBeGreaterThan(0);
    expect(themes[0]).toHaveProperty("key");
  });

  it("renders article HTML with the requested theme key", () => {
    const html = renderPreviewDocument({
      markdown: "# 标题\n\n正文",
      themeKey: "wechat-default",
    });
    expect(html).toContain("data-theme-key=\"wechat-default\"");
    expect(html).toContain("<h1>标题</h1>");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- tests/render-preview.test.ts`  
Expected: FAIL with missing `load-themes` and `render-preview`.

- [ ] **Step 3: Vendor the theme data and implement the preview functions**

```json
// src/core/theme/builtin-themes.json
[
  { "key": "wechat-default", "label": "默认主题", "containerStyle": "max-width: 720px; margin: 0 auto; padding: 32px 24px;" },
  { "key": "wechat-tech", "label": "科技主题", "containerStyle": "max-width: 720px; margin: 0 auto; padding: 32px 24px; background: #ffffff;" },
  { "key": "latepost-depth", "label": "晚点深度", "containerStyle": "max-width: 760px; margin: 0 auto; padding: 40px 32px;" }
]
```

```ts
// src/core/theme/load-themes.ts
import themes from "./builtin-themes.json";

export interface BuiltInTheme {
  key: string;
  label: string;
  containerStyle: string;
}

export function loadBuiltInThemes(): BuiltInTheme[] {
  return themes as BuiltInTheme[];
}

export function getThemeByKey(themeKey: string): BuiltInTheme {
  const theme = loadBuiltInThemes().find((item) => item.key === themeKey);
  if (!theme) {
    throw new Error(`Unknown theme: ${themeKey}`);
  }
  return theme;
}
```

```ts
// src/core/preview/render-preview.ts
import { getThemeByKey } from "../theme/load-themes";

interface RenderPreviewInput {
  markdown: string;
  themeKey: string;
}

function simpleMarkdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^([^<].+)$/gm, "<p>$1</p>");
}

export function renderPreviewDocument(input: RenderPreviewInput): string {
  const theme = getThemeByKey(input.themeKey);
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <body data-theme-key="${theme.key}">
    <article style="${theme.containerStyle}">
      ${simpleMarkdownToHtml(input.markdown)}
    </article>
  </body>
</html>`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- tests/render-preview.test.ts`  
Expected: PASS with `2 passed`.

## Task 4: Implement image planning and new-article assembly with tests

**Files:**
- Create: `src/core/images/types.ts`
- Create: `src/core/images/plan-images.ts`
- Create: `src/core/images/build-article.ts`
- Test: `tests/build-article.test.ts`

- [ ] **Step 1: Write the failing tests for article assembly**

```ts
// tests/build-article.test.ts
import { describe, expect, it } from "vitest";
import { buildGeneratedArticle } from "../src/core/images/build-article";

describe("build-generated-article", () => {
  it("adds frontmatter and places the cover image at the top", () => {
    const result = buildGeneratedArticle({
      sourcePath: "Inbox/原文.md",
      themeKey: "wechat-default",
      sourceMarkdown: "# 标题\n\n第一段",
      coverImage: { alt: "封面", markdownPath: ".wechat-article-obsidian/2026-04-1/cover.png" },
      inlineImages: [],
    });

    expect(result).toContain("source_note: Inbox/原文.md");
    expect(result).toContain("wechat_theme: wechat-default");
    expect(result).toContain("![封面](.wechat-article-obsidian/2026-04-1/cover.png)");
  });

  it("inserts inline images after the requested anchor paragraph index", () => {
    const result = buildGeneratedArticle({
      sourcePath: "Inbox/原文.md",
      themeKey: "wechat-default",
      sourceMarkdown: "第一段\n\n第二段",
      coverImage: null,
      inlineImages: [
        { alt: "配图 1", markdownPath: "assets/inline-01.png", paragraphIndex: 0 }
      ],
    });

    expect(result).toContain("第一段\n\n![配图 1](assets/inline-01.png)\n\n第二段");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- tests/build-article.test.ts`  
Expected: FAIL with missing `build-article`.

- [ ] **Step 3: Implement the image types, planner contract, and article builder**

```ts
// src/core/images/types.ts
export interface ImageOptions {
  coverType: string;
  style: string;
  creativeDirection: string;
  inlineCount: number;
}

export interface CoverImageResult {
  alt: string;
  markdownPath: string;
}

export interface InlineImageResult {
  alt: string;
  markdownPath: string;
  paragraphIndex: number;
}
```

```ts
// src/core/images/plan-images.ts
import type { ImageOptions } from "./types";

export interface PlannedImageTarget {
  kind: "cover" | "inline";
  paragraphIndex?: number;
  promptLabel: string;
}

export function planImages(markdown: string, options: ImageOptions): PlannedImageTarget[] {
  const paragraphs = markdown.split(/\n\s*\n/).filter(Boolean);
  const targets: PlannedImageTarget[] = [{ kind: "cover", promptLabel: options.coverType }];

  for (let index = 0; index < Math.min(options.inlineCount, paragraphs.length); index += 1) {
    targets.push({ kind: "inline", paragraphIndex: index, promptLabel: `${options.style}-${index + 1}` });
  }

  return targets;
}
```

```ts
// src/core/images/build-article.ts
import type { CoverImageResult, InlineImageResult } from "./types";

interface BuildGeneratedArticleInput {
  sourcePath: string;
  themeKey: string;
  sourceMarkdown: string;
  coverImage: CoverImageResult | null;
  inlineImages: InlineImageResult[];
}

export function buildGeneratedArticle(input: BuildGeneratedArticleInput): string {
  const paragraphs = input.sourceMarkdown.split(/\n\s*\n/);
  const inlineByIndex = new Map<number, InlineImageResult[]>();

  for (const image of input.inlineImages) {
    const bucket = inlineByIndex.get(image.paragraphIndex) ?? [];
    bucket.push(image);
    inlineByIndex.set(image.paragraphIndex, bucket);
  }

  const body: string[] = [];
  if (input.coverImage) {
    body.push(`![${input.coverImage.alt}](${input.coverImage.markdownPath})`);
  }

  paragraphs.forEach((paragraph, index) => {
    body.push(paragraph);
    const images = inlineByIndex.get(index) ?? [];
    images.forEach((image) => {
      body.push(`![${image.alt}](${image.markdownPath})`);
    });
  });

  const frontmatter = [
    "---",
    `source_note: ${input.sourcePath}`,
    `wechat_theme: ${input.themeKey}`,
    "---",
  ].join("\n");

  return `${frontmatter}\n\n${body.join("\n\n")}\n`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- tests/build-article.test.ts`  
Expected: PASS with `2 passed`.

## Task 5: Build the React workbench and local web-dev shell

**Files:**
- Create: `src/ui/types.ts`
- Create: `src/ui/app.tsx`
- Create: `src/ui/components/toolbar.tsx`
- Create: `src/ui/components/preview-frame.tsx`
- Create: `src/ui/components/image-options-form.tsx`
- Create: `src/ui/components/image-result-list.tsx`
- Create: `src/ui/components/status-banner.tsx`
- Create: `src/web/main.tsx`
- Create: `src/web/mock-api.ts`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
// tests/app.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/app";

describe("App", () => {
  it("renders the current file name and theme selector", () => {
    render(
      <App
        state={{
          sourcePath: "Inbox/原文.md",
          themeKey: "wechat-default",
          previewHtml: "<html></html>",
          imageOptions: { coverType: "概念型", style: "科技媒体", creativeDirection: "贴近文章语气", inlineCount: 3 },
          imageResults: [],
          status: "idle",
        }}
        actions={{
          onThemeChange: vi.fn(),
          onImageOptionsChange: vi.fn(),
          onGenerateImages: vi.fn(),
          onRegenerateImage: vi.fn(),
          onGenerateArticle: vi.fn(),
        }}
      />
    );

    expect(screen.getByText("Inbox/原文.md")).toBeInTheDocument();
    expect(screen.getByLabelText("排版主题")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/app.test.tsx`  
Expected: FAIL with missing `App`.

- [ ] **Step 3: Implement the workbench UI and local mock entry**

```ts
// src/ui/types.ts
import type { ImageOptions } from "../core/images/types";

export interface ImageCard {
  id: string;
  label: string;
  path: string;
  kind: "cover" | "inline";
}

export interface AppState {
  sourcePath: string;
  themeKey: string;
  previewHtml: string;
  imageOptions: ImageOptions;
  imageResults: ImageCard[];
  status: "idle" | "loading" | "error" | "success";
}
```

```tsx
// src/ui/app.tsx
import { Toolbar } from "./components/toolbar";
import { PreviewFrame } from "./components/preview-frame";
import { ImageOptionsForm } from "./components/image-options-form";
import { ImageResultList } from "./components/image-result-list";
import { StatusBanner } from "./components/status-banner";
import type { AppState } from "./types";

interface AppProps {
  state: AppState;
  actions: {
    onThemeChange: (themeKey: string) => void;
    onImageOptionsChange: (partial: Partial<AppState["imageOptions"]>) => void;
    onGenerateImages: () => void;
    onRegenerateImage: (imageId: string) => void;
    onGenerateArticle: () => void;
  };
}

export function App({ state, actions }: AppProps) {
  return (
    <div className="wechat-article-workbench">
      <Toolbar sourcePath={state.sourcePath} themeKey={state.themeKey} onThemeChange={actions.onThemeChange} onGenerateArticle={actions.onGenerateArticle} />
      <StatusBanner status={state.status} />
      <ImageOptionsForm value={state.imageOptions} onChange={actions.onImageOptionsChange} onGenerate={actions.onGenerateImages} />
      <PreviewFrame html={state.previewHtml} />
      <ImageResultList images={state.imageResults} onRegenerate={actions.onRegenerateImage} />
    </div>
  );
}
```

```tsx
// src/web/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "../ui/app";
import { createMockAppModel } from "./mock-api";

const model = createMockAppModel();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App state={model.state} actions={model.actions} />
  </React.StrictMode>
);
```

- [ ] **Step 4: Run the UI test to verify it passes**

Run: `npm run test -- tests/app.test.tsx`  
Expected: PASS with `1 passed`.

- [ ] **Step 5: Run the local dev server**

Run: `npm run dev:web`  
Expected: Vite serves the workbench on `http://127.0.0.1:4173`.

## Task 6: Mount the workbench inside Obsidian and expose plugin settings

**Files:**
- Create: `src/main.ts`
- Create: `src/obsidian/view.tsx`
- Create: `src/obsidian/settings-tab.ts`
- Create: `src/obsidian/active-note-bridge.ts`

- [ ] **Step 1: Create the active-note bridge abstraction**

```ts
// src/obsidian/active-note-bridge.ts
import type { App, MarkdownView, TFile } from "obsidian";

export function getActiveMarkdownView(app: App): MarkdownView | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  return view ?? null;
}

export function getActiveFile(app: App): TFile | null {
  return getActiveMarkdownView(app)?.file ?? null;
}

export function getLiveMarkdown(app: App): string {
  const view = getActiveMarkdownView(app);
  if (!view) return "";
  return view.editor?.getValue() ?? "";
}
```

- [ ] **Step 2: Implement the ItemView host**

```tsx
// src/obsidian/view.tsx
import { ItemView, WorkspaceLeaf } from "obsidian";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "../ui/app";

export const VIEW_TYPE_WECHAT_ARTICLE = "wechat-article-workbench";

export class WechatArticleWorkbenchView extends ItemView {
  private root: ReactDOM.Root | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_WECHAT_ARTICLE;
  }

  getDisplayText() {
    return "公众号工作台";
  }

  async onOpen() {
    this.root = ReactDOM.createRoot(this.containerEl.children[1]);
    this.root.render(<App state={{
      sourcePath: "",
      themeKey: "wechat-default",
      previewHtml: "",
      imageOptions: { coverType: "概念型", style: "科技媒体", creativeDirection: "贴近文章语气", inlineCount: 3 },
      imageResults: [],
      status: "idle",
    }} actions={{
      onThemeChange: () => {},
      onImageOptionsChange: () => {},
      onGenerateImages: () => {},
      onRegenerateImage: () => {},
      onGenerateArticle: () => {},
    }} />);
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
```

- [ ] **Step 3: Implement the settings tab and plugin registration**

```ts
// src/obsidian/settings-tab.ts
import { PluginSettingTab, Setting, App } from "obsidian";
import type WechatArticlePlugin from "../main";

export class WechatArticleSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: WechatArticlePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("图片服务商");
    new Setting(containerEl).setName("API Key");
    new Setting(containerEl).setName("输出目录");
  }
}
```

```ts
// src/main.ts
import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type PluginSettings } from "./obsidian/plugin-settings";
import { WechatArticleWorkbenchView, VIEW_TYPE_WECHAT_ARTICLE } from "./obsidian/view";
import { WechatArticleSettingTab } from "./obsidian/settings-tab";

export default class WechatArticlePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_WECHAT_ARTICLE, (leaf) => new WechatArticleWorkbenchView(leaf));
    this.addSettingTab(new WechatArticleSettingTab(this.app, this));
    this.addRibbonIcon("layout-panel-right", "公众号工作台", async () => {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: VIEW_TYPE_WECHAT_ARTICLE, active: true });
      this.app.workspace.revealLeaf(leaf!);
    });
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }
}
```

- [ ] **Step 4: Build the plugin bundle**

Run: `npm run build:plugin`  
Expected: generates `main.js` in the project root with no bundling error.

## Task 7: Connect preview, image generation, and article output orchestration

**Files:**
- Create: `src/obsidian/vault-output.ts`
- Modify: `src/obsidian/view.tsx`
- Modify: `src/ui/app.tsx`

- [ ] **Step 1: Implement the Vault output writer**

```ts
// src/obsidian/vault-output.ts
import path from "node:path";
import type { App, TFile } from "obsidian";
import { buildOutputFilename, resolveOutputDirectory } from "../core/output/output-path";

export async function writeGeneratedArticle(app: App, sourceFile: TFile, markdown: string, outputDirEnabled: boolean, outputDirPath: string) {
  const directory = resolveOutputDirectory({
    sourcePath: sourceFile.path,
    outputDirEnabled,
    outputDirPath,
    vaultRoot: app.vault.getRoot().path,
  });

  const filename = buildOutputFilename(sourceFile.name, new Date());
  const targetPath = [directory, filename].filter(Boolean).join("/");

  const file = await app.vault.create(targetPath, markdown);
  await app.workspace.getLeaf(true).openFile(file);
  return file.path;
}
```

- [ ] **Step 2: Replace placeholder workbench actions with real view-model updates**

```tsx
// src/obsidian/view.tsx (core excerpt)
import { getActiveFile, getLiveMarkdown } from "./active-note-bridge";
import { renderPreviewDocument } from "../core/preview/render-preview";
import { buildGeneratedArticle } from "../core/images/build-article";
import { planImages } from "../core/images/plan-images";
import { writeGeneratedArticle } from "./vault-output";

// inside onOpen, replace placeholder props:
const sourceFile = getActiveFile(this.app);
const sourceMarkdown = getLiveMarkdown(this.app);
const themeKey = "wechat-default";
const previewHtml = renderPreviewDocument({ markdown: sourceMarkdown, themeKey });

// onGenerateImages:
const plan = planImages(sourceMarkdown, { coverType, style, creativeDirection, inlineCount });

// onGenerateArticle:
const articleMarkdown = buildGeneratedArticle({
  sourcePath: sourceFile?.path ?? "",
  themeKey,
  sourceMarkdown,
  coverImage,
  inlineImages,
});
await writeGeneratedArticle(this.app, sourceFile!, articleMarkdown, settings.outputDirEnabled, settings.outputDirPath);
```

- [ ] **Step 3: Add a fake image generator for local development first**

```ts
// src/web/mock-api.ts (core excerpt)
export function createMockAppModel() {
  return {
    state: {
      sourcePath: "Inbox/原文.md",
      themeKey: "wechat-default",
      previewHtml: "<html><body><article><h1>标题</h1></article></body></html>",
      imageOptions: { coverType: "概念型", style: "科技媒体", creativeDirection: "贴近文章语气", inlineCount: 3 },
      imageResults: [],
      status: "idle" as const,
    },
    actions: {
      onThemeChange: () => {},
      onImageOptionsChange: () => {},
      onGenerateImages: () => {},
      onRegenerateImage: () => {},
      onGenerateArticle: () => {},
    },
  };
}
```

- [ ] **Step 4: Build and run the full suite**

Run: `npm run typecheck && npm run test && npm run build`  
Expected: typecheck passes, all tests pass, and both `dist/` web assets and root `main.js` build successfully.

## Task 8: Manual Obsidian verification

**Files:**
- Modify if needed: `manifest.json`, `styles.css`, `src/obsidian/view.tsx`, `src/obsidian/settings-tab.ts`

- [ ] **Step 1: Copy the plugin bundle into a test vault**

Run:

```bash
mkdir -p "/path/to/TestVault/.obsidian/plugins/wechat-article-obsidian"
cp manifest.json main.js styles.css "/path/to/TestVault/.obsidian/plugins/wechat-article-obsidian/"
```

Expected: the target plugin directory contains the three files.

- [ ] **Step 2: Enable the plugin in Obsidian and verify the host shell**

Manual check:
- Left ribbon shows “公众号工作台” icon
- Clicking the icon opens a right-side panel
- The panel title is “公众号工作台”

- [ ] **Step 3: Verify live preview from an unsaved note**

Manual check:
- Open a Markdown note
- Edit text without saving to disk
- Confirm the workbench preview refreshes from the unsaved editor value

- [ ] **Step 4: Verify new article output**

Manual check:
- Generate preview images
- Click “生成新文章”
- Confirm a new file named like `原文-wechat-YYYYMMDD-HHmm.md` is created
- Confirm the new file opens automatically
- Confirm referenced images are written under `.wechat-article-obsidian/年-月-时间戳/`

## Self-Review

### Spec coverage

- 当前文档作为输入源：Task 6, Task 7
- 实时 HTML 预览：Task 3, Task 5, Task 7
- 整篇主题切换：Task 3, Task 5
- 图片参数选择：Task 5
- 现有规则驱动图片规划：Task 4, Task 7
- 单张重生成：Task 5, Task 7
- 生成新 Markdown 文章：Task 4, Task 7
- 输出目录设置：Task 2, Task 6, Task 7
- Web 调试 + Obsidian 集成：Task 1, Task 5, Task 8

### Placeholder scan

- 没有 `TBD`、`TODO`、`implement later`
- 每个测试任务都给了实际测试代码和命令
- 所有文件路径是明确路径，不引用“类似 Task N”

### Type consistency

- `PluginSettings` 在 Task 2 定义，并在 Task 6、Task 7 使用
- `ImageOptions`、`CoverImageResult`、`InlineImageResult` 在 Task 4 定义，并在 Task 5、Task 7 使用
- `renderPreviewDocument` 在 Task 3 定义，并在 Task 7 使用

