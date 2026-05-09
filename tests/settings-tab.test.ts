import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../src/platform/obsidian/plugin-settings";
import { WechatArticleSettingTab } from "../src/platform/obsidian/settings-tab";

beforeAll(() => {
  if (!("empty" in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, "empty", {
      value() {
        this.innerHTML = "";
      },
    });
  }

  if (!("createEl" in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, "createEl", {
      value(tag: string, options?: { text?: string; cls?: string }) {
        const el = document.createElement(tag);
        if (options?.text) el.textContent = options.text;
        if (options?.cls) el.className = options.cls;
        this.appendChild(el);
        return el;
      },
    });
  }

  if (!("createDiv" in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, "createDiv", {
      value(options?: { text?: string; cls?: string }) {
        const el = document.createElement("div");
        if (options?.text) el.textContent = options.text;
        if (options?.cls) el.className = options.cls;
        this.appendChild(el);
        return el;
      },
    });
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("WechatArticleSettingTab", () => {
  it("renders 账户 and 模型 tabs with empty account state by default", () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: { ...DEFAULT_SETTINGS, clients: [] },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    expect(tab.containerEl.textContent).toContain("账户");
    expect(tab.containerEl.textContent).toContain("模型");
    expect(tab.containerEl.textContent).toContain("未设置账户");
    expect(tab.containerEl.querySelector(".wao-settings-tab-btn.is-active")?.textContent).toContain("账户");
  });

  it("renders timeout inputs and svg test buttons on the model settings tab", () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: { ...DEFAULT_SETTINGS, clients: [] },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    const modelTabButton = Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("模型"),
    );
    modelTabButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(tab.containerEl.textContent).toContain("API 端点");
    const endpointTabs = Array.from(tab.containerEl.querySelectorAll<HTMLButtonElement>(".wao-settings-endpoint-pill"));
    expect(endpointTabs.map((button) => button.textContent)).toEqual(["OpenAI 兼容", "Anthropic 兼容"]);
    expect(endpointTabs[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(tab.containerEl.textContent).toContain("LLM 超时");
    expect(tab.containerEl.textContent).toContain("图片生成超时");
    expect(tab.containerEl.textContent).not.toContain("测试 LLM 配置");
    expect(tab.containerEl.textContent).not.toContain("测试图片配置");
    expect(tab.containerEl.querySelectorAll(".wao-settings-test-icon-btn")).toHaveLength(2);
    expect(tab.containerEl.querySelectorAll(".wao-settings-test-icon-btn svg")).toHaveLength(2);
    expect(tab.containerEl.querySelector(".wao-settings-test-icon-btn path")?.getAttribute("d")).toBe(
      "M531.2 305.6V272H576v-40h-128V272h44.8v33.6c-124.8 9.6-224 115.2-224 243.2 0 134.4 108.8 243.2 243.2 243.2 134.4 0 243.2-108.8 243.2-243.2 0-128-97.6-233.6-224-243.2zM512 752c-112 0-204.8-91.2-204.8-204.8S400 344 512 344s204.8 91.2 204.8 204.8S624 752 512 752z",
    );
    expect(Array.from(tab.containerEl.querySelectorAll<HTMLButtonElement>(".wao-settings-test-icon-btn")).every((button) =>
      button.textContent?.trim() === "",
    )).toBe(true);
  });

  it("switches the LLM endpoint tab and saves the selection", async () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: { ...DEFAULT_SETTINGS, clients: [] },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();
    Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("模型"),
    )?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const anthropicTab = Array.from(tab.containerEl.querySelectorAll<HTMLButtonElement>(".wao-settings-endpoint-pill")).find((button) =>
      button.textContent === "Anthropic 兼容",
    );
    anthropicTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(plugin.settings.llmEndpointType).toBe("anthropic");
    expect(plugin.settings.llmBaseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(plugin.saveSettings).toHaveBeenCalled();
  });

  it("switches known Coding DashScope base URLs with the endpoint tab", async () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: {
        ...DEFAULT_SETTINGS,
        clients: [],
        llmBaseUrl: "https://coding.dashscope.aliyuncs.com/v1",
      },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();
    Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("模型"),
    )?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    Array.from(tab.containerEl.querySelectorAll<HTMLButtonElement>(".wao-settings-endpoint-pill")).find((button) =>
      button.textContent === "Anthropic 兼容",
    )?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(plugin.settings.llmEndpointType).toBe("anthropic");
    expect(plugin.settings.llmBaseUrl).toBe("https://coding.dashscope.aliyuncs.com/apps/anthropic");
  });

  it("opens a 新建账户 modal with only basic fields instead of creating a blank account immediately", () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: { ...DEFAULT_SETTINGS, clients: [] },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    const addButton = Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("新增账户"),
    );

    expect(addButton).toBeTruthy();
    addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(plugin.settings.clients).toHaveLength(0);
    expect(document.body.textContent).toContain("新建账户");
    expect(document.body.textContent).toContain("名称");
    expect(document.body.textContent).toContain("行业");
    expect(document.body.textContent).toContain("目标受众");
    expect(document.body.querySelector<HTMLInputElement>('input[placeholder="例如：刘Sir.2035"]')).toBeTruthy();
    expect(document.body.querySelector<HTMLInputElement>('input[placeholder="例如：AI 技术 / 开发者工具 / 智能体"]')).toBeTruthy();
    expect(document.body.querySelector<HTMLInputElement>('input[placeholder="例如：技术从业者、开发者、AI Agent 关注者"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("公众号账号");
    expect(document.body.textContent).not.toContain("选题方向");
  });

  it("creates and selects a new account only after modal save", async () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: { ...DEFAULT_SETTINGS, clients: [], lastSelectedClientId: null },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    const addButton = Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("新增账户"),
    );
    addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const inputs = Array.from(document.body.querySelectorAll("input"));
    inputs[0].value = "刘Sir.2035";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "AI 技术";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[2].value = "开发者";
    inputs[2].dispatchEvent(new Event("input", { bubbles: true }));

    const saveButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("保存"),
    );
    saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(plugin.settings.clients).toHaveLength(1);
    expect(plugin.settings.clients[0]?.author).toBe("刘Sir.2035");
    expect(plugin.settings.lastSelectedClientId).toBe(plugin.settings.clients[0]?.id);
  });

  it("renders each account as a summary row with status, edit, and delete actions", () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: {
        ...DEFAULT_SETTINGS,
        clients: [
          {
            id: "liu",
            author: "刘Sir.2035",
            industry: "AI 技术",
            targetAudience: "开发者",
            topics: ["AI 编程工具"],
            blacklist: { words: ["空话"], topics: ["纯概念炒作"] },
            wechat: {
              accountName: "liusir2035",
              appid: "wx123",
              secret: "sec456",
            },
          },
        ],
        lastSelectedClientId: "liu",
      },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    expect(tab.containerEl.textContent).toContain("刘Sir.2035");
    expect(tab.containerEl.textContent).toContain("AI 技术");
    expect(tab.containerEl.textContent).toContain("开发者");
    expect(tab.containerEl.textContent).toContain("选题方向");
    expect(tab.containerEl.textContent).toContain("禁用词");
    expect(tab.containerEl.textContent).toContain("公众号凭证");
    const credentialButton = Array.from(tab.containerEl.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("公众号凭证"),
    );
    expect(credentialButton?.classList.contains("is-ready")).toBe(true);
    expect(credentialButton?.getAttribute("aria-pressed")).toBe("true");
    expect(tab.containerEl.querySelectorAll(".wao-settings-icon-btn")).toHaveLength(2);
  });

  it("opens dedicated credential and blacklist modals from account actions", () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: {
        ...DEFAULT_SETTINGS,
        clients: [
          {
            id: "liu",
            author: "刘Sir.2035",
            industry: "AI 技术",
            targetAudience: "开发者",
            topics: ["AI 编程工具"],
            blacklist: { words: ["空话"], topics: ["纯概念炒作"] },
            wechat: {
              accountName: "",
              appid: "",
              secret: "",
            },
          },
        ],
      },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    const credentialButton = Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("公众号凭证"),
    );
    credentialButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.body.textContent).toContain("公众号凭证");
    expect(document.body.textContent).toContain("公众号账号");

    document.body.innerHTML = "";
    tab.display();

    const blacklistButton = Array.from(tab.containerEl.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("禁用词"),
    );
    blacklistButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.body.textContent).toContain("禁用词");
    expect(document.body.textContent).toContain("禁用话题");
  });

  it("asks for confirmation before deleting an account", async () => {
    const plugin: {
      settings: typeof DEFAULT_SETTINGS;
      saveSettings: ReturnType<typeof vi.fn>;
    } = {
      settings: {
        ...DEFAULT_SETTINGS,
        clients: [
          {
            id: "liu",
            author: "刘Sir.2035",
            industry: "AI 技术",
            targetAudience: "开发者",
            topics: [],
            blacklist: { words: [], topics: [] },
            wechat: { accountName: "", appid: "", secret: "" },
          },
        ],
      },
      saveSettings: vi.fn().mockResolvedValue(undefined),
    };

    const tab = new WechatArticleSettingTab({} as never, plugin as never);
    tab.display();

    const deleteButton = tab.containerEl.querySelectorAll<HTMLButtonElement>(".wao-settings-icon-btn")[1];
    deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.body.textContent).toContain("删除账户");
    expect(document.body.textContent).toContain("删除后将无法恢复，请谨慎操作。");
    expect(plugin.settings.clients).toHaveLength(1);

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认删除"),
    );
    confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(plugin.settings.clients).toHaveLength(0);
  });
});
