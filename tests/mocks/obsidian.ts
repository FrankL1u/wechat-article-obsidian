export class App {}

export class Plugin {
  app: App;

  constructor(app = new App(), _manifest?: unknown) {
    this.app = app;
  }
}

export class TFile {
  path: string;

  constructor(path: string) {
    this.path = path;
  }
}

export class WorkspaceLeaf {
  view: unknown = null;
  async setViewState(): Promise<void> {}
  async loadIfDeferred(): Promise<void> {}
}

export class ItemView {
  leaf: WorkspaceLeaf;
  contentEl: HTMLDivElement;
  icon = "";
  app = new App();

  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
    this.contentEl = document.createElement("div");
  }

  getViewType(): string {
    return "mock-view";
  }

  getDisplayText(): string {
    return "mock-view";
  }

  registerEvent(): void {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLDivElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }
}

export class Modal {
  app: App;
  contentEl: HTMLDivElement;
  modalEl: HTMLDivElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement("div");
    this.modalEl = document.createElement("div");
    this.modalEl.appendChild(this.contentEl);
  }

  onOpen(): void {}
  onClose(): void {}

  open(): void {
    document.body.appendChild(this.modalEl);
    this.onOpen();
  }

  close(): void {
    this.onClose();
    this.modalEl.remove();
  }
}

export class Notice {
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export class Setting {
  settingEl: HTMLDivElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.settingEl.className = "setting-item";
    containerEl.appendChild(this.settingEl);
  }

  setName(value: string): this {
    const nameEl = document.createElement("div");
    nameEl.textContent = value;
    this.settingEl.appendChild(nameEl);
    return this;
  }

  setDesc(value: string): this {
    const descEl = document.createElement("div");
    descEl.textContent = value;
    this.settingEl.appendChild(descEl);
    return this;
  }

  addText(callback: (api: { setPlaceholder: (value: string) => typeof api; setValue: (value: string) => typeof api; onChange: (handler: (value: string) => void) => typeof api }) => void): this {
    const input = document.createElement("input");
    this.settingEl.appendChild(input);

    const api: {
      inputEl: HTMLInputElement;
      setPlaceholder: (value: string) => typeof api;
      setValue: (value: string) => typeof api;
      onChange: (handler: (value: string) => void) => typeof api;
    } = {
      inputEl: input,
      setPlaceholder(value: string) {
        input.placeholder = value;
        return api;
      },
      setValue(value: string) {
        input.value = value;
        return api;
      },
      onChange(handler: (value: string) => void) {
        input.addEventListener("input", () => handler(input.value));
        return api;
      },
    };

    callback(api);
    return this;
  }

  addDropdown(callback: (api: { addOption: (value: string, label: string) => typeof api; setValue: (value: string) => typeof api; onChange: (handler: (value: string) => void) => typeof api }) => void): this {
    const select = document.createElement("select");
    this.settingEl.appendChild(select);

    const api = {
      addOption(value: string, label: string) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
        return api;
      },
      setValue(value: string) {
        select.value = value;
        return api;
      },
      onChange(handler: (value: string) => void) {
        select.addEventListener("change", () => handler(select.value));
        return api;
      },
    };

    callback(api);
    return this;
  }

  addToggle(callback: (api: { setValue: (value: boolean) => typeof api; onChange: (handler: (value: boolean) => void) => typeof api }) => void): this {
    const input = document.createElement("input");
    input.type = "checkbox";
    this.settingEl.appendChild(input);

    const api = {
      setValue(value: boolean) {
        input.checked = value;
        return api;
      },
      onChange(handler: (value: boolean) => void) {
        input.addEventListener("change", () => handler(input.checked));
        return api;
      },
    };

    callback(api);
    return this;
  }

  addButton(callback: (api: { buttonEl: HTMLButtonElement; setButtonText: (value: string) => typeof api; onClick: (handler: () => void | Promise<void>) => typeof api }) => void): this {
    const button = document.createElement("button");
    this.settingEl.appendChild(button);

    const api = {
      buttonEl: button,
      setButtonText(value: string) {
        button.textContent = value;
        return api;
      },
      onClick(handler: () => void | Promise<void>) {
        button.addEventListener("click", () => void handler());
        return api;
      },
    };

    callback(api);
    return this;
  }
}

export function addIcon(): void {}

export async function requestUrl(): Promise<never> {
  throw new Error("requestUrl not mocked");
}
