// Desk: the /dev/writing and /dev/diary surfaces as an Obsidian plugin, so they
// run on the laptop and the phone with no server. Source lives here because the
// vault's .obsidian folder is gitignored; `pnpm obsidian:install` builds and
// copies it. Nothing here talks to the network: private notes stay in the vault.

import {
  ItemView,
  normalizePath,
  Plugin,
  PluginSettingTab,
  parseYaml,
  Setting,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DeskApp } from "./DeskApp";
import type { DeskIO } from "./deskStore";

const VIEW_TYPE = "desk-view";
const ICON = "layout-dashboard";
const DEVICE_KEY = "desk-device-id";

type Settings = { openOnStart: boolean };
const DEFAULTS: Settings = { openOnStart: true };

/** Per device on purpose: data.json syncs, and two devices sharing an id would share a log. */
function deviceId(): string {
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function vaultIO(plugin: DeskPlugin): DeskIO {
  const { vault } = plugin.app;
  return {
    markdownFiles: () => vault.getMarkdownFiles().map((file) => file.path),
    read: async (rel) => {
      const file = vault.getAbstractFileByPath(normalizePath(rel));
      if (!(file instanceof TFile)) throw new Error(`No file at ${rel}`);
      return vault.cachedRead(file);
    },
    listFolder: async (folder) => {
      if (!(await vault.adapter.exists(folder))) return [];
      return (await vault.adapter.list(folder)).files;
    },
    readJson: async <T>(rel: string, fallback: T) => {
      if (!(await vault.adapter.exists(rel))) return fallback;
      return JSON.parse(await vault.adapter.read(rel)) as T;
    },
    writeJson: async (rel, value) => {
      await vault.adapter.write(rel, `${JSON.stringify(value, undefined, 2)}\n`);
    },
    createNote: async (rel, content) => {
      const path = normalizePath(rel);
      if (await vault.adapter.exists(path)) return false;
      const folder = path.split("/").slice(0, -1).join("/");
      if (folder && !(await vault.adapter.exists(folder))) await vault.createFolder(folder);
      await vault.create(path, content);
      return true;
    },
    parseYaml,
    deviceId,
  };
}

class DeskView extends ItemView {
  private root: Root | null = null;
  private plugin: DeskPlugin;
  private version = 0;

  constructor(leaf: WorkspaceLeaf, plugin: DeskPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Desk";
  }

  getIcon() {
    return ICON;
  }

  async onOpen() {
    this.contentEl.addClass("desk-host");
    this.root = createRoot(this.contentEl);
    this.draw();
  }

  /** Called when notes change, so numbers follow the files while a tab stays open. */
  refresh() {
    this.version += 1;
    this.draw();
  }

  private draw() {
    this.root?.render(
      createElement(DeskApp, {
        io: this.plugin.io,
        version: this.version,
        openNote: (rel: string) => this.plugin.openNote(rel),
      }),
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}

export default class DeskPlugin extends Plugin {
  settings: Settings = DEFAULTS;
  io: DeskIO = vaultIO(this);
  private refreshTimer: number | undefined;

  async onload() {
    this.settings = { ...DEFAULTS, ...(await this.loadData()) };
    this.registerView(VIEW_TYPE, (leaf) => new DeskView(leaf, this));
    this.addRibbonIcon(ICON, "Open Desk", () => this.openDesk());
    this.addCommand({
      id: "open",
      name: "Open",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "D" }],
      callback: () => this.openDesk(),
    });
    this.addSettingTab(new DeskSettings(this));

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.openOnStart) void this.openDesk();
      // Registered only now: Obsidian fires a create event per file while loading a vault.
      const changed = () => this.scheduleRefresh();
      this.registerEvent(this.app.vault.on("modify", changed));
      this.registerEvent(this.app.vault.on("create", changed));
      this.registerEvent(this.app.vault.on("delete", changed));
      this.registerEvent(this.app.vault.on("rename", changed));
    });
  }

  onunload() {
    window.clearTimeout(this.refreshTimer);
  }

  private scheduleRefresh() {
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
        if (leaf.view instanceof DeskView) leaf.view.refresh();
      }
    }, 1500);
  }

  /** Brings an open Desk forward instead of stacking another tab. */
  async openDesk() {
    const { workspace } = this.app;
    const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
  }

  async openNote(rel: string) {
    const [path, heading] = rel.split("#");
    await this.app.workspace.openLinkText(heading ? `${path}#${heading}` : path, "", "tab");
  }
}

class DeskSettings extends PluginSettingTab {
  private plugin: DeskPlugin;

  constructor(plugin: DeskPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display() {
    this.containerEl.empty();
    new Setting(this.containerEl).setName("Open when Obsidian starts").addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.openOnStart).onChange(async (value) => {
        this.plugin.settings.openOnStart = value;
        await this.plugin.saveData(this.plugin.settings);
      }),
    );
  }
}
