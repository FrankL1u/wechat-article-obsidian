import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import {
} from "../../features/images/presets";
import type WechatArticlePlugin from "../../main";
import { createEmptyClientProfile, resolveSelectedClientId } from "./client-profiles";
import { testImageConfig, testLlmConfig } from "./model-config-test";
import type { ClientProfile } from "./plugin-settings";

type SettingsTabKey = "accounts" | "models";

const EDIT_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
const DELETE_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const TEST_SVG = `<svg viewBox="0 0 1024 1024" width="18" height="18" aria-hidden="true"><path d="M531.2 305.6V272H576v-40h-128V272h44.8v33.6c-124.8 9.6-224 115.2-224 243.2 0 134.4 108.8 243.2 243.2 243.2 134.4 0 243.2-108.8 243.2-243.2 0-128-97.6-233.6-224-243.2zM512 752c-112 0-204.8-91.2-204.8-204.8S400 344 512 344s204.8 91.2 204.8 204.8S624 752 512 752z" fill="currentColor"></path><path d="M497.6 533.76l132.608-136.64 28.704 27.84-132.592 136.64z" fill="currentColor"></path></svg>`;

export class WechatArticleSettingTab extends PluginSettingTab {
  private activeTab: SettingsTabKey = "accounts";
  private editingClientId: string | null = null;
  private expandedSections = new Set<string>(["accounts", "models:llm", "models:image"]);

  constructor(app: App, private plugin: WechatArticlePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.classList.add("wao-settings-root");
    this.ensureEditingClientId();

    containerEl.createEl("h2", { text: "公众号工作台设置" });

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

  private renderTabButton(containerEl: HTMLElement, key: SettingsTabKey, label: string): void {
    const button = containerEl.createEl("button", { text: label, cls: "wao-settings-tab-btn" });
    button.type = "button";
    button.classList.toggle("is-active", this.activeTab === key);
    button.ariaPressed = this.activeTab === key ? "true" : "false";
    button.addEventListener("click", () => {
      this.activeTab = key;
      this.display();
    });
  }

  private ensureEditingClientId(): void {
    this.editingClientId = resolveSelectedClientId(this.plugin.settings.clients, this.editingClientId);
  }

  private renderAccountsTab(containerEl: HTMLElement): void {
    this.renderSection(containerEl, "accounts", "账户设置", (bodyEl) => {
      const galleryEl = bodyEl.createDiv({ cls: "wao-settings-account-gallery" });
      const clients = this.plugin.settings.clients;

      if (clients.length === 0) {
        const emptyEl = galleryEl.createDiv({ cls: "wao-settings-account-empty" });
        emptyEl.createEl("div", { text: "未设置账户", cls: "wao-settings-account-empty__title" });
        emptyEl.createEl("div", {
          text: "先创建一个客户账户，再配置作者和公众号信息。",
          cls: "wao-settings-account-empty__meta",
        });
      } else {
        for (const client of clients) {
          this.renderAccountSummaryRow(galleryEl, client);
        }
      }

      const footerEl = bodyEl.createDiv({ cls: "wao-settings-section__footer" });
      const createButton = footerEl.createEl("button", { text: "+ 新增账户", cls: "wao-btn wao-btn--primary mod-cta wao-settings-action-btn" });
      createButton.type = "button";
      createButton.addEventListener("click", () => void this.openBasicAccountModal());
    });
  }

  private renderModelsTab(containerEl: HTMLElement): void {
    const { settings } = this.plugin;

    this.renderSection(containerEl, "models:llm", "LLM 配置", (sectionEl) => {
      this.renderEndpointTypeTabs(sectionEl);

      new Setting(sectionEl)
      .setName("LLM Base URL")
      .addText((text) =>
        text.setPlaceholder("http://host:port/v1").setValue(settings.llmBaseUrl).onChange(async (value) => {
          this.plugin.settings.llmBaseUrl = value.trim();
          await this.plugin.saveSettings();
        }),
      );

      new Setting(sectionEl)
      .setName("LLM API Key")
      .addText((text) =>
        text.setPlaceholder("Bearer Token").setValue(settings.llmApiKey).onChange(async (value) => {
          this.plugin.settings.llmApiKey = value.trim();
          await this.plugin.saveSettings();
        }),
      );

      new Setting(sectionEl)
      .setName("LLM Model")
      .addText((text) =>
        text.setPlaceholder("可选，不填则禁用远程 LLM 规划").setValue(settings.llmModel).onChange(async (value) => {
          this.plugin.settings.llmModel = value.trim();
          await this.plugin.saveSettings();
        }),
      );

      new Setting(sectionEl)
      .setName("LLM 超时")
      .setDesc("单位：秒")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.setValue(String(settings.llmTimeoutSeconds)).onChange(async (value) => {
          this.plugin.settings.llmTimeoutSeconds = this.parseTimeoutSeconds(value, 60);
          await this.plugin.saveSettings();
        });
      });

    }, (buttonEl) => this.configureTestIconButton(buttonEl, "测试 LLM 配置", () => this.testLlm(buttonEl)));

    this.renderSection(containerEl, "models:image", "图片生成配置", (sectionEl) => {
      new Setting(sectionEl)
      .setName("图片服务商")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("openai", "OpenAI")
          .addOption("gemini", "Gemini")
          .addOption("doubao", "豆包")
          .addOption("qwen", "通义千问")
          .setValue(settings.imageProvider)
          .onChange(async (value) => {
            this.plugin.settings.imageProvider = value;
            await this.plugin.saveSettings();
          }),
      );

      new Setting(sectionEl)
      .setName("图片 API Key")
      .addText((text) =>
        text.setPlaceholder("请输入 API Key").setValue(settings.apiKey).onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          }),
      );

      new Setting(sectionEl)
      .setName("图片 Base URL")
      .addText((text) =>
        text.setPlaceholder("可选").setValue(settings.baseUrl).onChange(async (value) => {
          this.plugin.settings.baseUrl = value.trim();
            await this.plugin.saveSettings();
          }),
      );

      new Setting(sectionEl)
      .setName("图片 Model")
      .addText((text) =>
        text.setPlaceholder("可选").setValue(settings.model).onChange(async (value) => {
          this.plugin.settings.model = value.trim();
            await this.plugin.saveSettings();
        }),
      );

      new Setting(sectionEl)
      .setName("图片生成超时")
      .setDesc("单位：秒")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.setValue(String(settings.imageTimeoutSeconds)).onChange(async (value) => {
          this.plugin.settings.imageTimeoutSeconds = this.parseTimeoutSeconds(value, 60);
          await this.plugin.saveSettings();
        });
      });

      new Setting(sectionEl)
      .setName("启用输出目录")
      .addToggle((toggle) =>
        toggle.setValue(settings.outputDirEnabled).onChange(async (value) => {
          this.plugin.settings.outputDirEnabled = value;
          await this.plugin.saveSettings();
          this.display();
        }),
      );

      if (settings.outputDirEnabled) {
        new Setting(sectionEl)
        .setName("输出目录路径")
        .setDesc("支持 Vault 相对路径或指向 Vault 内部的绝对路径")
        .addText((text) =>
          text.setValue(settings.outputDirPath).onChange(async (value) => {
            this.plugin.settings.outputDirPath = value.trim();
            await this.plugin.saveSettings();
          }),
        );
      }
    }, (buttonEl) => this.configureTestIconButton(buttonEl, "测试图片配置", () => this.testImage(buttonEl)));
  }

  private configureTestIconButton(buttonEl: HTMLButtonElement, label: string, onClick: () => Promise<void>): void {
    buttonEl.type = "button";
    buttonEl.ariaLabel = label;
    buttonEl.title = label;
    buttonEl.className = "wao-settings-test-icon-btn";
    buttonEl.innerHTML = TEST_SVG;
    buttonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      void onClick();
    });
  }

  private renderEndpointTypeTabs(containerEl: HTMLElement): void {
    const rowEl = containerEl.createDiv({ cls: "wao-settings-endpoint-row" });
    rowEl.createEl("div", { text: "API 端点", cls: "wao-settings-endpoint-row__label" });
    const stripEl = rowEl.createDiv({ cls: "wao-settings-endpoint-strip" });
    const options: Array<{ value: "openai" | "anthropic"; label: string }> = [
      { value: "openai", label: "OpenAI 兼容" },
      { value: "anthropic", label: "Anthropic 兼容" },
    ];

    for (const option of options) {
      const button = stripEl.createEl("button", { text: option.label, cls: "wao-settings-endpoint-pill" });
      button.type = "button";
      button.ariaPressed = this.plugin.settings.llmEndpointType === option.value ? "true" : "false";
      button.classList.toggle("is-active", this.plugin.settings.llmEndpointType === option.value);
      button.addEventListener("click", async () => {
        this.plugin.settings.llmEndpointType = option.value;
        this.plugin.settings.llmBaseUrl = this.resolveEndpointBaseUrl(option.value, this.plugin.settings.llmBaseUrl);
        await this.plugin.saveSettings();
        this.display();
      });
    }
  }

  private resolveEndpointBaseUrl(endpointType: "openai" | "anthropic", currentBaseUrl: string): string {
    const normalized = currentBaseUrl.replace(/\/+$/, "");
    if (endpointType === "anthropic" && normalized === "https://coding.dashscope.aliyuncs.com/v1") {
      return "https://coding.dashscope.aliyuncs.com/apps/anthropic";
    }
    if (endpointType === "openai" && normalized === "https://coding.dashscope.aliyuncs.com/apps/anthropic") {
      return "https://coding.dashscope.aliyuncs.com/v1";
    }
    return currentBaseUrl;
  }

  private parseTimeoutSeconds(value: string, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.trunc(parsed));
  }

  private async testLlm(buttonEl: HTMLButtonElement): Promise<void> {
    buttonEl.disabled = true;
    try {
      await testLlmConfig(this.plugin.settings);
      new Notice("LLM 配置可用");
    } catch (error) {
      new Notice(`LLM 配置不可用：${this.formatConfigTestError(error)}`);
    } finally {
      buttonEl.disabled = false;
    }
  }

  private async testImage(buttonEl: HTMLButtonElement): Promise<void> {
    buttonEl.disabled = true;
    try {
      await testImageConfig(this.plugin.settings);
      new Notice("图片配置可用");
    } catch (error) {
      new Notice(`图片配置不可用：${this.formatConfigTestError(error)}`);
    } finally {
      buttonEl.disabled = false;
    }
  }

  private formatConfigTestError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private renderTextSetting(
    containerEl: HTMLElement,
    name: string,
    value: string,
    onChange: (value: string) => Promise<void>,
    isSecret = false,
  ): void {
    const rowEl = containerEl.createDiv({ cls: "wao-settings-field-row" });
    rowEl.createEl("label", { text: name, cls: "wao-settings-field-row__label" });
    const controlEl = rowEl.createDiv({ cls: "wao-settings-field-row__control" });
    const inputEl = controlEl.createEl("input", { cls: "wao-settings-field-row__input" });
    inputEl.type = isSecret ? "password" : "text";
    inputEl.value = value;
    inputEl.addEventListener("change", () => {
      void onChange(inputEl.value.trim());
    });
  }

  private renderListSetting(
    containerEl: HTMLElement,
    name: string,
    values: string[],
    onChange: (values: string[]) => Promise<void>,
  ): void {
    const rowEl = containerEl.createDiv({ cls: "wao-settings-field-row wao-settings-field-row--textarea" });
    rowEl.createEl("label", { text: name, cls: "wao-settings-field-row__label" });
    const controlEl = rowEl.createDiv({ cls: "wao-settings-field-row__control wao-settings-field-row__control--textarea" });
    const textarea = controlEl.createEl("textarea", { cls: "wao-settings-field-stack__textarea" });
    textarea.value = values.join("\n");
    textarea.rows = Math.max(4, values.length || 4);
    textarea.addEventListener("change", () => {
      void onChange(
        textarea.value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    });
  }

  private renderSection(
    containerEl: HTMLElement,
    key: string,
    title: string,
    renderContent: (contentEl: HTMLElement) => void,
    renderAction?: (buttonEl: HTMLButtonElement) => void,
  ): void {
    const sectionEl = containerEl.createDiv({ cls: "wao-settings-section" });
    const headerEl = sectionEl.createDiv({ cls: "wao-settings-section__header wao-settings-section__header--toggle" });
    headerEl.setAttribute("role", "button");
    headerEl.tabIndex = 0;
    headerEl.setAttribute("aria-expanded", this.expandedSections.has(key) ? "true" : "false");
    const titleEl = headerEl.createDiv({ cls: "wao-settings-section__title" });
    titleEl.createEl("span", {
      text: this.expandedSections.has(key) ? "⌄" : "›",
      cls: "wao-settings-section__chevron",
    });
    titleEl.createEl("h3", { text: title });
    if (renderAction) {
      const actionButton = headerEl.createEl("button", { cls: "wao-settings-test-icon-btn" });
      renderAction(actionButton);
    }

    const contentEl = sectionEl.createDiv({ cls: "wao-settings-section__content" });
    if (this.expandedSections.has(key)) {
      sectionEl.classList.add("is-expanded");
      renderContent(contentEl);
    }

    headerEl.addEventListener("click", () => {
      if (this.expandedSections.has(key)) {
        this.expandedSections.delete(key);
      } else {
        this.expandedSections.add(key);
      }
      this.display();
    });
    headerEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        headerEl.click();
      }
    });
  }

  private renderAccountSummaryRow(containerEl: HTMLElement, client: ClientProfile): void {
    const rowEl = containerEl.createDiv({ cls: "wao-settings-account-row" });
    const configured = Boolean(client.wechat.accountName && client.wechat.appid && client.wechat.secret);
    const mainEl = rowEl.createDiv({ cls: "wao-settings-account-row__main" });
    mainEl.createEl("div", { text: client.author || "未命名作者", cls: "wao-settings-account-row__title" });
    this.renderSummaryField(mainEl, client.industry);
    this.renderSummaryField(mainEl, client.targetAudience);

    const topActionsEl = rowEl.createDiv({ cls: "wao-settings-account-row__top-actions" });
    const editButton = topActionsEl.createEl("button", { cls: "wao-btn wao-btn--ghost wao-settings-icon-btn" });
    editButton.type = "button";
    editButton.ariaLabel = "编辑";
    editButton.innerHTML = EDIT_SVG;
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.openBasicAccountModal(client);
    });
    const deleteButton = topActionsEl.createEl("button", { cls: "wao-btn wao-btn--ghost wao-settings-icon-btn wao-settings-icon-btn--danger" });
    deleteButton.type = "button";
    deleteButton.ariaLabel = "删除";
    deleteButton.innerHTML = DELETE_SVG;
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.confirmDeleteClient(client);
    });

    const actionsEl = rowEl.createDiv({ cls: "wao-settings-account-row__actions" });
    const topicsButton = actionsEl.createEl("button", { text: "选题方向", cls: "wao-btn wao-btn--ghost wao-settings-inline-btn" });
    topicsButton.type = "button";
    topicsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.openTopicsModal(client);
    });
    const blacklistButton = actionsEl.createEl("button", { text: "禁用词", cls: "wao-btn wao-btn--ghost wao-settings-inline-btn" });
    blacklistButton.type = "button";
    blacklistButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.openBlacklistModal(client);
    });
    const credentialButton = actionsEl.createEl("button", {
      text: "公众号凭证",
      cls: `wao-btn wao-btn--ghost wao-settings-inline-btn wao-settings-inline-btn--credential ${configured ? "is-ready" : "is-missing"}`,
    });
    credentialButton.type = "button";
    credentialButton.ariaPressed = configured ? "true" : "false";
    const dotEl = credentialButton.createEl("span", {
      cls: `wao-settings-status-dot ${configured ? "is-ready" : "is-missing"}`,
    });
    credentialButton.insertBefore(dotEl, credentialButton.firstChild);
    credentialButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.openWechatCredentialModal(client);
    });
  }

  private renderSummaryField(containerEl: HTMLElement, value: string): void {
    const rowEl = containerEl.createDiv({ cls: "wao-settings-account-row__meta" });
    const valueEl = rowEl.createEl("span", {
      text: value || "未设置",
      cls: "wao-settings-account-row__meta-value",
    });
    valueEl.title = value || "未设置";
  }

  private async openBasicAccountModal(existingClient?: ClientProfile): Promise<void> {
    const nextClient = await new BasicAccountModal(this.app, existingClient).openAndWait();
    if (!nextClient) return;
    if (existingClient) {
      await this.updateClient(existingClient.id, nextClient);
      this.editingClientId = existingClient.id;
      this.plugin.settings.lastSelectedClientId = existingClient.id;
      await this.plugin.saveSettings();
      this.display();
      return;
    }

    this.plugin.settings.clients = [...this.plugin.settings.clients, nextClient];
    this.plugin.settings.lastSelectedClientId = nextClient.id;
    this.editingClientId = nextClient.id;
    await this.plugin.saveSettings();
    this.display();
  }

  private async openTopicsModal(client: ClientProfile): Promise<void> {
    const result = await new ListEditorModal(
      this.app,
      "选题方向",
      "按行输入这个账户长期关注的选题方向。",
      client.topics,
      "例如：AI 编程工具、Agent 架构、多智能体协作",
    ).openAndWait();
    if (!result) return;
    await this.updateClient(client.id, { topics: result });
  }

  private async openBlacklistModal(client: ClientProfile): Promise<void> {
    const result = await new BlacklistModal(this.app, client).openAndWait();
    if (!result) return;
    await this.updateClient(client.id, { blacklist: result });
  }

  private async openWechatCredentialModal(client: ClientProfile): Promise<void> {
    const result = await new WechatCredentialModal(this.app, client).openAndWait();
    if (!result) return;
    await this.updateClient(client.id, { wechat: result });
  }

  private async deleteClient(clientId: string): Promise<void> {
    this.plugin.settings.clients = this.plugin.settings.clients.filter((client) => client.id !== clientId);
    this.plugin.settings.lastSelectedClientId = resolveSelectedClientId(this.plugin.settings.clients, this.plugin.settings.lastSelectedClientId);
    this.editingClientId = this.plugin.settings.lastSelectedClientId;
    await this.plugin.saveSettings();
    this.display();
  }

  private async confirmDeleteClient(client: ClientProfile): Promise<void> {
    const shouldDelete = await new DeleteClientConfirmModal(this.app, client.author || "该账户").openAndWait();
    if (!shouldDelete) return;
    await this.deleteClient(client.id);
  }

  private async updateClient(clientId: string, partial: Partial<ClientProfile>): Promise<void> {
    this.plugin.settings.clients = this.plugin.settings.clients.map((client) =>
      client.id === clientId
        ? {
            ...client,
            ...partial,
            blacklist: partial.blacklist ? { ...client.blacklist, ...partial.blacklist } : client.blacklist,
            wechat: partial.wechat ? { ...client.wechat, ...partial.wechat } : client.wechat,
          }
        : client,
    );
    await this.plugin.saveSettings();
    this.display();
  }
}

abstract class BaseSettingsModal<T> extends Modal {
  protected resolver: ((value: T | null) => void) | null = null;

  async openAndWait(): Promise<T | null> {
    return new Promise<T | null>((resolve) => {
      this.resolver = resolve;
      this.open();
    });
  }

  protected renderShell(title: string): { formEl: HTMLElement; footerEl: HTMLElement } {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.classList.add("wao-account-modal");
    this.modalEl.classList.add("wao-account-modal-shell");

    const headerEl = contentEl.createDiv({ cls: "wao-account-modal__header" });
    headerEl.createEl("h3", { text: title, cls: "wao-account-modal__title" });

    return {
      formEl: contentEl.createDiv({ cls: "wao-account-modal__content wao-account-modal__content--plain" }),
      footerEl: contentEl.createDiv({ cls: "wao-account-modal__footer" }),
    };
  }

  protected renderInputField(
    containerEl: HTMLElement,
    label: string,
    description: string,
    value: string,
    onChange: (value: string) => void,
    isSecret = false,
    placeholder = "",
  ): void {
    const fieldEl = containerEl.createDiv({ cls: "wao-account-modal__field" });
    const metaEl = fieldEl.createDiv({ cls: "wao-account-modal__field-meta" });
    metaEl.createEl("label", { text: label, cls: "wao-account-modal__label" });
    metaEl.createEl("div", { text: description, cls: "wao-account-modal__desc" });
    const inputEl = fieldEl.createEl("input", { cls: "wao-input wao-account-modal__input" });
    inputEl.type = isSecret ? "password" : "text";
    inputEl.placeholder = placeholder;
    inputEl.value = value;
    inputEl.addEventListener("input", () => onChange(inputEl.value));
  }

  protected renderTextareaField(
    containerEl: HTMLElement,
    label: string,
    description: string,
    values: string[],
    onChange: (values: string[]) => void,
    placeholder = "",
  ): void {
    const fieldEl = containerEl.createDiv({ cls: "wao-account-modal__field wao-account-modal__field--textarea" });
    const metaEl = fieldEl.createDiv({ cls: "wao-account-modal__field-meta" });
    metaEl.createEl("label", { text: label, cls: "wao-account-modal__label" });
    metaEl.createEl("div", { text: description, cls: "wao-account-modal__desc" });
    const textarea = fieldEl.createEl("textarea", { cls: "wao-input wao-account-modal__textarea" });
    textarea.placeholder = placeholder;
    textarea.value = values.join("\n");
    textarea.rows = Math.max(4, values.length || 4);
    textarea.addEventListener("input", () => {
      onChange(
        textarea.value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    });
  }

  protected renderFooterActions(
    footerEl: HTMLElement,
    onSave: () => void,
  ): void {
    const cancelButton = footerEl.createEl("button", { text: "取消", cls: "wao-btn wao-btn--ghost wao-account-modal__cancel" });
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => this.close());
    const saveButton = footerEl.createEl("button", { text: "保存", cls: "wao-btn wao-btn--primary mod-cta wao-account-modal__save" });
    saveButton.type = "button";
    saveButton.addEventListener("click", onSave);
  }

  override onClose(): void {
    this.modalEl.classList.remove("wao-account-modal-shell");
    this.contentEl.empty();
    this.resolver?.(null);
    this.resolver = null;
  }
}

class BasicAccountModal extends BaseSettingsModal<ClientProfile> {
  private draft: ClientProfile;

  constructor(app: App, existingClient?: ClientProfile) {
    super(app);
    this.draft = existingClient
      ? JSON.parse(JSON.stringify(existingClient)) as ClientProfile
      : createEmptyClientProfile();
  }

  override onOpen(): void {
    const { formEl, footerEl } = this.renderShell(this.draft.author ? "编辑账户" : "新建账户");
    this.renderInputField(
      formEl,
      "名称",
      "用于顶部选择显示和发布作者名称。",
      this.draft.author,
      (value) => {
        this.draft.author = value;
      },
      false,
      "例如：刘Sir.2035",
    );
    this.renderInputField(
      formEl,
      "行业",
      "描述该账户主要覆盖的行业或内容领域。",
      this.draft.industry,
      (value) => {
        this.draft.industry = value;
      },
      false,
      "例如：AI 技术 / 开发者工具 / 智能体",
    );
    this.renderInputField(
      formEl,
      "目标受众",
      "描述文章的主要读者群体。",
      this.draft.targetAudience,
      (value) => {
        this.draft.targetAudience = value;
      },
      false,
      "例如：技术从业者、开发者、AI Agent 关注者",
    );
    this.renderFooterActions(footerEl, () => {
      if (!this.draft.author.trim()) {
        new Notice("请先填写名称");
        return;
      }
      const resolver = this.resolver;
      this.resolver = null;
      this.close();
      resolver?.({
        ...this.draft,
        author: this.draft.author.trim(),
        industry: this.draft.industry.trim(),
        targetAudience: this.draft.targetAudience.trim(),
      });
    });
  }
}

class ListEditorModal extends BaseSettingsModal<string[]> {
  private draft: string[];

  constructor(
    app: App,
    private title: string,
    private description: string,
    values: string[],
    private placeholder = "",
  ) {
    super(app);
    this.draft = [...values];
  }

  override onOpen(): void {
    const { formEl, footerEl } = this.renderShell(this.title);
    this.renderTextareaField(formEl, this.title, this.description, this.draft, (values) => {
      this.draft = values;
    }, this.placeholder);
    this.renderFooterActions(footerEl, () => {
      const resolver = this.resolver;
      this.resolver = null;
      this.close();
      resolver?.(this.draft);
    });
  }
}

class BlacklistModal extends BaseSettingsModal<ClientProfile["blacklist"]> {
  private draft: ClientProfile["blacklist"];

  constructor(app: App, client: ClientProfile) {
    super(app);
    this.draft = JSON.parse(JSON.stringify(client.blacklist)) as ClientProfile["blacklist"];
  }

  override onOpen(): void {
    const { formEl, footerEl } = this.renderShell("禁用词");
    this.renderTextareaField(formEl, "禁用词", "按行输入不希望出现在文章里的套话或表达。", this.draft.words, (values) => {
      this.draft.words = values;
    }, "例如：空话、套话、众所周知");
    this.renderTextareaField(formEl, "禁用话题", "按行输入这个账户不希望涉及的话题。", this.draft.topics, (values) => {
      this.draft.topics = values;
    }, "例如：纯资讯搬运、纯概念炒作");
    this.renderFooterActions(footerEl, () => {
      const resolver = this.resolver;
      this.resolver = null;
      this.close();
      resolver?.(this.draft);
    });
  }
}

class WechatCredentialModal extends BaseSettingsModal<ClientProfile["wechat"]> {
  private draft: ClientProfile["wechat"];

  constructor(app: App, client: ClientProfile) {
    super(app);
    this.draft = JSON.parse(JSON.stringify(client.wechat)) as ClientProfile["wechat"];
  }

  override onOpen(): void {
    const { formEl, footerEl } = this.renderShell("公众号凭证");
    this.renderInputField(formEl, "公众号账号", "仅用于本地识别这个公众号账户。", this.draft.accountName, (value) => {
      this.draft.accountName = value;
    });
    this.renderInputField(formEl, "AppID", "微信公众平台开发设置里的 AppID。", this.draft.appid, (value) => {
      this.draft.appid = value;
    });
    this.renderInputField(formEl, "Secret", "微信公众平台开发设置里的 AppSecret。", this.draft.secret, (value) => {
      this.draft.secret = value;
    }, true);
    this.renderFooterActions(footerEl, () => {
      const resolver = this.resolver;
      this.resolver = null;
      this.close();
      resolver?.({
        accountName: this.draft.accountName.trim(),
        appid: this.draft.appid.trim(),
        secret: this.draft.secret.trim(),
      });
    });
  }
}

class DeleteClientConfirmModal extends BaseSettingsModal<boolean> {
  constructor(app: App, private clientName: string) {
    super(app);
  }

  override onOpen(): void {
    const { formEl, footerEl } = this.renderShell("删除账户");
    const bodyEl = formEl.createDiv({ cls: "wao-account-modal__confirm" });
    bodyEl.createEl("p", {
      text: `是否删除“${this.clientName}”？`,
      cls: "wao-account-modal__confirm-title",
    });
    bodyEl.createEl("p", {
      text: "删除后将无法恢复，请谨慎操作。",
      cls: "wao-account-modal__confirm-desc",
    });

    const cancelButton = footerEl.createEl("button", { text: "取消", cls: "wao-btn wao-btn--ghost wao-account-modal__cancel" });
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => this.close());

    const confirmButton = footerEl.createEl("button", { text: "确认删除", cls: "wao-btn wao-btn--danger wao-account-modal__save" });
    confirmButton.type = "button";
    confirmButton.addEventListener("click", () => {
      const resolver = this.resolver;
      this.resolver = null;
      this.close();
      resolver?.(true);
    });
  }
}
