"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NoteWorkspace
});
module.exports = __toCommonJS(main_exports);

// src/updater/host.ts
var import_obsidian = require("obsidian");

// src/updater/core.ts
var UPDATE_REPO = "alikhantonyfrancescoery1984-sys/todo-list-skill";
var UPDATE_FILES = ["main.js", "styles.css", "manifest.json"];
function versionCompare(a, b) {
  const parse2 = (s) => {
    if (!/^\d+\.\d+\.\d+$/.test(s)) throw new Error("\u7248\u672C\u683C\u5F0F\u9700\u8981 x.y.z\u3002");
    const n = s.split(".").map(Number);
    if (n.some((v) => !Number.isSafeInteger(v))) throw new Error("\u7248\u672C\u6570\u5B57\u8FC7\u5927\u3002");
    return n;
  };
  const x = parse2(a), y = parse2(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
var get = async (http2, url, max = 8e6) => {
  const r = await http2.get(url);
  if (r.status !== 200) throw new Error(r.status === 403 || r.status === 429 ? "GitHub\u8BF7\u6C42\u53D7\u9650\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" : "\u66F4\u65B0\u4E0B\u8F7D\u5931\u8D25\uFF0CHTTP " + r.status);
  if (new TextEncoder().encode(r.text).length > max) throw new Error("\u66F4\u65B0\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650\u3002");
  return r.text;
};
async function checkUpdate(http2, current) {
  const raw = await get(http2, "https://api.github.com/repos/" + UPDATE_REPO + "/releases/latest", 5e5), r = JSON.parse(raw);
  if (r.draft || r.prerelease) throw new Error("\u53EA\u652F\u6301\u6B63\u5F0F\u7248\u672C\u66F4\u65B0\u3002");
  const version2 = String(r.tag_name ?? "").replace(/^v/, "");
  if (versionCompare(version2, current) <= 0) return null;
  const urls = {};
  for (const name of [...UPDATE_FILES, "update.json"]) {
    const matches2 = Array.isArray(r.assets) ? r.assets.filter((a) => a.name === name) : [];
    if (matches2.length !== 1) throw new Error("\u8BE5\u7248\u672C\u7F3A\u5C11\u76F4\u63A5\u66F4\u65B0\u9644\u4EF6 " + name + "\uFF0C\u8BF7\u4F5C\u8005\u6267\u884C\u6587\u6863\u4E2D\u7684\u53D1\u5E03\u547D\u4EE4\u3002");
    const url = matches2[0].browser_download_url, prefix = "https://github.com/" + UPDATE_REPO + "/releases/download/" + encodeURIComponent(r.tag_name) + "/";
    if (url !== prefix + name) throw new Error("\u66F4\u65B0\u9644\u4EF6\u6765\u6E90\u4E0D\u7B26\u5408\u672C\u9879\u76EE\u4ED3\u5E93\u3002");
    urls[name] = url;
  }
  return { version: version2, urls, notes: typeof r.body === "string" ? r.body.slice(0, 4e3) : "" };
}
async function downloadUpdate(http2, release, hostVersion) {
  const meta = JSON.parse(await get(http2, release.urls["update.json"], 2e4));
  if (meta.version !== release.version || meta.pluginId !== "note-trajectory" || !meta.files) throw new Error("\u66F4\u65B0\u6821\u9A8C\u6E05\u5355\u4E0D\u5339\u914D\u3002");
  const bundle = {};
  for (const name of UPDATE_FILES) {
    const content = await get(http2, release.urls[name]);
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)))].map((v) => v.toString(16).padStart(2, "0")).join("");
    if (meta.files[name] !== hash) throw new Error("\u66F4\u65B0\u6587\u4EF6\u6821\u9A8C\u5931\u8D25\uFF1A" + name);
    bundle[name] = content;
  }
  const manifest = JSON.parse(bundle["manifest.json"]);
  if (manifest.id !== "note-trajectory" || manifest.version !== release.version || versionCompare(hostVersion, manifest.minAppVersion) < 0) throw new Error("\u63D2\u4EF6\u8EAB\u4EFD\u3001\u7248\u672C\u4E0D\u5339\u914D\u6216Obsidian\u7248\u672C\u8FC7\u4F4E\u3002");
  if (!bundle["main.js"].trim() || !bundle["styles.css"].trim()) throw new Error("\u66F4\u65B0\u7A0B\u5E8F\u6587\u4EF6\u4E3A\u7A7A\u3002");
  return bundle;
}
async function installUpdate(store, bundle, current) {
  const previous = {};
  for (const name of UPDATE_FILES) previous[name] = await store.read(name);
  if (JSON.parse(previous["manifest.json"]).version !== current) throw new Error("\u672C\u673A\u7A0B\u5E8F\u5DF2\u88AB\u5176\u5B83\u65B9\u5F0F\u66F4\u65B0\uFF0C\u8BF7\u5148\u91CD\u8F7D\u518D\u68C0\u67E5\u3002");
  const backup = await store.backup(previous);
  try {
    for (const name of UPDATE_FILES) await store.write(name, bundle[name]);
    for (const name of UPDATE_FILES) if (await store.read(name) !== bundle[name]) throw new Error("\u5199\u5165\u6838\u9A8C\u5931\u8D25\uFF1A" + name);
  } catch (error) {
    const failed = [];
    for (const name of UPDATE_FILES) try {
      await store.write(name, previous[name]);
    } catch {
      failed.push(name);
    }
    throw new Error("\u66F4\u65B0\u5931\u8D25\uFF1B" + (failed.length ? "\u90E8\u5206\u56DE\u6EDA\u5931\u8D25\uFF0C\u8BF7\u4ECE\u5907\u4EFD\u6062\u590D " + failed.join("\u3001") : "\u5DF2\u6062\u590D\u539F\u7A0B\u5E8F") + "\u3002\u5907\u4EFD\uFF1A" + backup + "\uFF1B" + String(error));
  }
  return backup;
}

// src/updater/host.ts
var http = { async get(url) {
  const r = await (0, import_obsidian.requestUrl)({ url, throw: false });
  return { status: r.status, text: r.text };
} };
function registerUpdateCommand(plugin, ready) {
  let busy = false;
  plugin.addCommand({ id: "check-plugin-update", name: "\u68C0\u67E5\u66F4\u65B0", callback: () => {
    if (busy) {
      new import_obsidian.Notice("\u6B63\u5728\u68C0\u67E5\u6216\u5B89\u88C5\u66F4\u65B0\u3002");
      return;
    }
    busy = true;
    void (async () => {
      try {
        const release = await checkUpdate(http, plugin.manifest.version);
        if (!release) {
          new import_obsidian.Notice("\u5F53\u524D\u5DF2\u662F\u6700\u65B0\u7248\u672C\u3002");
          return;
        }
        await new Promise((resolve) => {
          new UpdateModal(plugin.app, release, plugin.manifest.version, async () => {
            const bundle = await downloadUpdate(http, release, import_obsidian.apiVersion);
            await ready();
            const dir = plugin.manifest.dir;
            if (!dir || !(0, import_obsidian.normalizePath)(dir).endsWith("/note-trajectory")) throw new Error("\u63D2\u4EF6\u5B89\u88C5\u76EE\u5F55\u4E0D\u5339\u914D\u3002");
            const adapter = plugin.app.vault.adapter;
            await installUpdate({ read: (name) => adapter.read((0, import_obsidian.normalizePath)(dir + "/" + name)), write: (name, text) => adapter.write((0, import_obsidian.normalizePath)(dir + "/" + name), text), async backup(files) {
              const path = (0, import_obsidian.normalizePath)(dir + "/.update-backup/" + plugin.manifest.version + "-" + Date.now());
              await adapter.mkdir(path);
              for (const name of UPDATE_FILES) await adapter.write(path + "/" + name, files[name]);
              return path;
            } }, bundle, plugin.manifest.version);
            new import_obsidian.Notice("\u65B0\u7248\u7A0B\u5E8F\u5DF2\u5B89\u88C5\u3002\u8BF7\u5173\u95ED\u518D\u5F00\u542F\u201C\u5F85\u529E\u6E05\u5355\u201D\u63D2\u4EF6\u52A0\u8F7D\u65B0\u7248\uFF1B\u5F85\u529E\u6570\u636E\u4FDD\u7559\u3002", 15e3);
          }, resolve).open();
        });
      } catch (e) {
        new import_obsidian.Notice("\u68C0\u67E5\u66F4\u65B0\u5931\u8D25\uFF1A" + String(e), 1e4);
      } finally {
        busy = false;
      }
    })();
  } });
}
var UpdateModal = class extends import_obsidian.Modal {
  constructor(app, release, current, install, finish) {
    super(app);
    __publicField(this, "release", release);
    __publicField(this, "current", current);
    __publicField(this, "install", install);
    __publicField(this, "finish", finish);
    __publicField(this, "installing", false);
  }
  close() {
    if (!this.installing) super.close();
  }
  onOpen() {
    this.setTitle("\u5F85\u529E\u6E05\u5355\u53D1\u73B0\u65B0\u7248\u672C");
    this.contentEl.createEl("p", { text: this.current + " \u2192 " + this.release.version });
    this.contentEl.createEl("p", { text: this.release.notes || "\u4F5C\u8005\u672A\u63D0\u4F9B\u66F4\u65B0\u8BF4\u660E\u3002" });
    this.contentEl.createEl("p", { text: "\u786E\u8BA4\u540E\u4E0B\u8F7D\u6821\u9A8C\u7A0B\u5E8F\u3001\u5907\u4EFD\u5E76\u66F4\u65B0\u4E09\u4E2A\u63D2\u4EF6\u6587\u4EF6\uFF1B\u4E0D\u4F1A\u8986\u76D6data.json\u3002\u5B89\u88C5\u540E\u9700\u8981\u5173\u95ED\u518D\u5F00\u542F\u63D2\u4EF6\u3002" });
    const error = this.contentEl.createEl("p", { attr: { role: "alert" } }), actions = this.contentEl.createDiv({ cls: "modal-button-container" }), cancel = actions.createEl("button", { text: "\u6682\u4E0D\u66F4\u65B0" }), install = actions.createEl("button", { text: "\u786E\u8BA4\u66F4\u65B0", cls: "mod-cta" });
    cancel.onclick = () => this.close();
    install.onclick = () => {
      this.installing = true;
      cancel.disabled = install.disabled = true;
      install.textContent = "\u6B63\u5728\u66F4\u65B0\u2026";
      void this.install().then(() => {
        this.installing = false;
        this.close();
      }, (e) => {
        this.installing = false;
        error.textContent = String(e);
        cancel.disabled = install.disabled = false;
        install.textContent = "\u91CD\u8BD5\u66F4\u65B0";
      });
    };
  }
  onClose() {
    this.finish();
    this.contentEl.empty();
  }
};

// src/ui/html.ts
var escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// src/ui/workspace/group-editor.ts
function groupEditor(group) {
  return `<form class="task-editor-form group-editor-form"><label for="group-name">\u9879\u76EE\u540D\u79F0</label><input id="group-name" required maxlength="80" value="${escapeHtml(group?.name ?? "")}"><p class="editor-context">\u9879\u76EE\u7528\u4E8E\u7EC4\u7EC7\u4E00\u7EC4\u9700\u8981\u6301\u7EED\u63A8\u8FDB\u7684\u5F85\u529E\uFF0C\u4E0D\u6539\u53D8\u6A21\u5757\u5F52\u5C5E\u6216\u7B14\u8BB0\u6587\u4EF6\u5939\u3002${group ? "\u89E3\u6563\u9879\u76EE\u4F1A\u4FDD\u7559\u5176\u4E2D\u5168\u90E8\u5F85\u529E\u3002" : ""}</p><p class="editor-error" role="alert" hidden></p><div class="editor-actions">${group ? '<button type="button" class="delete-task" data-group-action="delete">\u89E3\u6563\u9879\u76EE</button>' : ""}<button type="button" data-group-action="cancel">\u53D6\u6D88</button><button type="submit" class="save-task">${group ? "\u4FDD\u5B58\u540D\u79F0" : "\u521B\u5EFA\u9879\u76EE"}</button></div></form>`;
}
function bindGroupEditor(root, c, group, close) {
  const events = new AbortController(), form = root.querySelector("form"), name = form.querySelector("#group-name"), error = form.querySelector(".editor-error");
  let busy = false;
  const run = async (fn) => {
    if (busy) return;
    busy = true;
    error.hidden = true;
    for (const b of form.querySelectorAll("button")) b.disabled = true;
    try {
      await fn();
      close();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
      error.hidden = false;
    } finally {
      busy = false;
      for (const b of form.querySelectorAll("button")) b.disabled = false;
    }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void run(() => group ? c.renameGroup(group.id, name.value) : c.createGroup(name.value));
  }, { signal: events.signal });
  form.querySelector("[data-group-action=cancel]")?.addEventListener("click", close, { signal: events.signal });
  form.querySelector("[data-group-action=delete]")?.addEventListener("click", () => {
    if (group) void run(() => c.removeGroup(group.id));
  }, { signal: events.signal });
  name.focus();
  return () => events.abort();
}

// src/core/model.ts
var DEFAULT_CONFIG = {
  timezone: "Asia/Shanghai",
  inbox: "\u6211\u505A\u4E86\u4EC0\u4E48",
  completed: "completed",
  fallback: "processing",
  cap: 5,
  checklistLimit: 10,
  ignore: ["kanban/", ".obsidian/", "templater/", ".trash/", "English/review/", "English/daily output/"],
  columnMap: { "AI learning/": "AI", "English/": "english", "\u8BFE\u7A0B/\u82F1\u8BED/": "english", "thai/": "thai", "spainish/": "thai", "lessons/google lesson assignment/": "google lesson assignment", "lessons/research/": "research", "lessons/": "\u8BFE\u7A0B" },
  protectedColumns: ["research"]
};
var emptyState = () => ({ schemaVersion: 3, notes: [], observations: [], receipts: [], completions: [], operations: [], successfulRuns: [], taskRegistry: [] });
function fingerprint(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}
var id = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;

// src/core/tasks.ts
var LEGACY_ID = /[ \t]*\^nt-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
var TASK_LINE = /^(\s*[-*+]\s+\[[ xX]\])\s*(.*)$/;
function stripTaskBlockIds(markdown) {
  const lines = markdown.split("\n");
  let fence = "", frontmatter = false, comment = false, changed = false;
  for (let line = 0; line < lines.length; line++) {
    const raw = lines[line], body = raw.replace(/\r$/, "");
    if (line === 0 && body.trim() === "---") {
      frontmatter = true;
      continue;
    }
    if (frontmatter) {
      if (body.trim() === "---") frontmatter = false;
      continue;
    }
    const marker = body.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      const m = marker[1];
      if (!fence) fence = m;
      else if (m[0] === fence[0] && m.length >= fence.length) fence = "";
      continue;
    }
    if (fence) continue;
    if (body.includes("%%")) {
      if ((body.match(/%%/g)?.length ?? 0) % 2) comment = !comment;
      continue;
    }
    if (body.includes("<!--")) {
      comment = !body.includes("-->");
      continue;
    }
    if (comment) {
      if (body.includes("-->")) comment = false;
      continue;
    }
    const match = body.match(TASK_LINE);
    if (!match) continue;
    const text = match[2].replace(LEGACY_ID, " ").replace(/[ \t]{2,}/g, " ").trim();
    const next = (text ? `${match[1]} ${text}` : match[1]) + (raw.endsWith("\r") ? "\r" : "");
    if (next !== raw) {
      lines[line] = next;
      changed = true;
    }
  }
  return changed ? lines.join("\n") : markdown;
}
function extractTasks(note, previous = []) {
  const found = [];
  let fence = "", frontmatter = false, comment = false;
  for (const [line, raw] of note.text.split(/\r?\n/).entries()) {
    if (line === 0 && raw.trim() === "---") {
      frontmatter = true;
      continue;
    }
    if (frontmatter) {
      if (raw.trim() === "---") frontmatter = false;
      continue;
    }
    const marker = raw.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      const m2 = marker[1];
      if (!fence) fence = m2;
      else if (m2[0] === fence[0] && m2.length >= fence.length) fence = "";
      continue;
    }
    if (fence) continue;
    if (raw.includes("%%")) {
      if ((raw.match(/%%/g)?.length ?? 0) % 2) comment = !comment;
      continue;
    }
    if (raw.includes("<!--")) {
      comment = !raw.includes("-->");
      continue;
    }
    if (comment) {
      if (raw.includes("-->")) comment = false;
      continue;
    }
    const m = raw.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (!m) continue;
    const body = m[2].replace(LEGACY_ID, "");
    const ending = body.match(/(?:^|\s)\^([a-zA-Z0-9-]+)\s*$/);
    const text = body.replace(/(?:^|\s)\^[a-zA-Z0-9-]+\s*$/, "").replace(/[ \t]{2,}/g, " ").trim();
    found.push({ text, line, done: m[1] !== " ", blockId: ending?.[1] });
  }
  const norm2 = (s) => s.trim().replace(/\s+/g, " ");
  const previousHere = previous.filter((t) => t.noteId === note.id);
  const seen = /* @__PURE__ */ new Map();
  return found.map((f) => {
    const text = norm2(f.text), occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    const same = previousHere.filter((t) => norm2(t.text) === text);
    const duplicate = found.filter((t) => norm2(t.text) === text).length > 1;
    const oldAtLine = previousHere.find((t) => t.line === f.line && !found.some((n) => norm2(n.text) === norm2(t.text)));
    const blockMatch = f.blockId ? previousHere.find((t) => t.blockId === f.blockId) : void 0;
    const generated = f.blockId ? `task-${fingerprint(note.id)}-b-${f.blockId}` : `task-${fingerprint(note.id)}-${fingerprint(text)}-${occurrence}`;
    const duplicateBlock = !!f.blockId && found.filter((t) => t.blockId === f.blockId).length > 1;
    return { ...f, noteId: note.id, id: blockMatch?.id ?? (!f.blockId && !duplicate && same.length === 1 ? same[0].id : generated), ambiguous: duplicateBlock || !f.blockId && (duplicate || !!oldAtLine) };
  });
}
function classify(path, columns, config) {
  const hit = Object.entries(config.columnMap).sort((a, b) => b[0].length - a[0].length).find(([prefix]) => path.startsWith(prefix));
  if (hit && columns.includes(hit[1])) return hit[1];
  const normalize = (s) => s.toLowerCase().replace(/[\s-]/g, "");
  for (const dir of path.split("/").slice(0, -1).reverse()) {
    const match = columns.find((c) => normalize(c) === normalize(dir));
    if (match) return match;
  }
  if (columns.includes(config.fallback)) return config.fallback;
  throw new Error("\u7F3A\u5C11\u76EE\u6807\u5217\u548C processing \u515C\u5E95\u5217\uFF0C\u8BF7\u786E\u8BA4\u770B\u677F\u7ED3\u6784\u3002");
}

// src/core/source-task-delete.ts
function deleteSourceTask(text, task) {
  const norm2 = (s) => s.trim().replace(/\s+/g, " "), all = extractTasks({ id: task.noteId, path: "", text, version: 0 });
  const matches2 = all.filter((t) => task.blockId ? t.blockId === task.blockId : norm2(t.text) === norm2(task.text));
  if (!matches2.length) return text;
  if (matches2.length > 1) throw new Error("\u539F\u7B14\u8BB0\u5B58\u5728\u591A\u4E2A\u76F8\u540C\u5F85\u529E\uFF0C\u8BF7\u5148\u4E3A\u4EFB\u52A1\u6DFB\u52A0\u552F\u4E00\u5757 ID\u3002");
  const lines = text.split("\n");
  lines.splice(matches2[0].line, 1);
  return lines.join("\n");
}

// src/core/source-task-complete.ts
var LEGACY_ID2 = /[ \t]*\^nt-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
var TASK = /(\s*[-*+]\s+)\[([ xX])\](.*)/;
var norm = (value) => value.trim().replace(/\s+/g, " ");
function parse(raw) {
  const match = raw.replace(/\r$/, "").match(TASK);
  return match ? { prefix: match[1], flag: match[2], body: match[3] } : void 0;
}
function lineMatches(raw, text) {
  const parsed = parse(raw);
  return !!parsed && norm(parsed.body.replace(LEGACY_ID2, "")) === norm(text);
}
function setSourceChecked(markdown, task, done) {
  const lines = markdown.split("\n");
  let index2 = -1;
  if (task.blockId) {
    const wanted = `^${task.blockId}`;
    index2 = lines.findIndex((line) => line.includes(wanted));
  }
  if (index2 < 0 && task.line >= 0 && task.line < lines.length && lineMatches(lines[task.line], task.text)) index2 = task.line;
  if (index2 < 0) {
    const hits = lines.map((line, i) => lineMatches(line, task.text) ? i : -1).filter((i) => i >= 0);
    if (hits.length === 1) index2 = hits[0];
    else if (hits.length > 1) throw new Error("\u8FD9\u7BC7\u7B14\u8BB0\u6709\u591A\u6761\u540C\u540D\u5F85\u529E\uFF0C\u65E0\u6CD5\u786E\u5B9A\u8981\u52FE\u54EA\u4E00\u884C");
  }
  if (index2 < 0) throw new Error("\u627E\u4E0D\u5230\u8FD9\u6761\u5F85\u529E\u5BF9\u5E94\u7684\u7B14\u8BB0\u884C\uFF0C\u8BF7\u5728\u7B14\u8BB0\u91CC\u624B\u52A8\u52FE\u9009");
  const raw = lines[index2], parsed = parse(raw);
  if (!parsed) throw new Error("\u627E\u4E0D\u5230\u8FD9\u6761\u5F85\u529E\u5BF9\u5E94\u7684\u7B14\u8BB0\u884C\uFF0C\u8BF7\u5728\u7B14\u8BB0\u91CC\u624B\u52A8\u52FE\u9009");
  const want = done ? "x" : " ";
  if (parsed.flag === want) return markdown;
  const cr = raw.endsWith("\r") ? "\r" : "";
  lines[index2] = `${parsed.prefix}[${want}]${parsed.body}${cr}`;
  return lines.join("\n");
}

// src/adapters/obsidian/block-ids.ts
var import_view = require("@codemirror/view");
var ID = /\s*\^nt-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
var hidden = import_view.Decoration.replace({});
function build(view) {
  const ranges = [];
  let lastLine = -1;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      pos = line.to + 1;
      if (line.from === lastLine) continue;
      lastLine = line.from;
      for (const match of line.text.matchAll(ID)) {
        const start = line.from + (match.index ?? 0);
        ranges.push(hidden.range(start, start + match[0].length));
      }
    }
  }
  return import_view.Decoration.set(ranges, true);
}
var hideTaskBlockIds = import_view.ViewPlugin.fromClass(class {
  constructor(view) {
    __publicField(this, "decorations");
    this.decorations = build(view);
  }
  update(update) {
    if (update.docChanged || update.viewportChanged) this.decorations = build(update.view);
  }
}, { decorations: (plugin) => plugin.decorations });

// src/application/editor-sync.ts
var EditorSync = class {
  constructor(edit, index2, schedule, cancel, delay = 250) {
    __publicField(this, "edit", edit);
    __publicField(this, "index", index2);
    __publicField(this, "schedule", schedule);
    __publicField(this, "cancel", cancel);
    __publicField(this, "delay", delay);
    __publicField(this, "pending", /* @__PURE__ */ new Map());
  }
  queue(file, text) {
    this.drop(file);
    const timer = this.schedule(() => this.flush(file), this.delay);
    this.pending.set(file, { timer, text });
  }
  indexed(file, text) {
    this.flush(file);
    this.index(file, text);
  }
  flush(file) {
    for (const [key, p] of this.pending) {
      if (file !== void 0 && file !== key) continue;
      this.pending.delete(key);
      this.cancel(p.timer);
      this.edit(key, p.text);
    }
  }
  drop(file) {
    const p = this.pending.get(file);
    if (p) this.cancel(p.timer);
    this.pending.delete(file);
  }
};

// src/core/planning.ts
var SHANGHAI_ZONE = "Asia/Shanghai";
function localDeadline(at) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: SHANGHAI_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at)).replace(" ", "T");
}
function parseDeadline(value) {
  if (!value) return void 0;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("\u8BF7\u9009\u62E9\u5B8C\u6574\u7684\u622A\u6B62\u65E5\u671F\u548C\u65F6\u95F4\u3002");
  const time = Date.parse(value + ":00+08:00");
  if (!Number.isFinite(time) || localDeadline(new Date(time).toISOString()) !== value) throw new Error("\u622A\u6B62\u65E5\u671F\u6216\u65F6\u95F4\u65E0\u6548\u3002");
  return new Date(time).toISOString();
}
function validReminder(v) {
  if (!v || typeof v !== "object") return false;
  const r = v;
  return ["days", "hours"].includes(r.unit) && typeof r.value === "number" && Number.isFinite(r.value) && r.value >= 0 && r.value <= 1e6;
}
function reminderAt(task) {
  if (!task.dueAt) return void 0;
  return Date.parse(task.dueAt) - (task.reminder ? task.reminder.value * (task.reminder.unit === "days" ? 864e5 : 36e5) : 0);
}
function deadlineState(task, now) {
  if (task.done) return "done";
  if (!task.dueAt) return "none";
  if (now >= Date.parse(task.dueAt)) return "overdue";
  if (task.reminder && now >= reminderAt(task)) return "warning";
  return "scheduled";
}
function orderByDeadline(tasks) {
  return tasks.map((task, index2) => ({ task, index: index2 })).sort((a, b) => {
    const d = (a.task.dueAt ? Date.parse(a.task.dueAt) : Infinity) - (b.task.dueAt ? Date.parse(b.task.dueAt) : Infinity);
    return Number.isNaN(d) || d === 0 ? a.index - b.index : d;
  }).map((v) => v.task);
}
function taskHorizon(task, now) {
  if (task.dueAt && Date.parse(task.dueAt) <= (/* @__PURE__ */ new Date(`${localDeadline(now.toISOString()).slice(0, 10)}T23:59:59+08:00`)).getTime()) return "today";
  return task.horizon ?? (task.dueAt ? "next" : "later");
}
function parseTags(text) {
  const tags = [];
  const body = text.replace(/(^|[\s，,；;])#([\p{L}\p{N}_/-]+)/gu, (_match, space, name) => {
    if (!tags.some((t) => tagKey(t) === tagKey(name))) tags.push(name);
    return space;
  }).replace(/[ \t]+/g, " ").trim();
  return { body, tags };
}
var tagKey = (name) => name.normalize("NFKC").toLowerCase().replace(/[\s_-]+/g, "");
function deadlineHint(task) {
  const lines = [];
  if (task.dueAt) {
    lines.push("\u622A\u6B62\u65F6\u95F4\uFF1A" + localDeadline(task.dueAt).replace("T", " ") + "\uFF08\u4E0A\u6D77\u65F6\u95F4\uFF09");
    if (task.reminder) lines.push("\u63D0\u9192\u65F6\u95F4\uFF1A" + localDeadline(new Date(reminderAt(task)).toISOString()).replace("T", " ") + " \xB7 \u63D0\u524D " + task.reminder.value + (task.reminder.unit === "days" ? " \u5929" : " \u5C0F\u65F6"));
  }
  return lines.join("\n");
}

// src/core/modules.ts
var INBOX_MODULE = "manual-inbox";
function moduleForPath(path, config = DEFAULT_CONFIG) {
  if (path === "\u624B\u52A8\u5F85\u529E") return "\u624B\u52A8\u5F85\u529E";
  return classify(path, [.../* @__PURE__ */ new Set([...Object.values(config.columnMap), config.fallback])], config);
}
var sourceModuleId = (name) => "source:" + tagKey(name);
function moduleCatalog(state, manuals = [], hidden2 = [], config = DEFAULT_CONFIG, sourceNames = {}) {
  const labels = [.../* @__PURE__ */ new Set([...Object.values(config.columnMap), config.fallback, ...state.notes.filter((n) => n.id !== "note-manual-tasks").map((n) => moduleForPath(n.path, config))])];
  const source = labels.map((original) => {
    const id2 = sourceModuleId(original);
    return { id: id2, name: sourceNames[id2] ?? original, kind: "source", hidden: hidden2.includes(id2), aliases: [] };
  });
  return [...source, ...manuals.filter((m) => !m.deletedAt).map((m) => ({ ...m, kind: "manual", hidden: false }))];
}
function moduleForTask(task, noteId, state, catalog, manuals = [], config = DEFAULT_CONFIG) {
  const override = task?.moduleIds?.[0];
  if (override) {
    const active = catalog.find((m) => m.id === override);
    if (active) return active;
  }
  if (task?.origin === "manual") {
    const key = task.moduleIds?.[0] ?? INBOX_MODULE, active = catalog.find((m) => m.id === key);
    if (active) return active;
    const removed = manuals.find((m) => m.id === key);
    if (removed) return { ...removed, kind: "manual", hidden: true };
    return { id: INBOX_MODULE, name: "\u624B\u52A8\u5F85\u529E", kind: "manual", hidden: false, aliases: [] };
  }
  const note = state.notes.find((n) => n.id === noteId), name = note ? moduleForPath(note.path, config) : "\u6765\u6E90\u4E0D\u53EF\u7528", source = catalog.find((m) => m.id === sourceModuleId(name));
  return source && !source.hidden ? source : catalog.find((m) => m.id === INBOX_MODULE) ?? { id: INBOX_MODULE, name: "\u624B\u52A8\u5F85\u529E", kind: "manual", hidden: false, aliases: [] };
}

// src/ui/workspace/module-editor.ts
function moduleEditor(c, module2) {
  const count = module2 ? c.moduleTaskCount(module2.id) : 0;
  const removable = !!module2 && module2.id !== INBOX_MODULE;
  const deleteHint = removable ? "" : "\u300C\u624B\u52A8\u5F85\u529E\u300D\u662F\u672A\u5206\u7C7B\u6536\u4EF6\u7BB1\uFF0C\u4E0D\u80FD\u5220\u9664\u3002";
  return `<form class="task-editor-form module-editor-form"><label for="module-name">\u6A21\u5757\u540D\u79F0</label><input id="module-name" maxlength="80" required value="${escapeHtml(module2?.name ?? "")}"><p class="editor-context">\u6A21\u5757\u662F\u9879\u76EE\u548C\u4EFB\u52A1\u7684\u6700\u9AD8\u7EA7\u5206\u7EC4\uFF1B\u6765\u6E90\u6587\u4EF6\u5939\u63D0\u4F9B\u9ED8\u8BA4\u6A21\u5757\uFF0C\u62D6\u52A8\u53EA\u6539\u53D8\u63D2\u4EF6\u5185\u5206\u7C7B\u3002</p>${module2 ? '<button type="button" class="module-view-tasks" data-module-action="view">\u67E5\u770B\u6B64\u6A21\u5757\u5F85\u529E</button>' : ""}${deleteHint ? `<p class="editor-context">${deleteHint}</p>` : ""}<p class="editor-error" role="alert" hidden></p>${removable ? `<div class="module-delete-confirm" hidden><p>\u5220\u9664\u6A21\u5757\u540E\uFF0C\u5176\u4E2D ${count} \u6761\u4EFB\u52A1\u5C06\u8F6C\u5165\u672A\u5206\u7C7B\uFF0C\u6765\u6E90\u7B14\u8BB0\u4E0D\u4F1A\u79FB\u52A8\u6216\u5220\u9664\u3002</p><button type="button" class="delete-task" data-module-action="confirm-delete">\u786E\u8BA4\u5220\u9664\u6A21\u5757</button></div>` : ""}<div class="editor-actions">${removable ? '<button type="button" class="delete-task" data-module-action="delete">\u5220\u9664\u6A21\u5757</button>' : ""}<button type="button" data-module-action="cancel">\u53D6\u6D88</button><button type="submit" class="save-task">${module2 ? "\u4FDD\u5B58\u540D\u79F0" : "\u521B\u5EFA\u6A21\u5757"}</button></div></form>`;
}
function bindModuleEditor(root, c, module2, close, view, removed) {
  const events = new AbortController(), form = root.querySelector("form"), error = form.querySelector(".editor-error");
  let busy = false;
  const run = async (fn) => {
    if (busy) return;
    busy = true;
    for (const b of form.querySelectorAll("button")) b.disabled = true;
    error.hidden = true;
    try {
      await fn();
      close();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
      error.hidden = false;
    } finally {
      busy = false;
      for (const b of form.querySelectorAll("button")) b.disabled = false;
    }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void run(async () => {
      const name = form.querySelector("#module-name").value;
      if (module2) await c.renameModule(module2.id, name);
      else await c.createModule(name);
    });
  }, { signal: events.signal });
  form.addEventListener("click", (e) => {
    const action = e.target.closest("[data-module-action]")?.dataset.moduleAction;
    if (action === "cancel") close();
    if (action === "view" && module2) {
      view(module2.id);
      close();
    }
    if (action === "delete") {
      form.querySelector(".module-delete-confirm").hidden = false;
      form.querySelector("[data-module-action=confirm-delete]").focus();
    }
    if (action === "confirm-delete" && module2) void run(async () => {
      await c.removeModule(module2.id);
      removed(module2.id);
    });
  }, { signal: events.signal });
  form.querySelector("#module-name")?.focus();
  return () => events.abort();
}

// src/ui/workspace/hints.ts
var displayTaskName = (task) => task.origin === "manual" && task.moduleIds?.length ? parseTags(task.text).body || task.text : task.label ?? task.text;
function paintDeadlines(root, c) {
  for (const row of root.querySelectorAll("[data-task-item]")) {
    const task = c.tasks.find((t) => t.id === row.dataset.taskItem);
    if (!task) continue;
    const state = deadlineState(task, c.now().getTime());
    row.dataset.deadlineState = state;
    row.classList.toggle("deadline-warning", state === "warning" || state === "overdue");
  }
}
function bindTaskHints(root, c) {
  const doc = root.ownerDocument, win = doc.defaultView, events = new AbortController();
  let hint, target;
  const hide = () => {
    hint?.remove();
    hint = void 0;
    target = void 0;
  };
  const show = (button) => {
    const task = c.tasks.find((t) => t.id === button.dataset.task);
    hide();
    if (!task?.dueAt) return;
    target = button;
    hint = doc.createElement("div");
    hint.className = "task-deadline-tooltip";
    hint.setAttribute("role", "tooltip");
    hint.textContent = deadlineHint(task);
    doc.body.append(hint);
    const box = button.getBoundingClientRect();
    hint.style.maxWidth = Math.max(120, Math.min(420, win.innerWidth - 24)) + "px";
    const rect = hint.getBoundingClientRect(), left = Math.max(12, Math.min(win.innerWidth - rect.width - 12, box.left + box.width / 2 - rect.width / 2));
    hint.style.left = left + "px";
    hint.style.top = (box.top - rect.height - 10 >= 12 ? box.top - rect.height - 10 : Math.min(win.innerHeight - rect.height - 12, box.bottom + 10)) + "px";
  };
  root.addEventListener("pointerover", (e) => {
    if (!win.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    const button = e.target.closest(".task-title-button");
    if (button && button !== target) show(button);
  }, { signal: events.signal });
  root.addEventListener("pointerout", (e) => {
    if (target && !target.contains(e.relatedTarget)) hide();
  }, { signal: events.signal });
  root.addEventListener("focusin", (e) => {
    const button = e.target.closest(".task-title-button");
    if (button) show(button);
  }, { signal: events.signal });
  root.addEventListener("focusout", hide, { signal: events.signal });
  root.addEventListener("scroll", hide, { signal: events.signal, capture: true });
  win.addEventListener("resize", hide, { signal: events.signal });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  }, { signal: events.signal });
  return { hide, dispose: () => {
    events.abort();
    hide();
  } };
}

// src/ui/workspace/deadline-input.ts
function deadlineParts(at) {
  if (!at) return { date: "", period: "am", hour: "9", minute: "00" };
  const local = localDeadline(at), hour = Number(local.slice(11, 13));
  return { date: local.slice(0, 10), period: hour >= 12 ? "pm" : "am", hour: String(hour % 12 || 12), minute: local.slice(14, 16) };
}
function deadlineValue(date, period, hour, minute) {
  if (!date) return "";
  if (!["am", "pm"].includes(period) || !/^([1-9]|1[0-2])$/.test(hour) || !/^([0-5][0-9])$/.test(minute)) throw new Error("\u8BF7\u9009\u62E9\u4E0A\u5348\u6216\u4E0B\u5348\uFF0C\u4EE5\u53CA\u5B8C\u6574\u7684\u65F6\u3001\u5206\u3002");
  const value = `${date}T${String(Number(hour) % 12 + (period === "pm" ? 12 : 0)).padStart(2, "0")}:${minute}`;
  parseDeadline(value);
  return value;
}
function deadlineInput(at) {
  const p = deadlineParts(at), options = (values, selected) => values.map((v) => `<option value="${v}" ${v === selected ? "selected" : ""}>${v.padStart(2, "0")}</option>`).join("");
  return `<label for="task-deadline-date">\u622A\u6B62\u65E5\u671F \xB7 \u4E0A\u6D77\u65F6\u95F4</label><input id="task-deadline-date" type="date" value="${escapeHtml(p.date)}"><div class="deadline-time-fields"><label for="task-deadline-period">\u65F6\u6BB5<select id="task-deadline-period"><option value="am" ${p.period === "am" ? "selected" : ""}>\u4E0A\u5348</option><option value="pm" ${p.period === "pm" ? "selected" : ""}>\u4E0B\u5348</option></select></label><label for="task-deadline-hour">\u65F6<select id="task-deadline-hour">${options(Array.from({ length: 12 }, (_, i) => String(i + 1)), p.hour)}</select></label><label for="task-deadline-minute">\u5206<select id="task-deadline-minute">${options(Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), p.minute)}</select></label></div>`;
}

// src/ui/workspace/editor.ts
var taskLabel = (task) => task.label ?? task.text;
function taskEditor(task, c) {
  return `<form class="task-editor-form"><label for="task-name">\u5F85\u529E\u540D\u79F0${!task || task.origin === "manual" ? " \xB7 \u652F\u6301 #\u6807\u7B7E" : ""}</label><textarea id="task-name" name="task-name" rows="3" maxlength="2000" required>${task ? escapeHtml(taskLabel(task)) : ""}</textarea>${!task || task.origin === "manual" ? '<div class="tag-preview" aria-live="polite"></div><p class="editor-context">\u6807\u7B7E\u53EA\u7528\u4E8E\u6A21\u5757\u5B8C\u6210\u5EA6\u7EDF\u8BA1\u3002</p>' : '<p class="editor-context">\u5728\u6E05\u5355\u4E2D\u4FDD\u5B58\u540D\u79F0\u4E0E\u65F6\u95F4\uFF0C\u7B14\u8BB0\u6765\u6E90\u4FDD\u6301\u4E0D\u53D8\u3002</p>'}<div class="task-group-field"><label for="task-group">\u6240\u5C5E\u9879\u76EE</label><select id="task-group"><option value="">\u4E0D\u5C5E\u4E8E\u9879\u76EE</option>${(c?.groups ?? []).map((g) => `<option value="${escapeHtml(g.id)}" ${task?.groupId === g.id ? "selected" : ""}>${escapeHtml(g.name)}</option>`).join("")}<option value="__new">\u521B\u5EFA\u65B0\u9879\u76EE\u2026</option></select><div id="task-new-group-field" hidden><label for="task-new-group">\u65B0\u9879\u76EE\u540D\u79F0</label><input id="task-new-group" maxlength="80"></div></div><div class="planning-fields"><div class="deadline-field">${deadlineInput(task?.dueAt)}<button type="button" class="deadline-clear" data-editor="clear-deadline">\u6E05\u7A7A\u622A\u6B62\u65F6\u95F4</button></div><label class="reminder-enable"><input id="task-reminder-enabled" type="checkbox" aria-describedby="task-reminder-hint" ${task?.reminder ? "checked" : ""}>\u63D0\u524D\u63D0\u9192</label><p id="task-reminder-hint" class="editor-context" aria-live="polite" hidden>\u5DF2\u542F\u7528\u63D0\u524D\u63D0\u9192\uFF0C\u8BF7\u9009\u62E9\u622A\u6B62\u65E5\u671F\u540E\u4FDD\u5B58\u3002</p><div class="reminder-fields"><label for="task-reminder-value">\u63D0\u524D\u91CF<input id="task-reminder-value" type="number" min="0" max="1000000" step="any" value="${task?.reminder?.value ?? 1}"></label><label for="task-reminder-unit">\u5355\u4F4D<select id="task-reminder-unit"><option value="hours" ${task?.reminder?.unit === "hours" ? "selected" : ""}>\u5C0F\u65F6</option><option value="days" ${task?.reminder?.unit === "days" ? "selected" : ""}>\u5929</option></select></label></div><p class="editor-context">\u5230\u63D0\u9192\u65F6\u95F4\u540E\u540D\u79F0\u53D8\u7EA2\uFF1B\u622A\u6B62\u5DF2\u8FC7\u5219\u4FDD\u6301\u7EA2\u8272\uFF0C\u5B8C\u6210\u540E\u53D6\u6D88\u3002</p></div><p class="editor-error" role="alert" hidden></p><div class="editor-actions">${task ? '<button type="button" class="delete-task" data-editor="delete">\u5220\u9664\u5F85\u529E</button>' : ""}<button type="button" data-editor="cancel">\u53D6\u6D88</button><button type="submit" class="save-task">${task ? "\u4FDD\u5B58\u4FEE\u6539" : "\u521B\u5EFA\u5F85\u529E"}</button></div></form>`;
}
function bindTaskEditor(root, c, task, close, onDeleted) {
  const events = new AbortController(), form = root.querySelector("form"), input = form.querySelector("#task-name"), error = form.querySelector(".editor-error"), deadline = form.querySelector("#task-deadline-date"), period = form.querySelector("#task-deadline-period"), hour = form.querySelector("#task-deadline-hour"), minute = form.querySelector("#task-deadline-minute"), enabled = form.querySelector("#task-reminder-enabled"), amount = form.querySelector("#task-reminder-value"), unit = form.querySelector("#task-reminder-unit");
  if (!task && !deadline.value) deadline.value = localDeadline(c.now().toISOString()).slice(0, 10);
  const group = form.querySelector("#task-group"), newGroup = form.querySelector("#task-new-group"), groupField = form.querySelector("#task-new-group-field");
  const moduleLabel = document.createElement("label"), moduleSelect = document.createElement("select");
  moduleLabel.htmlFor = "task-module";
  moduleLabel.append("\u6240\u5C5E\u6A21\u5757");
  moduleSelect.id = "task-module";
  for (const module2 of c.modules.filter((m) => !m.hidden)) {
    const option2 = document.createElement("option");
    option2.value = module2.id;
    option2.textContent = module2.name;
    if (task && c.taskModule(task).id === module2.id) option2.selected = true;
    moduleSelect.append(option2);
  }
  moduleLabel.append(moduleSelect);
  form.querySelector(".task-group-field").before(moduleLabel);
  const syncGroup = () => {
    groupField.hidden = group.value !== "__new";
    newGroup.required = !groupField.hidden;
  };
  group.addEventListener("change", syncGroup, { signal: events.signal });
  syncGroup();
  const draftId = id("task-manual");
  let busy = false;
  const hint = form.querySelector("#task-reminder-hint");
  const sync = () => {
    enabled.disabled = false;
    deadline.required = enabled.checked;
    hint.hidden = !enabled.checked || !!deadline.value;
    amount.disabled = unit.disabled = !enabled.checked;
    amount.required = enabled.checked;
  };
  const tags = () => {
    const holder = form.querySelector(".tag-preview");
    if (holder) holder.innerHTML = c.previewTags(input.value).map(({ tag, module: module2 }, i) => `<span class="tag-preview-chip" data-tag-state="${module2 ? "existing" : "new"}">#${escapeHtml(module2?.name ?? tag)}${i === 0 ? " \xB7 \u4E3B\u6A21\u5757" : ""}${module2 ? "" : " \xB7 \u65B0\u5EFA"}</span>`).join("");
  };
  const run = async (work) => {
    if (busy) return;
    busy = true;
    error.hidden = true;
    form.setAttribute("aria-busy", "true");
    for (const b of form.querySelectorAll("button")) b.disabled = true;
    try {
      await work();
      close();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
      error.hidden = false;
      if (enabled.checked && !deadline.value) deadline.focus();
      else input.focus();
    } finally {
      busy = false;
      form.removeAttribute("aria-busy");
      for (const b of form.querySelectorAll("button")) b.disabled = false;
    }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void run(() => {
      const value = deadlineValue(deadline.value, period.value, hour.value, minute.value);
      const dueAt = task?.dueAt && localDeadline(task.dueAt) === value ? task.dueAt : parseDeadline(value);
      if (enabled.checked && !dueAt) throw new Error("\u8BF7\u5148\u9009\u62E9\u622A\u6B62\u65E5\u671F\u540E\u518D\u4FDD\u5B58\u63D0\u524D\u63D0\u9192\u3002");
      const options = { ...group.value === "__new" ? { newGroupName: newGroup.value, groupId: null } : { groupId: group.value || null }, moduleId: moduleSelect.value, ...!task ? { horizon: "today" } : {}, dueAt: dueAt ?? null, reminder: dueAt && enabled.checked ? { value: Number(amount.value), unit: unit.value } : null };
      return task ? c.updateTask(task.id, input.value, options) : c.createTask(input.value, draftId, options);
    });
  }, { signal: events.signal });
  input.addEventListener("input", tags, { signal: events.signal });
  deadline.addEventListener("input", sync, { signal: events.signal });
  deadline.addEventListener("change", sync, { signal: events.signal });
  enabled.addEventListener("change", sync, { signal: events.signal });
  form.querySelector("[data-editor=clear-deadline]")?.addEventListener("click", () => {
    const p = deadlineParts();
    deadline.value = "";
    enabled.checked = false;
    period.value = p.period;
    hour.value = p.hour;
    minute.value = p.minute;
    sync();
  }, { signal: events.signal });
  form.querySelector("[data-editor=cancel]")?.addEventListener("click", close, { signal: events.signal });
  form.querySelector("[data-editor=delete]")?.addEventListener("click", () => {
    if (task) void run(async () => {
      await c.removeTask(task.id);
      onDeleted(task.id);
    });
  }, { signal: events.signal });
  sync();
  tags();
  input.focus();
  input.select();
  return () => events.abort();
}
function taskClick(target) {
  if (target.closest("button,a,input,summary,textarea,label,details,select")) return;
  if (!target.closest("[data-task-surface]")) return;
  const item = target.closest("[data-task-item]");
  return item ? { action: "edit-task", id: item.dataset.taskItem } : { action: "new-task" };
}

// src/main.ts
var import_obsidian2 = require("obsidian");

// src/core/task-groups.ts
var groupNameKey = (name) => name.trim().normalize("NFKC").toLowerCase();
function folderCandidates(tasks, notes) {
  const counts = /* @__PURE__ */ new Map();
  for (const t of tasks) if (!t.deletedAt) counts.set(t.noteId, (counts.get(t.noteId) ?? 0) + 1);
  const result = /* @__PURE__ */ new Map();
  for (const t of tasks) {
    if (t.deletedAt || t.done || t.dueAt || t.groupId || t.groupExcluded || t.origin === "manual" || (counts.get(t.noteId) ?? 0) > 5) continue;
    const folder = notes.find((n) => n.id === t.noteId)?.path.split("/").slice(0, -1).join("/");
    if (!folder) continue;
    const list = result.get(folder) ?? [];
    list.push(t);
    result.set(folder, list);
  }
  return result;
}

// src/core/scheduler.ts
function localDate(at) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

// src/core/task-revisions.ts
function extractTaskRevision(note, previous, previousText) {
  if (previousText === note.text) return previous.map((t) => ({ ...t }));
  const next = extractTasks(note, previous);
  if (previousText === void 0) return next;
  const before = previousText.split(/\r?\n/), after = note.text.split(/\r?\n/);
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length, newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const oldChanged = previous.filter((t) => t.line >= start && t.line < oldEnd);
  for (const old of oldChanged) {
    const line = old.line;
    if (!old.blockId && line < newEnd && /^\s*[-*+]\s+\[[ xX]\]\s*$/.test(after[line] ?? "")) {
      next.push({ ...old, text: "", line });
    }
  }
  const newChanged = next.filter((t) => t.line >= start && t.line < newEnd);
  const existingIds = new Set(previous.map((t) => t.id)), used = new Set(next.filter((t) => existingIds.has(t.id)).map((t) => t.id));
  const norm2 = (s) => s.trim().replace(/\s+/g, " ");
  for (const candidate of newChanged) {
    if (existingIds.has(candidate.id) || candidate.blockId) continue;
    const old = oldEnd - start === newEnd - start ? oldChanged.find((t) => t.line === candidate.line) : oldChanged.length === 1 && newChanged.length === 1 ? oldChanged[0] : void 0;
    if (!old || old.blockId || used.has(old.id)) continue;
    if (previous.filter((t) => norm2(t.text) === norm2(old.text)).length !== 1 || next.filter((t) => norm2(t.text) === norm2(candidate.text)).length !== 1) continue;
    candidate.id = old.id;
    candidate.ambiguous = old.ambiguous;
    used.add(old.id);
  }
  return next.sort((a, b) => a.line - b.line);
}

// src/core/observations.ts
function observeNote(state, noteId, date) {
  if (!state.observations.some((o) => o.noteId === noteId && o.date === date)) state.observations.push({ noteId, date });
}

// src/application/workspace.ts
var emptyWorkspace = () => ({ schemaVersion: 7, taskGroups: [], groupDecisions: {}, manualModules: [], hiddenModules: [], sourceModuleNames: {}, state: emptyState(), tasks: [], decisions: {}, deletedNotes: [] });
var validDate = (s) => typeof s === "string" && Number.isFinite(Date.parse(s));
var object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function validateWorkspace(raw) {
  if (!object(raw) || (typeof raw.schemaVersion !== "number" || ![2, 3, 4, 5, 6, 7].includes(raw.schemaVersion)) || !object(raw.state) || raw.state.schemaVersion !== (raw.schemaVersion === 2 ? 1 : raw.schemaVersion === 7 ? 3 : 2) || !Array.isArray(raw.tasks) || !object(raw.decisions) || !Array.isArray(raw.deletedNotes)) throw new Error("\u4EFB\u52A1\u6570\u636E\u683C\u5F0F\u4E0D\u53D7\u652F\u6301\uFF1B\u539F\u6570\u636E\u672A\u8986\u76D6\u3002");
  const s = raw.state;
  if (Array.isArray(raw.manualModules)) {
    const unique = /* @__PURE__ */ new Map();
    for (const m of raw.manualModules) {
      if (!object(m) || typeof m.id !== "string") continue;
      const prev = unique.get(m.id);
      if (!prev || object(prev) && prev.deletedAt && !m.deletedAt) unique.set(m.id, m);
    }
    if (unique.size !== raw.manualModules.length) raw.manualModules = [...unique.values()];
  }
  if (raw.schemaVersion !== 2 && "activities" in s) throw new Error("\u5F53\u524D\u4EFB\u52A1\u683C\u5F0F\u4E0D\u63A5\u53D7\u5DF2\u79FB\u9664\u7684\u8282\u70B9\u6570\u636E\u3002");
  for (const k of ["notes", raw.schemaVersion === 2 ? "activities" : "observations", "receipts", "completions", "operations", "successfulRuns", "taskRegistry"]) if (!Array.isArray(s[k])) throw new Error("\u4EFB\u52A1\u6570\u636E\u4E0D\u5B8C\u6574\uFF1B\u539F\u6570\u636E\u672A\u8986\u76D6\u3002");
  const notes = s.notes, ids = /* @__PURE__ */ new Set(), paths = /* @__PURE__ */ new Set();
  for (const n of notes) {
    if (!object(n) || typeof n.id !== "string" || typeof n.path !== "string" || typeof n.text !== "string" || !Number.isInteger(n.version) || ids.has(n.id)) throw new Error("\u7B14\u8BB0\u8EAB\u4EFD\u6570\u636E\u635F\u574F\u3002");
    ids.add(n.id);
    paths.add(n.path);
  }
  const taskIds = /* @__PURE__ */ new Set();
  for (const t of raw.tasks) {
    if (!object(t) || typeof t.id !== "string" || typeof t.noteId !== "string" || !ids.has(t.noteId) || typeof t.text !== "string" || typeof t.done !== "boolean" || typeof t.ambiguous !== "boolean" || !Number.isInteger(t.line) || Number(t.line) < 0 || !validDate(t.collectedAt) || taskIds.has(t.id) || t.completedAt !== void 0 && !validDate(t.completedAt) || t.deletedAt !== void 0 && !validDate(t.deletedAt) || t.origin !== void 0 && t.origin !== "manual" || t.dueAt !== void 0 && (!validDate(t.dueAt) || !/[Tt].*(?:Z|[+-]\d{2}:\d{2})$/.test(String(t.dueAt))) || t.reminder !== void 0 && (!t.dueAt || !validReminder(t.reminder)) || t.horizon !== void 0 && !["today", "next", "later"].includes(String(t.horizon)) || t.moduleIds !== void 0 && (!Array.isArray(t.moduleIds) || t.moduleIds.some((k) => typeof k !== "string") || new Set(t.moduleIds).size !== t.moduleIds.length) || t.label !== void 0 && (typeof t.label !== "string" || !t.label.trim() || t.label.length > 2e3)) throw new Error("\u4EFB\u52A1\u6761\u76EE\u635F\u574F\u3002");
    taskIds.add(t.id);
  }
  if (raw.schemaVersion === 2) {
    for (const a of s.activities) if (!object(a) || typeof a.id !== "string" || typeof a.noteId !== "string" || !ids.has(a.noteId) || !validDate(a.at) || !["user", "external"].includes(String(a.source)) || !["visit", "edit"].includes(String(a.kind))) throw new Error("\u65E7\u6D3B\u52A8\u8BB0\u5F55\u635F\u574F\u3002");
  } else {
    const seen = /* @__PURE__ */ new Set();
    for (const o of s.observations) {
      if (!object(o) || typeof o.noteId !== "string" || !ids.has(o.noteId) || typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date) || !validDate(o.date) || seen.has(o.noteId + "@" + o.date)) throw new Error("\u7B14\u8BB0\u7EDF\u8BA1\u8BB0\u5F55\u635F\u574F\u3002");
      seen.add(o.noteId + "@" + o.date);
    }
  }
  s.receipts = s.receipts.filter((r) => {
    if (!object(r) || !validDate(r.at) || !Array.isArray(r.taskIds) || r.taskIds.some((t) => typeof t !== "string")) throw new Error("\u6536\u5F55\u8BB0\u5F55\u635F\u574F\u3002");
    r.taskIds = r.taskIds.filter((taskId) => taskIds.has(taskId));
    return r.taskIds.length > 0;
  });
  s.completions = s.completions.filter((c) => {
    if (!object(c) || typeof c.taskId !== "string" || !validDate(c.at)) throw new Error("\u5B8C\u6210\u8BB0\u5F55\u635F\u574F\u3002");
    return taskIds.has(c.taskId);
  });
  for (const [key, value] of Object.entries(raw.decisions)) if (!ids.has(key) || !["allow", "skip"].includes(String(value))) throw new Error("\u5BFC\u5165\u9009\u62E9\u635F\u574F\u3002");
  if (raw.deletedNotes.some((n) => typeof n !== "string" || !ids.has(n))) throw new Error("\u6765\u6E90\u72B6\u6001\u635F\u574F\u3002");
  const result = structuredClone(raw);
  if (!object(result.sourceModuleNames)) result.sourceModuleNames = {};
  if (raw.schemaVersion === 2) {
    const state = result.state, seen = /* @__PURE__ */ new Set();
    state.observations = s.activities.filter((a) => a.source === "user").flatMap((a) => {
      const date = localDate(a.at), key = a.noteId + "@" + date;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ noteId: a.noteId, date }];
    });
    delete state.activities;
    state.schemaVersion = 2;
    result.schemaVersion = 3;
  }
  if (raw.schemaVersion >= 5) {
    if (!Array.isArray(raw.manualModules) || !Array.isArray(raw.hiddenModules)) throw new Error("\u6A21\u5757\u6570\u636E\u4E0D\u5B8C\u6574\u3002");
    const moduleIds = /* @__PURE__ */ new Set(), names = /* @__PURE__ */ new Map();
    for (const m of raw.manualModules) {
      if (!object(m) || typeof m.id !== "string" || typeof m.name !== "string" || !m.name.trim() || m.name.length > 80 || !Array.isArray(m.aliases) || m.aliases.some((a) => typeof a !== "string" || !tagKey(a) || a.length > 80) || !validDate(m.createdAt) || m.deletedAt !== void 0 && !validDate(m.deletedAt) || (!m.id.trim() || moduleIds.has(m.id))) throw new Error("\u6A21\u5757\u6570\u636E\u635F\u574F\u3002");
      if (m.id.startsWith("source:") || !tagKey(m.name)) throw new Error("\u6A21\u5757\u8EAB\u4EFD\u6216\u540D\u79F0\u635F\u574F\u3002");
      moduleIds.add(m.id);
      if (!m.deletedAt) {
        for (const name of [m.name, ...m.aliases]) {
          const key = tagKey(name);
          if (names.has(key) && names.get(key) !== m.id) throw new Error("\u6A21\u5757\u540D\u79F0\u51B2\u7A81\u3002");
          names.set(key, m.id);
        }
      }
    }
    if (raw.hiddenModules.some((k) => typeof k !== "string" || !k.startsWith("source:")) || new Set(raw.hiddenModules).size !== raw.hiddenModules.length) throw new Error("\u6A21\u5757\u663E\u793A\u72B6\u6001\u635F\u574F\u3002");
    const catalog = moduleCatalog(result.state, raw.manualModules, raw.hiddenModules), known = /* @__PURE__ */ new Set([...catalog.map((m) => m.id), ...moduleIds, INBOX_MODULE]);
    for (const source of catalog.filter((m) => m.kind === "source")) if (names.has(tagKey(source.name))) throw new Error("\u624B\u52A8\u6A21\u5757\u4E0E\u7B14\u8BB0\u6A21\u5757\u540D\u79F0\u51B2\u7A81\u3002");
    if (raw.tasks.some((t) => t.moduleIds?.some((k) => !known.has(k)))) throw new Error("\u4EFB\u52A1\u6A21\u5757\u5F15\u7528\u635F\u574F\u3002");
  } else {
    result.manualModules = [];
    result.hiddenModules = [];
    const manual = raw.tasks.filter((t) => t.origin === "manual");
    if (manual.length) result.manualModules.push({ id: INBOX_MODULE, name: "\u624B\u52A8\u5F85\u529E", aliases: [], createdAt: String(manual[0].collectedAt) });
  }
  if (raw.schemaVersion >= 6) {
    if (!Array.isArray(raw.taskGroups) || !object(raw.groupDecisions)) throw new Error("\u5F85\u529E\u5206\u7EC4\u6570\u636E\u4E0D\u5B8C\u6574\u3002");
    const ids2 = /* @__PURE__ */ new Set(), names = /* @__PURE__ */ new Set();
    for (const g of raw.taskGroups) {
      if (!object(g) || typeof g.id !== "string" || !g.id || ids2.has(g.id) || typeof g.name !== "string" || !g.name.trim() || g.name.length > 80 || !validDate(g.createdAt) || g.folder !== void 0 && (typeof g.folder !== "string" || !g.folder) || g.deletedAt !== void 0 && !validDate(g.deletedAt)) throw new Error("\u5F85\u529E\u5206\u7EC4\u6570\u636E\u635F\u574F\u3002");
      ids2.add(g.id);
      if (!g.deletedAt) {
        const name = groupNameKey(g.name);
        if (names.has(name)) throw new Error("\u5F85\u529E\u5206\u7EC4\u540D\u79F0\u91CD\u590D\u3002");
        names.add(name);
      }
    }
    for (const value of Object.values(raw.groupDecisions)) if (!["allow", "skip"].includes(String(value))) throw new Error("\u6587\u4EF6\u5939\u5206\u7EC4\u9009\u62E9\u635F\u574F\u3002");
    for (const t of raw.tasks) {
      if (t.groupExcluded !== void 0 && typeof t.groupExcluded !== "boolean") throw new Error("\u5F85\u529E\u5206\u7EC4\u9009\u62E9\u635F\u574F\u3002");
      if (t.groupId !== void 0 && (typeof t.groupId !== "string" || !ids2.has(t.groupId))) throw new Error("\u5F85\u529E\u5206\u7EC4\u5F15\u7528\u635F\u574F\u3002");
    }
  } else {
    result.taskGroups = [];
    result.groupDecisions = {};
  }
  if (raw.schemaVersion === 7 && "sessions" in s) throw new Error("\u5F53\u524D\u6570\u636E\u683C\u5F0F\u4E0D\u63A5\u53D7\u5DF2\u79FB\u9664\u7684\u65F6\u957F\u5B57\u6BB5\u3002");
  delete result.state.sessions;
  result.state.schemaVersion = 3;
  result.schemaVersion = 7;
  return result;
}
var WorkspaceController = class {
  constructor(source, clock, store, confirm, raw = null, deleteSource, confirmGroup, writeSourceCheck) {
    __publicField(this, "source", source);
    __publicField(this, "clock", clock);
    __publicField(this, "store", store);
    __publicField(this, "confirm", confirm);
    __publicField(this, "deleteSource", deleteSource);
    __publicField(this, "confirmGroup", confirmGroup);
    __publicField(this, "writeSourceCheck", writeSourceCheck);
    __publicField(this, "data");
    __publicField(this, "observed", /* @__PURE__ */ new Map());
    __publicField(this, "storageError", "");
    __publicField(this, "identities", /* @__PURE__ */ new WeakMap());
    __publicField(this, "generations", /* @__PURE__ */ new WeakMap());
    __publicField(this, "candidates", /* @__PURE__ */ new Map());
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "imports", /* @__PURE__ */ new Map());
    __publicField(this, "saveTail", Promise.resolve());
    __publicField(this, "disposed", false);
    __publicField(this, "deletedSourceTasks", /* @__PURE__ */ new Set());
    __publicField(this, "groupPrompt");
    this.data = raw === null ? emptyWorkspace() : validateWorkspace(raw);
    this.syncRegistry();
  }
  get groups() {
    return this.data.taskGroups.filter((g) => !g.deletedAt);
  }
  get state() {
    return this.data.state;
  }
  get tasks() {
    return this.data.tasks.filter((t) => !t.deletedAt);
  }
  now() {
    return this.clock.now();
  }
  get analyticsContext() {
    return { tasks: this.data.tasks, manualModules: this.data.manualModules, hiddenModules: this.data.hiddenModules, sourceModuleNames: this.data.sourceModuleNames };
  }
  get modules() {
    return moduleCatalog(this.state, this.data.manualModules, this.data.hiddenModules, void 0, this.data.sourceModuleNames);
  }
  taskModule(task) {
    return moduleForTask(task, task.noteId, this.state, this.modules, this.data.manualModules);
  }
  taskInModule(task, moduleId) {
    return task.origin === "manual" ? task.moduleIds?.length ? task.moduleIds.includes(moduleId) : moduleId === INBOX_MODULE : this.taskModule(task).id === moduleId;
  }
  get pending() {
    return this.tasks.filter((t) => !t.done);
  }
  title(noteId) {
    return this.state.notes.find((n) => n.id === noteId)?.path.split("/").at(-1)?.replace(/\.md$/, "") ?? "\u6765\u6E90\u4E0D\u53EF\u7528";
  }
  /** Nearest folder of the source note at any depth, shown as the task's #tag. */
  folderTag(noteId) {
    const path = this.state.notes.find((n) => n.id === noteId)?.path;
    if (!path) return;
    const parts = path.split("/");
    return parts.length > 1 ? parts.at(-2) : void 0;
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    if (!this.disposed) for (const fn of this.listeners) fn();
  }
  syncRegistry() {
    this.state.taskRegistry = this.tasks;
  }
  allowed(file) {
    return file.extension === "md" && file.stat.size <= 1e6 && ![".obsidian/", ".trash/", "kanban/"].some((p) => file.path.startsWith(p));
  }
  known(file) {
    const key = this.identities.get(file);
    return key ? this.observed.get(key) : void 0;
  }
  register(file) {
    let key = this.identities.get(file);
    if (!key) {
      key = this.state.notes.find((n2) => n2.path === file.path && !this.data.deletedNotes.includes(n2.id))?.id ?? id("note");
      this.identities.set(file, key);
    }
    let n = this.observed.get(key);
    if (!n) {
      const stored = this.state.notes.find((n2) => n2.id === key);
      n = { id: key, path: file.path, text: "", version: stored?.version ?? 0, indexed: false, dirty: false };
      this.observed.set(key, n);
      if (!stored) this.state.notes.push({ id: key, path: file.path, text: "", version: 0 });
    }
    return n;
  }
  snapshot() {
    const result = structuredClone(this.data);
    for (const note of result.state.notes) note.text = "";
    result.state.taskRegistry = [];
    return result;
  }
  persist() {
    const snapshot = this.snapshot();
    const next = this.saveTail.catch(() => {
    }).then(() => this.store.save(snapshot)).then(() => {
      this.storageError = "";
      this.emit();
    }, (error) => {
      this.storageError = "\u4FDD\u5B58\u5931\u8D25\uFF0C\u5F85\u529E\u5C1A\u672A\u5199\u5165\u78C1\u76D8\uFF1A" + (error instanceof Error ? error.message : String(error));
      this.emit();
      throw error;
    });
    this.saveTail = next;
    void next.catch(() => {
    });
    return next;
  }
  save() {
    void this.persist().catch(() => {
    });
  }
  async ready() {
    await this.saveTail;
  }
  receive(n, text, indexed, dirty = false) {
    const previous = this.candidates.get(n.id);
    const oldText = previous ? n.text : void 0;
    n.text = text;
    n.indexed = indexed;
    n.dirty = dirty;
    n.version++;
    delete n.error;
    const stored = this.state.notes.find((s) => s.id === n.id);
    stored.path = n.path;
    stored.version = n.version;
    stored.text = text;
    this.candidates.set(n.id, extractTaskRevision(stored, previous ?? this.data.tasks.filter((t) => t.noteId === n.id && t.origin !== "manual"), oldText));
    this.emit();
    if (indexed && !dirty) void this.collect(n.id).catch((error) => {
      n.error = error instanceof Error ? error.message : String(error);
      this.emit();
    });
  }
  async ingest(file, recordVisit) {
    if (this.disposed || !this.allowed(file)) return;
    const n = this.register(file), generation = (this.generations.get(file) ?? 0) + 1;
    this.generations.set(file, generation);
    if (recordVisit) {
      observeNote(this.state, n.id, localDate(this.clock.now()));
      this.save();
      this.emit();
    }
    try {
      const packet = await this.source.read(file);
      if (this.disposed || this.generations.get(file) !== generation) return;
      if (packet.text.length > 1e6) throw new Error("\u6587\u4EF6\u8D85\u8FC7 1MB \u5BFC\u5165\u4E0A\u9650\u3002");
      if (!n.dirty || n.text === packet.text) this.receive(n, packet.text, packet.indexed);
    } catch (error) {
      if (!this.disposed && this.generations.get(file) === generation) {
        n.error = error instanceof Error ? error.message : String(error);
        this.emit();
      }
    }
    await this.imports.get(n.id);
  }
  async open(file) {
    await this.ingest(file, true);
  }
  async refresh(file) {
    await this.ingest(file, false);
  }
  edit(file, text) {
    if (this.disposed || !this.allowed(file) || text.length > 1e6) return;
    const n = this.register(file), confirmed = n.indexed && n.text === text;
    this.generations.set(file, (this.generations.get(file) ?? 0) + 1);
    this.receive(n, text, confirmed, !confirmed);
    observeNote(this.state, n.id, localDate(this.clock.now()));
    this.save();
    this.emit();
  }
  indexed(file, text) {
    if (this.disposed || !this.allowed(file) || text.length > 1e6) return;
    const n = this.known(file);
    if (!n) return;
    this.generations.set(file, (this.generations.get(file) ?? 0) + 1);
    if (n.dirty && n.text !== text) {
      n.indexed = false;
      this.emit();
      return;
    }
    this.receive(n, text, true);
  }
  collect(noteId, force = false) {
    const running = this.imports.get(noteId);
    if (running) return running;
    const work = Promise.resolve().then(async () => {
      const n = this.observed.get(noteId);
      if (this.disposed || !n || !n.indexed || n.dirty) return;
      let candidates = this.candidates.get(noteId) ?? [], pending = candidates.filter((t) => !t.done && t.text.trim() && !this.data.tasks.some((old) => old.id === t.id && old.deletedAt));
      let completed = false;
      const detectedAt = this.clock.now().toISOString();
      for (const candidate of candidates) {
        const existing = this.tasks.find((t) => t.id === candidate.id);
        if (existing && !existing.done && candidate.done && !candidate.ambiguous) {
          this.setCompletion(existing, true, detectedAt);
          completed = true;
        }
      }
      if (completed) {
        await this.persist();
        this.emit();
      }
      if (this.data.decisions[noteId] === "skip" && !force) return;
      const hasNew = pending.some((t) => !this.tasks.some((existing) => existing.id === t.id));
      if (pending.length > 5 && hasNew && this.data.decisions[noteId] !== "allow") {
        const allow = await this.confirm({ noteId, path: n.path, count: pending.length });
        if (this.disposed || this.data.deletedNotes.includes(noteId)) return;
        this.data.decisions[noteId] = allow ? "allow" : "skip";
        this.save();
        this.emit();
        if (!allow) return;
      }
      if (this.disposed) return;
      candidates = this.candidates.get(noteId) ?? [];
      const at = this.clock.now().toISOString(), added = [];
      for (const candidate of candidates) {
        const existing = this.data.tasks.find((t) => t.id === candidate.id);
        if (existing?.deletedAt) continue;
        if (!candidate.text.trim()) {
          if (existing) existing.line = candidate.line;
          continue;
        }
        if (existing) {
          existing.text = candidate.text;
          existing.line = candidate.line;
          existing.ambiguous = candidate.ambiguous;
          existing.sourceUnavailable = false;
          existing.missingFromSource = false;
          if (candidate.done && !candidate.ambiguous) this.setCompletion(existing, true, at);
          continue;
        }
        if (candidate.done || candidate.ambiguous) continue;
        const ghost = this.data.tasks.find((t) => t.noteId === noteId && t.origin !== "manual" && !t.deletedAt && !t.done && t.id !== candidate.id && t.text.trim() === candidate.text.trim() && !candidates.some((c) => c.id === t.id));
        if (ghost) {
          this.data.tasks = this.data.tasks.filter((t) => t !== ghost);
          this.state.receipts = this.state.receipts.filter((r) => !r.taskIds.includes(ghost.id));
        }
        this.data.tasks.push({ ...candidate, done: false, collectedAt: at });
        added.push(candidate.id);
      }
      for (const task of this.tasks.filter((t) => t.noteId === noteId)) if (!candidates.some((c) => c.id === task.id)) task.missingFromSource = true;
      if (added.length) this.state.receipts.push({ id: id("receipt"), noteId, taskIds: added, at });
      this.syncRegistry();
      await this.persist();
      this.emit();
      void this.suggestTaskGroups().catch((error) => {
        n.error = String(error);
        this.emit();
      });
    }).finally(() => {
      this.imports.delete(noteId);
    });
    this.imports.set(noteId, work);
    void work.catch(() => {
    });
    return work;
  }
  async createTask(text, taskId = id("task-manual"), options = {}) {
    if (this.disposed) throw new Error("\u63D2\u4EF6\u5DF2\u5173\u95ED\u3002");
    const value = this.taskText(text), details = this.taskDetails(options), noteId = "note-manual-tasks";
    if (!parseTags(value).body) throw new Error("\u6807\u7B7E\u4EE5\u5916\u8FD8\u9700\u8981\u586B\u5199\u5F85\u529E\u540D\u79F0\u3002");
    const existing = this.data.tasks.find((t) => t.id === taskId);
    if (existing) {
      if (existing.origin !== "manual" || existing.deletedAt) throw new Error("\u5F85\u529E\u8EAB\u4EFD\u4E0D\u53EF\u590D\u7528\u3002");
      await this.updateTask(taskId, value, options);
      return taskId;
    }
    if (options.moduleId && !this.modules.some((m) => m.id === options.moduleId && !m.hidden)) throw new Error("\u6240\u9009\u6A21\u5757\u4E0D\u5B58\u5728\u3002");
    const moduleIds = options.moduleId ? [options.moduleId] : this.assignTags(value);
    if (!this.state.notes.some((n) => n.id === noteId)) this.state.notes.push({ id: noteId, path: "\u624B\u52A8\u5F85\u529E", text: "", version: 0 });
    const at = this.clock.now().toISOString();
    this.data.tasks.push({ id: taskId, noteId, text: value, line: 0, done: false, ambiguous: false, collectedAt: at, origin: "manual", ...details, moduleIds, groupId: options.newGroupName ? this.ensureTaskGroup(options.newGroupName).id : details.groupId });
    this.state.receipts.push({ id: id("receipt"), noteId, taskIds: [taskId], at });
    this.syncRegistry();
    this.emit();
    await this.persist();
    return taskId;
  }
  taskText(text) {
    const value = text.trim();
    if (!value) throw new Error("\u8BF7\u8F93\u5165\u5F85\u529E\u540D\u79F0\u3002");
    if (value.length > 2e3) throw new Error("\u5F85\u529E\u540D\u79F0\u6700\u591A 2000 \u4E2A\u5B57\u7B26\u3002");
    return value;
  }
  taskDetails(options, task) {
    const dueAt = options.dueAt === void 0 ? task?.dueAt : options.dueAt ?? void 0;
    const reminder = options.reminder === void 0 ? options.dueAt === null ? void 0 : task?.reminder : options.reminder ?? void 0;
    if (dueAt !== void 0 && (!validDate(dueAt) || !/[Tt].*(?:Z|[+-]\d{2}:\d{2})$/.test(dueAt))) throw new Error("\u622A\u6B62\u65F6\u95F4\u9700\u8981\u5B8C\u6574\u65E5\u671F\u3001\u65F6\u95F4\u548C\u65F6\u533A\u3002");
    if (reminder && (!dueAt || !validReminder(reminder))) throw new Error("\u5148\u8BBE\u7F6E\u622A\u6B62\u65F6\u95F4\uFF0C\u518D\u586B\u5199\u975E\u8D1F\u7684\u5929\u6216\u5C0F\u65F6\u63D0\u9192\u3002");
    if (options.newGroupName !== void 0) this.validGroupName(options.newGroupName);
    if (options.newGroupName && options.groupId) throw new Error("\u8BF7\u9009\u62E9\u5DF2\u6709\u5206\u7EC4\u6216\u521B\u5EFA\u65B0\u5206\u7EC4\u3002");
    const groupId = options.groupId === null ? void 0 : options.groupId ?? task?.groupId;
    if (groupId && !this.groups.some((g) => g.id === groupId)) throw new Error("\u5F85\u529E\u5206\u7EC4\u5DF2\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002");
    const horizon = options.horizon ?? task?.horizon;
    if (horizon && !["today", "next", "later"].includes(horizon)) throw new Error("\u5F85\u529E\u65F6\u95F4\u8303\u56F4\u65E0\u6548\u3002");
    return { dueAt, reminder: reminder ? { ...reminder } : void 0, groupId, groupExcluded: options.newGroupName || options.groupId ? void 0 : options.groupId === null ? true : task?.groupExcluded, horizon };
  }
  previewTags(text) {
    return parseTags(text).tags.map((tag) => ({ tag, module: this.modules.find((m) => [m.name, ...m.aliases].some((name) => tagKey(name) === tagKey(tag))) }));
  }
  assignTags(text) {
    const tags = parseTags(text).tags;
    if (tags.some((tag) => !tagKey(tag) || tag.length > 80)) throw new Error("\u6807\u7B7E\u9700\u8981\u6709\u6548\u540D\u79F0\uFF0C\u4E14\u6700\u591A 80 \u4E2A\u5B57\u7B26\u3002");
    if (!tags.length) {
      let inbox = this.data.manualModules.find((m) => m.id === INBOX_MODULE);
      if (!inbox) {
        inbox = { id: INBOX_MODULE, name: "\u624B\u52A8\u5F85\u529E", aliases: [], createdAt: this.clock.now().toISOString() };
        this.data.manualModules.push(inbox);
      } else delete inbox.deletedAt;
      return [INBOX_MODULE];
    }
    return tags.map((tag) => {
      let module2 = this.modules.find((m) => [m.name, ...m.aliases].some((name) => tagKey(name) === tagKey(tag)));
      if (!module2) {
        const m = { id: tagKey(tag) === tagKey("\u624B\u52A8\u5F85\u529E") ? INBOX_MODULE : id("module"), name: tag, aliases: [], createdAt: this.clock.now().toISOString() };
        const old = this.data.manualModules.findIndex((v) => v.id === m.id);
        if (old >= 0) this.data.manualModules[old] = m;
        else this.data.manualModules.push(m);
        module2 = { ...m, kind: "manual", hidden: false };
      }
      this.data.hiddenModules = this.data.hiddenModules.filter((k) => k !== module2.id);
      return module2.id;
    });
  }
  async renameTask(taskId, text) {
    return this.updateTask(taskId, text);
  }
  async updateTask(taskId, text, options = {}) {
    if (this.disposed) return;
    const value = this.taskText(text), task = this.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("\u5F85\u529E\u5DF2\u5220\u9664\u3002");
    const details = this.taskDetails(options, task);
    if (options.moduleId && !this.modules.some((m) => m.id === options.moduleId && !m.hidden)) throw new Error("\u6240\u9009\u6A21\u5757\u4E0D\u5B58\u5728\u3002");
    if (task.origin === "manual") {
      if (!parseTags(value).body) throw new Error("\u6807\u7B7E\u4EE5\u5916\u8FD8\u9700\u8981\u586B\u5199\u5F85\u529E\u540D\u79F0\u3002");
      const moduleIds = options.moduleId ? [options.moduleId] : this.assignTags(value);
      task.text = value;
      task.moduleIds = moduleIds;
    } else {
      task.label = value;
      if (options.moduleId) task.moduleIds = [options.moduleId];
    }
    if (options.newGroupName) details.groupId = this.ensureTaskGroup(options.newGroupName).id;
    Object.assign(task, details);
    this.emit();
    await this.persist();
  }
  validGroupName(name) {
    const value = name.trim();
    if (!value || value.length > 80) throw new Error("\u5206\u7EC4\u540D\u79F0\u9700\u8981 1\u201380 \u4E2A\u5B57\u7B26\u3002");
    return value;
  }
  ensureTaskGroup(name, folder) {
    const value = this.validGroupName(name), existing = this.groups.find((g) => groupNameKey(g.name) === groupNameKey(value));
    if (existing) return existing;
    const group = { id: id("task-group"), name: value, createdAt: this.clock.now().toISOString(), ...folder ? { folder } : {} };
    this.data.taskGroups.push(group);
    return group;
  }
  async createGroup(name) {
    const group = this.ensureTaskGroup(name);
    this.emit();
    await this.persist();
    return group.id;
  }
  async renameGroup(groupId, name) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) throw new Error("\u5206\u7EC4\u5DF2\u5220\u9664\u3002");
    const value = this.validGroupName(name);
    if (this.groups.some((g) => g.id !== groupId && groupNameKey(g.name) === groupNameKey(value))) throw new Error("\u5DF2\u6709\u540C\u540D\u5206\u7EC4\u3002");
    group.name = value;
    this.emit();
    await this.persist();
  }
  async removeGroup(groupId) {
    const group = this.data.taskGroups.find((g) => g.id === groupId);
    if (!group) return;
    group.deletedAt ??= this.clock.now().toISOString();
    if (group.folder) this.data.groupDecisions[group.folder] = "skip";
    for (const task of this.data.tasks) if (task.groupId === groupId) {
      delete task.groupId;
      task.groupExcluded = true;
    }
    this.emit();
    await this.persist();
  }
  suggestTaskGroups() {
    if (this.groupPrompt) return this.groupPrompt;
    if (!this.confirmGroup || this.disposed) return Promise.resolve();
    const work = Promise.resolve().then(async () => {
      for (const [folder] of folderCandidates(this.tasks, this.state.notes)) {
        if (this.disposed) return;
        let members = folderCandidates(this.tasks, this.state.notes).get(folder) ?? [];
        members = members.filter((t) => !t.sourceUnavailable);
        const existing = this.groups.find((g) => g.folder === folder);
        if (existing) {
          for (const t of members) t.groupId = existing.id;
          if (members.length) {
            this.emit();
            await this.persist();
          }
          continue;
        }
        if (members.length <= 3 || this.data.groupDecisions[folder] === "skip") continue;
        const allow = await this.confirmGroup({ folder, count: members.length });
        if (this.disposed) return;
        this.data.groupDecisions[folder] = allow ? "allow" : "skip";
        members = (folderCandidates(this.tasks, this.state.notes).get(folder) ?? []).filter((t) => !t.sourceUnavailable);
        if (allow && members.length > 3) {
          const base = folder.split("/").at(-1).slice(0, 60);
          let name = base, index2 = 2;
          while (this.groups.some((g) => groupNameKey(g.name) === groupNameKey(name))) name = base + " (" + index2++ + ")";
          const group = this.ensureTaskGroup(name, folder);
          for (const t of members) t.groupId = group.id;
        }
        this.emit();
        await this.persist();
      }
    }).finally(() => {
      this.groupPrompt = void 0;
    });
    this.groupPrompt = work;
    return work;
  }
  moduleTaskCount(moduleId) {
    return this.tasks.filter((t) => this.taskInModule(t, moduleId)).length;
  }
  async createModule(name) {
    const value = name.trim();
    if (!value || !tagKey(value) || value.length > 80) throw new Error("\u6A21\u5757\u540D\u79F0\u9700\u8981 1\u201380 \u4E2A\u5B57\u7B26\u3002");
    if (this.modules.some((m) => tagKey(m.name) === tagKey(value))) throw new Error("\u5DF2\u6709\u540C\u540D\u6A21\u5757\u3002");
    const module2 = { id: id("module"), name: value, aliases: [], createdAt: this.clock.now().toISOString() };
    this.data.manualModules.push(module2);
    this.emit();
    await this.persist();
    return module2.id;
  }
  async assignTaskModule(taskId, moduleId) {
    const task = this.tasks.find((t) => t.id === taskId), module2 = this.modules.find((m) => m.id === moduleId && !m.hidden);
    if (!task) throw new Error("\u5F85\u529E\u5DF2\u5220\u9664\u3002");
    if (!module2) throw new Error("\u76EE\u6807\u6A21\u5757\u4E0D\u5B58\u5728\u3002");
    task.moduleIds = [moduleId];
    this.emit();
    await this.persist();
  }
  async assignTaskHorizon(taskId, horizon) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("\u5F85\u529E\u5DF2\u5220\u9664\u3002");
    task.horizon = horizon;
    this.emit();
    await this.persist();
  }
  async renameModule(moduleId, name) {
    if (this.disposed) return;
    const module2 = this.data.manualModules.find((m) => m.id === moduleId && !m.deletedAt), source = this.modules.find((m) => m.id === moduleId && m.kind === "source");
    const value = name.trim();
    if (!module2 && !source) throw new Error("\u6A21\u5757\u4E0D\u5B58\u5728\u3002");
    if (!value || !tagKey(value) || value.length > 80) throw new Error("\u6A21\u5757\u540D\u79F0\u9700\u8981 1\u201380 \u4E2A\u5B57\u7B26\u3002");
    const collision = this.modules.find((m) => m.id !== moduleId && [m.name, ...m.aliases].some((n) => tagKey(n) === tagKey(value)));
    if (collision) throw new Error("\u5DF2\u6709\u540C\u540D\u6A21\u5757\uFF0C\u8BF7\u4F7F\u7528\u5176\u5B83\u540D\u79F0\u3002");
    if (source) this.data.sourceModuleNames[moduleId] = value;
    else {
      if (tagKey(module2.name) !== tagKey(value) && !module2.aliases.some((a) => tagKey(a) === tagKey(module2.name))) module2.aliases.push(module2.name);
      module2.name = value;
    }
    this.emit();
    await this.persist();
  }
  async removeModule(moduleId) {
    if (this.disposed) return;
    if (moduleId === INBOX_MODULE) throw new Error("\u300C\u624B\u52A8\u5F85\u529E\u300D\u662F\u672A\u5206\u7C7B\u6536\u4EF6\u7BB1\uFF0C\u4E0D\u80FD\u5220\u9664\uFF1B\u8BF7\u628A\u4EFB\u52A1\u62D6\u5230\u5176\u5B83\u6A21\u5757\u3002");
    const deleted = this.data.manualModules.find((m) => m.id === moduleId);
    const module2 = this.modules.find((m) => m.id === moduleId) ?? (deleted ? { ...deleted, kind: "manual", hidden: true } : void 0);
    if (!module2) throw new Error("\u6A21\u5757\u5DF2\u4E0D\u5B58\u5728\u3002");
    const at = this.clock.now().toISOString();
    const inbox = this.data.manualModules.find((m) => m.id === INBOX_MODULE);
    if (!inbox) this.data.manualModules.push({ id: INBOX_MODULE, name: "\u624B\u52A8\u5F85\u529E", aliases: [], createdAt: at });
    else delete inbox.deletedAt;
    for (const t of this.tasks) if (this.taskInModule(t, moduleId)) t.moduleIds = [INBOX_MODULE];
    if (module2.kind === "manual") this.data.manualModules.find((m) => m.id === moduleId).deletedAt ??= at;
    else if (!this.data.hiddenModules.includes(moduleId)) this.data.hiddenModules.push(moduleId);
    this.syncRegistry();
    this.emit();
    await this.persist();
  }
  async showModule(moduleId) {
    if (this.disposed) return;
    this.data.hiddenModules = this.data.hiddenModules.filter((k) => k !== moduleId);
    this.emit();
    await this.persist();
  }
  async removeTask(taskId) {
    if (this.disposed) return;
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.origin !== "manual" && !task.sourceUnavailable) {
      const path = this.state.notes.find((n) => n.id === task.noteId)?.path;
      if (path && this.deleteSource && !this.deletedSourceTasks.has(taskId)) {
        await this.deleteSource(task, path);
        this.deletedSourceTasks.add(taskId);
      }
    }
    task.deletedAt ??= this.clock.now().toISOString();
    this.syncRegistry();
    this.emit();
    await this.persist();
  }
  async restoreTask(taskId) {
    if (this.disposed) return;
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    delete task.deletedAt;
    this.syncRegistry();
    this.emit();
    await this.persist();
  }
  async complete(taskId, done) {
    if (this.disposed) return;
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.done === done) return;
    this.setCompletion(task, done, this.clock.now().toISOString());
    this.emit();
    await this.persist();
    if (done !== void 0 && task.origin !== "manual" && !task.sourceUnavailable && !task.missingFromSource && this.writeSourceCheck) {
      const path = this.state.notes.find((n) => n.id === task.noteId)?.path;
      if (path) {
        try {
          await this.writeSourceCheck(task, path, done);
        } catch {
        }
      }
    }
  }
  setCompletion(task, done, at) {
    if (task.done === done) return;
    task.done = done;
    if (done) {
      task.completedAt = at;
      this.state.completions.push({ taskId: task.id, noteId: task.noteId, at });
    } else delete task.completedAt;
  }
  renamed(file, oldPath) {
    if (this.disposed) return;
    const stored = this.state.notes.find((n2) => n2.id === this.identities.get(file) || n2.path === oldPath);
    if (!stored) return;
    this.identities.set(file, stored.id);
    stored.path = file.path;
    const n = this.observed.get(stored.id);
    if (n) n.path = file.path;
    this.save();
    this.emit();
  }
  deleted(file) {
    if (this.disposed) return;
    const key = this.identities.get(file) ?? this.state.notes.find((n) => n.path === file.path)?.id;
    if (!key) return;
    this.generations.set(file, (this.generations.get(file) ?? 0) + 1);
    this.observed.delete(key);
    this.candidates.delete(key);
    this.identities.delete(file);
    if (!this.data.deletedNotes.includes(key)) this.data.deletedNotes.push(key);
    for (const task of this.tasks.filter((t) => t.noteId === key)) task.sourceUnavailable = true;
    this.save();
    this.emit();
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    await this.persist();
    this.observed.clear();
    this.candidates.clear();
  }
};

// node_modules/sortablejs/modular/sortable.esm.js
function ownKeys(object2, enumerableOnly) {
  var keys = Object.keys(object2);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object2);
    if (enumerableOnly) {
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object2, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }
  return target;
}
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
var version = "1.15.6";
function userAgent(pattern) {
  if (typeof window !== "undefined" && window.navigator) {
    return !!/* @__PURE__ */ navigator.userAgent.match(pattern);
  }
}
var IE11OrLess = userAgent(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i);
var Edge = userAgent(/Edge/i);
var FireFox = userAgent(/firefox/i);
var Safari = userAgent(/safari/i) && !userAgent(/chrome/i) && !userAgent(/android/i);
var IOS = userAgent(/iP(ad|od|hone)/i);
var ChromeForAndroid = userAgent(/chrome/i) && userAgent(/android/i);
var captureMode = {
  capture: false,
  passive: false
};
function on(el, event, fn) {
  el.addEventListener(event, fn, !IE11OrLess && captureMode);
}
function off(el, event, fn) {
  el.removeEventListener(event, fn, !IE11OrLess && captureMode);
}
function matches(el, selector) {
  if (!selector) return;
  selector[0] === ">" && (selector = selector.substring(1));
  if (el) {
    try {
      if (el.matches) {
        return el.matches(selector);
      } else if (el.msMatchesSelector) {
        return el.msMatchesSelector(selector);
      } else if (el.webkitMatchesSelector) {
        return el.webkitMatchesSelector(selector);
      }
    } catch (_) {
      return false;
    }
  }
  return false;
}
function getParentOrHost(el) {
  return el.host && el !== document && el.host.nodeType ? el.host : el.parentNode;
}
function closest(el, selector, ctx, includeCTX) {
  if (el) {
    ctx = ctx || document;
    do {
      if (selector != null && (selector[0] === ">" ? el.parentNode === ctx && matches(el, selector) : matches(el, selector)) || includeCTX && el === ctx) {
        return el;
      }
      if (el === ctx) break;
    } while (el = getParentOrHost(el));
  }
  return null;
}
var R_SPACE = /\s+/g;
function toggleClass(el, name, state) {
  if (el && name) {
    if (el.classList) {
      el.classList[state ? "add" : "remove"](name);
    } else {
      var className = (" " + el.className + " ").replace(R_SPACE, " ").replace(" " + name + " ", " ");
      el.className = (className + (state ? " " + name : "")).replace(R_SPACE, " ");
    }
  }
}
function css(el, prop, val) {
  var style = el && el.style;
  if (style) {
    if (val === void 0) {
      if (document.defaultView && document.defaultView.getComputedStyle) {
        val = document.defaultView.getComputedStyle(el, "");
      } else if (el.currentStyle) {
        val = el.currentStyle;
      }
      return prop === void 0 ? val : val[prop];
    } else {
      if (!(prop in style) && prop.indexOf("webkit") === -1) {
        prop = "-webkit-" + prop;
      }
      style[prop] = val + (typeof val === "string" ? "" : "px");
    }
  }
}
function matrix(el, selfOnly) {
  var appliedTransforms = "";
  if (typeof el === "string") {
    appliedTransforms = el;
  } else {
    do {
      var transform = css(el, "transform");
      if (transform && transform !== "none") {
        appliedTransforms = transform + " " + appliedTransforms;
      }
    } while (!selfOnly && (el = el.parentNode));
  }
  var matrixFn = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return matrixFn && new matrixFn(appliedTransforms);
}
function find(ctx, tagName, iterator) {
  if (ctx) {
    var list = ctx.getElementsByTagName(tagName), i = 0, n = list.length;
    if (iterator) {
      for (; i < n; i++) {
        iterator(list[i], i);
      }
    }
    return list;
  }
  return [];
}
function getWindowScrollingElement() {
  var scrollingElement = document.scrollingElement;
  if (scrollingElement) {
    return scrollingElement;
  } else {
    return document.documentElement;
  }
}
function getRect(el, relativeToContainingBlock, relativeToNonStaticParent, undoScale, container) {
  if (!el.getBoundingClientRect && el !== window) return;
  var elRect, top, left, bottom, right, height, width;
  if (el !== window && el.parentNode && el !== getWindowScrollingElement()) {
    elRect = el.getBoundingClientRect();
    top = elRect.top;
    left = elRect.left;
    bottom = elRect.bottom;
    right = elRect.right;
    height = elRect.height;
    width = elRect.width;
  } else {
    top = 0;
    left = 0;
    bottom = window.innerHeight;
    right = window.innerWidth;
    height = window.innerHeight;
    width = window.innerWidth;
  }
  if ((relativeToContainingBlock || relativeToNonStaticParent) && el !== window) {
    container = container || el.parentNode;
    if (!IE11OrLess) {
      do {
        if (container && container.getBoundingClientRect && (css(container, "transform") !== "none" || relativeToNonStaticParent && css(container, "position") !== "static")) {
          var containerRect = container.getBoundingClientRect();
          top -= containerRect.top + parseInt(css(container, "border-top-width"));
          left -= containerRect.left + parseInt(css(container, "border-left-width"));
          bottom = top + elRect.height;
          right = left + elRect.width;
          break;
        }
      } while (container = container.parentNode);
    }
  }
  if (undoScale && el !== window) {
    var elMatrix = matrix(container || el), scaleX = elMatrix && elMatrix.a, scaleY = elMatrix && elMatrix.d;
    if (elMatrix) {
      top /= scaleY;
      left /= scaleX;
      width /= scaleX;
      height /= scaleY;
      bottom = top + height;
      right = left + width;
    }
  }
  return {
    top,
    left,
    bottom,
    right,
    width,
    height
  };
}
function isScrolledPast(el, elSide, parentSide) {
  var parent = getParentAutoScrollElement(el, true), elSideVal = getRect(el)[elSide];
  while (parent) {
    var parentSideVal = getRect(parent)[parentSide], visible = void 0;
    if (parentSide === "top" || parentSide === "left") {
      visible = elSideVal >= parentSideVal;
    } else {
      visible = elSideVal <= parentSideVal;
    }
    if (!visible) return parent;
    if (parent === getWindowScrollingElement()) break;
    parent = getParentAutoScrollElement(parent, false);
  }
  return false;
}
function getChild(el, childNum, options, includeDragEl) {
  var currentChild = 0, i = 0, children = el.children;
  while (i < children.length) {
    if (children[i].style.display !== "none" && children[i] !== Sortable.ghost && (includeDragEl || children[i] !== Sortable.dragged) && closest(children[i], options.draggable, el, false)) {
      if (currentChild === childNum) {
        return children[i];
      }
      currentChild++;
    }
    i++;
  }
  return null;
}
function lastChild(el, selector) {
  var last = el.lastElementChild;
  while (last && (last === Sortable.ghost || css(last, "display") === "none" || selector && !matches(last, selector))) {
    last = last.previousElementSibling;
  }
  return last || null;
}
function index(el, selector) {
  var index2 = 0;
  if (!el || !el.parentNode) {
    return -1;
  }
  while (el = el.previousElementSibling) {
    if (el.nodeName.toUpperCase() !== "TEMPLATE" && el !== Sortable.clone && (!selector || matches(el, selector))) {
      index2++;
    }
  }
  return index2;
}
function getRelativeScrollOffset(el) {
  var offsetLeft = 0, offsetTop = 0, winScroller = getWindowScrollingElement();
  if (el) {
    do {
      var elMatrix = matrix(el), scaleX = elMatrix.a, scaleY = elMatrix.d;
      offsetLeft += el.scrollLeft * scaleX;
      offsetTop += el.scrollTop * scaleY;
    } while (el !== winScroller && (el = el.parentNode));
  }
  return [offsetLeft, offsetTop];
}
function indexOfObject(arr, obj) {
  for (var i in arr) {
    if (!arr.hasOwnProperty(i)) continue;
    for (var key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] === arr[i][key]) return Number(i);
    }
  }
  return -1;
}
function getParentAutoScrollElement(el, includeSelf) {
  if (!el || !el.getBoundingClientRect) return getWindowScrollingElement();
  var elem = el;
  var gotSelf = false;
  do {
    if (elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight) {
      var elemCSS = css(elem);
      if (elem.clientWidth < elem.scrollWidth && (elemCSS.overflowX == "auto" || elemCSS.overflowX == "scroll") || elem.clientHeight < elem.scrollHeight && (elemCSS.overflowY == "auto" || elemCSS.overflowY == "scroll")) {
        if (!elem.getBoundingClientRect || elem === document.body) return getWindowScrollingElement();
        if (gotSelf || includeSelf) return elem;
        gotSelf = true;
      }
    }
  } while (elem = elem.parentNode);
  return getWindowScrollingElement();
}
function extend(dst, src) {
  if (dst && src) {
    for (var key in src) {
      if (src.hasOwnProperty(key)) {
        dst[key] = src[key];
      }
    }
  }
  return dst;
}
function isRectEqual(rect1, rect2) {
  return Math.round(rect1.top) === Math.round(rect2.top) && Math.round(rect1.left) === Math.round(rect2.left) && Math.round(rect1.height) === Math.round(rect2.height) && Math.round(rect1.width) === Math.round(rect2.width);
}
var _throttleTimeout;
function throttle(callback, ms) {
  return function() {
    if (!_throttleTimeout) {
      var args = arguments, _this = this;
      if (args.length === 1) {
        callback.call(_this, args[0]);
      } else {
        callback.apply(_this, args);
      }
      _throttleTimeout = setTimeout(function() {
        _throttleTimeout = void 0;
      }, ms);
    }
  };
}
function cancelThrottle() {
  clearTimeout(_throttleTimeout);
  _throttleTimeout = void 0;
}
function scrollBy(el, x, y) {
  el.scrollLeft += x;
  el.scrollTop += y;
}
function clone(el) {
  var Polymer = window.Polymer;
  var $ = window.jQuery || window.Zepto;
  if (Polymer && Polymer.dom) {
    return Polymer.dom(el).cloneNode(true);
  } else if ($) {
    return $(el).clone(true)[0];
  } else {
    return el.cloneNode(true);
  }
}
function getChildContainingRectFromElement(container, options, ghostEl2) {
  var rect = {};
  Array.from(container.children).forEach(function(child) {
    var _rect$left, _rect$top, _rect$right, _rect$bottom;
    if (!closest(child, options.draggable, container, false) || child.animated || child === ghostEl2) return;
    var childRect = getRect(child);
    rect.left = Math.min((_rect$left = rect.left) !== null && _rect$left !== void 0 ? _rect$left : Infinity, childRect.left);
    rect.top = Math.min((_rect$top = rect.top) !== null && _rect$top !== void 0 ? _rect$top : Infinity, childRect.top);
    rect.right = Math.max((_rect$right = rect.right) !== null && _rect$right !== void 0 ? _rect$right : -Infinity, childRect.right);
    rect.bottom = Math.max((_rect$bottom = rect.bottom) !== null && _rect$bottom !== void 0 ? _rect$bottom : -Infinity, childRect.bottom);
  });
  rect.width = rect.right - rect.left;
  rect.height = rect.bottom - rect.top;
  rect.x = rect.left;
  rect.y = rect.top;
  return rect;
}
var expando = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function AnimationStateManager() {
  var animationStates = [], animationCallbackId;
  return {
    captureAnimationState: function captureAnimationState() {
      animationStates = [];
      if (!this.options.animation) return;
      var children = [].slice.call(this.el.children);
      children.forEach(function(child) {
        if (css(child, "display") === "none" || child === Sortable.ghost) return;
        animationStates.push({
          target: child,
          rect: getRect(child)
        });
        var fromRect = _objectSpread2({}, animationStates[animationStates.length - 1].rect);
        if (child.thisAnimationDuration) {
          var childMatrix = matrix(child, true);
          if (childMatrix) {
            fromRect.top -= childMatrix.f;
            fromRect.left -= childMatrix.e;
          }
        }
        child.fromRect = fromRect;
      });
    },
    addAnimationState: function addAnimationState(state) {
      animationStates.push(state);
    },
    removeAnimationState: function removeAnimationState(target) {
      animationStates.splice(indexOfObject(animationStates, {
        target
      }), 1);
    },
    animateAll: function animateAll(callback) {
      var _this = this;
      if (!this.options.animation) {
        clearTimeout(animationCallbackId);
        if (typeof callback === "function") callback();
        return;
      }
      var animating = false, animationTime = 0;
      animationStates.forEach(function(state) {
        var time = 0, target = state.target, fromRect = target.fromRect, toRect = getRect(target), prevFromRect = target.prevFromRect, prevToRect = target.prevToRect, animatingRect = state.rect, targetMatrix = matrix(target, true);
        if (targetMatrix) {
          toRect.top -= targetMatrix.f;
          toRect.left -= targetMatrix.e;
        }
        target.toRect = toRect;
        if (target.thisAnimationDuration) {
          if (isRectEqual(prevFromRect, toRect) && !isRectEqual(fromRect, toRect) && // Make sure animatingRect is on line between toRect & fromRect
          (animatingRect.top - toRect.top) / (animatingRect.left - toRect.left) === (fromRect.top - toRect.top) / (fromRect.left - toRect.left)) {
            time = calculateRealTime(animatingRect, prevFromRect, prevToRect, _this.options);
          }
        }
        if (!isRectEqual(toRect, fromRect)) {
          target.prevFromRect = fromRect;
          target.prevToRect = toRect;
          if (!time) {
            time = _this.options.animation;
          }
          _this.animate(target, animatingRect, toRect, time);
        }
        if (time) {
          animating = true;
          animationTime = Math.max(animationTime, time);
          clearTimeout(target.animationResetTimer);
          target.animationResetTimer = setTimeout(function() {
            target.animationTime = 0;
            target.prevFromRect = null;
            target.fromRect = null;
            target.prevToRect = null;
            target.thisAnimationDuration = null;
          }, time);
          target.thisAnimationDuration = time;
        }
      });
      clearTimeout(animationCallbackId);
      if (!animating) {
        if (typeof callback === "function") callback();
      } else {
        animationCallbackId = setTimeout(function() {
          if (typeof callback === "function") callback();
        }, animationTime);
      }
      animationStates = [];
    },
    animate: function animate(target, currentRect, toRect, duration) {
      if (duration) {
        css(target, "transition", "");
        css(target, "transform", "");
        var elMatrix = matrix(this.el), scaleX = elMatrix && elMatrix.a, scaleY = elMatrix && elMatrix.d, translateX = (currentRect.left - toRect.left) / (scaleX || 1), translateY = (currentRect.top - toRect.top) / (scaleY || 1);
        target.animatingX = !!translateX;
        target.animatingY = !!translateY;
        css(target, "transform", "translate3d(" + translateX + "px," + translateY + "px,0)");
        this.forRepaintDummy = repaint(target);
        css(target, "transition", "transform " + duration + "ms" + (this.options.easing ? " " + this.options.easing : ""));
        css(target, "transform", "translate3d(0,0,0)");
        typeof target.animated === "number" && clearTimeout(target.animated);
        target.animated = setTimeout(function() {
          css(target, "transition", "");
          css(target, "transform", "");
          target.animated = false;
          target.animatingX = false;
          target.animatingY = false;
        }, duration);
      }
    }
  };
}
function repaint(target) {
  return target.offsetWidth;
}
function calculateRealTime(animatingRect, fromRect, toRect, options) {
  return Math.sqrt(Math.pow(fromRect.top - animatingRect.top, 2) + Math.pow(fromRect.left - animatingRect.left, 2)) / Math.sqrt(Math.pow(fromRect.top - toRect.top, 2) + Math.pow(fromRect.left - toRect.left, 2)) * options.animation;
}
var plugins = [];
var defaults = {
  initializeByDefault: true
};
var PluginManager = {
  mount: function mount(plugin) {
    for (var option2 in defaults) {
      if (defaults.hasOwnProperty(option2) && !(option2 in plugin)) {
        plugin[option2] = defaults[option2];
      }
    }
    plugins.forEach(function(p) {
      if (p.pluginName === plugin.pluginName) {
        throw "Sortable: Cannot mount plugin ".concat(plugin.pluginName, " more than once");
      }
    });
    plugins.push(plugin);
  },
  pluginEvent: function pluginEvent(eventName, sortable, evt) {
    var _this = this;
    this.eventCanceled = false;
    evt.cancel = function() {
      _this.eventCanceled = true;
    };
    var eventNameGlobal = eventName + "Global";
    plugins.forEach(function(plugin) {
      if (!sortable[plugin.pluginName]) return;
      if (sortable[plugin.pluginName][eventNameGlobal]) {
        sortable[plugin.pluginName][eventNameGlobal](_objectSpread2({
          sortable
        }, evt));
      }
      if (sortable.options[plugin.pluginName] && sortable[plugin.pluginName][eventName]) {
        sortable[plugin.pluginName][eventName](_objectSpread2({
          sortable
        }, evt));
      }
    });
  },
  initializePlugins: function initializePlugins(sortable, el, defaults2, options) {
    plugins.forEach(function(plugin) {
      var pluginName = plugin.pluginName;
      if (!sortable.options[pluginName] && !plugin.initializeByDefault) return;
      var initialized = new plugin(sortable, el, sortable.options);
      initialized.sortable = sortable;
      initialized.options = sortable.options;
      sortable[pluginName] = initialized;
      _extends(defaults2, initialized.defaults);
    });
    for (var option2 in sortable.options) {
      if (!sortable.options.hasOwnProperty(option2)) continue;
      var modified = this.modifyOption(sortable, option2, sortable.options[option2]);
      if (typeof modified !== "undefined") {
        sortable.options[option2] = modified;
      }
    }
  },
  getEventProperties: function getEventProperties(name, sortable) {
    var eventProperties = {};
    plugins.forEach(function(plugin) {
      if (typeof plugin.eventProperties !== "function") return;
      _extends(eventProperties, plugin.eventProperties.call(sortable[plugin.pluginName], name));
    });
    return eventProperties;
  },
  modifyOption: function modifyOption(sortable, name, value) {
    var modifiedValue;
    plugins.forEach(function(plugin) {
      if (!sortable[plugin.pluginName]) return;
      if (plugin.optionListeners && typeof plugin.optionListeners[name] === "function") {
        modifiedValue = plugin.optionListeners[name].call(sortable[plugin.pluginName], value);
      }
    });
    return modifiedValue;
  }
};
function dispatchEvent(_ref) {
  var sortable = _ref.sortable, rootEl2 = _ref.rootEl, name = _ref.name, targetEl = _ref.targetEl, cloneEl2 = _ref.cloneEl, toEl = _ref.toEl, fromEl = _ref.fromEl, oldIndex2 = _ref.oldIndex, newIndex2 = _ref.newIndex, oldDraggableIndex2 = _ref.oldDraggableIndex, newDraggableIndex2 = _ref.newDraggableIndex, originalEvent = _ref.originalEvent, putSortable2 = _ref.putSortable, extraEventProperties = _ref.extraEventProperties;
  sortable = sortable || rootEl2 && rootEl2[expando];
  if (!sortable) return;
  var evt, options = sortable.options, onName = "on" + name.charAt(0).toUpperCase() + name.substr(1);
  if (window.CustomEvent && !IE11OrLess && !Edge) {
    evt = new CustomEvent(name, {
      bubbles: true,
      cancelable: true
    });
  } else {
    evt = document.createEvent("Event");
    evt.initEvent(name, true, true);
  }
  evt.to = toEl || rootEl2;
  evt.from = fromEl || rootEl2;
  evt.item = targetEl || rootEl2;
  evt.clone = cloneEl2;
  evt.oldIndex = oldIndex2;
  evt.newIndex = newIndex2;
  evt.oldDraggableIndex = oldDraggableIndex2;
  evt.newDraggableIndex = newDraggableIndex2;
  evt.originalEvent = originalEvent;
  evt.pullMode = putSortable2 ? putSortable2.lastPutMode : void 0;
  var allEventProperties = _objectSpread2(_objectSpread2({}, extraEventProperties), PluginManager.getEventProperties(name, sortable));
  for (var option2 in allEventProperties) {
    evt[option2] = allEventProperties[option2];
  }
  if (rootEl2) {
    rootEl2.dispatchEvent(evt);
  }
  if (options[onName]) {
    options[onName].call(sortable, evt);
  }
}
var _excluded = ["evt"];
var pluginEvent2 = function pluginEvent3(eventName, sortable) {
  var _ref = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, originalEvent = _ref.evt, data = _objectWithoutProperties(_ref, _excluded);
  PluginManager.pluginEvent.bind(Sortable)(eventName, sortable, _objectSpread2({
    dragEl,
    parentEl,
    ghostEl,
    rootEl,
    nextEl,
    lastDownEl,
    cloneEl,
    cloneHidden,
    dragStarted: moved,
    putSortable,
    activeSortable: Sortable.active,
    originalEvent,
    oldIndex,
    oldDraggableIndex,
    newIndex,
    newDraggableIndex,
    hideGhostForTarget: _hideGhostForTarget,
    unhideGhostForTarget: _unhideGhostForTarget,
    cloneNowHidden: function cloneNowHidden() {
      cloneHidden = true;
    },
    cloneNowShown: function cloneNowShown() {
      cloneHidden = false;
    },
    dispatchSortableEvent: function dispatchSortableEvent(name) {
      _dispatchEvent({
        sortable,
        name,
        originalEvent
      });
    }
  }, data));
};
function _dispatchEvent(info) {
  dispatchEvent(_objectSpread2({
    putSortable,
    cloneEl,
    targetEl: dragEl,
    rootEl,
    oldIndex,
    oldDraggableIndex,
    newIndex,
    newDraggableIndex
  }, info));
}
var dragEl;
var parentEl;
var ghostEl;
var rootEl;
var nextEl;
var lastDownEl;
var cloneEl;
var cloneHidden;
var oldIndex;
var newIndex;
var oldDraggableIndex;
var newDraggableIndex;
var activeGroup;
var putSortable;
var awaitingDragStarted = false;
var ignoreNextClick = false;
var sortables = [];
var tapEvt;
var touchEvt;
var lastDx;
var lastDy;
var tapDistanceLeft;
var tapDistanceTop;
var moved;
var lastTarget;
var lastDirection;
var pastFirstInvertThresh = false;
var isCircumstantialInvert = false;
var targetMoveDistance;
var ghostRelativeParent;
var ghostRelativeParentInitialScroll = [];
var _silent = false;
var savedInputChecked = [];
var documentExists = typeof document !== "undefined";
var PositionGhostAbsolutely = IOS;
var CSSFloatProperty = Edge || IE11OrLess ? "cssFloat" : "float";
var supportDraggable = documentExists && !ChromeForAndroid && !IOS && "draggable" in document.createElement("div");
var supportCssPointerEvents = (function() {
  if (!documentExists) return;
  if (IE11OrLess) {
    return false;
  }
  var el = document.createElement("x");
  el.style.cssText = "pointer-events:auto";
  return el.style.pointerEvents === "auto";
})();
var _detectDirection = function _detectDirection2(el, options) {
  var elCSS = css(el), elWidth = parseInt(elCSS.width) - parseInt(elCSS.paddingLeft) - parseInt(elCSS.paddingRight) - parseInt(elCSS.borderLeftWidth) - parseInt(elCSS.borderRightWidth), child1 = getChild(el, 0, options), child2 = getChild(el, 1, options), firstChildCSS = child1 && css(child1), secondChildCSS = child2 && css(child2), firstChildWidth = firstChildCSS && parseInt(firstChildCSS.marginLeft) + parseInt(firstChildCSS.marginRight) + getRect(child1).width, secondChildWidth = secondChildCSS && parseInt(secondChildCSS.marginLeft) + parseInt(secondChildCSS.marginRight) + getRect(child2).width;
  if (elCSS.display === "flex") {
    return elCSS.flexDirection === "column" || elCSS.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  }
  if (elCSS.display === "grid") {
    return elCSS.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  }
  if (child1 && firstChildCSS["float"] && firstChildCSS["float"] !== "none") {
    var touchingSideChild2 = firstChildCSS["float"] === "left" ? "left" : "right";
    return child2 && (secondChildCSS.clear === "both" || secondChildCSS.clear === touchingSideChild2) ? "vertical" : "horizontal";
  }
  return child1 && (firstChildCSS.display === "block" || firstChildCSS.display === "flex" || firstChildCSS.display === "table" || firstChildCSS.display === "grid" || firstChildWidth >= elWidth && elCSS[CSSFloatProperty] === "none" || child2 && elCSS[CSSFloatProperty] === "none" && firstChildWidth + secondChildWidth > elWidth) ? "vertical" : "horizontal";
};
var _dragElInRowColumn = function _dragElInRowColumn2(dragRect, targetRect, vertical) {
  var dragElS1Opp = vertical ? dragRect.left : dragRect.top, dragElS2Opp = vertical ? dragRect.right : dragRect.bottom, dragElOppLength = vertical ? dragRect.width : dragRect.height, targetS1Opp = vertical ? targetRect.left : targetRect.top, targetS2Opp = vertical ? targetRect.right : targetRect.bottom, targetOppLength = vertical ? targetRect.width : targetRect.height;
  return dragElS1Opp === targetS1Opp || dragElS2Opp === targetS2Opp || dragElS1Opp + dragElOppLength / 2 === targetS1Opp + targetOppLength / 2;
};
var _detectNearestEmptySortable = function _detectNearestEmptySortable2(x, y) {
  var ret;
  sortables.some(function(sortable) {
    var threshold = sortable[expando].options.emptyInsertThreshold;
    if (!threshold || lastChild(sortable)) return;
    var rect = getRect(sortable), insideHorizontally = x >= rect.left - threshold && x <= rect.right + threshold, insideVertically = y >= rect.top - threshold && y <= rect.bottom + threshold;
    if (insideHorizontally && insideVertically) {
      return ret = sortable;
    }
  });
  return ret;
};
var _prepareGroup = function _prepareGroup2(options) {
  function toFn(value, pull) {
    return function(to, from, dragEl2, evt) {
      var sameGroup = to.options.group.name && from.options.group.name && to.options.group.name === from.options.group.name;
      if (value == null && (pull || sameGroup)) {
        return true;
      } else if (value == null || value === false) {
        return false;
      } else if (pull && value === "clone") {
        return value;
      } else if (typeof value === "function") {
        return toFn(value(to, from, dragEl2, evt), pull)(to, from, dragEl2, evt);
      } else {
        var otherGroup = (pull ? to : from).options.group.name;
        return value === true || typeof value === "string" && value === otherGroup || value.join && value.indexOf(otherGroup) > -1;
      }
    };
  }
  var group = {};
  var originalGroup = options.group;
  if (!originalGroup || _typeof(originalGroup) != "object") {
    originalGroup = {
      name: originalGroup
    };
  }
  group.name = originalGroup.name;
  group.checkPull = toFn(originalGroup.pull, true);
  group.checkPut = toFn(originalGroup.put);
  group.revertClone = originalGroup.revertClone;
  options.group = group;
};
var _hideGhostForTarget = function _hideGhostForTarget2() {
  if (!supportCssPointerEvents && ghostEl) {
    css(ghostEl, "display", "none");
  }
};
var _unhideGhostForTarget = function _unhideGhostForTarget2() {
  if (!supportCssPointerEvents && ghostEl) {
    css(ghostEl, "display", "");
  }
};
if (documentExists && !ChromeForAndroid) {
  document.addEventListener("click", function(evt) {
    if (ignoreNextClick) {
      evt.preventDefault();
      evt.stopPropagation && evt.stopPropagation();
      evt.stopImmediatePropagation && evt.stopImmediatePropagation();
      ignoreNextClick = false;
      return false;
    }
  }, true);
}
var nearestEmptyInsertDetectEvent = function nearestEmptyInsertDetectEvent2(evt) {
  if (dragEl) {
    evt = evt.touches ? evt.touches[0] : evt;
    var nearest = _detectNearestEmptySortable(evt.clientX, evt.clientY);
    if (nearest) {
      var event = {};
      for (var i in evt) {
        if (evt.hasOwnProperty(i)) {
          event[i] = evt[i];
        }
      }
      event.target = event.rootEl = nearest;
      event.preventDefault = void 0;
      event.stopPropagation = void 0;
      nearest[expando]._onDragOver(event);
    }
  }
};
var _checkOutsideTargetEl = function _checkOutsideTargetEl2(evt) {
  if (dragEl) {
    dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
  }
};
function Sortable(el, options) {
  if (!(el && el.nodeType && el.nodeType === 1)) {
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(el));
  }
  this.el = el;
  this.options = options = _extends({}, options);
  el[expando] = this;
  var defaults2 = {
    group: null,
    sort: true,
    disabled: false,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(el.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: false,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: true,
    direction: function direction() {
      return _detectDirection(el, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: true,
    animation: 0,
    easing: null,
    setData: function setData(dataTransfer, dragEl2) {
      dataTransfer.setData("Text", dragEl2.textContent);
    },
    dropBubble: false,
    dragoverBubble: false,
    dataIdAttr: "data-id",
    delay: 0,
    delayOnTouchOnly: false,
    touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
    forceFallback: false,
    fallbackClass: "sortable-fallback",
    fallbackOnBody: false,
    fallbackTolerance: 0,
    fallbackOffset: {
      x: 0,
      y: 0
    },
    // Disabled on Safari: #1571; Enabled on Safari IOS: #2244
    supportPointer: Sortable.supportPointer !== false && "PointerEvent" in window && (!Safari || IOS),
    emptyInsertThreshold: 5
  };
  PluginManager.initializePlugins(this, el, defaults2);
  for (var name in defaults2) {
    !(name in options) && (options[name] = defaults2[name]);
  }
  _prepareGroup(options);
  for (var fn in this) {
    if (fn.charAt(0) === "_" && typeof this[fn] === "function") {
      this[fn] = this[fn].bind(this);
    }
  }
  this.nativeDraggable = options.forceFallback ? false : supportDraggable;
  if (this.nativeDraggable) {
    this.options.touchStartThreshold = 1;
  }
  if (options.supportPointer) {
    on(el, "pointerdown", this._onTapStart);
  } else {
    on(el, "mousedown", this._onTapStart);
    on(el, "touchstart", this._onTapStart);
  }
  if (this.nativeDraggable) {
    on(el, "dragover", this);
    on(el, "dragenter", this);
  }
  sortables.push(this.el);
  options.store && options.store.get && this.sort(options.store.get(this) || []);
  _extends(this, AnimationStateManager());
}
Sortable.prototype = /** @lends Sortable.prototype */
{
  constructor: Sortable,
  _isOutsideThisEl: function _isOutsideThisEl(target) {
    if (!this.el.contains(target) && target !== this.el) {
      lastTarget = null;
    }
  },
  _getDirection: function _getDirection(evt, target) {
    return typeof this.options.direction === "function" ? this.options.direction.call(this, evt, target, dragEl) : this.options.direction;
  },
  _onTapStart: function _onTapStart(evt) {
    if (!evt.cancelable) return;
    var _this = this, el = this.el, options = this.options, preventOnFilter = options.preventOnFilter, type = evt.type, touch = evt.touches && evt.touches[0] || evt.pointerType && evt.pointerType === "touch" && evt, target = (touch || evt).target, originalTarget = evt.target.shadowRoot && (evt.path && evt.path[0] || evt.composedPath && evt.composedPath()[0]) || target, filter = options.filter;
    _saveInputCheckedState(el);
    if (dragEl) {
      return;
    }
    if (/mousedown|pointerdown/.test(type) && evt.button !== 0 || options.disabled) {
      return;
    }
    if (originalTarget.isContentEditable) {
      return;
    }
    if (!this.nativeDraggable && Safari && target && target.tagName.toUpperCase() === "SELECT") {
      return;
    }
    target = closest(target, options.draggable, el, false);
    if (target && target.animated) {
      return;
    }
    if (lastDownEl === target) {
      return;
    }
    oldIndex = index(target);
    oldDraggableIndex = index(target, options.draggable);
    if (typeof filter === "function") {
      if (filter.call(this, evt, target, this)) {
        _dispatchEvent({
          sortable: _this,
          rootEl: originalTarget,
          name: "filter",
          targetEl: target,
          toEl: el,
          fromEl: el
        });
        pluginEvent2("filter", _this, {
          evt
        });
        preventOnFilter && evt.preventDefault();
        return;
      }
    } else if (filter) {
      filter = filter.split(",").some(function(criteria) {
        criteria = closest(originalTarget, criteria.trim(), el, false);
        if (criteria) {
          _dispatchEvent({
            sortable: _this,
            rootEl: criteria,
            name: "filter",
            targetEl: target,
            fromEl: el,
            toEl: el
          });
          pluginEvent2("filter", _this, {
            evt
          });
          return true;
        }
      });
      if (filter) {
        preventOnFilter && evt.preventDefault();
        return;
      }
    }
    if (options.handle && !closest(originalTarget, options.handle, el, false)) {
      return;
    }
    this._prepareDragStart(evt, touch, target);
  },
  _prepareDragStart: function _prepareDragStart(evt, touch, target) {
    var _this = this, el = _this.el, options = _this.options, ownerDocument = el.ownerDocument, dragStartFn;
    if (target && !dragEl && target.parentNode === el) {
      var dragRect = getRect(target);
      rootEl = el;
      dragEl = target;
      parentEl = dragEl.parentNode;
      nextEl = dragEl.nextSibling;
      lastDownEl = target;
      activeGroup = options.group;
      Sortable.dragged = dragEl;
      tapEvt = {
        target: dragEl,
        clientX: (touch || evt).clientX,
        clientY: (touch || evt).clientY
      };
      tapDistanceLeft = tapEvt.clientX - dragRect.left;
      tapDistanceTop = tapEvt.clientY - dragRect.top;
      this._lastX = (touch || evt).clientX;
      this._lastY = (touch || evt).clientY;
      dragEl.style["will-change"] = "all";
      dragStartFn = function dragStartFn2() {
        pluginEvent2("delayEnded", _this, {
          evt
        });
        if (Sortable.eventCanceled) {
          _this._onDrop();
          return;
        }
        _this._disableDelayedDragEvents();
        if (!FireFox && _this.nativeDraggable) {
          dragEl.draggable = true;
        }
        _this._triggerDragStart(evt, touch);
        _dispatchEvent({
          sortable: _this,
          name: "choose",
          originalEvent: evt
        });
        toggleClass(dragEl, options.chosenClass, true);
      };
      options.ignore.split(",").forEach(function(criteria) {
        find(dragEl, criteria.trim(), _disableDraggable);
      });
      on(ownerDocument, "dragover", nearestEmptyInsertDetectEvent);
      on(ownerDocument, "mousemove", nearestEmptyInsertDetectEvent);
      on(ownerDocument, "touchmove", nearestEmptyInsertDetectEvent);
      if (options.supportPointer) {
        on(ownerDocument, "pointerup", _this._onDrop);
        !this.nativeDraggable && on(ownerDocument, "pointercancel", _this._onDrop);
      } else {
        on(ownerDocument, "mouseup", _this._onDrop);
        on(ownerDocument, "touchend", _this._onDrop);
        on(ownerDocument, "touchcancel", _this._onDrop);
      }
      if (FireFox && this.nativeDraggable) {
        this.options.touchStartThreshold = 4;
        dragEl.draggable = true;
      }
      pluginEvent2("delayStart", this, {
        evt
      });
      if (options.delay && (!options.delayOnTouchOnly || touch) && (!this.nativeDraggable || !(Edge || IE11OrLess))) {
        if (Sortable.eventCanceled) {
          this._onDrop();
          return;
        }
        if (options.supportPointer) {
          on(ownerDocument, "pointerup", _this._disableDelayedDrag);
          on(ownerDocument, "pointercancel", _this._disableDelayedDrag);
        } else {
          on(ownerDocument, "mouseup", _this._disableDelayedDrag);
          on(ownerDocument, "touchend", _this._disableDelayedDrag);
          on(ownerDocument, "touchcancel", _this._disableDelayedDrag);
        }
        on(ownerDocument, "mousemove", _this._delayedDragTouchMoveHandler);
        on(ownerDocument, "touchmove", _this._delayedDragTouchMoveHandler);
        options.supportPointer && on(ownerDocument, "pointermove", _this._delayedDragTouchMoveHandler);
        _this._dragStartTimer = setTimeout(dragStartFn, options.delay);
      } else {
        dragStartFn();
      }
    }
  },
  _delayedDragTouchMoveHandler: function _delayedDragTouchMoveHandler(e) {
    var touch = e.touches ? e.touches[0] : e;
    if (Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1))) {
      this._disableDelayedDrag();
    }
  },
  _disableDelayedDrag: function _disableDelayedDrag() {
    dragEl && _disableDraggable(dragEl);
    clearTimeout(this._dragStartTimer);
    this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function _disableDelayedDragEvents() {
    var ownerDocument = this.el.ownerDocument;
    off(ownerDocument, "mouseup", this._disableDelayedDrag);
    off(ownerDocument, "touchend", this._disableDelayedDrag);
    off(ownerDocument, "touchcancel", this._disableDelayedDrag);
    off(ownerDocument, "pointerup", this._disableDelayedDrag);
    off(ownerDocument, "pointercancel", this._disableDelayedDrag);
    off(ownerDocument, "mousemove", this._delayedDragTouchMoveHandler);
    off(ownerDocument, "touchmove", this._delayedDragTouchMoveHandler);
    off(ownerDocument, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function _triggerDragStart(evt, touch) {
    touch = touch || evt.pointerType == "touch" && evt;
    if (!this.nativeDraggable || touch) {
      if (this.options.supportPointer) {
        on(document, "pointermove", this._onTouchMove);
      } else if (touch) {
        on(document, "touchmove", this._onTouchMove);
      } else {
        on(document, "mousemove", this._onTouchMove);
      }
    } else {
      on(dragEl, "dragend", this);
      on(rootEl, "dragstart", this._onDragStart);
    }
    try {
      if (document.selection) {
        _nextTick(function() {
          document.selection.empty();
        });
      } else {
        window.getSelection().removeAllRanges();
      }
    } catch (err) {
    }
  },
  _dragStarted: function _dragStarted(fallback, evt) {
    awaitingDragStarted = false;
    if (rootEl && dragEl) {
      pluginEvent2("dragStarted", this, {
        evt
      });
      if (this.nativeDraggable) {
        on(document, "dragover", _checkOutsideTargetEl);
      }
      var options = this.options;
      !fallback && toggleClass(dragEl, options.dragClass, false);
      toggleClass(dragEl, options.ghostClass, true);
      Sortable.active = this;
      fallback && this._appendGhost();
      _dispatchEvent({
        sortable: this,
        name: "start",
        originalEvent: evt
      });
    } else {
      this._nulling();
    }
  },
  _emulateDragOver: function _emulateDragOver() {
    if (touchEvt) {
      this._lastX = touchEvt.clientX;
      this._lastY = touchEvt.clientY;
      _hideGhostForTarget();
      var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
      var parent = target;
      while (target && target.shadowRoot) {
        target = target.shadowRoot.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
        if (target === parent) break;
        parent = target;
      }
      dragEl.parentNode[expando]._isOutsideThisEl(target);
      if (parent) {
        do {
          if (parent[expando]) {
            var inserted = void 0;
            inserted = parent[expando]._onDragOver({
              clientX: touchEvt.clientX,
              clientY: touchEvt.clientY,
              target,
              rootEl: parent
            });
            if (inserted && !this.options.dragoverBubble) {
              break;
            }
          }
          target = parent;
        } while (parent = getParentOrHost(parent));
      }
      _unhideGhostForTarget();
    }
  },
  _onTouchMove: function _onTouchMove(evt) {
    if (tapEvt) {
      var options = this.options, fallbackTolerance = options.fallbackTolerance, fallbackOffset = options.fallbackOffset, touch = evt.touches ? evt.touches[0] : evt, ghostMatrix = ghostEl && matrix(ghostEl, true), scaleX = ghostEl && ghostMatrix && ghostMatrix.a, scaleY = ghostEl && ghostMatrix && ghostMatrix.d, relativeScrollOffset = PositionGhostAbsolutely && ghostRelativeParent && getRelativeScrollOffset(ghostRelativeParent), dx = (touch.clientX - tapEvt.clientX + fallbackOffset.x) / (scaleX || 1) + (relativeScrollOffset ? relativeScrollOffset[0] - ghostRelativeParentInitialScroll[0] : 0) / (scaleX || 1), dy = (touch.clientY - tapEvt.clientY + fallbackOffset.y) / (scaleY || 1) + (relativeScrollOffset ? relativeScrollOffset[1] - ghostRelativeParentInitialScroll[1] : 0) / (scaleY || 1);
      if (!Sortable.active && !awaitingDragStarted) {
        if (fallbackTolerance && Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) < fallbackTolerance) {
          return;
        }
        this._onDragStart(evt, true);
      }
      if (ghostEl) {
        if (ghostMatrix) {
          ghostMatrix.e += dx - (lastDx || 0);
          ghostMatrix.f += dy - (lastDy || 0);
        } else {
          ghostMatrix = {
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            e: dx,
            f: dy
          };
        }
        var cssMatrix = "matrix(".concat(ghostMatrix.a, ",").concat(ghostMatrix.b, ",").concat(ghostMatrix.c, ",").concat(ghostMatrix.d, ",").concat(ghostMatrix.e, ",").concat(ghostMatrix.f, ")");
        css(ghostEl, "webkitTransform", cssMatrix);
        css(ghostEl, "mozTransform", cssMatrix);
        css(ghostEl, "msTransform", cssMatrix);
        css(ghostEl, "transform", cssMatrix);
        lastDx = dx;
        lastDy = dy;
        touchEvt = touch;
      }
      evt.cancelable && evt.preventDefault();
    }
  },
  _appendGhost: function _appendGhost() {
    if (!ghostEl) {
      var container = this.options.fallbackOnBody ? document.body : rootEl, rect = getRect(dragEl, true, PositionGhostAbsolutely, true, container), options = this.options;
      if (PositionGhostAbsolutely) {
        ghostRelativeParent = container;
        while (css(ghostRelativeParent, "position") === "static" && css(ghostRelativeParent, "transform") === "none" && ghostRelativeParent !== document) {
          ghostRelativeParent = ghostRelativeParent.parentNode;
        }
        if (ghostRelativeParent !== document.body && ghostRelativeParent !== document.documentElement) {
          if (ghostRelativeParent === document) ghostRelativeParent = getWindowScrollingElement();
          rect.top += ghostRelativeParent.scrollTop;
          rect.left += ghostRelativeParent.scrollLeft;
        } else {
          ghostRelativeParent = getWindowScrollingElement();
        }
        ghostRelativeParentInitialScroll = getRelativeScrollOffset(ghostRelativeParent);
      }
      ghostEl = dragEl.cloneNode(true);
      toggleClass(ghostEl, options.ghostClass, false);
      toggleClass(ghostEl, options.fallbackClass, true);
      toggleClass(ghostEl, options.dragClass, true);
      css(ghostEl, "transition", "");
      css(ghostEl, "transform", "");
      css(ghostEl, "box-sizing", "border-box");
      css(ghostEl, "margin", 0);
      css(ghostEl, "top", rect.top);
      css(ghostEl, "left", rect.left);
      css(ghostEl, "width", rect.width);
      css(ghostEl, "height", rect.height);
      css(ghostEl, "opacity", "0.8");
      css(ghostEl, "position", PositionGhostAbsolutely ? "absolute" : "fixed");
      css(ghostEl, "zIndex", "100000");
      css(ghostEl, "pointerEvents", "none");
      Sortable.ghost = ghostEl;
      container.appendChild(ghostEl);
      css(ghostEl, "transform-origin", tapDistanceLeft / parseInt(ghostEl.style.width) * 100 + "% " + tapDistanceTop / parseInt(ghostEl.style.height) * 100 + "%");
    }
  },
  _onDragStart: function _onDragStart(evt, fallback) {
    var _this = this;
    var dataTransfer = evt.dataTransfer;
    var options = _this.options;
    pluginEvent2("dragStart", this, {
      evt
    });
    if (Sortable.eventCanceled) {
      this._onDrop();
      return;
    }
    pluginEvent2("setupClone", this);
    if (!Sortable.eventCanceled) {
      cloneEl = clone(dragEl);
      cloneEl.removeAttribute("id");
      cloneEl.draggable = false;
      cloneEl.style["will-change"] = "";
      this._hideClone();
      toggleClass(cloneEl, this.options.chosenClass, false);
      Sortable.clone = cloneEl;
    }
    _this.cloneId = _nextTick(function() {
      pluginEvent2("clone", _this);
      if (Sortable.eventCanceled) return;
      if (!_this.options.removeCloneOnHide) {
        rootEl.insertBefore(cloneEl, dragEl);
      }
      _this._hideClone();
      _dispatchEvent({
        sortable: _this,
        name: "clone"
      });
    });
    !fallback && toggleClass(dragEl, options.dragClass, true);
    if (fallback) {
      ignoreNextClick = true;
      _this._loopId = setInterval(_this._emulateDragOver, 50);
    } else {
      off(document, "mouseup", _this._onDrop);
      off(document, "touchend", _this._onDrop);
      off(document, "touchcancel", _this._onDrop);
      if (dataTransfer) {
        dataTransfer.effectAllowed = "move";
        options.setData && options.setData.call(_this, dataTransfer, dragEl);
      }
      on(document, "drop", _this);
      css(dragEl, "transform", "translateZ(0)");
    }
    awaitingDragStarted = true;
    _this._dragStartId = _nextTick(_this._dragStarted.bind(_this, fallback, evt));
    on(document, "selectstart", _this);
    moved = true;
    window.getSelection().removeAllRanges();
    if (Safari) {
      css(document.body, "user-select", "none");
    }
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function _onDragOver(evt) {
    var el = this.el, target = evt.target, dragRect, targetRect, revert, options = this.options, group = options.group, activeSortable = Sortable.active, isOwner = activeGroup === group, canSort = options.sort, fromSortable = putSortable || activeSortable, vertical, _this = this, completedFired = false;
    if (_silent) return;
    function dragOverEvent(name, extra) {
      pluginEvent2(name, _this, _objectSpread2({
        evt,
        isOwner,
        axis: vertical ? "vertical" : "horizontal",
        revert,
        dragRect,
        targetRect,
        canSort,
        fromSortable,
        target,
        completed,
        onMove: function onMove(target2, after2) {
          return _onMove(rootEl, el, dragEl, dragRect, target2, getRect(target2), evt, after2);
        },
        changed
      }, extra));
    }
    function capture() {
      dragOverEvent("dragOverAnimationCapture");
      _this.captureAnimationState();
      if (_this !== fromSortable) {
        fromSortable.captureAnimationState();
      }
    }
    function completed(insertion) {
      dragOverEvent("dragOverCompleted", {
        insertion
      });
      if (insertion) {
        if (isOwner) {
          activeSortable._hideClone();
        } else {
          activeSortable._showClone(_this);
        }
        if (_this !== fromSortable) {
          toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : activeSortable.options.ghostClass, false);
          toggleClass(dragEl, options.ghostClass, true);
        }
        if (putSortable !== _this && _this !== Sortable.active) {
          putSortable = _this;
        } else if (_this === Sortable.active && putSortable) {
          putSortable = null;
        }
        if (fromSortable === _this) {
          _this._ignoreWhileAnimating = target;
        }
        _this.animateAll(function() {
          dragOverEvent("dragOverAnimationComplete");
          _this._ignoreWhileAnimating = null;
        });
        if (_this !== fromSortable) {
          fromSortable.animateAll();
          fromSortable._ignoreWhileAnimating = null;
        }
      }
      if (target === dragEl && !dragEl.animated || target === el && !target.animated) {
        lastTarget = null;
      }
      if (!options.dragoverBubble && !evt.rootEl && target !== document) {
        dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
        !insertion && nearestEmptyInsertDetectEvent(evt);
      }
      !options.dragoverBubble && evt.stopPropagation && evt.stopPropagation();
      return completedFired = true;
    }
    function changed() {
      newIndex = index(dragEl);
      newDraggableIndex = index(dragEl, options.draggable);
      _dispatchEvent({
        sortable: _this,
        name: "change",
        toEl: el,
        newIndex,
        newDraggableIndex,
        originalEvent: evt
      });
    }
    if (evt.preventDefault !== void 0) {
      evt.cancelable && evt.preventDefault();
    }
    target = closest(target, options.draggable, el, true);
    dragOverEvent("dragOver");
    if (Sortable.eventCanceled) return completedFired;
    if (dragEl.contains(evt.target) || target.animated && target.animatingX && target.animatingY || _this._ignoreWhileAnimating === target) {
      return completed(false);
    }
    ignoreNextClick = false;
    if (activeSortable && !options.disabled && (isOwner ? canSort || (revert = parentEl !== rootEl) : putSortable === this || (this.lastPutMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) && group.checkPut(this, activeSortable, dragEl, evt))) {
      vertical = this._getDirection(evt, target) === "vertical";
      dragRect = getRect(dragEl);
      dragOverEvent("dragOverValid");
      if (Sortable.eventCanceled) return completedFired;
      if (revert) {
        parentEl = rootEl;
        capture();
        this._hideClone();
        dragOverEvent("revert");
        if (!Sortable.eventCanceled) {
          if (nextEl) {
            rootEl.insertBefore(dragEl, nextEl);
          } else {
            rootEl.appendChild(dragEl);
          }
        }
        return completed(true);
      }
      var elLastChild = lastChild(el, options.draggable);
      if (!elLastChild || _ghostIsLast(evt, vertical, this) && !elLastChild.animated) {
        if (elLastChild === dragEl) {
          return completed(false);
        }
        if (elLastChild && el === evt.target) {
          target = elLastChild;
        }
        if (target) {
          targetRect = getRect(target);
        }
        if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, !!target) !== false) {
          capture();
          if (elLastChild && elLastChild.nextSibling) {
            el.insertBefore(dragEl, elLastChild.nextSibling);
          } else {
            el.appendChild(dragEl);
          }
          parentEl = el;
          changed();
          return completed(true);
        }
      } else if (elLastChild && _ghostIsFirst(evt, vertical, this)) {
        var firstChild = getChild(el, 0, options, true);
        if (firstChild === dragEl) {
          return completed(false);
        }
        target = firstChild;
        targetRect = getRect(target);
        if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, false) !== false) {
          capture();
          el.insertBefore(dragEl, firstChild);
          parentEl = el;
          changed();
          return completed(true);
        }
      } else if (target.parentNode === el) {
        targetRect = getRect(target);
        var direction = 0, targetBeforeFirstSwap, differentLevel = dragEl.parentNode !== el, differentRowCol = !_dragElInRowColumn(dragEl.animated && dragEl.toRect || dragRect, target.animated && target.toRect || targetRect, vertical), side1 = vertical ? "top" : "left", scrolledPastTop = isScrolledPast(target, "top", "top") || isScrolledPast(dragEl, "top", "top"), scrollBefore = scrolledPastTop ? scrolledPastTop.scrollTop : void 0;
        if (lastTarget !== target) {
          targetBeforeFirstSwap = targetRect[side1];
          pastFirstInvertThresh = false;
          isCircumstantialInvert = !differentRowCol && options.invertSwap || differentLevel;
        }
        direction = _getSwapDirection(evt, target, targetRect, vertical, differentRowCol ? 1 : options.swapThreshold, options.invertedSwapThreshold == null ? options.swapThreshold : options.invertedSwapThreshold, isCircumstantialInvert, lastTarget === target);
        var sibling;
        if (direction !== 0) {
          var dragIndex = index(dragEl);
          do {
            dragIndex -= direction;
            sibling = parentEl.children[dragIndex];
          } while (sibling && (css(sibling, "display") === "none" || sibling === ghostEl));
        }
        if (direction === 0 || sibling === target) {
          return completed(false);
        }
        lastTarget = target;
        lastDirection = direction;
        var nextSibling = target.nextElementSibling, after = false;
        after = direction === 1;
        var moveVector = _onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, after);
        if (moveVector !== false) {
          if (moveVector === 1 || moveVector === -1) {
            after = moveVector === 1;
          }
          _silent = true;
          setTimeout(_unsilent, 30);
          capture();
          if (after && !nextSibling) {
            el.appendChild(dragEl);
          } else {
            target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
          }
          if (scrolledPastTop) {
            scrollBy(scrolledPastTop, 0, scrollBefore - scrolledPastTop.scrollTop);
          }
          parentEl = dragEl.parentNode;
          if (targetBeforeFirstSwap !== void 0 && !isCircumstantialInvert) {
            targetMoveDistance = Math.abs(targetBeforeFirstSwap - getRect(target)[side1]);
          }
          changed();
          return completed(true);
        }
      }
      if (el.contains(dragEl)) {
        return completed(false);
      }
    }
    return false;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function _offMoveEvents() {
    off(document, "mousemove", this._onTouchMove);
    off(document, "touchmove", this._onTouchMove);
    off(document, "pointermove", this._onTouchMove);
    off(document, "dragover", nearestEmptyInsertDetectEvent);
    off(document, "mousemove", nearestEmptyInsertDetectEvent);
    off(document, "touchmove", nearestEmptyInsertDetectEvent);
  },
  _offUpEvents: function _offUpEvents() {
    var ownerDocument = this.el.ownerDocument;
    off(ownerDocument, "mouseup", this._onDrop);
    off(ownerDocument, "touchend", this._onDrop);
    off(ownerDocument, "pointerup", this._onDrop);
    off(ownerDocument, "pointercancel", this._onDrop);
    off(ownerDocument, "touchcancel", this._onDrop);
    off(document, "selectstart", this);
  },
  _onDrop: function _onDrop(evt) {
    var el = this.el, options = this.options;
    newIndex = index(dragEl);
    newDraggableIndex = index(dragEl, options.draggable);
    pluginEvent2("drop", this, {
      evt
    });
    parentEl = dragEl && dragEl.parentNode;
    newIndex = index(dragEl);
    newDraggableIndex = index(dragEl, options.draggable);
    if (Sortable.eventCanceled) {
      this._nulling();
      return;
    }
    awaitingDragStarted = false;
    isCircumstantialInvert = false;
    pastFirstInvertThresh = false;
    clearInterval(this._loopId);
    clearTimeout(this._dragStartTimer);
    _cancelNextTick(this.cloneId);
    _cancelNextTick(this._dragStartId);
    if (this.nativeDraggable) {
      off(document, "drop", this);
      off(el, "dragstart", this._onDragStart);
    }
    this._offMoveEvents();
    this._offUpEvents();
    if (Safari) {
      css(document.body, "user-select", "");
    }
    css(dragEl, "transform", "");
    if (evt) {
      if (moved) {
        evt.cancelable && evt.preventDefault();
        !options.dropBubble && evt.stopPropagation();
      }
      ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);
      if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== "clone") {
        cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
      }
      if (dragEl) {
        if (this.nativeDraggable) {
          off(dragEl, "dragend", this);
        }
        _disableDraggable(dragEl);
        dragEl.style["will-change"] = "";
        if (moved && !awaitingDragStarted) {
          toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : this.options.ghostClass, false);
        }
        toggleClass(dragEl, this.options.chosenClass, false);
        _dispatchEvent({
          sortable: this,
          name: "unchoose",
          toEl: parentEl,
          newIndex: null,
          newDraggableIndex: null,
          originalEvent: evt
        });
        if (rootEl !== parentEl) {
          if (newIndex >= 0) {
            _dispatchEvent({
              rootEl: parentEl,
              name: "add",
              toEl: parentEl,
              fromEl: rootEl,
              originalEvent: evt
            });
            _dispatchEvent({
              sortable: this,
              name: "remove",
              toEl: parentEl,
              originalEvent: evt
            });
            _dispatchEvent({
              rootEl: parentEl,
              name: "sort",
              toEl: parentEl,
              fromEl: rootEl,
              originalEvent: evt
            });
            _dispatchEvent({
              sortable: this,
              name: "sort",
              toEl: parentEl,
              originalEvent: evt
            });
          }
          putSortable && putSortable.save();
        } else {
          if (newIndex !== oldIndex) {
            if (newIndex >= 0) {
              _dispatchEvent({
                sortable: this,
                name: "update",
                toEl: parentEl,
                originalEvent: evt
              });
              _dispatchEvent({
                sortable: this,
                name: "sort",
                toEl: parentEl,
                originalEvent: evt
              });
            }
          }
        }
        if (Sortable.active) {
          if (newIndex == null || newIndex === -1) {
            newIndex = oldIndex;
            newDraggableIndex = oldDraggableIndex;
          }
          _dispatchEvent({
            sortable: this,
            name: "end",
            toEl: parentEl,
            originalEvent: evt
          });
          this.save();
        }
      }
    }
    this._nulling();
  },
  _nulling: function _nulling() {
    pluginEvent2("nulling", this);
    rootEl = dragEl = parentEl = ghostEl = nextEl = cloneEl = lastDownEl = cloneHidden = tapEvt = touchEvt = moved = newIndex = newDraggableIndex = oldIndex = oldDraggableIndex = lastTarget = lastDirection = putSortable = activeGroup = Sortable.dragged = Sortable.ghost = Sortable.clone = Sortable.active = null;
    savedInputChecked.forEach(function(el) {
      el.checked = true;
    });
    savedInputChecked.length = lastDx = lastDy = 0;
  },
  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case "drop":
      case "dragend":
        this._onDrop(evt);
        break;
      case "dragenter":
      case "dragover":
        if (dragEl) {
          this._onDragOver(evt);
          _globalDragOver(evt);
        }
        break;
      case "selectstart":
        evt.preventDefault();
        break;
    }
  },
  /**
   * Serializes the item into an array of string.
   * @returns {String[]}
   */
  toArray: function toArray() {
    var order = [], el, children = this.el.children, i = 0, n = children.length, options = this.options;
    for (; i < n; i++) {
      el = children[i];
      if (closest(el, options.draggable, this.el, false)) {
        order.push(el.getAttribute(options.dataIdAttr) || _generateId(el));
      }
    }
    return order;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function sort(order, useAnimation) {
    var items = {}, rootEl2 = this.el;
    this.toArray().forEach(function(id2, i) {
      var el = rootEl2.children[i];
      if (closest(el, this.options.draggable, rootEl2, false)) {
        items[id2] = el;
      }
    }, this);
    useAnimation && this.captureAnimationState();
    order.forEach(function(id2) {
      if (items[id2]) {
        rootEl2.removeChild(items[id2]);
        rootEl2.appendChild(items[id2]);
      }
    });
    useAnimation && this.animateAll();
  },
  /**
   * Save the current sorting
   */
  save: function save() {
    var store = this.options.store;
    store && store.set && store.set(this);
  },
  /**
   * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
   * @param   {HTMLElement}  el
   * @param   {String}       [selector]  default: `options.draggable`
   * @returns {HTMLElement|null}
   */
  closest: function closest$1(el, selector) {
    return closest(el, selector || this.options.draggable, this.el, false);
  },
  /**
   * Set/get option
   * @param   {string} name
   * @param   {*}      [value]
   * @returns {*}
   */
  option: function option(name, value) {
    var options = this.options;
    if (value === void 0) {
      return options[name];
    } else {
      var modifiedValue = PluginManager.modifyOption(this, name, value);
      if (typeof modifiedValue !== "undefined") {
        options[name] = modifiedValue;
      } else {
        options[name] = value;
      }
      if (name === "group") {
        _prepareGroup(options);
      }
    }
  },
  /**
   * Destroy
   */
  destroy: function destroy() {
    pluginEvent2("destroy", this);
    var el = this.el;
    el[expando] = null;
    off(el, "mousedown", this._onTapStart);
    off(el, "touchstart", this._onTapStart);
    off(el, "pointerdown", this._onTapStart);
    if (this.nativeDraggable) {
      off(el, "dragover", this);
      off(el, "dragenter", this);
    }
    Array.prototype.forEach.call(el.querySelectorAll("[draggable]"), function(el2) {
      el2.removeAttribute("draggable");
    });
    this._onDrop();
    this._disableDelayedDragEvents();
    sortables.splice(sortables.indexOf(this.el), 1);
    this.el = el = null;
  },
  _hideClone: function _hideClone() {
    if (!cloneHidden) {
      pluginEvent2("hideClone", this);
      if (Sortable.eventCanceled) return;
      css(cloneEl, "display", "none");
      if (this.options.removeCloneOnHide && cloneEl.parentNode) {
        cloneEl.parentNode.removeChild(cloneEl);
      }
      cloneHidden = true;
    }
  },
  _showClone: function _showClone(putSortable2) {
    if (putSortable2.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (cloneHidden) {
      pluginEvent2("showClone", this);
      if (Sortable.eventCanceled) return;
      if (dragEl.parentNode == rootEl && !this.options.group.revertClone) {
        rootEl.insertBefore(cloneEl, dragEl);
      } else if (nextEl) {
        rootEl.insertBefore(cloneEl, nextEl);
      } else {
        rootEl.appendChild(cloneEl);
      }
      if (this.options.group.revertClone) {
        this.animate(dragEl, cloneEl);
      }
      css(cloneEl, "display", "");
      cloneHidden = false;
    }
  }
};
function _globalDragOver(evt) {
  if (evt.dataTransfer) {
    evt.dataTransfer.dropEffect = "move";
  }
  evt.cancelable && evt.preventDefault();
}
function _onMove(fromEl, toEl, dragEl2, dragRect, targetEl, targetRect, originalEvent, willInsertAfter) {
  var evt, sortable = fromEl[expando], onMoveFn = sortable.options.onMove, retVal;
  if (window.CustomEvent && !IE11OrLess && !Edge) {
    evt = new CustomEvent("move", {
      bubbles: true,
      cancelable: true
    });
  } else {
    evt = document.createEvent("Event");
    evt.initEvent("move", true, true);
  }
  evt.to = toEl;
  evt.from = fromEl;
  evt.dragged = dragEl2;
  evt.draggedRect = dragRect;
  evt.related = targetEl || toEl;
  evt.relatedRect = targetRect || getRect(toEl);
  evt.willInsertAfter = willInsertAfter;
  evt.originalEvent = originalEvent;
  fromEl.dispatchEvent(evt);
  if (onMoveFn) {
    retVal = onMoveFn.call(sortable, evt, originalEvent);
  }
  return retVal;
}
function _disableDraggable(el) {
  el.draggable = false;
}
function _unsilent() {
  _silent = false;
}
function _ghostIsFirst(evt, vertical, sortable) {
  var firstElRect = getRect(getChild(sortable.el, 0, sortable.options, true));
  var childContainingRect = getChildContainingRectFromElement(sortable.el, sortable.options, ghostEl);
  var spacer = 10;
  return vertical ? evt.clientX < childContainingRect.left - spacer || evt.clientY < firstElRect.top && evt.clientX < firstElRect.right : evt.clientY < childContainingRect.top - spacer || evt.clientY < firstElRect.bottom && evt.clientX < firstElRect.left;
}
function _ghostIsLast(evt, vertical, sortable) {
  var lastElRect = getRect(lastChild(sortable.el, sortable.options.draggable));
  var childContainingRect = getChildContainingRectFromElement(sortable.el, sortable.options, ghostEl);
  var spacer = 10;
  return vertical ? evt.clientX > childContainingRect.right + spacer || evt.clientY > lastElRect.bottom && evt.clientX > lastElRect.left : evt.clientY > childContainingRect.bottom + spacer || evt.clientX > lastElRect.right && evt.clientY > lastElRect.top;
}
function _getSwapDirection(evt, target, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
  var mouseOnAxis = vertical ? evt.clientY : evt.clientX, targetLength = vertical ? targetRect.height : targetRect.width, targetS1 = vertical ? targetRect.top : targetRect.left, targetS2 = vertical ? targetRect.bottom : targetRect.right, invert = false;
  if (!invertSwap) {
    if (isLastTarget && targetMoveDistance < targetLength * swapThreshold) {
      if (!pastFirstInvertThresh && (lastDirection === 1 ? mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2 : mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)) {
        pastFirstInvertThresh = true;
      }
      if (!pastFirstInvertThresh) {
        if (lastDirection === 1 ? mouseOnAxis < targetS1 + targetMoveDistance : mouseOnAxis > targetS2 - targetMoveDistance) {
          return -lastDirection;
        }
      } else {
        invert = true;
      }
    } else {
      if (mouseOnAxis > targetS1 + targetLength * (1 - swapThreshold) / 2 && mouseOnAxis < targetS2 - targetLength * (1 - swapThreshold) / 2) {
        return _getInsertDirection(target);
      }
    }
  }
  invert = invert || invertSwap;
  if (invert) {
    if (mouseOnAxis < targetS1 + targetLength * invertedSwapThreshold / 2 || mouseOnAxis > targetS2 - targetLength * invertedSwapThreshold / 2) {
      return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
    }
  }
  return 0;
}
function _getInsertDirection(target) {
  if (index(dragEl) < index(target)) {
    return 1;
  } else {
    return -1;
  }
}
function _generateId(el) {
  var str = el.tagName + el.className + el.src + el.href + el.textContent, i = str.length, sum = 0;
  while (i--) {
    sum += str.charCodeAt(i);
  }
  return sum.toString(36);
}
function _saveInputCheckedState(root) {
  savedInputChecked.length = 0;
  var inputs = root.getElementsByTagName("input");
  var idx = inputs.length;
  while (idx--) {
    var el = inputs[idx];
    el.checked && savedInputChecked.push(el);
  }
}
function _nextTick(fn) {
  return setTimeout(fn, 0);
}
function _cancelNextTick(id2) {
  return clearTimeout(id2);
}
if (documentExists) {
  on(document, "touchmove", function(evt) {
    if ((Sortable.active || awaitingDragStarted) && evt.cancelable) {
      evt.preventDefault();
    }
  });
}
Sortable.utils = {
  on,
  off,
  css,
  find,
  is: function is(el, selector) {
    return !!closest(el, selector, el, false);
  },
  extend,
  throttle,
  closest,
  toggleClass,
  clone,
  index,
  nextTick: _nextTick,
  cancelNextTick: _cancelNextTick,
  detectDirection: _detectDirection,
  getChild,
  expando
};
Sortable.get = function(element) {
  return element[expando];
};
Sortable.mount = function() {
  for (var _len = arguments.length, plugins2 = new Array(_len), _key = 0; _key < _len; _key++) {
    plugins2[_key] = arguments[_key];
  }
  if (plugins2[0].constructor === Array) plugins2 = plugins2[0];
  plugins2.forEach(function(plugin) {
    if (!plugin.prototype || !plugin.prototype.constructor) {
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(plugin));
    }
    if (plugin.utils) Sortable.utils = _objectSpread2(_objectSpread2({}, Sortable.utils), plugin.utils);
    PluginManager.mount(plugin);
  });
};
Sortable.create = function(el, options) {
  return new Sortable(el, options);
};
Sortable.version = version;
var autoScrolls = [];
var scrollEl;
var scrollRootEl;
var scrolling = false;
var lastAutoScrollX;
var lastAutoScrollY;
var touchEvt$1;
var pointerElemChangedInterval;
function AutoScrollPlugin() {
  function AutoScroll() {
    this.defaults = {
      scroll: true,
      forceAutoScrollFallback: false,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      bubbleScroll: true
    };
    for (var fn in this) {
      if (fn.charAt(0) === "_" && typeof this[fn] === "function") {
        this[fn] = this[fn].bind(this);
      }
    }
  }
  AutoScroll.prototype = {
    dragStarted: function dragStarted(_ref) {
      var originalEvent = _ref.originalEvent;
      if (this.sortable.nativeDraggable) {
        on(document, "dragover", this._handleAutoScroll);
      } else {
        if (this.options.supportPointer) {
          on(document, "pointermove", this._handleFallbackAutoScroll);
        } else if (originalEvent.touches) {
          on(document, "touchmove", this._handleFallbackAutoScroll);
        } else {
          on(document, "mousemove", this._handleFallbackAutoScroll);
        }
      }
    },
    dragOverCompleted: function dragOverCompleted(_ref2) {
      var originalEvent = _ref2.originalEvent;
      if (!this.options.dragOverBubble && !originalEvent.rootEl) {
        this._handleAutoScroll(originalEvent);
      }
    },
    drop: function drop3() {
      if (this.sortable.nativeDraggable) {
        off(document, "dragover", this._handleAutoScroll);
      } else {
        off(document, "pointermove", this._handleFallbackAutoScroll);
        off(document, "touchmove", this._handleFallbackAutoScroll);
        off(document, "mousemove", this._handleFallbackAutoScroll);
      }
      clearPointerElemChangedInterval();
      clearAutoScrolls();
      cancelThrottle();
    },
    nulling: function nulling() {
      touchEvt$1 = scrollRootEl = scrollEl = scrolling = pointerElemChangedInterval = lastAutoScrollX = lastAutoScrollY = null;
      autoScrolls.length = 0;
    },
    _handleFallbackAutoScroll: function _handleFallbackAutoScroll(evt) {
      this._handleAutoScroll(evt, true);
    },
    _handleAutoScroll: function _handleAutoScroll(evt, fallback) {
      var _this = this;
      var x = (evt.touches ? evt.touches[0] : evt).clientX, y = (evt.touches ? evt.touches[0] : evt).clientY, elem = document.elementFromPoint(x, y);
      touchEvt$1 = evt;
      if (fallback || this.options.forceAutoScrollFallback || Edge || IE11OrLess || Safari) {
        autoScroll(evt, this.options, elem, fallback);
        var ogElemScroller = getParentAutoScrollElement(elem, true);
        if (scrolling && (!pointerElemChangedInterval || x !== lastAutoScrollX || y !== lastAutoScrollY)) {
          pointerElemChangedInterval && clearPointerElemChangedInterval();
          pointerElemChangedInterval = setInterval(function() {
            var newElem = getParentAutoScrollElement(document.elementFromPoint(x, y), true);
            if (newElem !== ogElemScroller) {
              ogElemScroller = newElem;
              clearAutoScrolls();
            }
            autoScroll(evt, _this.options, newElem, fallback);
          }, 10);
          lastAutoScrollX = x;
          lastAutoScrollY = y;
        }
      } else {
        if (!this.options.bubbleScroll || getParentAutoScrollElement(elem, true) === getWindowScrollingElement()) {
          clearAutoScrolls();
          return;
        }
        autoScroll(evt, this.options, getParentAutoScrollElement(elem, false), false);
      }
    }
  };
  return _extends(AutoScroll, {
    pluginName: "scroll",
    initializeByDefault: true
  });
}
function clearAutoScrolls() {
  autoScrolls.forEach(function(autoScroll2) {
    clearInterval(autoScroll2.pid);
  });
  autoScrolls = [];
}
function clearPointerElemChangedInterval() {
  clearInterval(pointerElemChangedInterval);
}
var autoScroll = throttle(function(evt, options, rootEl2, isFallback) {
  if (!options.scroll) return;
  var x = (evt.touches ? evt.touches[0] : evt).clientX, y = (evt.touches ? evt.touches[0] : evt).clientY, sens = options.scrollSensitivity, speed = options.scrollSpeed, winScroller = getWindowScrollingElement();
  var scrollThisInstance = false, scrollCustomFn;
  if (scrollRootEl !== rootEl2) {
    scrollRootEl = rootEl2;
    clearAutoScrolls();
    scrollEl = options.scroll;
    scrollCustomFn = options.scrollFn;
    if (scrollEl === true) {
      scrollEl = getParentAutoScrollElement(rootEl2, true);
    }
  }
  var layersOut = 0;
  var currentParent = scrollEl;
  do {
    var el = currentParent, rect = getRect(el), top = rect.top, bottom = rect.bottom, left = rect.left, right = rect.right, width = rect.width, height = rect.height, canScrollX = void 0, canScrollY = void 0, scrollWidth = el.scrollWidth, scrollHeight = el.scrollHeight, elCSS = css(el), scrollPosX = el.scrollLeft, scrollPosY = el.scrollTop;
    if (el === winScroller) {
      canScrollX = width < scrollWidth && (elCSS.overflowX === "auto" || elCSS.overflowX === "scroll" || elCSS.overflowX === "visible");
      canScrollY = height < scrollHeight && (elCSS.overflowY === "auto" || elCSS.overflowY === "scroll" || elCSS.overflowY === "visible");
    } else {
      canScrollX = width < scrollWidth && (elCSS.overflowX === "auto" || elCSS.overflowX === "scroll");
      canScrollY = height < scrollHeight && (elCSS.overflowY === "auto" || elCSS.overflowY === "scroll");
    }
    var vx = canScrollX && (Math.abs(right - x) <= sens && scrollPosX + width < scrollWidth) - (Math.abs(left - x) <= sens && !!scrollPosX);
    var vy = canScrollY && (Math.abs(bottom - y) <= sens && scrollPosY + height < scrollHeight) - (Math.abs(top - y) <= sens && !!scrollPosY);
    if (!autoScrolls[layersOut]) {
      for (var i = 0; i <= layersOut; i++) {
        if (!autoScrolls[i]) {
          autoScrolls[i] = {};
        }
      }
    }
    if (autoScrolls[layersOut].vx != vx || autoScrolls[layersOut].vy != vy || autoScrolls[layersOut].el !== el) {
      autoScrolls[layersOut].el = el;
      autoScrolls[layersOut].vx = vx;
      autoScrolls[layersOut].vy = vy;
      clearInterval(autoScrolls[layersOut].pid);
      if (vx != 0 || vy != 0) {
        scrollThisInstance = true;
        autoScrolls[layersOut].pid = setInterval(function() {
          if (isFallback && this.layer === 0) {
            Sortable.active._onTouchMove(touchEvt$1);
          }
          var scrollOffsetY = autoScrolls[this.layer].vy ? autoScrolls[this.layer].vy * speed : 0;
          var scrollOffsetX = autoScrolls[this.layer].vx ? autoScrolls[this.layer].vx * speed : 0;
          if (typeof scrollCustomFn === "function") {
            if (scrollCustomFn.call(Sortable.dragged.parentNode[expando], scrollOffsetX, scrollOffsetY, evt, touchEvt$1, autoScrolls[this.layer].el) !== "continue") {
              return;
            }
          }
          scrollBy(autoScrolls[this.layer].el, scrollOffsetX, scrollOffsetY);
        }.bind({
          layer: layersOut
        }), 24);
      }
    }
    layersOut++;
  } while (options.bubbleScroll && currentParent !== winScroller && (currentParent = getParentAutoScrollElement(currentParent, false)));
  scrolling = scrollThisInstance;
}, 30);
var drop = function drop2(_ref) {
  var originalEvent = _ref.originalEvent, putSortable2 = _ref.putSortable, dragEl2 = _ref.dragEl, activeSortable = _ref.activeSortable, dispatchSortableEvent = _ref.dispatchSortableEvent, hideGhostForTarget = _ref.hideGhostForTarget, unhideGhostForTarget = _ref.unhideGhostForTarget;
  if (!originalEvent) return;
  var toSortable = putSortable2 || activeSortable;
  hideGhostForTarget();
  var touch = originalEvent.changedTouches && originalEvent.changedTouches.length ? originalEvent.changedTouches[0] : originalEvent;
  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  unhideGhostForTarget();
  if (toSortable && !toSortable.el.contains(target)) {
    dispatchSortableEvent("spill");
    this.onSpill({
      dragEl: dragEl2,
      putSortable: putSortable2
    });
  }
};
function Revert() {
}
Revert.prototype = {
  startIndex: null,
  dragStart: function dragStart(_ref2) {
    var oldDraggableIndex2 = _ref2.oldDraggableIndex;
    this.startIndex = oldDraggableIndex2;
  },
  onSpill: function onSpill(_ref3) {
    var dragEl2 = _ref3.dragEl, putSortable2 = _ref3.putSortable;
    this.sortable.captureAnimationState();
    if (putSortable2) {
      putSortable2.captureAnimationState();
    }
    var nextSibling = getChild(this.sortable.el, this.startIndex, this.options);
    if (nextSibling) {
      this.sortable.el.insertBefore(dragEl2, nextSibling);
    } else {
      this.sortable.el.appendChild(dragEl2);
    }
    this.sortable.animateAll();
    if (putSortable2) {
      putSortable2.animateAll();
    }
  },
  drop
};
_extends(Revert, {
  pluginName: "revertOnSpill"
});
function Remove() {
}
Remove.prototype = {
  onSpill: function onSpill2(_ref4) {
    var dragEl2 = _ref4.dragEl, putSortable2 = _ref4.putSortable;
    var parentSortable = putSortable2 || this.sortable;
    parentSortable.captureAnimationState();
    dragEl2.parentNode && dragEl2.parentNode.removeChild(dragEl2);
    parentSortable.animateAll();
  },
  drop
};
_extends(Remove, {
  pluginName: "removeOnSpill"
});
Sortable.mount(new AutoScrollPlugin());
Sortable.mount(Remove, Revert);
var sortable_esm_default = Sortable;

// src/ui/workspace/tasks.ts
var link = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
function renderTasks(c, filter, href, expanded = /* @__PURE__ */ new Set(), view = "all", moduleId) {
  const all = c.tasks.filter((t) => t.done === (filter === "done") && (!moduleId || c.taskInModule(t, moduleId)));
  const tasks = orderByDeadline(view === "project" || view === "all" ? all : all.filter((t) => taskHorizon(t, c.now()) === view));
  const fileLink = (noteId, line, compact = false, header = false) => `<a class="${header ? "task-file-link" : "note-link readonly-note-link"}${compact ? " compact-source-link" : ""}" href="${escapeHtml(href(noteId))}" data-action="source-note" data-note="${escapeHtml(noteId)}" data-line="${line}" title="${escapeHtml(c.state.notes.find((n) => n.id === noteId)?.path ?? "")}" aria-label="\u6253\u5F00\u6E90\u7B14\u8BB0 ${escapeHtml(c.title(noteId))}${header ? "" : "\u7684\u4EFB\u52A1\u884C"}">${link}${compact ? "" : `<span>${escapeHtml(c.title(noteId))}</span>`}</a>`;
  const item = (t, compact = false) => {
    const name = displayTaskName(t), status = deadlineState(t, c.now().getTime()), warning = status === "warning" || status === "overdue", help = "task-help-" + t.id, hint = deadlineHint(t);
    const tags = t.origin === "manual" ? (t.moduleIds ?? []).map((id2) => c.modules.find((m) => m.id === id2)).filter((m) => m && m.id !== "manual-inbox") : [];
    const folderTag = t.origin === "manual" ? void 0 : c.folderTag(t.noteId);
    const chips = [...tags.map((m) => `<span>#${escapeHtml(m.name)}</span>`), ...folderTag ? [`<span class="task-folder-tag" title="\u6765\u6E90\u6587\u4EF6\u5939\uFF1A${escapeHtml(folderTag)}">#${escapeHtml(folderTag)}</span>`] : []].join("");
    return `<li class="task-item ${t.done ? "done" : ""} ${warning ? "deadline-warning" : ""}" data-task-item="${escapeHtml(t.id)}" data-deadline-state="${status}"><button type="button" class="task-drag-handle" aria-label="\u62D6\u52A8\u4EFB\u52A1\uFF1A${escapeHtml(name)}" title="\u62D6\u5230\u5176\u5B83\u6A21\u5757">\u22EE\u22EE</button><input type="checkbox" data-complete="${escapeHtml(t.id)}" aria-label="${t.done ? "\u91CD\u65B0\u6253\u5F00" : "\u5B8C\u6210"}\u4EFB\u52A1\uFF1A${escapeHtml(name)}" ${t.done ? "checked" : ""}><div class="task-copy readonly-task-copy"><button class="task-title-button" data-action="edit-task" data-task="${escapeHtml(t.id)}" ${hint ? `aria-describedby="${escapeHtml(help)}"` : ""}>${escapeHtml(name)}</button>${hint ? `<span id="${escapeHtml(help)}" class="task-time-description" hidden>${escapeHtml(hint)}</span>` : ""}${chips ? `<div class="task-tags">${chips}</div>` : ""}${t.sourceUnavailable ? "<small>\u6765\u6E90\u4E0D\u53EF\u7528</small>" : ""}</div>${t.origin === "manual" ? '<span class="manual-task-label">\u624B\u52A8</span>' : t.sourceUnavailable ? "" : fileLink(t.noteId, t.line, compact)}</li>`;
  };
  const counts = /* @__PURE__ */ new Map();
  for (const t of c.tasks) counts.set(t.noteId, (counts.get(t.noteId) ?? 0) + 1);
  const rendered = /* @__PURE__ */ new Set();
  const customRendered = /* @__PURE__ */ new Set();
  const groupRows = (group) => {
    const members = tasks.filter((t) => t.groupId === group.id && (filter === "done" || !t.dueAt));
    return `<li class="task-file-container"><details class="task-file-group task-custom-group" data-task-group="${escapeHtml(group.id)}" ${expanded.has(group.id) ? "open" : ""}><summary><button type="button" class="task-group-name task-file-title" data-action="task-group-menu" data-group="${escapeHtml(group.id)}" aria-label="\u7BA1\u7406\u5206\u7EC4 ${escapeHtml(group.name)}">${escapeHtml(group.name)}</button><span class="task-file-count">${members.length} \u6761</span><svg class="task-file-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><ul class="task-list readonly-tasks task-file-children">${members.map((t) => item(t, true)).join("")}</ul></details></li>`;
  };
  let rows = tasks.map((t) => {
    if (!(filter === "pending" && t.dueAt) && t.groupId) {
      const group2 = c.groups.find((g) => g.id === t.groupId);
      if (group2) {
        if (customRendered.has(group2.id)) return "";
        customRendered.add(group2.id);
        return groupRows(group2);
      }
    }
    if (filter === "pending" && t.dueAt || t.origin === "manual" || (counts.get(t.noteId) ?? 0) <= 5) return item(t);
    if (rendered.has(t.noteId)) return "";
    rendered.add(t.noteId);
    const group = tasks.filter((task) => task.noteId === t.noteId && !task.groupId && (filter === "done" || !task.dueAt)), unavailable = c.data.deletedNotes.includes(t.noteId);
    return `<li class="task-file-container"><details class="task-file-group" data-task-group="${escapeHtml(t.noteId)}" ${expanded.has(t.noteId) ? "open" : ""}><summary><span class="task-file-title" title="${escapeHtml(c.state.notes.find((n) => n.id === t.noteId)?.path ?? "")}">${escapeHtml(c.title(t.noteId))}</span><span class="task-file-count">${group.length} \u6761</span><svg class="task-file-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>${unavailable ? '<span class="source-unavailable">\u6765\u6E90\u4E0D\u53EF\u7528</span>' : fileLink(t.noteId, 0, true, true)}</summary><ul class="task-list readonly-tasks task-file-children">${group.map((task) => item(task, true)).join("")}</ul></details></li>`;
  }).join("");
  if (view === "project") rows = `<li class="module-board-row"><div class="module-board">${c.modules.filter((m) => !m.hidden).map((module2) => {
    const members = tasks.filter((t) => c.taskInModule(t, module2.id));
    return `<section class="module-lane" data-module-lane="${escapeHtml(module2.id)}"><h3><button data-action="module-menu" data-module-id="${escapeHtml(module2.id)}">${escapeHtml(module2.name)}</button><span>${members.length}</span></h3><ul class="module-drop-list" data-module-drop="${escapeHtml(module2.id)}">${members.map((t) => item(t)).join("")}</ul></section>`;
  }).join("")}</div></li>`;
  const tabs = [["today", "\u4ECA\u5929"], ["project", "\u9879\u76EE"]];
  return `<div class="task-create-surface" data-task-surface data-task-view="${view}"><nav class="task-view-tabs" aria-label="\u5F85\u529E\u89C6\u56FE">${tabs.map(([id2, label]) => `<div class="task-view-target"><button data-action="task-view" data-view="${id2}" aria-current="${view === id2 ? "page" : "false"}">${label}</button>${id2 === "project" ? "" : `<ul class="task-horizon-drop" data-horizon-drop="${id2}" aria-label="\u62D6\u5230${label}"></ul>`}</div>`).join("")}</nav>${moduleId ? `<div class="module-task-filter"><span>\u6B63\u5728\u67E5\u770B\uFF1A${escapeHtml(c.modules.find((m) => m.id === moduleId)?.name ?? "\u6A21\u5757")}</span><button type="button" data-action="clear-module">\u67E5\u770B\u5168\u90E8</button></div>` : ""}<nav class="task-filters" aria-label="\u4EFB\u52A1\u72B6\u6001"><button data-action="filter" data-filter="pending" aria-pressed="${filter === "pending"}">\u5F85\u529E ${c.pending.length}</button><button data-action="filter" data-filter="done" aria-pressed="${filter === "done"}">\u5DF2\u5B8C\u6210 ${c.tasks.length - c.pending.length}</button></nav><div class="task-group-toolbar"><button type="button" data-action="new-module">\uFF0B \u6A21\u5757</button>${c.groups.filter((g) => !customRendered.has(g.id)).map((g) => `<button type="button" data-action="task-group-menu" data-group="${escapeHtml(g.id)}">${escapeHtml(g.name)}</button>`).join("")}</div><ul class="task-list readonly-tasks" data-task-source>${rows || `<li class="empty">${filter === "done" ? "\u5F53\u524D\u89C6\u56FE\u8FD8\u6CA1\u6709\u5DF2\u5B8C\u6210\u4EFB\u52A1\u3002" : "\u5F53\u524D\u89C6\u56FE\u6CA1\u6709\u5F85\u529E\u3002"}</li>`}</ul><button class="task-create-button" data-action="new-task"><span aria-hidden="true">\uFF0B</span><span>\u5199\u4E0B\u4E00\u4E2A\u5F85\u529E</span></button><div class="task-blank-area" aria-hidden="true"></div></div>`;
}
function bindModuleSortables(root, c) {
  const board = root.querySelector(".module-board");
  const common = { draggable: ".task-item", handle: ".task-drag-handle", animation: 150, delay: 120, delayOnTouchOnly: true, touchStartThreshold: 3, forceFallback: true, forceAutoScrollFallback: true, fallbackOnBody: true, fallbackTolerance: 3, scroll: board ?? true, scrollSensitivity: 64, scrollSpeed: 18, bubbleScroll: true, emptyInsertThreshold: 24, ghostClass: "module-drag-ghost", chosenClass: "module-drag-chosen", onStart: () => root.classList.add("is-task-dragging"), onEnd: () => root.classList.remove("is-task-dragging") };
  const sources = [...root.querySelectorAll("[data-task-source],.task-file-children")].map((el) => new sortable_esm_default(el, { ...common, group: { name: "note-trajectory-tasks", pull: true, put: false } }));
  const horizons = [...root.querySelectorAll("[data-horizon-drop]")].map((el) => new sortable_esm_default(el, { ...common, group: { name: "note-trajectory-tasks", pull: false, put: true }, onAdd: (event) => {
    root.classList.remove("is-task-dragging");
    const taskId = event.item.dataset.taskItem;
    if (taskId) void c.assignTaskHorizon(taskId, "today");
  } }));
  const modules = [...root.querySelectorAll("[data-module-drop]")].map((el) => new sortable_esm_default(el, { ...common, group: { name: "note-trajectory-tasks", pull: true, put: true }, onAdd: (event) => {
    root.classList.remove("is-task-dragging");
    const taskId = event.item.dataset.taskItem, moduleId = event.to.dataset.moduleDrop;
    if (taskId && moduleId) void c.assignTaskModule(taskId, moduleId);
  } }));
  const instances = [...sources, ...horizons, ...modules];
  return () => instances.forEach((instance) => instance.destroy());
}

// src/core/analytics.ts
function dailyStats(state, date, config = DEFAULT_CONFIG, context = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error("\u65E5\u671F\u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
  const completed = state.completions.filter((e) => localDate(e.at) === date), receipts = state.receipts.filter((r) => localDate(r.at) === date), tasks = context.tasks ?? state.taskRegistry, visible = tasks.filter((t) => !t.deletedAt), catalog = moduleCatalog(state, context.manualModules, context.hiddenModules, config, context.sourceModuleNames), byId = new Map(tasks.map((t) => [t.id, t]));
  const modules = /* @__PURE__ */ new Map();
  const group = (noteId, task) => {
    const ref = moduleForTask(task, noteId, state, catalog, context.manualModules, config);
    if (!modules.has(ref.id)) modules.set(ref.id, { ...ref, completed: 0, pending: 0 });
    return modules.get(ref.id);
  };
  for (const taskId of new Set(completed.map((e) => e.taskId))) {
    const e = completed.find((e2) => e2.taskId === taskId);
    group(e.noteId, byId.get(taskId)).completed++;
  }
  for (const task of visible) {
    const g = group(task.noteId, task);
    if (!task.done) g.pending++;
  }
  for (const ref of catalog.filter((m) => m.kind === "manual")) if (!modules.has(ref.id)) modules.set(ref.id, { ...ref, completed: 0, pending: 0 });
  return { date, total: visible.length, pending: visible.filter((t) => !t.done).length, completed: new Set(completed.map((e) => e.taskId)).size, collected: new Set(receipts.flatMap((r) => r.taskIds)).size, notes: new Set(state.observations.filter((o) => o.date === date).map((o) => o.noteId)).size, modules: [...modules.values()].sort((a, b) => b.completed - a.completed) };
}
function recentDays(date, count = 7) {
  const last = /* @__PURE__ */ new Date(`${date}T12:00:00+08:00`);
  return Array.from({ length: count }, (_, i) => localDate(new Date(last.getTime() - (count - 1 - i) * 864e5)));
}

// src/ui/statistics/view.ts
function dateControls(date) {
  const adjacent = (offset) => localDate(new Date(Date.parse(`${date}T12:00:00+08:00`) + offset * 864e5));
  return `<div class="statistics-date-control"><button data-action="day" data-date="${adjacent(-1)}" aria-label="\u4E0A\u4E00\u5929">\u2039</button><label><span class="sr-only">\u7EDF\u8BA1\u65E5\u671F</span><input id="stats-date" type="date" value="${date}" aria-label="\u7EDF\u8BA1\u65E5\u671F"></label><button data-action="day" data-date="${adjacent(1)}" aria-label="\u4E0B\u4E00\u5929">\u203A</button></div>`;
}
function renderStatistics(state, date, context) {
  const s = dailyStats(state, date, DEFAULT_CONFIG, context.source), days = recentDays(date).map((d) => dailyStats(state, d, DEFAULT_CONFIG, context.source)), max = Math.max(0, ...days.map((d) => d.completed));
  const tasks = context.source?.tasks ?? state.taskRegistry, byId = new Map(tasks.map((t) => [t.id, t])), completed = [...new Map(state.completions.filter((e) => localDate(e.at) === date).map((e) => [e.taskId, e])).values()];
  return `<main id="main" tabindex="-1" class="statistics-view note-workspace-statistics">${context.dateControls ? dateControls(date) : ""}<div class="stat-summary"><div data-stat="total"><span>\u7D2F\u8BA1\u4EFB\u52A1</span><strong>${s.total}<small>\u9879</small></strong></div><div data-stat="new"><span>\u5F53\u65E5\u65B0\u589E</span><strong>${s.collected}<small>\u9879</small></strong></div><div data-stat="completed"><span>\u5F53\u65E5\u5B8C\u6210</span><strong>${s.completed}<small>\u9879</small></strong></div><div data-stat="notes"><span>\u6D89\u53CA\u7B14\u8BB0</span><strong>${s.notes}<small>\u7BC7</small></strong></div></div><details class="statistics-provenance"><summary>\u67E5\u770B\u7EDF\u8BA1\u53E3\u5F84</summary><p>\u7D2F\u8BA1\u4EFB\u52A1\u662F\u5F53\u524D\u6E05\u5355\u5168\u90E8\u672A\u5220\u9664\u5F85\u529E\u4E0E\u5B8C\u6210\u9879\u3002\u5F53\u65E5\u65B0\u589E\u6309\u6240\u9009\u65E5\u671F\u9996\u6B21\u6536\u5F55\u6216\u521B\u5EFA\u7684\u4EFB\u52A1\u53BB\u91CD\u8BA1\u6570\uFF0C\u5220\u9664\u4E0D\u4F1A\u91CD\u5199\u5386\u53F2\uFF1B\u5F53\u65E5\u5B8C\u6210\u6309\u5F53\u5929\u5B8C\u6210\u8FC7\u7684\u4EFB\u52A1\u53BB\u91CD\u3002</p></details><div class="stats-columns"><section><div class="section-heading"><h2>\u8FD1\u4E03\u5929</h2><span>\u5B8C\u6210\u4EFB\u52A1\u6570</span></div><div class="week-chart">${days.map((d) => `<button data-completed="${d.completed}" class="week-day ${d.date === date ? "current" : ""}" data-action="day" data-date="${d.date}" aria-label="${d.date}\uFF0C${d.completed} \u9879\u5B8C\u6210"><span class="week-value">${d.completed}</span><span class="week-bar" style="height:${max > 0 ? d.completed / max * 88 : 0}px"></span><span class="week-date"><span class="week-month">${d.date.slice(5, 7)}/</span><span>${d.date.slice(8)}</span></span></button>`).join("")}</div></section></div><section class="completion-details"><div class="section-heading"><h2>\u4ECA\u65E5\u5B8C\u6210\u4EFB\u52A1\u660E\u7EC6</h2><span>${completed.length} \u9879</span></div>${completed.length ? `<ul>${completed.map((e) => {
    const task = byId.get(e.taskId);
    return `<li><span>${escapeHtml(task?.label ?? task?.text ?? "\u5DF2\u5220\u9664\u4EFB\u52A1")}</span><time>${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(e.at))}</time></li>`;
  }).join("")}</ul>` : '<p class="empty">\u5F53\u5929\u6682\u65E0\u5B8C\u6210\u4EFB\u52A1\u3002</p>'}</section></main>`;
}
function renderModuleDistribution(state, date, source = {}) {
  const s = dailyStats(state, date, DEFAULT_CONFIG, source), visible = s.modules.filter((m) => !m.hidden);
  const paths = (name) => [...new Set(state.notes.filter((n) => state.completions.some((i) => i.noteId === n.id && localDate(i.at) === date)).filter((n) => moduleForPath(n.path) === name).map((n) => n.path.includes("/") ? n.path.slice(0, n.path.lastIndexOf("/") + 1) : n.path))].join("\u3001");
  return `<section class="module-card" aria-label="\u6A21\u5757\u5B8C\u6210\u5EA6"><div class="section-heading"><h2>\u6A21\u5757\u5B8C\u6210\u5EA6</h2><button data-action="new-module" class="module-create">\uFF0B \u65B0\u5EFA\u6A21\u5757</button></div><div class="module-total"><span>${date.slice(5).replace("-", "\u6708")}\u65E5</span></div>${visible.length ? `<ul class="module-list">${visible.map((m) => {
    const share = s.completed > 0 ? Math.max(0, Math.min(100, m.completed / s.completed * 100)) : 0;
    return `<li data-module="${escapeHtml(m.name)}" data-module-id="${escapeHtml(m.id)}" data-module-kind="${m.kind}" data-completed="${m.completed}" title="${escapeHtml(paths(m.name))} \xB7 ${m.completed} \u9879\u5B8C\u6210"><div><button class="module-open" data-action="module-menu" data-module-id="${escapeHtml(m.id)}">${escapeHtml(m.name)}</button><span class="module-meta"><span>${m.completed} \u9879\u5B8C\u6210</span></span></div><div class="module-track" role="img" aria-label="${escapeHtml(m.name)}\uFF0C\u5360\u5F53\u65E5\u5B8C\u6210\u6570 ${share.toFixed(1)}%"><span style="width:${share}%"></span></div></li>`;
  }).join("")}</ul>` : '<p class="empty">\u6682\u65E0\u6A21\u5757\u8BB0\u5F55\u3002</p>'}</section>`;
}

// src/main.ts
var VIEW = "note-trajectory-readonly";
var NoteWorkspace = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "controller");
    __publicField(this, "confirmationTail", Promise.resolve());
    __publicField(this, "activeModal", null);
    __publicField(this, "edits");
    __publicField(this, "stopped", false);
    __publicField(this, "activeGroupModal");
  }
  async onload() {
    const data = await this.loadData();
    try {
      this.controller = new WorkspaceController({ read: async (source) => {
        const file = source;
        const views = this.app.workspace.getLeavesOfType("markdown").map((l) => l.view).filter((v) => v instanceof import_obsidian2.MarkdownView);
        let text = await this.app.vault.read(file);
        const dirty = views.some((v) => v.file?.path === file.path && v.editor.getValue() !== text);
        if (!dirty) {
          const cleaned = stripTaskBlockIds(text);
          if (cleaned !== text) text = await this.app.vault.process(file, (current) => current === text ? cleaned : current);
        }
        return { text, indexed: !!this.app.metadataCache.getFileCache(file) };
      } }, { now: () => /* @__PURE__ */ new Date() }, { save: (value) => this.saveData(value) }, (question) => this.askImport(question), data ?? null, async (task, path) => {
        const file = this.app.vault.getFileByPath(path);
        if (!file) return;
        await this.app.vault.process(file, (current) => {
          const views = this.app.workspace.getLeavesOfType("markdown").map((l) => l.view).filter((v) => v instanceof import_obsidian2.MarkdownView && v.file?.path === path);
          if (views.some((v) => v.editor.getValue() !== current)) throw new Error("\u7B14\u8BB0\u4ECD\u5728\u4FDD\u5B58\u4E2D\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u5220\u9664\u3002");
          return deleteSourceTask(current, task);
        });
      }, (question) => this.askGroup(question), async (task, path, done) => {
        const file = this.app.vault.getFileByPath(path);
        if (!file) {
          new import_obsidian2.Notice("\u8FD9\u6761\u5F85\u529E\u7684\u6765\u6E90\u7B14\u8BB0\u5DF2\u4E0D\u53EF\u7528\uFF0C\u53EA\u5728\u63D2\u4EF6\u91CC\u52FE\u9009\u3002");
          return;
        }
        try {
          await this.app.vault.process(file, (current) => {
            const views = this.app.workspace.getLeavesOfType("markdown").map((l) => l.view).filter((v) => v instanceof import_obsidian2.MarkdownView && v.file?.path === path);
            if (views.some((v) => v.editor.getValue() !== current)) throw new Error("\u7B14\u8BB0\u6B63\u5728\u7F16\u8F91\uFF0C\u4FDD\u5B58\u540E\u518D\u52FE\u9009");
            return setSourceChecked(current, task, done);
          });
        } catch (error) {
          new import_obsidian2.Notice(error instanceof Error ? error.message : String(error));
        }
      });
    } catch (error) {
      new import_obsidian2.Notice("\u4EFB\u52A1\u6570\u636E\u65E0\u6CD5\u8F7D\u5165\uFF0C\u539F\u6570\u636E\u5DF2\u4FDD\u7559\u3002");
      throw error;
    }
    registerUpdateCommand(this, () => this.controller.ready());
    this.edits = new EditorSync((f, text) => {
      if (!this.stopped) this.controller.edit(f, text);
    }, (f, text) => this.controller.indexed(f, text), (fn, ms) => window.setTimeout(fn, ms), (timer) => window.clearTimeout(timer));
    this.registerView(VIEW, (leaf) => new WorkspaceView(leaf, this));
    this.registerEditorExtension(hideTaskBlockIds);
    this.addCommand({ id: "open-readonly-trajectory", name: "\u6253\u5F00\u5F85\u529E\u6E05\u5355", callback: () => {
      void this.openView();
    } });
    this.addCommand({ id: "read-current-note-tasks", name: "\u8BFB\u53D6\u5F53\u524D\u7B14\u8BB0\u5F85\u529E", callback: () => {
      const file = this.app.workspace.getActiveFile();
      if (file) void this.controller.open(file).then(() => {
        const note = this.controller.state.notes.find((n) => n.path === file.path);
        if (note) return this.controller.collect(note.id, true);
      }).catch((error) => new import_obsidian2.Notice(String(error)));
    } });
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      this.flush();
      if (file) {
        void this.controller.open(file);
      }
    }));
    this.registerEvent(this.app.workspace.on("editor-change", (editor, info) => {
      const file = info.file;
      if (!file || file.stat.size > 1e6) return;
      this.edits.queue(file, editor.getValue());
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file, data2) => this.edits.indexed(file, data2)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof import_obsidian2.TFile) this.controller.renamed(file, oldPath);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof import_obsidian2.TFile) {
        this.edits.drop(file);
        this.controller.deleted(file);
      }
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.view.getViewType() !== "markdown") {
        this.flush();
      }
    }));
    this.registerEvent(this.app.workspace.on("window-open", (_workspace, win) => this.watchWindow(win)));
    this.watchWindow(window);
    this.registerInterval(window.setInterval(() => this.refreshTimedViews(), 1e3));
    this.app.workspace.onLayoutReady(() => {
      if (this.stopped) return;
      const refresh = (file2) => {
        if (file2 instanceof import_obsidian2.TFile && file2.extension === "md") void this.controller.refresh(file2).catch((error) => new import_obsidian2.Notice(String(error)));
      };
      this.registerEvent(this.app.vault.on("create", refresh));
      this.registerEvent(this.app.vault.on("modify", refresh));
      const file = this.app.workspace.getActiveFile();
      if (file) {
        void this.controller.open(file);
      }
      if (this.app.workspace.getLeavesOfType(VIEW).length) void this.openView();
    });
  }
  refreshTimedViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof WorkspaceView && leaf.view.owns(this)) leaf.view.refreshTimedUI();
  }
  watchWindow(win) {
    this.registerDomEvent(win, "focus", () => this.refreshTimedViews());
    this.registerDomEvent(win.document, "visibilitychange", () => {
      if (!win.document.hidden) this.refreshTimedViews();
    });
    this.registerDomEvent(win, "blur", () => {
      this.flush();
    });
  }
  flush() {
    this.edits?.flush();
  }
  async openView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
    if (leaf && (!(leaf.view instanceof WorkspaceView) || !leaf.view.owns(this))) {
      leaf.detach();
      leaf = void 0;
    }
    leaf = leaf ?? this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW, active: true });
    await this.app.workspace.revealLeaf(leaf);
    void this.controller.suggestTaskGroups().catch((error) => new import_obsidian2.Notice(String(error)));
  }
  askImport(question) {
    const work = this.confirmationTail.then(() => new Promise((resolve) => {
      if (this.stopped) {
        resolve(false);
        return;
      }
      this.activeModal = new ImportModal(this.app, question, (value) => {
        this.activeModal = null;
        resolve(value);
      });
      this.activeModal.open();
    }));
    this.confirmationTail = work.catch(() => {
    });
    return work;
  }
  askGroup(question) {
    const work = this.confirmationTail.then(() => new Promise((resolve) => {
      if (this.stopped) {
        resolve(false);
        return;
      }
      const modal = new FolderGroupModal(this.app, question, resolve);
      this.activeGroupModal = modal;
      modal.open();
    }));
    this.confirmationTail = work.catch(() => {
    });
    return work;
  }
  onunload() {
    this.flush();
    this.stopped = true;
    this.activeModal?.close();
    this.activeGroupModal?.close();
    if (this.controller) void this.controller.dispose().catch(() => {
    });
  }
};
var WorkspaceView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin", plugin);
    __publicField(this, "taskGroupModal");
    __publicField(this, "expandedTaskFiles", /* @__PURE__ */ new Set());
    __publicField(this, "reminded", /* @__PURE__ */ new Set());
    __publicField(this, "viewEvents", new AbortController());
    __publicField(this, "savedScroll", 0);
    __publicField(this, "editorModal", null);
    __publicField(this, "moduleModal", null);
    __publicField(this, "moduleFilter");
    __publicField(this, "hints");
    __publicField(this, "homeDate", "");
    __publicField(this, "tasksOpen", true);
    __publicField(this, "taskFilter", "pending");
    __publicField(this, "taskView", "project");
    __publicField(this, "stats", false);
    __publicField(this, "statsDate", localDate(/* @__PURE__ */ new Date()));
    __publicField(this, "unsubscribe");
    __publicField(this, "unbindSortables");
  }
  owns(plugin) {
    return this.plugin === plugin;
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "\u5F85\u529E\u6E05\u5355";
  }
  async onOpen() {
    this.viewEvents.abort();
    this.viewEvents = new AbortController();
    const listen = (type, handler) => this.contentEl.addEventListener(type, handler, { signal: this.viewEvents.signal });
    this.contentEl.addEventListener("toggle", (event) => {
      const group = event.target;
      if (group.dataset.taskGroup) {
        if (group.open) this.expandedTaskFiles.add(group.dataset.taskGroup);
        else this.expandedTaskFiles.delete(group.dataset.taskGroup);
      }
    }, { capture: true, signal: this.viewEvents.signal });
    this.contentEl.classList.add("note-workspace-host", "note-workspace-root");
    this.contentEl.style.setProperty("background-color", "var(--paper)", "important");
    this.unsubscribe = this.plugin.controller.subscribe(() => this.render());
    this.hints = bindTaskHints(this.contentEl, this.plugin.controller);
    listen("click", (event) => this.click(event));
    let touchX;
    listen("touchstart", (event) => {
      touchX = event.touches[0]?.clientX;
    });
    listen("touchend", (event) => {
      const end = event.changedTouches[0]?.clientX;
      if (touchX === void 0 || end === void 0 || Math.abs(end - touchX) < 48) return;
      const views = ["today", "project"], at = views.indexOf(this.taskView), next = Math.max(0, Math.min(views.length - 1, at + (end < touchX ? 1 : -1)));
      if (next !== at) {
        this.taskView = views[next];
        this.render();
      }
      touchX = void 0;
    });
    listen("change", (event) => {
      const input = event.target;
      if (input.dataset.complete) {
        void this.plugin.controller.complete(input.dataset.complete, input.checked).catch((error) => new import_obsidian2.Notice(String(error)));
        return;
      }
      if (input.id === "stats-date" && /^\d{4}-\d{2}-\d{2}$/.test(input.value) && Number.isFinite(Date.parse(input.value))) {
        this.statsDate = input.value;
        this.render();
      }
    });
    this.render();
  }
  async onClose() {
    this.viewEvents.abort();
    this.unsubscribe?.();
    this.unsubscribe = void 0;
    this.unbindSortables?.();
    this.unbindSortables = void 0;
    this.editorModal?.close();
    this.taskGroupModal?.close();
    this.moduleModal?.close();
    this.hints?.dispose();
    this.contentEl.classList.remove("note-workspace-host", "note-workspace-root");
    this.contentEl.style.removeProperty("background-color");
    this.contentEl.empty();
  }
  tasks() {
    return renderTasks(this.plugin.controller, this.taskFilter, (id2) => {
      const n = this.plugin.controller.state.notes.find((n2) => n2.id === id2);
      return "obsidian://open?vault=" + encodeURIComponent(this.app.vault.getName()) + "&file=" + encodeURIComponent(n?.path ?? "");
    }, this.expandedTaskFiles, this.taskView, this.moduleFilter);
  }
  render() {
    this.hints?.hide();
    this.unbindSortables?.();
    this.unbindSortables = void 0;
    const c = this.plugin.controller;
    this.homeDate = localDate(c.now());
    this.contentEl.innerHTML = `<header><strong>${this.stats ? "\u6BCF\u65E5\u7EDF\u8BA1" : "\u5F85\u529E\u6E05\u5355"}</strong><button data-action="stats">${this.stats ? "\u8FD4\u56DE\u4EFB\u52A1" : "\u7EDF\u8BA1"}</button></header><p class="readonly-notice">\u672C\u5730\u4FDD\u5B58 \xB7 \u6301\u7EED\u79EF\u7D2F</p>${c.storageError ? `<p class="storage-error" role="alert">${escapeHtml(c.storageError)} <button data-action="retry-save">\u91CD\u8BD5\u4FDD\u5B58</button></p>` : ""}${this.stats ? this.statistics() : `<div class="home-modules note-workspace-statistics">${renderModuleDistribution(c.state, localDate(c.now()), c.analyticsContext)}</div><div class="readonly-disclosure"><button class="readonly-toggle" data-action="tasks" aria-expanded="${this.tasksOpen}" aria-controls="readonly-task-body" aria-label="${this.tasksOpen ? "\u6536\u8D77" : "\u5C55\u5F00"}\u4EFB\u52A1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="transform:rotate(${this.tasksOpen ? 180 : 0}deg)"><path d="m6 9 6 6 6-6"/></svg></button><span class="tasks-heading">\u5F85\u529E</span><button class="task-add-header" data-action="new-task" aria-label="\u521B\u5EFA\u5F85\u529E">\uFF0B</button></div><div id="readonly-task-body" class="readonly-task-body" ${this.tasksOpen ? "" : "hidden"}>${this.tasks()}</div>`}<details><summary>\u8BB0\u5F55\u4E0E\u5BFC\u5165\u72B6\u6001</summary><p>\u7D2F\u8BA1 ${c.tasks.length} \u6761\u4EFB\u52A1 \xB7 ${c.pending.length} \u6761\u5F85\u529E \xB7 \u4EFB\u52A1\u4E0E\u5386\u53F2\u4FDD\u5B58\u5728\u63D2\u4EF6\u672C\u5730\u6587\u4EF6</p>${Object.entries(c.data.decisions).filter(([, decision]) => decision === "skip").map(([id2]) => `<p>${escapeHtml(c.title(id2))} \xB7 \u5DF2\u8DF3\u8FC7 <button data-action="recheck" data-note="${escapeHtml(id2)}">\u91CD\u65B0\u8BFB\u53D6</button></p>`).join("")}${[...c.observed.values()].filter((n) => n.error).map((n) => `<p>${escapeHtml(n.path)}\uFF1A${escapeHtml(n.error)}</p>`).join("")}</details>`;
    if (!this.stats) this.unbindSortables = bindModuleSortables(this.contentEl, c);
  }
  statistics() {
    return renderStatistics(this.plugin.controller.state, this.statsDate, { dateControls: true, source: this.plugin.controller.analyticsContext });
  }
  refreshTimedUI() {
    const c = this.plugin.controller, now = c.now().getTime();
    if (!this.stats && this.homeDate !== localDate(c.now())) this.render();
    else paintDeadlines(this.contentEl, c);
    for (const task of c.pending) {
      const status = deadlineState(task, now);
      if (!task.reminder || status !== "warning" && status !== "overdue") continue;
      const key = task.id + ":" + reminderAt(task);
      if (this.reminded.has(key)) continue;
      this.reminded.add(key);
      new import_obsidian2.Notice((status === "overdue" ? "\u5F85\u529E\u5DF2\u622A\u6B62\uFF1A" : "\u5F85\u529E\u5373\u5C06\u622A\u6B62\uFF1A") + displayTaskName(task), 1e4);
    }
  }
  openModule(moduleId) {
    const module2 = moduleId ? this.plugin.controller.modules.find((m) => m.id === moduleId) : void 0;
    if (moduleId && !module2) return;
    this.moduleModal?.close();
    this.moduleModal = new ModuleEditorModal(this.app, this.plugin.controller, module2, (id2) => {
      this.moduleFilter = id2;
      this.taskView = "project";
      this.tasksOpen = true;
      this.render();
    }, (id2) => {
      if (this.moduleFilter === id2) this.moduleFilter = void 0;
      this.render();
    });
    this.moduleModal.open();
  }
  openEditor(taskId) {
    this.tasksOpen = true;
    this.render();
    const task = taskId ? this.plugin.controller.tasks.find((t) => t.id === taskId) : void 0;
    if (taskId && !task) return;
    this.editorModal?.close();
    this.editorModal = new TaskEditorModal(this.app, this.plugin.controller, task, () => {
      this.render();
    }, () => {
      ((taskId ? this.contentEl.querySelector('[data-action=edit-task][data-task="' + CSS.escape(taskId) + '"]') : null) ?? this.contentEl.querySelector(".task-add-header"))?.focus();
    });
    this.editorModal.open();
  }
  click(event) {
    const blank = taskClick(event.target);
    if (blank) {
      this.openEditor(blank.id);
      return;
    }
    const b = event.target.closest("button,a[data-action]");
    if (!b) return;
    const action = b.dataset.action;
    if (action === "task-group-menu") {
      event.preventDefault();
      event.stopPropagation();
      const group = this.plugin.controller.groups.find((g) => g.id === b.dataset.group);
      this.taskGroupModal?.close();
      this.taskGroupModal = new TaskGroupModal(this.app, this.plugin.controller, group, () => this.render());
      this.taskGroupModal.open();
      return;
    }
    if (action === "module-menu") {
      this.openModule(b.dataset.moduleId);
      return;
    }
    if (action === "new-module") {
      this.openModule();
      return;
    }
    if (action === "clear-module") {
      this.moduleFilter = void 0;
      this.render();
      return;
    }
    if (action === "task-view") {
      this.moduleFilter = void 0;
      this.taskView = b.dataset.view ?? "today";
      this.render();
      return;
    }
    if (action === "new-task" || action === "edit-task") {
      this.openEditor(b.dataset.task);
      return;
    }
    if (action === "filter") {
      this.taskFilter = b.dataset.filter === "done" ? "done" : "pending";
      this.render();
      return;
    }
    if (action === "retry-save") {
      void this.plugin.controller.persist().catch(() => {
      });
      return;
    }
    if (action === "recheck") {
      const id2 = b.dataset.note, n = this.plugin.controller.state.notes.find((n2) => n2.id === id2), file = n && this.app.vault.getFileByPath(n.path);
      if (file) void this.plugin.controller.open(file).then(() => this.plugin.controller.collect(n.id, true)).catch((error) => new import_obsidian2.Notice(String(error)));
      return;
    }
    if (action === "source-note") {
      event.preventDefault();
      event.stopPropagation();
      const n = this.plugin.controller.state.notes.find((n2) => n2.id === b.dataset.note), file = n && this.app.vault.getFileByPath(n.path);
      if (file) void this.app.workspace.getLeaf("tab").openFile(file, { active: true, eState: { line: Number(b.dataset.line) } });
      else new import_obsidian2.Notice("\u6E90\u7B14\u8BB0\u5DF2\u4E0D\u53EF\u7528\u3002");
      return;
    }
    if (action === "day") {
      this.statsDate = b.dataset.date;
      this.render();
      return;
    }
    if (action === "stats") {
      if (!this.stats) this.savedScroll = this.contentEl.scrollTop;
      this.stats = !this.stats;
      this.render();
      this.contentEl.scrollTop = this.stats ? 0 : this.savedScroll;
    }
    if (action === "tasks") {
      this.tasksOpen = !this.tasksOpen;
      this.render();
    }
  }
};
var ImportModal = class extends import_obsidian2.Modal {
  constructor(app, question, resolve) {
    super(app);
    __publicField(this, "question", question);
    __publicField(this, "resolve", resolve);
    __publicField(this, "approved", false);
  }
  onOpen() {
    this.modalEl.classList.add("note-workspace-import-modal");
    this.setTitle("\u8BFB\u53D6\u8FD9\u7BC7\u7B14\u8BB0\u7684\u5F85\u529E\uFF1F");
    this.contentEl.createEl("p", { text: this.question.path });
    this.contentEl.createEl("p", { text: "\u8FD9\u7BC7\u7B14\u8BB0\u6709 " + this.question.count + " \u6761\u672A\u5B8C\u6210\u5F85\u529E\uFF0C\u8D85\u8FC7 5 \u6761\u3002\u5141\u8BB8\u540E\u4F1A\u5168\u90E8\u5BFC\u5165\uFF0C\u540E\u7EED\u65B0\u589E\u4E5F\u4F1A\u6301\u7EED\u540C\u6B65\u3002" });
    this.contentEl.createEl("p", { text: "\u8DF3\u8FC7\u540E\u4E0D\u4F1A\u8BFB\u53D6\u5176\u4EFB\u52A1\uFF1B\u53EF\u4ECE\u8BB0\u5F55\u4E0E\u5BFC\u5165\u72B6\u6001\u6216\u201C\u8BFB\u53D6\u5F53\u524D\u7B14\u8BB0\u5F85\u529E\u201D\u547D\u4EE4\u91CD\u65B0\u9009\u62E9\u3002" });
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    const skip = actions.createEl("button", { text: "\u6682\u4E0D\u8BFB\u53D6", attr: { "data-import-choice": "skip" } });
    skip.onclick = () => this.close();
    const allow = actions.createEl("button", { text: "\u8BFB\u53D6\u6B64\u6587\u4EF6\u7684\u5F85\u529E", cls: "mod-cta", attr: { "data-import-choice": "allow" } });
    allow.onclick = () => {
      this.approved = true;
      this.close();
    };
    skip.focus();
  }
  onClose() {
    this.resolve(this.approved);
    this.contentEl.empty();
  }
};
var TaskEditorModal = class extends import_obsidian2.Modal {
  constructor(app, controller, task, deleted, closed) {
    super(app);
    __publicField(this, "controller", controller);
    __publicField(this, "task", task);
    __publicField(this, "deleted", deleted);
    __publicField(this, "closed", closed);
    __publicField(this, "unbind");
  }
  onOpen() {
    this.modalEl.classList.add("note-workspace-root", "task-editor-dialog");
    this.setTitle(this.task ? "\u7F16\u8F91\u5F85\u529E" : "\u65B0\u5EFA\u5F85\u529E");
    this.contentEl.innerHTML = taskEditor(this.task, this.controller);
    this.unbind = bindTaskEditor(this.contentEl, this.controller, this.task, () => this.close(), this.deleted);
  }
  onClose() {
    this.unbind?.();
    this.contentEl.empty();
    this.closed();
  }
};
var ModuleEditorModal = class extends import_obsidian2.Modal {
  constructor(app, controller, module2, viewTasks, removed) {
    super(app);
    __publicField(this, "controller", controller);
    __publicField(this, "module", module2);
    __publicField(this, "viewTasks", viewTasks);
    __publicField(this, "removed", removed);
    __publicField(this, "unbind");
  }
  onOpen() {
    this.modalEl.classList.add("note-workspace-root", "task-editor-dialog", "module-editor-dialog");
    this.setTitle(this.module ? "\u7BA1\u7406\u6A21\u5757" : "\u65B0\u5EFA\u6A21\u5757");
    this.contentEl.innerHTML = moduleEditor(this.controller, this.module);
    this.unbind = bindModuleEditor(this.contentEl, this.controller, this.module, () => this.close(), this.viewTasks, this.removed);
  }
  onClose() {
    this.unbind?.();
    this.contentEl.empty();
  }
};
var FolderGroupModal = class extends import_obsidian2.Modal {
  constructor(app, question, resolve) {
    super(app);
    __publicField(this, "question", question);
    __publicField(this, "resolve", resolve);
    __publicField(this, "approved", false);
  }
  onOpen() {
    this.modalEl.classList.add("note-workspace-group-prompt");
    this.setTitle("\u6309\u5B50\u6587\u4EF6\u5939\u5EFA\u7ACB\u9879\u76EE\uFF1F");
    this.contentEl.createEl("p", { text: this.question.folder });
    this.contentEl.createEl("p", { text: "\u540C\u4E00\u5B50\u6587\u4EF6\u5939\u6709 " + this.question.count + " \u6761\u65E0\u622A\u6B62\u65F6\u95F4\u3001\u672A\u52A0\u5165\u9879\u76EE\u7684\u5F85\u529E\u3002\u5EFA\u7ACB\u9879\u76EE\u540E\u53EF\u6298\u53E0\u67E5\u770B\uFF1B\u6A21\u5757\u5F52\u5C5E\u4E0D\u53D8\u3002" });
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    actions.createEl("button", { text: "\u6682\u4E0D\u5EFA\u7ACB", attr: { "data-group-choice": "skip" } }).onclick = () => this.close();
    actions.createEl("button", { text: "\u5EFA\u7ACB\u9879\u76EE", cls: "mod-cta", attr: { "data-group-choice": "allow" } }).onclick = () => {
      this.approved = true;
      this.close();
    };
  }
  onClose() {
    this.resolve(this.approved);
    this.contentEl.empty();
  }
};
var TaskGroupModal = class extends import_obsidian2.Modal {
  constructor(app, controller, group, updated) {
    super(app);
    __publicField(this, "controller", controller);
    __publicField(this, "group", group);
    __publicField(this, "updated", updated);
    __publicField(this, "unbind");
  }
  onOpen() {
    this.modalEl.classList.add("note-workspace-root", "task-editor-dialog", "task-group-dialog");
    this.setTitle(this.group ? "\u7BA1\u7406\u9879\u76EE" : "\u65B0\u5EFA\u9879\u76EE");
    this.contentEl.innerHTML = groupEditor(this.group);
    this.unbind = bindGroupEditor(this.contentEl, this.controller, this.group, () => this.close());
  }
  onClose() {
    this.unbind?.();
    this.contentEl.empty();
    this.updated();
  }
};
/*! Bundled license information:

sortablejs/modular/sortable.esm.js:
  (**!
   * Sortable 1.15.6
   * @author	RubaXa   <trash@rubaxa.org>
   * @author	owenm    <owen23355@gmail.com>
   * @license MIT
   *)
*/
