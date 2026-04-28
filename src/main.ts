import { addIcon, Plugin, requestUrl } from "obsidian";
import styles from "../styles.css";
import { DEFAULT_SETTINGS, normalizePluginSettings, type PluginSettings } from "./platform/obsidian/plugin-settings";
import { WechatArticleSettingTab } from "./platform/obsidian/settings-tab";
import { captureMarkdownContext, type MarkdownContext } from "./platform/obsidian/active-note-bridge";
import { VIEW_TYPE_WECHAT_ARTICLE, WechatArticleWorkbenchView } from "./platform/obsidian/workbench-view";

export default class WechatArticlePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  static readonly RIBBON_ICON_ID = "wechat-article-agent-v2";
  static readonly RIBBON_LABEL = "打开公众号编排智能体";
  private launchContext: MarkdownContext | null = null;
  private styleElement: HTMLStyleElement | null = null;

  async onload(): Promise<void> {
    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrl }).__waoRequestUrl = requestUrl;
    await this.loadSettings();

    this.injectStyles();

    addIcon(
      WechatArticlePlugin.RIBBON_ICON_ID,
      `<g transform="translate(-27.27 -27.27) scale(0.1515)"><path d="M448.18432 230.94272c176.98304-53.95968 267.17696 110.98624 267.17696 110.98624-32.59392-17.78176-130.39104-37.53472-235.09504 16.7936s-126.4384 172.87168-126.4384 172.87168c-42.56256-45.4144-44.4928-118.6304-44.4928-118.6304 5.03296-137.41568 138.84928-182.02112 138.84928-182.02112zM393.50784 796.42112c-256.12288-49.6384-197.85216-273.38752-133.81632-371.95264 0 0-2.88256 138.13248 130.22208 214.4 0 0 15.82592 7.1936 10.79296 30.21312l-5.03808 29.49632s-6.656 20.1472 6.02624 22.30272c0 0 4.04992 0 13.39904-6.4768l48.92672-32.37376s10.07104-7.1936 23.01952-5.03808c12.94848 2.16064 95.68768 23.74656 177.70496-44.60032-0.00512 0-15.10912 213.67296-271.23712 164.02944z m256.8448-19.42016c16.54784-7.9104 97.1264-102.8864 58.98752-231.66464s-167.6288-157.55776-167.6288-157.55776c66.19136-28.0576 143.89248-7.19872 143.89248-7.19872 117.9904 34.5344 131.6608 146.77504 131.6608 146.77504 23.01952 200.71936-166.912 249.64608-166.912 249.64608z" fill="currentColor"/><path d="M525 390L455 535H530L495 655L625 495H545L525 390Z" fill="currentColor"/></g>`,
    );

    this.registerView(VIEW_TYPE_WECHAT_ARTICLE, (leaf) => new WechatArticleWorkbenchView(leaf, this));
    this.addSettingTab(new WechatArticleSettingTab(this.app, this));

    this.addRibbonIcon(WechatArticlePlugin.RIBBON_ICON_ID, WechatArticlePlugin.RIBBON_LABEL, async () => {
      this.launchContext = captureMarkdownContext(this.app);
      const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_WECHAT_ARTICLE)[0];
      const leaf = existingLeaf ?? this.app.workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_WECHAT_ARTICLE, active: true });
      await this.app.workspace.revealLeaf(leaf);
      await leaf.loadIfDeferred?.();

      const view = leaf.view;
      if (view instanceof WechatArticleWorkbenchView) {
        await view.activateFromRibbon();
      }
    });
  }

  onunload(): void {
    this.styleElement?.remove();
    this.styleElement = null;
  }

  private injectStyles(): void {
    const styleId = "wao-styles";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = styles;
    this.styleElement = el;
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizePluginSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  consumeLaunchContext(): MarkdownContext | null {
    const context = this.launchContext;
    this.launchContext = null;
    return context;
  }
}
