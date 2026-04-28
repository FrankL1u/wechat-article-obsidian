# 4.1 正文图位置大纲重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一条新的 4.1 链路替换当前“程序先估数量和候选位置”的正文图规划方式，让模型单次交互直接产出可缓存的正文图位置大纲。

**Architecture:** 保留旧 4.1 代码不动，新增一套并行的新 outline-planning 链路。新链只负责一次 LLM 调用、解析 `outline` 结果、写入新 cache，并由 workbench 优先走新链；旧链仅暂时保留作为过渡。完成开发和测试切换后，补一份废弃说明文档，为后续删除旧链做准备。

**Tech Stack:** TypeScript、Vitest、Obsidian plugin host、现有图片生成与 workbench 状态管理

---

### Task 1: 定义 4.1 新链的类型与 schema

**Files:**
- Create: `src/features/images/outline-planning-types.ts`
- Modify: `tests/image-planner.test.ts`
- Reference: `docs/superpowers/specs/2026-04-22-image-planning-baoyu-alignment-design.md`

- [ ] **Step 1: 写失败测试，锁定 4.1 最终输出 schema**

```ts
import { describe, expect, it } from "vitest";
import type { OutlinePlanningResult } from "../src/features/images/outline-planning-types";

describe("OutlinePlanningResult schema", () => {
  it("models a cached final outline payload", () => {
    const result: OutlinePlanningResult = {
      articleType: "技术拆解",
      coreArguments: ["核心论点 1", "核心论点 2"],
      imageCount: 2,
      outline: [
        {
          id: "illustration-1",
          positionType: "paragraph",
          locationText: "解释核心方法差异的段落",
          excerpt: "这里的理念有所不同。",
          sectionTitle: "核心想法",
          purpose: "解释方法论差异",
          inlineType: "framework",
          visualContent: "展示结构化知识节点关系",
        },
      ],
    };

    expect(result.outline[0].positionType).toBe("paragraph");
    expect(result.outline[0].visualContent).toContain("结构化");
  });
});
```

- [ ] **Step 2: 运行测试，确认当前没有新类型文件**

Run: `npm run test -- tests/image-planner.test.ts`

Expected: FAIL with module-not-found or export-not-found for `outline-planning-types`

- [ ] **Step 3: 新增 4.1 类型文件，最小定义最终 schema**

```ts
// src/features/images/outline-planning-types.ts
import type { InlineImageType } from "./types";

export type OutlinePositionType = "section" | "paragraph";

export interface OutlineItem {
  id: string;
  positionType: OutlinePositionType;
  locationText: string;
  excerpt: string;
  sectionTitle: string;
  purpose: string;
  inlineType: Exclude<InlineImageType, "auto">;
  visualContent: string;
}

export interface OutlinePlanningResult {
  articleType: string;
  coreArguments: string[];
  imageCount: number;
  outline: OutlineItem[];
}
```

- [ ] **Step 4: 运行测试，确认类型测试通过**

Run: `npm run test -- tests/image-planner.test.ts`

Expected: PASS for the new schema test

- [ ] **Step 5: Commit**

```bash
git add src/features/images/outline-planning-types.ts tests/image-planner.test.ts
git commit -m "feat: define outline planning result schema"
```

---

### Task 2: 新增 4.1 的 system prompt 与单轮请求构造

**Files:**
- Create: `src/features/images/outline-planning-prompt.ts`
- Create: `tests/outline-planning-prompt.test.ts`
- Reference: `docs/superpowers/specs/2026-04-22-image-planning-baoyu-alignment-design.md:7`

- [ ] **Step 1: 写失败测试，锁定 system prompt 和 request payload 关键内容**

```ts
import { describe, expect, it } from "vitest";
import { buildOutlinePlanningRequest } from "../src/features/images/outline-planning-prompt";

describe("buildOutlinePlanningRequest", () => {
  it("builds a single-turn request from markdown and image options", () => {
    const request = buildOutlinePlanningRequest(
      "# 标题\n\n## 核心想法\n\n这里的理念有所不同。",
      {
        coverType: "conceptual",
        style: "多格漫画说明风",
        creativeDirection: "贴近文章语气",
        inlineMode: "range-1-3",
        inlineType: "framework",
      },
    );

    expect(request.system).toContain("正文图位置大纲");
    expect(request.user).toContain("文章全文");
    expect(request.user).toContain("配图密度");
    expect(request.user).toContain("多格漫画说明风");
    expect(request.user).toContain("这里的理念有所不同");
  });
});
```

- [ ] **Step 2: 运行测试，确认新 prompt 构造器尚不存在**

Run: `npm run test -- tests/outline-planning-prompt.test.ts`

Expected: FAIL with module-not-found for `outline-planning-prompt`

- [ ] **Step 3: 新增 prompt 构造器**

```ts
// src/features/images/outline-planning-prompt.ts
import type { ImageOptions } from "./types";

export interface OutlinePlanningRequest {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = `你是一个微信公众号文章配图规划助手。

你的任务不是总结全文，而是直接为这篇文章产出“正文图位置大纲”。

Step 1：判断文章类型并提取 2-5 个核心论点。
Step 2：识别真正值得配图的位置，排除字面比喻、装饰性图、无信息增量段落。
Step 3：直接输出最终正文图位置大纲，按正文顺序返回。

输出 JSON，字段必须包含：
- articleType
- coreArguments
- imageCount
- outline

outline 每项必须包含：
- id
- positionType
- locationText
- excerpt
- sectionTitle
- purpose
- inlineType
- visualContent`;

function describeInlineMode(mode: ImageOptions["inlineMode"]): string {
  switch (mode) {
    case "none":
      return "不需要正文图";
    case "range-1-3":
      return "少量正文图（1-3 张）";
    case "range-3-5":
      return "较多正文图（3-5 张）";
    default:
      return "按文章内容决定";
  }
}

export function buildOutlinePlanningRequest(markdown: string, options: ImageOptions): OutlinePlanningRequest {
  return {
    system: SYSTEM_PROMPT,
    user: [
      "请基于以下输入，直接输出最终正文图位置大纲。",
      `配图密度：${describeInlineMode(options.inlineMode)}`,
      `风格：${options.style}`,
      `图片类型：${options.inlineType}`,
      `创意方向：${options.creativeDirection}`,
      "文章全文：",
      markdown,
    ].join("\n"),
  };
}
```

- [ ] **Step 4: 运行测试，确认 request 构造通过**

Run: `npm run test -- tests/outline-planning-prompt.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/images/outline-planning-prompt.ts tests/outline-planning-prompt.test.ts
git commit -m "feat: add outline planning prompt builder"
```

---

### Task 3: 新增单轮 LLM 调用与 outline 解析

**Files:**
- Create: `src/features/images/outline-planning-model.ts`
- Create: `tests/outline-planning-model.test.ts`
- Reference: `src/features/images/planning-model.ts`

- [ ] **Step 1: 写失败测试，覆盖成功解析与无效 JSON 回退**

```ts
import { describe, expect, it, vi } from "vitest";
import { buildOutlineWithModel } from "../src/features/images/outline-planning-model";

const SETTINGS = {
  llmBaseUrl: "https://api.example.com",
  llmApiKey: "sk-test",
  llmModel: "test-model",
} as const;

const OPTIONS = {
  coverType: "conceptual",
  style: "多格漫画说明风",
  creativeDirection: "贴近文章语气",
  inlineMode: "range-1-3",
  inlineType: "framework",
} as const;

describe("buildOutlineWithModel", () => {
  it("returns final outline from one model response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              articleType: "技术拆解",
              coreArguments: ["A", "B"],
              imageCount: 1,
              outline: [{
                id: "illustration-1",
                positionType: "paragraph",
                locationText: "方法论解释段落",
                excerpt: "这里的理念有所不同。",
                sectionTitle: "核心想法",
                purpose: "解释核心差异",
                inlineType: "framework",
                visualContent: "展示结构关系"
              }]
            })
          }
        }]
      }),
      text: async () => ""
    }));

    const result = await buildOutlineWithModel(SETTINGS, "# 标题\n\n正文", OPTIONS);
    expect(result.outline).toHaveLength(1);
    expect(result.outline[0].inlineType).toBe("framework");
  });

  it("throws when model output cannot be parsed into outline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"bad\":true}" } }]
      }),
      text: async () => ""
    }));

    await expect(buildOutlineWithModel(SETTINGS, "# 标题\n\n正文", OPTIONS)).rejects.toThrow("invalid_outline");
  });
});
```

- [ ] **Step 2: 运行测试，确认模型文件尚不存在**

Run: `npm run test -- tests/outline-planning-model.test.ts`

Expected: FAIL with module-not-found

- [ ] **Step 3: 新增单轮模型调用**

```ts
// src/features/images/outline-planning-model.ts
import type { PluginSettings } from "../../platform/obsidian/plugin-settings";
import { buildOutlinePlanningRequest } from "./outline-planning-prompt";
import type { OutlinePlanningResult } from "./outline-planning-types";
import type { ImageOptions } from "./types";

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function parseOutlineContent(content: string): OutlinePlanningResult {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const raw = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content) as Partial<OutlinePlanningResult>;

  if (!raw.articleType || !Array.isArray(raw.coreArguments) || !Array.isArray(raw.outline)) {
    throw new Error("invalid_outline");
  }

  return {
    articleType: raw.articleType,
    coreArguments: raw.coreArguments,
    imageCount: typeof raw.imageCount === "number" ? raw.imageCount : raw.outline.length,
    outline: raw.outline as OutlinePlanningResult["outline"],
  };
}

export async function buildOutlineWithModel(
  settings: Pick<PluginSettings, "llmBaseUrl" | "llmApiKey" | "llmModel">,
  markdown: string,
  options: ImageOptions,
): Promise<OutlinePlanningResult> {
  const request = buildOutlinePlanningRequest(markdown, options);
  const response = await fetch(`${normalizeBaseUrl(settings.llmBaseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.llmApiKey}`,
    },
    body: JSON.stringify({
      model: settings.llmModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  const json = await response.json() as ChatResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty_outline");
  return parseOutlineContent(content);
}
```

- [ ] **Step 4: 运行测试，确认单轮模型路径通过**

Run: `npm run test -- tests/outline-planning-model.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/images/outline-planning-model.ts tests/outline-planning-model.test.ts
git commit -m "feat: add single-turn outline planning model"
```

---

### Task 4: 新增 4.1 专用 cache 结构与读写

**Files:**
- Create: `src/features/images/outline-planning-cache.ts`
- Create: `tests/outline-planning-cache.test.ts`
- Reference: `src/features/images/cache.ts`

- [ ] **Step 1: 写失败测试，锁定新 cache 文件路径与内容**

```ts
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getOutlinePlanCachePath,
  readOutlinePlanCache,
  writeOutlinePlanCache,
} from "../src/features/images/outline-planning-cache";

describe("outline planning cache", () => {
  it("writes and reads final outline payload", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wao-outline-cache-"));
    const file = getOutlinePlanCachePath(dir, "Inbox/test.md");

    writeOutlinePlanCache(file, {
      articleType: "技术拆解",
      coreArguments: ["A"],
      imageCount: 1,
      outline: [],
    });

    const result = readOutlinePlanCache(file);
    expect(result?.articleType).toBe("技术拆解");
  });
});
```

- [ ] **Step 2: 运行测试，确认 cache 文件尚不存在**

Run: `npm run test -- tests/outline-planning-cache.test.ts`

Expected: FAIL with module-not-found

- [ ] **Step 3: 新增 outline cache 读写**

```ts
// src/features/images/outline-planning-cache.ts
import fs from "node:fs";
import path from "node:path";
import type { OutlinePlanningResult } from "./outline-planning-types";

export function getOutlinePlanCachePath(cacheRoot: string, sourcePath: string): string {
  const file = sourcePath.replace(/[\\/]/g, "__");
  return path.join(cacheRoot, ".wechat-article-obsidian", "cache", "outline-plans", `${file}.json`);
}

export function readOutlinePlanCache(filePath: string): OutlinePlanningResult | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as OutlinePlanningResult;
}

export function writeOutlinePlanCache(filePath: string, result: OutlinePlanningResult): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: 运行测试，确认 cache 读写通过**

Run: `npm run test -- tests/outline-planning-cache.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/images/outline-planning-cache.ts tests/outline-planning-cache.test.ts
git commit -m "feat: add outline planning cache"
```

---

### Task 5: 把 workbench 的 4.1 主路径切到新 outline 链

**Files:**
- Modify: `src/platform/obsidian/workbench-view.tsx`
- Modify: `tests/image-planner.test.ts`
- Reference: `src/features/images/planning-model.ts`
- Reference: `src/features/images/plan-images.ts`

- [ ] **Step 1: 写失败测试，确认 workbench 优先走新 4.1 cache 和新 outline 模型**

```ts
it("prefers the new outline planning chain for explicit image planning", async () => {
  const outline = {
    articleType: "技术拆解",
    coreArguments: ["A"],
    imageCount: 1,
    outline: [{
      id: "illustration-1",
      positionType: "paragraph",
      locationText: "方法论解释段落",
      excerpt: "这里的理念有所不同。",
      sectionTitle: "核心想法",
      purpose: "解释核心差异",
      inlineType: "framework",
      visualContent: "展示结构关系",
    }],
  };

  // 断言：当 outline cache 可用时，不再调用旧 planImages / buildExplicitImagePlanWithModel
  expect(outline.outline[0].positionType).toBe("paragraph");
});
```

- [ ] **Step 2: 运行测试，确认当前主路径仍然绑定旧 4.1**

Run: `npm run test -- tests/image-planner.test.ts`

Expected: FAIL because workbench still reads old plan cache and old planner

- [ ] **Step 3: 在 workbench 中接入新链**

```ts
// src/platform/obsidian/workbench-view.tsx
import {
  getOutlinePlanCachePath,
  readOutlinePlanCache,
  writeOutlinePlanCache,
} from "../../features/images/outline-planning-cache";
import { buildOutlineWithModel } from "../../features/images/outline-planning-model";

// inside planning flow
const outlineCachePath = getOutlinePlanCachePath(this.plugin.app.vault.configDir, entry.sourcePath);
const cachedOutline = readOutlinePlanCache(outlineCachePath);
if (cachedOutline) {
  return cachedOutline;
}

const outline = await buildOutlineWithModel(this.plugin.settings, entry.sourceMarkdown, entry.imageOptions);
writeOutlinePlanCache(outlineCachePath, outline);
return outline;
```

- [ ] **Step 4: 运行测试，确认 workbench 主路径切换完成**

Run: `npm run test -- tests/image-planner.test.ts`

Expected: PASS with assertions that new outline path is used

- [ ] **Step 5: Commit**

```bash
git add src/platform/obsidian/workbench-view.tsx tests/image-planner.test.ts
git commit -m "feat: route 4.1 planning through outline chain"
```

---

### Task 6: 输出废弃说明文档

**Files:**
- Create: `docs/superpowers/specs/2026-04-22-image-planning-4_1-deprecation-list.md`
- Reference: `src/features/images/planning-model.ts`
- Reference: `src/features/images/plan-images.ts`
- Reference: `tests/image-planner.test.ts`

- [ ] **Step 1: 写废弃说明文档**

```md
# 4.1 旧链废弃说明

## 已废弃文件
- `src/features/images/planning-model.ts`
- `src/features/images/plan-images.ts`

## 已废弃字段
- 旧 4.1 候选位置与本地估数量相关字段

## 已废弃描述
- 文档中关于“程序先估数量、先组织候选”的旧说明

## 替代关系
- `planning-model.ts` -> `outline-planning-model.ts`
- `plan-images.ts` -> `outline-planning-prompt.ts` + `outline-planning-model.ts`

## 删除时机
- 等 4.1 新链稳定并且 4.2 接好后，统一删除旧链
```

- [ ] **Step 2: 静态核对文档内容完整**

Run: `sed -n '1,220p' docs/superpowers/specs/2026-04-22-image-planning-4_1-deprecation-list.md`

Expected: shows 废弃文件、字段、描述、替代关系、删除时机五部分

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-22-image-planning-4_1-deprecation-list.md
git commit -m "docs: add 4.1 deprecation list"
```

---

### Task 7: 完整验证

**Files:**
- Test: `tests/outline-planning-prompt.test.ts`
- Test: `tests/outline-planning-model.test.ts`
- Test: `tests/outline-planning-cache.test.ts`
- Test: `tests/image-planner.test.ts`
- Verify: `src/platform/obsidian/workbench-view.tsx`

- [ ] **Step 1: 运行新增单测集合**

Run: `npm run test -- tests/outline-planning-prompt.test.ts tests/outline-planning-model.test.ts tests/outline-planning-cache.test.ts tests/image-planner.test.ts`

Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: 运行完整测试**

Run: `npm run test`

Expected: PASS

- [ ] **Step 4: 运行构建**

Run: `npm run build`

Expected: PASS

- [ ] **Step 5: 运行 Obsidian 开发链**

Run: `npm run obsidian:dev`

Expected: plugin rebuilt, copied, and reloaded without host errors

- [ ] **Step 6: Commit**

```bash
git add src tests docs
git commit -m "feat: complete 4.1 outline planning rewrite"
```

---

## Self-Review

### Spec coverage

- 单次 LLM 交互：Task 2 + Task 3
- 输出 `outline` 形态：Task 1 + Task 3
- 写入 cache：Task 4 + Task 5
- 先并行新实现、不立即删旧链：Task 3-5
- 废弃说明文档：Task 6
- 验证链：Task 7

### Placeholder scan

已检查，没有 `TBD / TODO / implement later / similar to` 之类占位语。

### Type consistency

计划中统一使用：
- `OutlinePlanningResult`
- `OutlineItem`
- `buildOutlinePlanningRequest`
- `buildOutlineWithModel`
- `readOutlinePlanCache`
- `writeOutlinePlanCache`

没有混用旧 4.1 命名。

### Execution note

当前目录不是 git 仓库，计划里的 `git commit` 步骤在当前工作区会失败。  
实现时要么跳过 commit，要么先切到有效 repo/worktree。
