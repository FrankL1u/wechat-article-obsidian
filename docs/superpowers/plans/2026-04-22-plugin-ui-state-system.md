# Plugin UI State System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify interactive UI states across the plugin settings page and workbench so tabs, collapsible cards, author chip, buttons, image tools, and form controls share the same visual language and state behavior.

**Architecture:** Reuse the existing plugin style source files and add a thin shared token/state layer in the workbench CSS source. Apply the new state model in two passes: settings-page components first, then workbench controls, while keeping layout structure and business logic unchanged.

**Tech Stack:** Obsidian plugin API, React 18, TypeScript, CSS source files under `src/features/workbench/styles`, Vitest, existing build pipeline via `scripts/build-plugin-styles.mjs`

---

## File Structure

### Existing files to modify

- `src/features/workbench/styles/design-tokens.css`
  - Add plugin-scoped interaction tokens for surfaces, borders, text, accent, focus, success, and danger.
- `src/features/workbench/styles/settings-tab.css`
  - Rebuild settings-page tab, collapsible section, account card, modal, and form-control states around the new token set.
- `src/features/workbench/styles/buttons.css`
  - Normalize primary/secondary/icon button states, including hover, active, selected, focus, and disabled.
- `src/features/workbench/styles/author-chip.css`
  - Apply the shared state model to the workbench author chip and dropdown items.
- `src/features/workbench/styles/theme-selector.css`
  - Normalize theme pills, “more” trigger, and theme modal list states.
- `src/features/workbench/styles/dropdown.css`
  - Normalize dropdown trigger, menu, option hover/selected/focus states for image settings and regenerate dialogs.
- `src/features/workbench/styles/controls.css`
  - Normalize workbench form control states shared by image settings and modal controls.
- `src/features/workbench/styles/smart-image.css`
  - Bring smart image sheet buttons and card surfaces into the shared state system.
- `src/features/workbench/components/preview-frame.tsx`
  - Replace inline preview image-tool styles with tokenized inline CSS so delete/regenerate buttons match the shared state rules.
- `src/platform/obsidian/settings-tab.ts`
  - Add disabled markers/ARIA hooks where needed so state styling is actually reachable without changing business behavior.
- `src/features/workbench/components/author-chip.tsx`
  - Add explicit state classes/ARIA for selected and empty states if current markup is insufficient.
- `src/features/workbench/components/theme-selector.tsx`
  - Add explicit state classes/ARIA hooks for selected pills and modal options if current markup is insufficient.
- `tests/settings-tab.test.ts`
  - Extend coverage for tab selected state and account action disabled/state hooks.
- `tests/app.test.tsx`
  - Cover author-chip selected/empty states and publish-button disabled styling hooks.

### External references to inspect while implementing

- `docs/superpowers/specs/2026-04-22-plugin-ui-state-system-design.md`
- `/Users/frank/Documents/MyStudio/repo/skills/note-to-red/src/styles/settings/settings.css`
- `/Users/frank/Documents/MyStudio/repo/skills/note-to-red/src/styles/settings/theme-modal.css`

### Execution note

- This workspace is **not** a git repository. Plan steps still include commit checkpoints, but they cannot be executed until the work is moved into a valid repo/worktree.

## Task 1: Define plugin-scoped interaction tokens and button states

**Files:**
- Modify: `src/features/workbench/styles/design-tokens.css`
- Modify: `src/features/workbench/styles/buttons.css`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing style-hook test for workbench button states**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/features/workbench/app";
import type { AppState } from "../src/features/workbench/types";

function createState(): AppState {
  return {
    sourcePath: "demo.md",
    title: "Demo",
    html: "<p>hello</p>",
    themeKey: "wechat-default",
    pendingAction: null,
    imageSettings: null,
    imageContext: null,
    clientProfiles: [],
    selectedClientId: null,
    publishResult: null,
  };
}

describe("workbench action state hooks", () => {
  it("marks publish as disabled when no author is configured", () => {
    render(
      <App
        state={createState()}
        onSyncNow={vi.fn()}
        onThemeChange={vi.fn()}
        onGenerateImages={vi.fn()}
        onPublish={vi.fn()}
        onSelectClient={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/app.test.tsx`

Expected: FAIL because the current render path does not expose a disabled publish button in the empty-author state or lacks the state hook this plan expects.

- [ ] **Step 3: Add token variables and normalize button classes**

```css
/* src/features/workbench/styles/design-tokens.css */
:root {
  --wao-surface-base: #ffffff;
  --wao-surface-muted: #f7f7f8;
  --wao-surface-hover: #f1f1f4;
  --wao-surface-active: #e9e9ef;
  --wao-border-default: #e5e7eb;
  --wao-border-strong: #d1d5db;
  --wao-border-selected: #8b5cf6;
  --wao-text-primary: #16181d;
  --wao-text-secondary: #6b7280;
  --wao-text-disabled: #a8adb7;
  --wao-accent: #8b5cf6;
  --wao-accent-muted: rgba(139, 92, 246, 0.12);
  --wao-accent-active: #7c3aed;
  --wao-success: #22c55e;
  --wao-danger: #ef4444;
  --wao-focus-ring: 0 0 0 3px rgba(139, 92, 246, 0.18);
}
```

```css
/* src/features/workbench/styles/buttons.css */
.wao-primary-button,
.wao-secondary-button,
.wao-icon-button {
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
}

.wao-primary-button:focus-visible,
.wao-secondary-button:focus-visible,
.wao-icon-button:focus-visible {
  outline: none;
  box-shadow: var(--wao-focus-ring);
}

.wao-primary-button:disabled,
.wao-secondary-button:disabled,
.wao-icon-button:disabled {
  cursor: not-allowed;
  color: var(--wao-text-disabled);
}
```

- [ ] **Step 4: Update the workbench render path to expose real disabled state**

```tsx
// src/features/workbench/app.tsx
const publishDisabled = !state.selectedClientId || state.pendingAction === "publish";

<PrimaryButton disabled={publishDisabled} onClick={onPublish}>
  {isPublishing ? <Spinner /> : "发布"}
</PrimaryButton>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/app.test.tsx`

Expected: PASS with the publish button rendered disabled for the empty-client state.

- [ ] **Step 6: Commit**

```bash
git add src/features/workbench/styles/design-tokens.css src/features/workbench/styles/buttons.css src/features/workbench/app.tsx tests/app.test.tsx
git commit -m "style: add shared interaction tokens"
```

## Task 2: Rebuild settings-page tabs, collapsible cards, account cards, and form states

**Files:**
- Modify: `src/features/workbench/styles/settings-tab.css`
- Modify: `src/platform/obsidian/settings-tab.ts`
- Test: `tests/settings-tab.test.ts`

- [ ] **Step 1: Write the failing settings-page state test**

```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/platform/obsidian/plugin-settings";
import { WechatArticleSettingTab } from "../src/platform/obsidian/settings-tab";

describe("settings tab state hooks", () => {
  it("marks the active top tab and credential status button", () => {
    const plugin = {
      settings: { ...DEFAULT_SETTINGS, clients: [] },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    expect(tab.containerEl.querySelector(".wao-settings-tab-btn.is-active")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/settings-tab.test.ts`

Expected: FAIL because the test should be extended to inspect the new state hooks or the current CSS/state markers are incomplete.

- [ ] **Step 3: Reshape settings CSS to match the spec**

```css
/* src/features/workbench/styles/settings-tab.css */
.wao-settings-tabs {
  display: inline-flex;
  gap: 0;
  padding: 0;
  background: transparent;
  border: 0;
}

.wao-settings-tab-btn {
  position: relative;
  border-radius: 0;
  background: transparent;
}

.wao-settings-tab-btn::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -2px;
  height: 2px;
  background: transparent;
}

.wao-settings-tab-btn.is-active::after {
  background: var(--wao-accent);
}

.wao-settings-section {
  background: var(--wao-surface-base);
}

.wao-settings-section__content {
  padding: 0 16px 16px;
  background: var(--wao-surface-base);
}

.wao-settings-root .setting-item,
.wao-settings-account-row,
.wao-account-modal__field {
  background: var(--wao-surface-muted);
}
```

- [ ] **Step 4: Add missing class/ARIA hooks for disabled and selected states**

```ts
// src/platform/obsidian/settings-tab.ts
button.classList.toggle("is-active", this.activeTab === key);
button.ariaPressed = this.activeTab === key ? "true" : "false";

credentialButton.classList.toggle("is-ready", configured);
credentialButton.classList.toggle("is-missing", !configured);
credentialButton.ariaPressed = configured ? "true" : "false";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/settings-tab.test.ts`

Expected: PASS with active-tab and credential-state hooks present.

- [ ] **Step 6: Commit**

```bash
git add src/features/workbench/styles/settings-tab.css src/platform/obsidian/settings-tab.ts tests/settings-tab.test.ts
git commit -m "style: normalize settings page states"
```

## Task 3: Normalize author chip, dropdowns, theme selector, and workbench form controls

**Files:**
- Modify: `src/features/workbench/styles/author-chip.css`
- Modify: `src/features/workbench/styles/dropdown.css`
- Modify: `src/features/workbench/styles/theme-selector.css`
- Modify: `src/features/workbench/styles/controls.css`
- Modify: `src/features/workbench/components/author-chip.tsx`
- Modify: `src/features/workbench/components/theme-selector.tsx`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing interaction-class test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthorChip } from "../src/features/workbench/components/author-chip";

describe("AuthorChip", () => {
  it("marks the selected author item inside the menu", () => {
    render(
      <AuthorChip
        clients={[
          { id: "a", label: "作者 A" },
          { id: "b", label: "作者 B" },
        ]}
        selectedClientId="a"
        onSelect={() => {}}
        onOpenSettings={() => {}}
      />,
    );

    screen.getByRole("button", { name: "作者 A" }).click();
    expect(document.querySelector(".wao-author-chip__menu-item.is-selected")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/app.test.tsx`

Expected: FAIL because the selected menu item or chip state marker is missing.

- [ ] **Step 3: Add explicit selected/empty/disabled hooks in components**

```tsx
// src/features/workbench/components/author-chip.tsx
<button
  type="button"
  className={[
    "wao-author-chip",
    isEmpty ? "is-empty" : "",
    menuOpen ? "is-open" : "",
    disabled ? "is-disabled" : "",
  ].filter(Boolean).join(" ")}
  disabled={disabled}
>
```

```tsx
// src/features/workbench/components/theme-selector.tsx
className={`wao-theme-pill ${theme.key === themeKey ? "wao-theme-pill--active" : ""}`}
aria-pressed={theme.key === themeKey}
```

- [ ] **Step 4: Apply shared state CSS to chip, dropdown, selector, and controls**

```css
/* src/features/workbench/styles/author-chip.css */
.wao-author-chip:hover:not(:disabled) {
  background: var(--wao-surface-hover);
}

.wao-author-chip.is-open,
.wao-author-chip.is-selected {
  border-color: var(--wao-border-selected);
  background: var(--wao-accent-muted);
}

.wao-author-chip__menu-item.is-selected {
  color: var(--wao-accent-active);
  background: var(--wao-accent-muted);
}
```

```css
/* src/features/workbench/styles/dropdown.css */
.wao-dropdown__trigger:hover:not(:disabled),
.wao-dropdown__option:hover:not(:disabled) {
  background: var(--wao-surface-hover);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/app.test.tsx`

Expected: PASS with selected-state hooks available for author chip and workbench selectors.

- [ ] **Step 6: Commit**

```bash
git add src/features/workbench/styles/author-chip.css src/features/workbench/styles/dropdown.css src/features/workbench/styles/theme-selector.css src/features/workbench/styles/controls.css src/features/workbench/components/author-chip.tsx src/features/workbench/components/theme-selector.tsx tests/app.test.tsx
git commit -m "style: unify workbench selector states"
```

## Task 4: Bring preview image tools and theme/image action surfaces into the same state system

**Files:**
- Modify: `src/features/workbench/components/preview-frame.tsx`
- Modify: `src/features/workbench/styles/smart-image.css`
- Modify: `src/features/workbench/styles/buttons.css`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing preview-tools/state test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeSelector } from "../src/features/workbench/components/theme-selector";

describe("ThemeSelector state hooks", () => {
  it("marks the active theme pill with aria-pressed", () => {
    render(<ThemeSelector themeKey="wechat-default" onThemeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /wechat-default/i })).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/app.test.tsx`

Expected: FAIL because the current test selector or active-state exposure is missing.

- [ ] **Step 3: Tokenize inline preview image button styles and normalize smart-image surfaces**

```ts
// src/features/workbench/components/preview-frame.tsx
const style = `
  .wao-image-tools__button {
    border: 1px solid var(--wao-border-default);
    background: var(--wao-surface-base);
    color: var(--wao-text-secondary);
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
  }

  .wao-image-tools__button:hover:not(:disabled) {
    background: var(--wao-surface-hover);
    color: var(--wao-text-primary);
  }

  .wao-image-tools__button:disabled {
    color: var(--wao-text-disabled);
    cursor: not-allowed;
  }
`;
```

```css
/* src/features/workbench/styles/smart-image.css */
.wao-smart-image-card,
.wao-smart-image-sheet__section {
  background: var(--wao-surface-base);
}

.wao-smart-image-sheet__field,
.wao-smart-image-sheet__summary {
  background: var(--wao-surface-muted);
}
```

- [ ] **Step 4: Run focused tests and full verification**

Run: `npm run test -- tests/app.test.tsx tests/settings-tab.test.ts`

Expected: PASS with active-state and UI hook assertions passing.

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run build`

Expected: PASS and regenerated plugin CSS bundle.

Run: `npm run obsidian:dev`

Expected: PASS with plugin copied to the Obsidian vault plugin folder and reload triggered.

- [ ] **Step 5: Commit**

```bash
git add src/features/workbench/components/preview-frame.tsx src/features/workbench/styles/smart-image.css src/features/workbench/styles/buttons.css tests/app.test.tsx tests/settings-tab.test.ts
git commit -m "style: unify preview and image action states"
```

## Self-Review

Spec coverage:

- Global token/state model is covered by Task 1.
- Settings-page tabs, cards, account rows, modals, and form states are covered by Task 2.
- Workbench author chip, dropdowns, theme controls, and form controls are covered by Task 3.
- Preview image-tool buttons and final verification are covered by Task 4.

Placeholder scan:

- No `TBD`, `TODO`, or deferred implementation placeholders remain.
- Every task contains exact files, commands, and concrete implementation snippets.

Type consistency:

- Reused class names and CSS tokens stay aligned across tasks: `is-active`, `is-selected`, `--wao-accent`, `--wao-focus-ring`.
- No task references functions or files that are not listed in the file structure.
