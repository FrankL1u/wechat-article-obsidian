# WeChat Publish + Client Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client account management, a top-of-workbench author selector, and WeChat draft publishing based on the current rendered preview.

**Architecture:** Keep Markdown as the single content source, but treat the rendered preview HTML in the workbench as the publish artifact. Extend plugin settings with client profiles and last-selected client state, then add a focused publish service that adapts the existing `ls-wechat-article` WeChat publish flow to the plugin runtime instead of shelling out to the CLI.

**Tech Stack:** Obsidian plugin API, React 18, TypeScript, Vitest, existing preview/image pipeline, WeChat draft API flow from `ls-wechat-article`

---

## File Structure

### Existing files to modify

- `src/platform/obsidian/plugin-settings.ts`
  - Extend persisted settings with client profile data and rename the current "planning model" semantics to global LLM settings.
- `src/platform/obsidian/settings-tab.ts`
  - Rebuild settings UI into `账户` / `模型` tabs and move existing global model controls under the correct labels.
- `src/features/workbench/types.ts`
  - Add selected client display state and publish result/error fields needed by the top tag and publish flow.
- `src/features/workbench/app.tsx`
  - Add the top author tag UI, dropdown behavior, and publish status rendering.
- `src/platform/obsidian/workbench-view.tsx`
  - Source client settings into app state, persist selection changes, and wire publish action to the new publish service.
- `tests/app.test.tsx`
  - Cover the top author tag states and publish-button behavior with/without configured clients.

### New files to create

- `src/platform/obsidian/client-profiles.ts`
  - Normalization helpers, default labels, and selection resolution for client profile data.
- `src/features/workbench/components/author-chip.tsx`
  - Focused top-bar author tag component with empty/single/multi-account rendering.
- `src/features/workbench/styles/author-chip.css`
  - Styles for the author tag and dropdown.
- `src/platform/obsidian/wechat-publish-service.ts`
  - Plugin-native publish service that uploads images, uploads cover, and creates the WeChat draft.
- `tests/plugin-settings.test.ts`
  - Settings normalization and persisted-shape tests.
- `tests/settings-tab.test.tsx`
  - Settings tab coverage for account/model tabs and account form rendering.
- `tests/client-profiles.test.ts`
  - Selection fallback and normalization tests.
- `tests/wechat-publish-service.test.ts`
  - Publish service tests for config validation, image upload replacement, and draft creation flow.

### External references to inspect while implementing

- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/toolkit/src/cli.ts`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/toolkit/src/wechat-api.js`
- `/Users/frank/Documents/MyStudio/dev/LS-SKILLS/skills/ls-wechat-article/toolkit/src/publisher.ts`

## Task 1: Reshape persisted settings for clients and global LLM config

**Files:**
- Modify: `src/platform/obsidian/plugin-settings.ts`
- Create: `src/platform/obsidian/client-profiles.ts`
- Test: `tests/plugin-settings.test.ts`
- Test: `tests/client-profiles.test.ts`

- [ ] **Step 1: Write the failing settings-shape tests**

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type PluginSettings } from "../src/platform/obsidian/plugin-settings";
import {
  normalizeClientProfiles,
  resolveSelectedClientId,
} from "../src/platform/obsidian/client-profiles";

describe("plugin settings", () => {
  it("provides empty client profiles and null lastSelectedClientId by default", () => {
    expect(DEFAULT_SETTINGS.clients).toEqual([]);
    expect(DEFAULT_SETTINGS.lastSelectedClientId).toBeNull();
    expect(DEFAULT_SETTINGS.llmEnabled).toBe(true);
  });

  it("normalizes persisted client profile records", () => {
    const settings = {
      clients: [
        {
          id: "liu",
          author: "刘Sir.2035",
          industry: "AI",
          targetAudience: "开发者",
          topics: ["AI 编程工具"],
          blacklist: { words: ["空话"], topics: ["纯资讯搬运"] },
          wechat: { accountName: "主号", appid: "wx123", secret: "sec" },
        },
      ],
      lastSelectedClientId: "liu",
    } satisfies Partial<PluginSettings>;

    const normalized = normalizeClientProfiles(settings.clients ?? []);
    expect(normalized[0]?.wechat.accountName).toBe("主号");
    expect(resolveSelectedClientId(normalized, settings.lastSelectedClientId ?? null)).toBe("liu");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/plugin-settings.test.ts tests/client-profiles.test.ts`

Expected: FAIL with missing `clients`, `lastSelectedClientId`, `llmEnabled`, and missing helper module/export errors.

- [ ] **Step 3: Implement the persisted settings model and client normalization**

```ts
// src/platform/obsidian/plugin-settings.ts
export interface ClientProfile {
  id: string;
  author: string;
  industry: string;
  targetAudience: string;
  topics: string[];
  blacklist: {
    words: string[];
    topics: string[];
  };
  wechat: {
    accountName: string;
    appid: string;
    secret: string;
  };
}

export interface PluginSettings {
  imageProvider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  llmEnabled: boolean;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  defaultCoverType: string;
  defaultStyle: string;
  defaultCreativeDirection: string;
  outputDirEnabled: boolean;
  outputDirPath: string;
  clients: ClientProfile[];
  lastSelectedClientId: string | null;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  imageProvider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "",
  llmEnabled: true,
  llmBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  llmApiKey: "",
  llmModel: "qwen3.6-plus",
  defaultCoverType: "conceptual",
  defaultStyle: "editorial",
  defaultCreativeDirection: "贴近文章语气",
  outputDirEnabled: false,
  outputDirPath: "",
  clients: [],
  lastSelectedClientId: null,
};
```

```ts
// src/platform/obsidian/client-profiles.ts
import type { ClientProfile } from "./plugin-settings";

export function normalizeClientProfiles(input: ClientProfile[] | unknown[]): ClientProfile[] {
  return (input as Partial<ClientProfile>[]).map((item, index) => ({
    id: String(item.id ?? `client-${index + 1}`),
    author: String(item.author ?? "").trim(),
    industry: String(item.industry ?? "").trim(),
    targetAudience: String(item.targetAudience ?? "").trim(),
    topics: Array.isArray(item.topics) ? item.topics.map((value) => String(value).trim()).filter(Boolean) : [],
    blacklist: {
      words: Array.isArray(item.blacklist?.words) ? item.blacklist.words.map((value) => String(value).trim()).filter(Boolean) : [],
      topics: Array.isArray(item.blacklist?.topics) ? item.blacklist.topics.map((value) => String(value).trim()).filter(Boolean) : [],
    },
    wechat: {
      accountName: String(item.wechat?.accountName ?? "").trim(),
      appid: String(item.wechat?.appid ?? "").trim(),
      secret: String(item.wechat?.secret ?? "").trim(),
    },
  }));
}

export function resolveSelectedClientId(clients: ClientProfile[], lastSelectedClientId: string | null): string | null {
  if (clients.length === 0) return null;
  if (lastSelectedClientId && clients.some((client) => client.id === lastSelectedClientId)) return lastSelectedClientId;
  return clients[0]?.id ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/plugin-settings.test.ts tests/client-profiles.test.ts`

Expected: PASS with 4 passing assertions.

- [ ] **Step 5: Commit**

```bash
git add src/platform/obsidian/plugin-settings.ts src/platform/obsidian/client-profiles.ts tests/plugin-settings.test.ts tests/client-profiles.test.ts
git commit -m "feat: add client profile settings model"
```

## Task 2: Rebuild settings UI into `账户` / `模型` tabs

**Files:**
- Modify: `src/platform/obsidian/settings-tab.ts`
- Test: `tests/settings-tab.test.tsx`

- [ ] **Step 1: Write the failing settings tab tests**

```tsx
import { describe, expect, it, vi } from "vitest";
import { App } from "obsidian";
import WechatArticlePlugin from "../src/main";
import { WechatArticleSettingTab } from "../src/platform/obsidian/settings-tab";

describe("WechatArticleSettingTab", () => {
  it("renders 账户 and 模型 tabs", () => {
    const plugin = {
      app: {} as App,
      settings: {
        ...DEFAULT_SETTINGS,
        clients: [],
      },
      saveSettings: vi.fn(),
    } as unknown as WechatArticlePlugin;

    const tab = new WechatArticleSettingTab(plugin.app, plugin);
    tab.display();

    expect(tab.containerEl.textContent).toContain("账户");
    expect(tab.containerEl.textContent).toContain("模型");
    expect(tab.containerEl.textContent).toContain("未设置账户");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/settings-tab.test.tsx`

Expected: FAIL because the current settings tab has no tabbed layout and no account-management state.

- [ ] **Step 3: Implement tab state and account form UI**

```ts
// src/platform/obsidian/settings-tab.ts
type SettingsTabKey = "accounts" | "models";

export class WechatArticleSettingTab extends PluginSettingTab {
  private activeTab: SettingsTabKey = "accounts";
  private editingClientId: string | null = null;

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const tabsEl = containerEl.createDiv({ cls: "wao-settings-tabs" });
    this.renderTabButton(tabsEl, "accounts", "账户");
    this.renderTabButton(tabsEl, "models", "模型");

    const panelEl = containerEl.createDiv({ cls: "wao-settings-panel" });
    if (this.activeTab === "accounts") {
      this.renderAccountsTab(panelEl);
      return;
    }

    this.renderModelsTab(panelEl);
  }
}
```

```ts
private renderAccountsTab(containerEl: HTMLElement): void {
  const selectedClient = this.plugin.settings.clients.find((client) => client.id === this.editingClientId) ?? null;
  if (!selectedClient) {
    containerEl.createEl("div", { text: "未设置账户", cls: "wao-settings-empty" });
  }

  new Setting(containerEl)
    .setName("新增账户")
    .addButton((button) =>
      button.setButtonText("新增").onClick(async () => {
        this.plugin.settings.clients.push(createEmptyClientProfile());
        await this.plugin.saveSettings();
        this.display();
      }),
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/settings-tab.test.tsx`

Expected: PASS with the tab labels and empty-state copy rendered.

- [ ] **Step 5: Commit**

```bash
git add src/platform/obsidian/settings-tab.ts tests/settings-tab.test.tsx
git commit -m "feat: split settings into account and model tabs"
```

## Task 3: Add the top author tag UI to the workbench

**Files:**
- Create: `src/features/workbench/components/author-chip.tsx`
- Create: `src/features/workbench/styles/author-chip.css`
- Modify: `src/features/workbench/types.ts`
- Modify: `src/features/workbench/app.tsx`
- Modify: `styles.css`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing app tests for empty/single/multi-author states**

```tsx
it("shows 未设置作者 and routes to settings when no client exists", () => {
  render(<App state={{ ...baseState, selectedClient: null, availableClients: [] }} actions={baseActions} />);
  expect(screen.getByRole("button", { name: "未设置作者" })).toBeInTheDocument();
});

it("shows the author name without a dropdown arrow when a single client exists", () => {
  render(
    <App
      state={{ ...baseState, selectedClient: { id: "liu", author: "刘Sir.2035" }, availableClients: [{ id: "liu", author: "刘Sir.2035" }] }}
      actions={baseActions}
    />,
  );
  expect(screen.getByRole("button", { name: "刘Sir.2035" })).toBeInTheDocument();
  expect(screen.queryByTestId("wao-author-chip-arrow")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/app.test.tsx`

Expected: FAIL because `AppState` and `App` do not expose client-selection UI yet.

- [ ] **Step 3: Add state shape and author-chip component**

```ts
// src/features/workbench/types.ts
export interface ClientOption {
  id: string;
  author: string;
}

export interface PublishResult {
  ok: boolean;
  message: string;
}

export interface AppState {
  // existing fields...
  availableClients: ClientOption[];
  selectedClientId: string | null;
  publishResult: PublishResult | null;
}
```

```tsx
// src/features/workbench/components/author-chip.tsx
export function AuthorChip({
  clients,
  selectedClientId,
  onOpenSettings,
  onSelectClient,
}: {
  clients: ClientOption[];
  selectedClientId: string | null;
  onOpenSettings: () => void;
  onSelectClient: (clientId: string) => void;
}) {
  const selected = clients.find((client) => client.id === selectedClientId) ?? null;
  const label = selected?.author ?? "未设置作者";
  const isMulti = clients.length > 1;
  return (
    <button type="button" className="wao-author-chip" onClick={() => (clients.length === 0 ? onOpenSettings() : undefined)} aria-label={label}>
      <UserIcon />
      <span>{label}</span>
      {isMulti ? <ChevronDownIcon data-testid="wao-author-chip-arrow" /> : null}
    </button>
  );
}
```

- [ ] **Step 4: Integrate the top chip into `App` and rerun tests**

Run: `npm run test -- tests/app.test.tsx`

Expected: PASS with new author-chip tests plus no regressions in existing publish-button tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/workbench/components/author-chip.tsx src/features/workbench/styles/author-chip.css src/features/workbench/types.ts src/features/workbench/app.tsx styles.css tests/app.test.tsx
git commit -m "feat: add workbench author selector"
```

## Task 4: Add the plugin-native WeChat publish service

**Files:**
- Create: `src/platform/obsidian/wechat-publish-service.ts`
- Test: `tests/wechat-publish-service.test.ts`

- [ ] **Step 1: Write the failing publish-service tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { publishWechatDraft } from "../src/platform/obsidian/wechat-publish-service";

describe("publishWechatDraft", () => {
  it("rejects when author or credentials are missing", async () => {
    await expect(
      publishWechatDraft({
        html: "<h1>标题</h1>",
        client: {
          id: "liu",
          author: "",
          wechat: { accountName: "主号", appid: "", secret: "" },
        },
        themeKey: "wechat-tech",
        images: [],
      }),
    ).rejects.toThrow("缺少发布配置");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/wechat-publish-service.test.ts`

Expected: FAIL because the service file does not exist yet.

- [ ] **Step 3: Implement the minimal service using the existing skill flow as reference**

```ts
// src/platform/obsidian/wechat-publish-service.ts
interface PublishWechatDraftInput {
  html: string;
  themeKey: string;
  images: { path: string; markdownPath?: string; kind: "cover" | "inline" }[];
  client: ClientProfile;
}

export async function publishWechatDraft(input: PublishWechatDraftInput): Promise<{ mediaId: string }> {
  if (!input.client.author || !input.client.wechat.appid || !input.client.wechat.secret) {
    throw new Error("缺少发布配置：author / appid / secret");
  }

  const token = await getAccessToken(input.client.wechat.appid, input.client.wechat.secret);
  let html = input.html;

  for (const image of input.images.filter((item) => item.kind === "inline")) {
    const wechatUrl = await uploadImage(token, image.path);
    if (image.markdownPath) {
      html = html.replaceAll(image.markdownPath, wechatUrl);
    }
  }

  const cover = input.images.find((item) => item.kind === "cover");
  const thumbMediaId = cover ? await uploadThumb(token, cover.path) : undefined;
  return createDraft({
    accessToken: token,
    title: extractTitleFromHtml(html),
    author: input.client.author,
    digest: extractDigestFromHtml(html),
    content: html,
    thumbMediaId,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/wechat-publish-service.test.ts`

Expected: PASS with validation and upload-flow assertions succeeding under mocks.

- [ ] **Step 5: Commit**

```bash
git add src/platform/obsidian/wechat-publish-service.ts tests/wechat-publish-service.test.ts
git commit -m "feat: add plugin-native wechat publish service"
```

## Task 5: Wire client selection and publish flow into the workbench

**Files:**
- Modify: `src/platform/obsidian/workbench-view.tsx`
- Modify: `src/features/workbench/app.tsx`
- Modify: `tests/app.test.tsx`
- Modify: `tests/workbench-view.test.ts`
- Modify: `tests/active-note-bridge.test.ts` (only if state init breaks)

- [ ] **Step 1: Write the failing integration tests**

```ts
it("hydrates selected client id from plugin settings into app state", async () => {
  const plugin = createPlugin({
    clients: [{ id: "liu", author: "刘Sir.2035", wechat: { accountName: "主号", appid: "wx", secret: "sec" } }],
    lastSelectedClientId: "liu",
  });
  const view = new WechatArticleWorkbenchView(leaf, plugin);
  await view.onOpen();
  expect(renderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ selectedClientId: "liu" }));
});

it("sets pendingAction to publish and forwards the current preview html to the publish service", async () => {
  publishWechatDraftMock.mockResolvedValue({ mediaId: "draft-media-id" });
  await view["publishCurrentArticle"](entry);
  expect(publishWechatDraftMock).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining("<html") }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/workbench-view.test.ts tests/app.test.tsx`

Expected: FAIL because `workbench-view` does not resolve clients or call a publish service yet.

- [ ] **Step 3: Implement client selection and publish integration**

```ts
// src/platform/obsidian/workbench-view.tsx
private resolveClientOptions(): ClientOption[] {
  return this.plugin.settings.clients.map((client) => ({ id: client.id, author: client.author }));
}

private async publishCurrentArticle(entry: ViewCacheEntry): Promise<void> {
  const selectedClientId = resolveSelectedClientId(this.plugin.settings.clients, this.plugin.settings.lastSelectedClientId);
  const client = this.plugin.settings.clients.find((item) => item.id === selectedClientId);
  if (!client) {
    this.updateEntry(entry, { status: "error", publishResult: { ok: false, message: "未设置作者" } });
    return;
  }

  this.updateEntry(entry, { pendingAction: "publish", status: "loading" });
  try {
    const result = await publishWechatDraft({
      html: this.buildState(entry).previewHtml,
      themeKey: entry.themeKey,
      images: this.buildState(entry).imageResults.map((image) => ({
        path: image.path,
        markdownPath: image.markdownPath,
        kind: image.kind,
      })),
      client,
    });
    this.updateEntry(entry, {
      pendingAction: null,
      status: "success",
      publishResult: { ok: true, message: `草稿创建成功：${result.mediaId}` },
    });
  } catch (error) {
    this.updateEntry(entry, {
      pendingAction: null,
      status: "error",
      publishResult: { ok: false, message: error instanceof Error ? error.message : "发布失败" },
    });
  }
}
```

- [ ] **Step 4: Run targeted tests, then full local verification**

Run: `npm run test -- tests/workbench-view.test.ts tests/app.test.tsx`

Expected: PASS with client-hydration and publish-service integration covered.

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run test`

Expected: PASS all tests.

Run: `npm run build`

Expected: PASS web + plugin build.

Run: `npm run obsidian:dev`

Expected: PASS build-copy-reload workflow.

- [ ] **Step 5: Commit**

```bash
git add src/platform/obsidian/workbench-view.tsx src/features/workbench/app.tsx tests/workbench-view.test.ts tests/app.test.tsx
git commit -m "feat: wire client selection into wechat publishing"
```

## Self-Review Checklist

### Spec coverage

- Client settings model: covered by Task 1
- Settings page tabs and account forms: covered by Task 2
- Top author tag UI: covered by Task 3
- Publish service based on preview HTML: covered by Task 4
- Workbench integration + remembered selection: covered by Task 5

### Placeholder scan

- No `TODO`, `TBD`, or “handle appropriately” placeholders remain in the task list.
- Every coding step includes explicit files, code, and commands.

### Type consistency

- `ClientProfile`, `ClientOption`, `lastSelectedClientId`, and `publishWechatDraft` naming is consistent across tasks.
- `llmEnabled / llmBaseUrl / llmApiKey / llmModel` replace the old planning-model semantics consistently in the plan.

## Execution Notes

- This workspace is currently **not a git repository**, so the `git commit` steps will fail until work starts inside a valid repo or worktree. Keep the step order, but expect to skip commit commands unless repo state changes first.
