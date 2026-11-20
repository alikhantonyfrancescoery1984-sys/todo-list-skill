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

// src/ui/html.ts
var escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// src/ui/workspace/module-editor.ts
function moduleEditor(c, module2) {
  const count = c.moduleTaskCount(module2.id);
  return `<form class="task-editor-form module-editor-form"><label for="module-name">\u6A21\u5757\u540D\u79F0</label><input id="module-name" maxlength="80" value="${escapeHtml(module2.name)}" ${module2.kind === "source" ? 'readonly aria-readonly="true"' : ""}><p class="editor-context">${module2.kind === "source" ? "\u540D\u79F0\u6765\u81EA\u7B14\u8BB0\u6587\u4EF6\u5939\u5206\u7C7B\uFF0C\u6B64\u5904\u4E0D\u53EF\u6539\u540D\uFF1B\u7B14\u8BB0\u6587\u4EF6\u548C\u6765\u6E90\u4EFB\u52A1\u4FDD\u7559\u3002" : "\u624B\u52A8\u6A21\u5757\u53EF\u91CD\u547D\u540D\uFF0C\u5DF2\u6709\u6807\u7B7E\u548C\u5F85\u529E\u4FDD\u6301\u5173\u8054\u3002"}</p><button type="button" class="module-view-tasks" data-module-action="view">\u67E5\u770B\u6B64\u6A21\u5757\u5F85\u529E</button><p class="editor-error" role="alert" hidden></p><div class="module-delete-confirm" hidden><p>\u5220\u9664\u6A21\u5757\u5E76\u5220\u9664\u5176\u4E2D ${count} \u6761\u624B\u52A8\u5F85\u529E\uFF1F\u7B14\u8BB0\u6587\u4EF6\u3001\u7B14\u8BB0\u5F85\u529E\u53CA\u5386\u53F2\u7EDF\u8BA1\u4FDD\u7559\u3002${module2.kind === "source" ? "\u6B64\u7B14\u8BB0\u6A21\u5757\u5C06\u4ECE\u5206\u5E03\u9690\u85CF\u3002" : ""}</p><button type="button" class="delete-task" data-module-action="confirm-delete">\u786E\u8BA4\u5220\u9664\u6A21\u5757\u53CA ${count} \u6761\u624B\u52A8\u5F85\u529E</button></div><div class="editor-actions"><button type="button" class="delete-task" data-module-action="delete">\u5220\u9664\u6A21\u5757</button><button type="button" data-module-action="cancel">\u53D6\u6D88</button>${module2.kind === "manual" ? '<button type="submit" class="save-task">\u4FDD\u5B58\u540D\u79F0</button>' : ""}</div></form>`;
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
    if (module2.kind === "manual") void run(() => c.renameModule(module2.id, form.querySelector("#module-name").value));
  }, { signal: events.signal });
  form.addEventListener("click", (e) => {
    const action = e.target.closest("[data-module-action]")?.dataset.moduleAction;
    if (action === "cancel") close();
    if (action === "view") {
      view(module2.id);
      close();
    }
    if (action === "delete") {
      form.querySelector(".module-delete-confirm").hidden = false;
      form.querySelector("[data-module-action=confirm-delete]").focus();
    }
    if (action === "confirm-delete") void run(async () => {
      await c.removeModule(module2.id);
      removed(module2.id);
    });
  }, { signal: events.signal });
  (module2.kind === "manual" ? form.querySelector("#module-name") : form.querySelector("[data-module-action=view]"))?.focus();
  return () => events.abort();
}

// src/core/planning.ts
var SHANGHAI_ZONE = "Asia/Shanghai";
function localDeadline(at) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: SHANGHAI_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at)).replace(" ", "T");
}
function parseDeadline(value) {
  if (!value) return void 0;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("\u8BF7\u9009\u62E9\u5B8C\u6574\u7684\u622A\u6B62\u65E5\u671F\u548C\u65F6\u95F4\u3002");
  const time2 = Date.parse(value + ":00+08:00");
  if (!Number.isFinite(time2) || localDeadline(new Date(time2).toISOString()) !== value) throw new Error("\u622A\u6B62\u65E5\u671F\u6216\u65F6\u95F4\u65E0\u6548\u3002");
  return new Date(time2).toISOString();
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
  return tasks.map((task, index) => ({ task, index })).sort((a, b) => {
    const d = (a.task.dueAt ? Date.parse(a.task.dueAt) : Infinity) - (b.task.dueAt ? Date.parse(b.task.dueAt) : Infinity);
    return Number.isNaN(d) || d === 0 ? a.index - b.index : d;
  }).map((v) => v.task);
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
var emptyState = () => ({ schemaVersion: 2, notes: [], observations: [], sessions: [], receipts: [], completions: [], operations: [], successfulRuns: [], taskRegistry: [] });
function fingerprint(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}
var id = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;

// src/ui/workspace/editor.ts
var taskLabel = (task) => task.label ?? task.text;
function taskEditor(task) {
  return `<form class="task-editor-form"><label for="task-name">\u5F85\u529E\u540D\u79F0${!task || task.origin === "manual" ? " \xB7 \u652F\u6301 #\u6807\u7B7E" : ""}</label><textarea id="task-name" name="task-name" rows="3" maxlength="2000" required>${task ? escapeHtml(taskLabel(task)) : ""}</textarea>${!task || task.origin === "manual" ? '<div class="tag-preview" aria-live="polite"></div><p class="editor-context">\u6807\u7B7E\u5339\u914D\u5DF2\u6709\u6A21\u5757\uFF0C\u5426\u5219\u4FDD\u5B58\u65F6\u521B\u5EFA\u624B\u52A8\u6A21\u5757\uFF1B\u7B2C\u4E00\u4E2A\u6807\u7B7E\u4E3A\u5B8C\u6210\u7EDF\u8BA1\u4E3B\u5206\u7C7B\u3002</p>' : '<p class="editor-context">\u5728\u6E05\u5355\u4E2D\u4FDD\u5B58\u540D\u79F0\u4E0E\u65F6\u95F4\uFF0C\u7B14\u8BB0\u6765\u6E90\u4FDD\u6301\u4E0D\u53D8\u3002</p>'}<div class="planning-fields"><div class="deadline-field">${deadlineInput(task?.dueAt)}<button type="button" class="deadline-clear" data-editor="clear-deadline">\u6E05\u7A7A\u622A\u6B62\u65F6\u95F4</button></div><label class="reminder-enable"><input id="task-reminder-enabled" type="checkbox" ${task?.reminder ? "checked" : ""}>\u63D0\u524D\u63D0\u9192</label><div class="reminder-fields"><label for="task-reminder-value">\u63D0\u524D\u91CF<input id="task-reminder-value" type="number" min="0" max="1000000" step="any" value="${task?.reminder?.value ?? 1}"></label><label for="task-reminder-unit">\u5355\u4F4D<select id="task-reminder-unit"><option value="hours" ${task?.reminder?.unit === "hours" ? "selected" : ""}>\u5C0F\u65F6</option><option value="days" ${task?.reminder?.unit === "days" ? "selected" : ""}>\u5929</option></select></label></div><p class="editor-context">\u5230\u63D0\u9192\u65F6\u95F4\u540E\u540D\u79F0\u53D8\u7EA2\uFF1B\u622A\u6B62\u5DF2\u8FC7\u5219\u4FDD\u6301\u7EA2\u8272\uFF0C\u5B8C\u6210\u540E\u53D6\u6D88\u3002</p></div><p class="editor-error" role="alert" hidden></p><div class="editor-actions">${task ? '<button type="button" class="delete-task" data-editor="delete">\u5220\u9664\u5F85\u529E</button>' : ""}<button type="button" data-editor="cancel">\u53D6\u6D88</button><button type="submit" class="save-task">${task ? "\u4FDD\u5B58\u4FEE\u6539" : "\u521B\u5EFA\u5F85\u529E"}</button></div></form>`;
}
function bindTaskEditor(root, c, task, close, onDeleted) {
  const events = new AbortController(), form = root.querySelector("form"), input = form.querySelector("#task-name"), error = form.querySelector(".editor-error"), deadline = form.querySelector("#task-deadline-date"), period = form.querySelector("#task-deadline-period"), hour = form.querySelector("#task-deadline-hour"), minute = form.querySelector("#task-deadline-minute"), enabled = form.querySelector("#task-reminder-enabled"), amount = form.querySelector("#task-reminder-value"), unit = form.querySelector("#task-reminder-unit");
  const draftId = id("task-manual");
  let busy = false;
  const sync = () => {
    enabled.disabled = !deadline.value;
    if (!deadline.value) enabled.checked = false;
    amount.disabled = unit.disabled = !deadline.value || !enabled.checked;
    amount.required = !amount.disabled;
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
      input.focus();
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
      const options = { dueAt: dueAt ?? null, reminder: dueAt && enabled.checked ? { value: Number(amount.value), unit: unit.value } : null };
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
var import_obsidian = require("obsidian");

// src/core/tasks.ts
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
    const block = m[2].match(/\s+\^([a-zA-Z0-9-]+)\s*$/);
    found.push({ text: m[2].replace(/\s+\^[a-zA-Z0-9-]+\s*$/, "").trim(), line, done: m[1] !== " ", blockId: block?.[1] });
  }
  const norm = (s) => s.trim().replace(/\s+/g, " ");
  const previousHere = previous.filter((t) => t.noteId === note.id);
  const seen = /* @__PURE__ */ new Map();
  return found.map((f) => {
    const text = norm(f.text), occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    const same = previousHere.filter((t) => norm(t.text) === text);
    const duplicate = found.filter((t) => norm(t.text) === text).length > 1;
    const oldAtLine = previousHere.find((t) => t.line === f.line && !found.some((n) => norm(n.text) === norm(t.text)));
    const blockMatch = f.blockId ? previousHere.find((t) => t.blockId === f.blockId) : void 0;
    const generated = f.blockId ? `task-${fingerprint(note.id)}-b-${f.blockId}` : `task-${fingerprint(note.id)}-${fingerprint(text)}-${occurrence}`;
    const duplicateBlock = !!f.blockId && found.filter((t) => t.blockId === f.blockId).length > 1;
    return { ...f, noteId: note.id, id: blockMatch?.id ?? (!duplicate && same.length === 1 ? same[0].id : generated), ambiguous: duplicateBlock || !f.blockId && (duplicate || !!oldAtLine) };
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

// src/core/modules.ts
var INBOX_MODULE = "manual-inbox";
function moduleForPath(path, config = DEFAULT_CONFIG) {
  if (path === "\u624B\u52A8\u5F85\u529E") return "\u624B\u52A8\u5F85\u529E";
  return classify(path, [.../* @__PURE__ */ new Set([...Object.values(config.columnMap), config.fallback])], config);
}
var sourceModuleId = (name) => "source:" + tagKey(name);
function moduleCatalog(state, manuals = [], hidden = [], config = DEFAULT_CONFIG) {
  const labels = [.../* @__PURE__ */ new Set([...Object.values(config.columnMap), config.fallback, ...state.notes.filter((n) => n.id !== "note-manual-tasks").map((n) => moduleForPath(n.path, config))])];
  return [...labels.map((name) => ({ id: sourceModuleId(name), name, kind: "source", hidden: hidden.includes(sourceModuleId(name)), aliases: [] })), ...manuals.filter((m) => !m.deletedAt).map((m) => ({ ...m, kind: "manual", hidden: false }))];
}
function moduleForTask(task, noteId, state, catalog, manuals = [], config = DEFAULT_CONFIG) {
  if (task?.origin === "manual") {
    const key = task.moduleIds?.[0] ?? INBOX_MODULE, active = catalog.find((m) => m.id === key);
    if (active) return active;
    const removed = manuals.find((m) => m.id === key);
    if (removed) return { ...removed, kind: "manual", hidden: true };
    return { id: INBOX_MODULE, name: "\u624B\u52A8\u5F85\u529E", kind: "manual", hidden: false, aliases: [] };
  }
  const note = state.notes.find((n) => n.id === noteId), name = note ? moduleForPath(note.path, config) : "\u6765\u6E90\u4E0D\u53EF\u7528";
  return catalog.find((m) => m.id === sourceModuleId(name)) ?? { id: sourceModuleId(name), name, kind: "source", hidden: false, aliases: [] };
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
  const norm = (s) => s.trim().replace(/\s+/g, " ");
  for (const candidate of newChanged) {
    if (existingIds.has(candidate.id) || candidate.blockId) continue;
    const old = oldEnd - start === newEnd - start ? oldChanged.find((t) => t.line === candidate.line) : oldChanged.length === 1 && newChanged.length === 1 ? oldChanged[0] : void 0;
    if (!old || old.blockId || used.has(old.id)) continue;
    if (previous.filter((t) => norm(t.text) === norm(old.text)).length !== 1 || next.filter((t) => norm(t.text) === norm(candidate.text)).length !== 1) continue;
    candidate.id = old.id;
    candidate.ambiguous = old.ambiguous;
    used.add(old.id);
  }
  return next.sort((a, b) => a.line - b.line);
}

// src/core/usage.ts
var UsageRecorder = class {
  constructor(state, clock, idleMs = 9e4) {
    __publicField(this, "state", state);
    __publicField(this, "clock", clock);
    __publicField(this, "idleMs", idleMs);
    __publicField(this, "active", null);
  }
  interact(noteId, source = "user") {
    const now = this.clock.now().getTime();
    if (source === "external") return;
    if (this.active && now - this.active.last > this.idleMs) this.close("idle");
    if (this.active && this.active.noteId !== noteId) this.close("switch");
    if (!this.active) this.active = { noteId, start: now, last: now };
    else this.active.last = Math.max(this.active.last, now);
    observeNote(this.state, noteId, localDate(new Date(now)));
  }
  checkIdle() {
    if (this.active && this.clock.now().getTime() - this.active.last > this.idleMs) this.close("idle");
  }
  close(reason = "pause") {
    if (!this.active) return;
    const a = this.active, now = this.clock.now().getTime();
    const end = reason === "idle" || reason === "interruption" || now - a.last > this.idleMs ? a.last : now;
    if (end > a.start) this.state.sessions.push({ id: id("session"), noteId: a.noteId, start: new Date(a.start).toISOString(), end: new Date(end).toISOString(), estimated: true, reason });
    this.active = null;
  }
};
function observeNote(state, noteId, date) {
  if (!state.observations.some((o) => o.noteId === noteId && o.date === date)) state.observations.push({ noteId, date });
}

// src/application/workspace.ts
var emptyWorkspace = () => ({ schemaVersion: 5, manualModules: [], hiddenModules: [], state: emptyState(), tasks: [], decisions: {}, deletedNotes: [] });
var validDate = (s) => typeof s === "string" && Number.isFinite(Date.parse(s));
var object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function validateWorkspace(raw) {
  if (!object(raw) || (typeof raw.schemaVersion !== "number" || ![2, 3, 4, 5].includes(raw.schemaVersion)) || !object(raw.state) || raw.state.schemaVersion !== (raw.schemaVersion === 2 ? 1 : 2) || !Array.isArray(raw.tasks) || !object(raw.decisions) || !Array.isArray(raw.deletedNotes)) throw new Error("\u4EFB\u52A1\u6570\u636E\u683C\u5F0F\u4E0D\u53D7\u652F\u6301\uFF1B\u539F\u6570\u636E\u672A\u8986\u76D6\u3002");
  const s = raw.state;
  if (raw.schemaVersion !== 2 && "activities" in s) throw new Error("\u5F53\u524D\u4EFB\u52A1\u683C\u5F0F\u4E0D\u63A5\u53D7\u5DF2\u79FB\u9664\u7684\u8282\u70B9\u6570\u636E\u3002");
  for (const k of ["notes", raw.schemaVersion === 2 ? "activities" : "observations", "sessions", "receipts", "completions", "operations", "successfulRuns", "taskRegistry"]) if (!Array.isArray(s[k])) throw new Error("\u4EFB\u52A1\u6570\u636E\u4E0D\u5B8C\u6574\uFF1B\u539F\u6570\u636E\u672A\u8986\u76D6\u3002");
  const notes = s.notes, ids = /* @__PURE__ */ new Set(), paths = /* @__PURE__ */ new Set();
  for (const n of notes) {
    if (!object(n) || typeof n.id !== "string" || typeof n.path !== "string" || typeof n.text !== "string" || !Number.isInteger(n.version) || ids.has(n.id)) throw new Error("\u7B14\u8BB0\u8EAB\u4EFD\u6570\u636E\u635F\u574F\u3002");
    ids.add(n.id);
    paths.add(n.path);
  }
  const taskIds = /* @__PURE__ */ new Set();
  for (const t of raw.tasks) {
    if (!object(t) || typeof t.id !== "string" || typeof t.noteId !== "string" || !ids.has(t.noteId) || typeof t.text !== "string" || typeof t.done !== "boolean" || typeof t.ambiguous !== "boolean" || !Number.isInteger(t.line) || Number(t.line) < 0 || !validDate(t.collectedAt) || taskIds.has(t.id) || t.completedAt !== void 0 && !validDate(t.completedAt) || t.deletedAt !== void 0 && !validDate(t.deletedAt) || t.origin !== void 0 && t.origin !== "manual" || t.dueAt !== void 0 && (!validDate(t.dueAt) || !/[Tt].*(?:Z|[+-]\d{2}:\d{2})$/.test(String(t.dueAt))) || t.reminder !== void 0 && (!t.dueAt || !validReminder(t.reminder)) || t.moduleIds !== void 0 && (!Array.isArray(t.moduleIds) || t.moduleIds.some((k) => typeof k !== "string") || new Set(t.moduleIds).size !== t.moduleIds.length) || t.label !== void 0 && (typeof t.label !== "string" || !t.label.trim() || t.label.length > 2e3)) throw new Error("\u4EFB\u52A1\u6761\u76EE\u635F\u574F\u3002");
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
  for (const i of s.sessions) if (!object(i) || typeof i.noteId !== "string" || !ids.has(i.noteId) || !validDate(i.start) || !validDate(i.end)) throw new Error("\u6D3B\u52A8\u533A\u95F4\u635F\u574F\u3002");
  for (const r of s.receipts) if (!object(r) || !validDate(r.at) || !Array.isArray(r.taskIds) || r.taskIds.some((t) => typeof t !== "string" || !taskIds.has(t))) throw new Error("\u6536\u5F55\u8BB0\u5F55\u635F\u574F\u3002");
  for (const c of s.completions) if (!object(c) || typeof c.taskId !== "string" || !taskIds.has(c.taskId) || !validDate(c.at)) throw new Error("\u5B8C\u6210\u8BB0\u5F55\u635F\u574F\u3002");
  for (const [key, value] of Object.entries(raw.decisions)) if (!ids.has(key) || !["allow", "skip"].includes(String(value))) throw new Error("\u5BFC\u5165\u9009\u62E9\u635F\u574F\u3002");
  if (raw.deletedNotes.some((n) => typeof n !== "string" || !ids.has(n))) throw new Error("\u6765\u6E90\u72B6\u6001\u635F\u574F\u3002");
  const result = structuredClone(raw);
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
  if (raw.schemaVersion === 5) {
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
  result.schemaVersion = 5;
  return result;
}
var WorkspaceController = class {
  constructor(source, clock, store, confirm, raw = null) {
    __publicField(this, "source", source);
    __publicField(this, "clock", clock);
    __publicField(this, "store", store);
    __publicField(this, "confirm", confirm);
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
    __publicField(this, "recorder");
    this.data = raw === null ? emptyWorkspace() : validateWorkspace(raw);
    this.syncRegistry();
    this.recorder = new UsageRecorder(this.state, clock);
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
    return { tasks: this.data.tasks, manualModules: this.data.manualModules, hiddenModules: this.data.hiddenModules };
  }
  get modules() {
    return moduleCatalog(this.state, this.data.manualModules, this.data.hiddenModules);
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
  async open(file) {
    if (this.disposed || !this.allowed(file)) return;
    const n = this.register(file), generation = (this.generations.get(file) ?? 0) + 1;
    this.generations.set(file, generation);
    this.recorder.interact(n.id);
    this.save();
    this.emit();
    try {
      const packet = await this.source.read(file);
      if (this.disposed || this.generations.get(file) !== generation) return;
      if (packet.text.length > 1e6) throw new Error("\u6587\u4EF6\u8D85\u8FC7 1MB \u5BFC\u5165\u4E0A\u9650\u3002");
      if (!n.dirty) this.receive(n, packet.text, packet.indexed);
    } catch (error) {
      if (!this.disposed && this.generations.get(file) === generation) {
        n.error = error instanceof Error ? error.message : String(error);
        this.emit();
      }
    }
    await this.imports.get(n.id);
  }
  edit(file, text) {
    if (this.disposed || !this.allowed(file) || text.length > 1e6) return;
    const n = this.register(file), confirmed = n.indexed && n.text === text;
    this.generations.set(file, (this.generations.get(file) ?? 0) + 1);
    this.receive(n, text, confirmed, !confirmed);
    this.recorder.interact(n.id);
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
          continue;
        }
        if (candidate.done || candidate.ambiguous) continue;
        this.data.tasks.push({ ...candidate, done: false, collectedAt: at });
        added.push(candidate.id);
      }
      for (const task of this.tasks.filter((t) => t.noteId === noteId)) if (!candidates.some((c) => c.id === task.id)) task.missingFromSource = true;
      if (added.length) this.state.receipts.push({ id: id("receipt"), noteId, taskIds: added, at });
      this.syncRegistry();
      await this.persist();
      this.emit();
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
    const moduleIds = this.assignTags(value);
    if (!this.state.notes.some((n) => n.id === noteId)) this.state.notes.push({ id: noteId, path: "\u624B\u52A8\u5F85\u529E", text: "", version: 0 });
    const at = this.clock.now().toISOString();
    this.data.tasks.push({ id: taskId, noteId, text: value, line: 0, done: false, ambiguous: false, collectedAt: at, origin: "manual", ...details, moduleIds });
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
    return { dueAt, reminder: reminder ? { ...reminder } : void 0 };
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
    if (task.origin === "manual") {
      if (!parseTags(value).body) throw new Error("\u6807\u7B7E\u4EE5\u5916\u8FD8\u9700\u8981\u586B\u5199\u5F85\u529E\u540D\u79F0\u3002");
      const moduleIds = this.assignTags(value);
      task.text = value;
      task.moduleIds = moduleIds;
    } else task.label = value;
    Object.assign(task, details);
    this.emit();
    await this.persist();
  }
  moduleTaskCount(moduleId) {
    return this.tasks.filter((t) => t.origin === "manual" && this.taskInModule(t, moduleId)).length;
  }
  async renameModule(moduleId, name) {
    if (this.disposed) return;
    const module2 = this.data.manualModules.find((m) => m.id === moduleId && !m.deletedAt);
    if (!module2) throw new Error("\u7B14\u8BB0\u6765\u6E90\u6A21\u5757\u7684\u540D\u79F0\u4E0D\u80FD\u4FEE\u6539\u3002");
    const value = name.trim();
    if (!value || !tagKey(value) || value.length > 80) throw new Error("\u6A21\u5757\u540D\u79F0\u9700\u8981 1\u201380 \u4E2A\u5B57\u7B26\u3002");
    const collision = this.modules.find((m) => m.id !== moduleId && [m.name, ...m.aliases].some((n) => tagKey(n) === tagKey(value)));
    if (collision) throw new Error("\u5DF2\u6709\u540C\u540D\u6A21\u5757\uFF0C\u8BF7\u4F7F\u7528\u5176\u5B83\u540D\u79F0\u3002");
    if (tagKey(module2.name) !== tagKey(value) && !module2.aliases.some((a) => tagKey(a) === tagKey(module2.name))) module2.aliases.push(module2.name);
    module2.name = value;
    this.emit();
    await this.persist();
  }
  async removeModule(moduleId) {
    if (this.disposed) return;
    const deleted = this.data.manualModules.find((m) => m.id === moduleId);
    const module2 = this.modules.find((m) => m.id === moduleId) ?? (deleted ? { ...deleted, kind: "manual", hidden: true } : void 0);
    if (!module2) throw new Error("\u6A21\u5757\u5DF2\u4E0D\u5B58\u5728\u3002");
    const at = this.clock.now().toISOString();
    for (const t of this.tasks) if (t.origin === "manual" && this.taskInModule(t, moduleId)) t.deletedAt = at;
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
    task.done = done;
    if (done) {
      task.completedAt = this.clock.now().toISOString();
      this.state.completions.push({ taskId, noteId: task.noteId, at: task.completedAt });
    } else delete task.completedAt;
    this.emit();
    await this.persist();
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
    this.recorder.close("interruption");
    this.observed.delete(key);
    this.candidates.delete(key);
    this.identities.delete(file);
    if (!this.data.deletedNotes.includes(key)) this.data.deletedNotes.push(key);
    for (const task of this.tasks.filter((t) => t.noteId === key)) task.sourceUnavailable = true;
    this.save();
    this.emit();
  }
  pause() {
    if (this.disposed) return;
    this.recorder.close("blur");
    this.save();
    this.emit();
  }
  checkIdle() {
    if (this.disposed) return;
    const before = this.state.sessions.length;
    this.recorder.checkIdle();
    if (this.state.sessions.length !== before) {
      this.save();
      this.emit();
    }
  }
  async dispose() {
    if (this.disposed) return;
    this.recorder.close("interruption");
    this.disposed = true;
    this.listeners.clear();
    await this.persist();
    this.observed.clear();
    this.candidates.clear();
  }
};

// src/ui/workspace/tasks.ts
var link = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
function renderTasks(c, filter, href, expanded = /* @__PURE__ */ new Set(), moduleId) {
  const tasks = orderByDeadline(c.tasks.filter((t) => t.done === (filter === "done") && (!moduleId || c.taskInModule(t, moduleId))));
  const fileLink = (noteId, line, compact = false, header = false) => `<a class="${header ? "task-file-link" : "note-link readonly-note-link"}${compact ? " compact-source-link" : ""}" href="${escapeHtml(href(noteId))}" data-action="source-note" data-note="${escapeHtml(noteId)}" data-line="${line}" title="${escapeHtml(c.state.notes.find((n) => n.id === noteId)?.path ?? "")}" aria-label="\u6253\u5F00\u6E90\u7B14\u8BB0 ${escapeHtml(c.title(noteId))}${header ? "" : "\u7684\u4EFB\u52A1\u884C"}">${link}${compact ? "" : `<span>${escapeHtml(c.title(noteId))}</span>`}</a>`;
  const item = (t, compact = false) => {
    const name = displayTaskName(t), status = deadlineState(t, c.now().getTime()), warning = status === "warning" || status === "overdue", help = "task-help-" + t.id, hint = deadlineHint(t);
    const tags = t.origin === "manual" ? (t.moduleIds ?? []).map((id2) => c.modules.find((m) => m.id === id2)).filter((m) => m && m.id !== "manual-inbox") : [];
    return `<li class="task-item ${t.done ? "done" : ""} ${warning ? "deadline-warning" : ""}" data-task-item="${escapeHtml(t.id)}" data-deadline-state="${status}"><input type="checkbox" data-complete="${escapeHtml(t.id)}" aria-label="${t.done ? "\u91CD\u65B0\u6253\u5F00" : "\u5B8C\u6210"}\u4EFB\u52A1\uFF1A${escapeHtml(name)}" ${t.done ? "checked" : ""}><div class="task-copy readonly-task-copy"><button class="task-title-button" data-action="edit-task" data-task="${escapeHtml(t.id)}" ${hint ? `aria-describedby="${escapeHtml(help)}"` : ""}>${escapeHtml(name)}</button>${hint ? `<span id="${escapeHtml(help)}" class="task-time-description" hidden>${escapeHtml(hint)}</span>` : ""}${tags.length ? `<div class="task-tags">${tags.map((m) => `<span>#${escapeHtml(m.name)}</span>`).join("")}</div>` : ""}${t.sourceUnavailable ? "<small>\u6765\u6E90\u4E0D\u53EF\u7528</small>" : ""}</div>${t.origin === "manual" ? '<span class="manual-task-label">\u624B\u52A8</span>' : t.sourceUnavailable ? "" : fileLink(t.noteId, t.line, compact)}</li>`;
  };
  const counts = /* @__PURE__ */ new Map();
  for (const t of c.tasks) counts.set(t.noteId, (counts.get(t.noteId) ?? 0) + 1);
  const rendered = /* @__PURE__ */ new Set();
  const rows = tasks.map((t) => {
    if (filter === "pending" && t.dueAt || t.origin === "manual" || (counts.get(t.noteId) ?? 0) <= 5) return item(t);
    if (rendered.has(t.noteId)) return "";
    rendered.add(t.noteId);
    const group = tasks.filter((task) => task.noteId === t.noteId && (filter === "done" || !task.dueAt)), unavailable = c.data.deletedNotes.includes(t.noteId);
    return `<li class="task-file-container"><details class="task-file-group" data-task-group="${escapeHtml(t.noteId)}" ${expanded.has(t.noteId) ? "open" : ""}><summary><span class="task-file-title" title="${escapeHtml(c.state.notes.find((n) => n.id === t.noteId)?.path ?? "")}">${escapeHtml(c.title(t.noteId))}</span><span class="task-file-count">${group.length} \u6761</span><svg class="task-file-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>${unavailable ? '<span class="source-unavailable">\u6765\u6E90\u4E0D\u53EF\u7528</span>' : fileLink(t.noteId, 0, true, true)}</summary><ul class="task-list readonly-tasks task-file-children">${group.map((task) => item(task, true)).join("")}</ul></details></li>`;
  }).join("");
  return `<div class="task-create-surface" data-task-surface>${moduleId ? `<div class="module-task-filter"><span>\u6A21\u5757\uFF1A${escapeHtml(c.modules.find((m) => m.id === moduleId)?.name ?? "\u5168\u90E8")}</span><button data-action="clear-module">\u67E5\u770B\u5168\u90E8</button></div>` : ""}<nav class="task-filters" aria-label="\u4EFB\u52A1\u72B6\u6001"><button data-action="filter" data-filter="pending" aria-pressed="${filter === "pending"}">\u5F85\u529E ${c.pending.length}</button><button data-action="filter" data-filter="done" aria-pressed="${filter === "done"}">\u5DF2\u5B8C\u6210 ${c.tasks.length - c.pending.length}</button></nav><ul class="task-list readonly-tasks">${rows || `<li class="empty">${filter === "done" ? "\u8FD8\u6CA1\u6709\u5DF2\u5B8C\u6210\u4EFB\u52A1\u3002" : "\u6CA1\u6709\u5F85\u529E\uFF1B\u8BBF\u95EE\u7B14\u8BB0\u540E\u4F1A\u8BFB\u53D6\u4EFB\u52A1\u3002"}</li>`}</ul><button class="task-create-button" data-action="new-task"><span aria-hidden="true">\uFF0B</span><span>\u5199\u4E0B\u4E00\u4E2A\u5F85\u529E</span></button><div class="task-blank-area" aria-hidden="true"></div></div>`;
}

// src/core/analytics.ts
function dailyStats(state, date, config = DEFAULT_CONFIG, context = {}) {
  const start = (/* @__PURE__ */ new Date(`${date}T00:00:00+08:00`)).getTime();
  if (!Number.isFinite(start)) throw new Error("\u65E5\u671F\u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
  const end = start + 864e5;
  const warnings = [], intervals = [];
  let previousEnd = -Infinity;
  const sorted = [...state.sessions].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  for (const s of sorted) {
    const from = new Date(s.start).getTime(), to = new Date(s.end).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 864e5) {
      warnings.push("\u5DF2\u6392\u9664\u65E0\u6548\u65F6\u95F4\u533A\u95F4");
      continue;
    }
    const uniqueStart = Math.max(from, previousEnd);
    if (uniqueStart > from) warnings.push("\u5DF2\u53BB\u9664\u91CD\u53E0\u65F6\u95F4");
    previousEnd = Math.max(previousEnd, to);
    const a = Math.max(uniqueStart, start), b = Math.min(to, end);
    if (b > a) intervals.push({ ...s, start: new Date(a).toISOString(), end: new Date(b).toISOString(), minutes: (b - a) / 6e4 });
  }
  const completed = state.completions.filter((e) => localDate(e.at) === date), receipts = state.receipts.filter((r) => localDate(r.at) === date);
  const tasks = context.tasks ?? state.taskRegistry, visible = tasks.filter((t) => !t.deletedAt), catalog = moduleCatalog(state, context.manualModules, context.hiddenModules, config), byId = new Map(tasks.map((t) => [t.id, t]));
  const modules = /* @__PURE__ */ new Map();
  function group(noteId, task) {
    const ref = moduleForTask(task, noteId, state, catalog, context.manualModules, config);
    if (!modules.has(ref.id)) modules.set(ref.id, { ...ref, minutes: 0, completed: 0, pending: 0 });
    return modules.get(ref.id);
  }
  for (const s of intervals) group(s.noteId).minutes += s.minutes;
  for (const taskId of new Set(completed.map((e) => e.taskId))) {
    const e = completed.find((e2) => e2.taskId === taskId);
    group(e.noteId, byId.get(taskId)).completed++;
  }
  for (const task of visible) {
    const g = group(task.noteId, task);
    if (!task.done) g.pending++;
  }
  for (const ref of catalog.filter((m) => m.kind === "manual")) if (!modules.has(ref.id)) modules.set(ref.id, { ...ref, minutes: 0, completed: 0, pending: 0 });
  const noteIds = /* @__PURE__ */ new Set([...state.observations.filter((a) => a.date === date).map((a) => a.noteId), ...intervals.map((s) => s.noteId)]);
  return { date, total: visible.length, pending: visible.filter((t) => !t.done).length, completed: new Set(completed.map((e) => e.taskId)).size, collected: new Set(receipts.flatMap((r) => r.taskIds)).size, notes: noteIds.size, activeMinutes: intervals.reduce((n, i) => n + i.minutes, 0), intervals, modules: [...modules.values()].sort((a, b) => b.minutes - a.minutes), warnings: [...new Set(warnings)] };
}
function recentDays(date, count = 7) {
  const last = /* @__PURE__ */ new Date(`${date}T12:00:00+08:00`);
  return Array.from({ length: count }, (_, i) => localDate(new Date(last.getTime() - (count - 1 - i) * 864e5)));
}
function minutesLabel(minutes) {
  if (minutes <= 0) return "\u672A\u8BB0\u5F55";
  if (minutes < 1) return "<1 \u5206\u949F";
  const value = Math.round(minutes);
  return value >= 60 ? `${Math.floor(value / 60)} \u5C0F\u65F6${value % 60 ? ` ${value % 60} \u5206\u949F` : ""}` : `${value} \u5206\u949F`;
}

// src/ui/statistics/view.ts
function dateControls(date) {
  const adjacent = (offset) => localDate(new Date(Date.parse(`${date}T12:00:00+08:00`) + offset * 864e5));
  return `<div class="statistics-date-control"><button data-action="day" data-date="${adjacent(-1)}" aria-label="\u4E0A\u4E00\u5929">\u2039</button><label><span class="sr-only">\u7EDF\u8BA1\u65E5\u671F</span><input id="stats-date" type="date" value="${date}" aria-label="\u7EDF\u8BA1\u65E5\u671F"></label><button data-action="day" data-date="${adjacent(1)}" aria-label="\u4E0B\u4E00\u5929">\u203A</button></div>`;
}
function renderStatistics(state, date, context) {
  const { title, time: time2 } = context, s = dailyStats(state, date, DEFAULT_CONFIG, context.source), days = recentDays(date).map((d) => dailyStats(state, d, DEFAULT_CONFIG, context.source)), max = Math.max(0, ...days.map((d) => d.activeMinutes));
  return `<main id="main" tabindex="-1" class="statistics-view note-workspace-statistics">${context.dateControls ? dateControls(date) : ""}<div class="stat-summary"><div data-stat="total"><span>\u7D2F\u8BA1\u4EFB\u52A1</span><strong>${s.total}<small>\u9879</small></strong></div><div data-stat="new"><span>\u5F53\u65E5\u65B0\u589E</span><strong>${s.collected}<small>\u9879</small></strong></div><div data-stat="completed"><span>\u5F53\u65E5\u5B8C\u6210</span><strong>${s.completed}<small>\u9879</small></strong></div><div data-stat="notes"><span>\u6D89\u53CA\u7B14\u8BB0</span><strong>${s.notes}<small>\u7BC7</small></strong></div><div data-stat="duration"><span>\u5DF2\u8BB0\u5F55\u65F6\u957F</span><strong class="duration">${s.activeMinutes ? escapeHtml(minutesLabel(s.activeMinutes)) : "\u672A\u8BB0\u5F55"}</strong></div></div><details class="statistics-provenance"><summary>\u67E5\u770B\u7EDF\u8BA1\u53E3\u5F84</summary><p>\u7D2F\u8BA1\u4EFB\u52A1\u662F\u5F53\u524D\u6E05\u5355\u5168\u90E8\u672A\u5220\u9664\u5F85\u529E\u4E0E\u5B8C\u6210\u9879\u3002\u5F53\u65E5\u65B0\u589E\u6309\u6240\u9009\u65E5\u671F\u9996\u6B21\u6536\u5F55\u6216\u521B\u5EFA\u7684\u4EFB\u52A1\u53BB\u91CD\u8BA1\u6570\uFF0C\u5220\u9664\u4E0D\u4F1A\u91CD\u5199\u5386\u53F2\uFF1B\u5F53\u65E5\u5B8C\u6210\u6309\u5F53\u5929\u5B8C\u6210\u8FC7\u7684\u4EFB\u52A1\u53BB\u91CD\u3002\u8FD1\u4E03\u5929\u6C47\u603B\u4FDD\u5B58\u7684\u6D3B\u52A8\u533A\u95F4\uFF0C\u6309\u4E0A\u6D77\u65E5\u671F\u62C6\u5206\u5E76\u53BB\u9664\u91CD\u590D\u8986\u76D6\u3002</p></details>${s.warnings.length ? `<p class="data-note">${s.warnings.map(escapeHtml).join("\uFF1B")}\u3002</p>` : ""}<div class="stats-columns"><section><div class="section-heading"><h2>\u8FD1\u4E03\u5929</h2><span>\u5DF2\u8BB0\u5F55\u65F6\u957F</span></div><div class="week-chart">${days.map((d) => `<button data-seconds="${d.activeMinutes * 60}" class="week-day ${d.date === date ? "current" : ""}" data-action="day" data-date="${d.date}" aria-label="${d.date}\uFF0C${d.activeMinutes ? minutesLabel(d.activeMinutes) : "\u672A\u8BB0\u5F55"}"><span class="week-value">${d.activeMinutes ? d.activeMinutes < 1 ? "<1m" : Math.round(d.activeMinutes) + "m" : "\u2014"}</span><span class="week-bar" style="height:${max > 0 ? d.activeMinutes / max * 88 : 0}px"></span><span class="week-date"><span class="week-month">${d.date.slice(5, 7)}/</span><span>${d.date.slice(8)}</span></span></button>`).join("")}</div></section></div><section class="details-section"><div class="section-heading"><h2>\u6D3B\u52A8\u660E\u7EC6</h2><span>\u4EFB\u52A1\u7528\u65F6\u53EA\u5728\u660E\u786E\u8BA1\u65F6\u540E\u8BB0\u5F55</span></div><div class="table-scroll"><table><caption class="sr-only">\u5F53\u65E5\u6D3B\u52A8\u660E\u7EC6</caption><thead><tr><th>\u65F6\u95F4\u6BB5</th><th>\u7B14\u8BB0 / \u4EFB\u52A1</th><th>\u8BB0\u5F55\u65B9\u5F0F</th><th>\u8BB0\u5F55\u65F6\u957F</th><th>\u4EFB\u52A1\u7528\u65F6</th></tr></thead><tbody>${s.intervals.map((v) => `<tr><td>${time2(v.start)}\u2014${time2(v.end)}</td><td><button class="text-button" data-action="source-note" data-note="${escapeHtml(v.noteId)}" data-line="0">${escapeHtml(title(v.noteId))}</button></td><td>${v.taskId ? "\u4EFB\u52A1\u8BA1\u65F6" : "\u7B14\u8BB0\u6D3B\u52A8"}</td><td>${escapeHtml(minutesLabel(v.minutes))}</td><td>${v.taskId ? escapeHtml(minutesLabel(v.minutes)) : "\u672A\u8BB0\u5F55"}</td></tr>`).join("") || '<tr><td colspan="5">\u6682\u65E0\u8BB0\u5F55</td></tr>'}</tbody></table></div></section></main>`;
}
function renderModuleDistribution(state, date, source = {}) {
  const s = dailyStats(state, date, DEFAULT_CONFIG, source), visible = s.modules.filter((m) => !m.hidden);
  const paths = (name) => [...new Set(state.notes.filter((n) => s.intervals.some((i) => i.noteId === n.id)).filter((n) => moduleForPath(n.path) === name).map((n) => n.path.includes("/") ? n.path.slice(0, n.path.lastIndexOf("/") + 1) : n.path))].join("\u3001");
  return `<section class="module-card" aria-label="\u6A21\u5757\u5206\u5E03"><div class="section-heading"><h2>\u6A21\u5757\u5206\u5E03</h2><span>\u5DF2\u8BB0\u5F55\u65F6\u957F</span></div><div class="module-total"><strong>${s.activeMinutes ? escapeHtml(minutesLabel(s.activeMinutes)) : "\u6682\u65E0\u8BB0\u5F55"}</strong><span>${date.slice(5).replace("-", "\u6708")}\u65E5</span></div>${visible.length ? `<ul class="module-list">${visible.map((m) => {
    const share = s.activeMinutes > 0 ? Math.max(0, Math.min(100, m.minutes / s.activeMinutes * 100)) : 0;
    return `<li data-module="${escapeHtml(m.name)}" data-module-id="${escapeHtml(m.id)}" data-module-kind="${m.kind}" data-seconds="${m.minutes * 60}" data-completed="${m.completed}" title="${escapeHtml(paths(m.name))} \xB7 ${Math.round(m.minutes * 60)} \u79D2"><div><button class="module-open" data-action="module-menu" data-module-id="${escapeHtml(m.id)}" aria-label="\u7BA1\u7406\u6A21\u5757 ${escapeHtml(m.name)}">${escapeHtml(m.name)}</button><span class="module-meta"><span>${escapeHtml(minutesLabel(m.minutes))}</span><span>\xB7 ${m.completed} \u9879\u5B8C\u6210</span></span></div><div class="module-track" role="img" aria-label="${escapeHtml(m.name)}\uFF0C\u5360\u8BB0\u5F55\u65F6\u957F ${share.toFixed(1)}%"><span style="width:${share}%"></span></div></li>`;
  }).join("")}</ul>` : '<p class="empty">\u6682\u65E0\u6A21\u5757\u8BB0\u5F55\u3002</p>'}${s.modules.some((m) => m.hidden && m.kind === "source") ? `<details class="hidden-module-list"><summary>\u5DF2\u9690\u85CF\u6A21\u5757</summary>${s.modules.filter((m) => m.hidden && m.kind === "source").map((m) => `<button data-action="restore-module" data-module-id="${escapeHtml(m.id)}">\u91CD\u65B0\u663E\u793A ${escapeHtml(m.name)}</button>`).join("")}</details>` : ""}<details class="module-provenance"><summary>\u67E5\u770B\u8BB0\u5F55\u53E3\u5F84</summary><p>\u7B14\u8BB0\u6309\u6587\u4EF6\u5939\u5F52\u7C7B\uFF0C\u624B\u52A8\u5F85\u529E\u6309\u6807\u7B7E\u5F52\u7C7B\uFF1B\u5B8C\u6210\u6570\u53EA\u8BA1\u5165\u7B2C\u4E00\u4E2A\u4E3B\u6807\u7B7E\uFF0C\u907F\u514D\u91CD\u590D\u3002\u6C47\u603B\u5DF2\u4FDD\u5B58\u7684\u6D3B\u52A8\u533A\u95F4\u3002\u7A7A\u95F2\u3001\u5173\u95ED\u5E94\u7528\u53CA\u672A\u8BB0\u5F55\u65F6\u6BB5\u4E0D\u8BA1\u5165\uFF1B\u5B8C\u6210\u6570\u6765\u81EA\u672C\u63D2\u4EF6\u7684\u5B8C\u6210\u8BB0\u5F55\u3002</p></details></section>`;
}

// src/main.ts
var VIEW = "note-trajectory-readonly";
var time = (at) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
var NoteWorkspace = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "controller");
    __publicField(this, "confirmationTail", Promise.resolve());
    __publicField(this, "activeModal", null);
    __publicField(this, "pending", /* @__PURE__ */ new Map());
    __publicField(this, "stopped", false);
  }
  async onload() {
    const data = await this.loadData();
    try {
      this.controller = new WorkspaceController({ read: async (file) => ({ text: await this.app.vault.cachedRead(file), indexed: !!this.app.metadataCache.getFileCache(file) }) }, { now: () => /* @__PURE__ */ new Date() }, { save: (value) => this.saveData(value) }, (question) => this.askImport(question), data ?? null);
    } catch (error) {
      new import_obsidian.Notice("\u4EFB\u52A1\u6570\u636E\u65E0\u6CD5\u8F7D\u5165\uFF0C\u539F\u6570\u636E\u5DF2\u4FDD\u7559\u3002");
      throw error;
    }
    this.registerView(VIEW, (leaf) => new WorkspaceView(leaf, this));
    this.addCommand({ id: "open-readonly-trajectory", name: "\u6253\u5F00\u5F85\u529E\u6E05\u5355", callback: () => {
      void this.openView();
    } });
    this.addCommand({ id: "read-current-note-tasks", name: "\u8BFB\u53D6\u5F53\u524D\u7B14\u8BB0\u5F85\u529E", callback: () => {
      const file = this.app.workspace.getActiveFile();
      if (file) void this.controller.open(file).then(() => {
        const note = this.controller.state.notes.find((n) => n.path === file.path);
        if (note) return this.controller.collect(note.id, true);
      }).catch((error) => new import_obsidian.Notice(String(error)));
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
      const before = this.pending.get(file);
      if (before) window.clearTimeout(before.timer);
      const text = editor.getValue();
      const timer = window.setTimeout(() => {
        this.pending.delete(file);
        if (!this.stopped) this.controller.edit(file, text);
      }, 500);
      this.pending.set(file, { timer, text });
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file, data2) => this.controller.indexed(file, data2)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof import_obsidian.TFile) this.controller.renamed(file, oldPath);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof import_obsidian.TFile) {
        const pending = this.pending.get(file);
        if (pending) window.clearTimeout(pending.timer);
        this.pending.delete(file);
        this.controller.deleted(file);
      }
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf?.view.getViewType() !== "markdown") {
        this.flush();
        this.controller.pause();
      }
    }));
    this.registerEvent(this.app.workspace.on("window-open", (_workspace, win) => this.watchWindow(win)));
    this.watchWindow(window);
    this.registerInterval(window.setInterval(() => this.controller.checkIdle(), 15e3));
    this.registerInterval(window.setInterval(() => this.refreshTimedViews(), 1e3));
    this.app.workspace.onLayoutReady(() => {
      if (this.stopped) return;
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
      this.controller.pause();
    });
  }
  flush() {
    for (const [file, pending] of this.pending) {
      window.clearTimeout(pending.timer);
      if (!this.stopped) this.controller.edit(file, pending.text);
    }
    this.pending.clear();
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
  onunload() {
    this.flush();
    this.stopped = true;
    this.activeModal?.close();
    if (this.controller) void this.controller.dispose().catch(() => {
    });
  }
};
var WorkspaceView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin", plugin);
    __publicField(this, "expandedTaskFiles", /* @__PURE__ */ new Set());
    __publicField(this, "viewEvents", new AbortController());
    __publicField(this, "savedScroll", 0);
    __publicField(this, "lastDeleted", null);
    __publicField(this, "editorModal", null);
    __publicField(this, "moduleModal", null);
    __publicField(this, "moduleFilter");
    __publicField(this, "hints");
    __publicField(this, "homeDate", "");
    __publicField(this, "tasksOpen", false);
    __publicField(this, "taskFilter", "pending");
    __publicField(this, "stats", false);
    __publicField(this, "statsDate", localDate(/* @__PURE__ */ new Date()));
    __publicField(this, "unsubscribe");
    __publicField(this, "title", (noteId) => this.plugin.controller.title(noteId));
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
    listen("change", (event) => {
      const input = event.target;
      if (input.dataset.complete) {
        void this.plugin.controller.complete(input.dataset.complete, input.checked).catch((error) => new import_obsidian.Notice(String(error)));
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
    this.editorModal?.close();
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
    }, this.expandedTaskFiles, this.moduleFilter);
  }
  render() {
    this.hints?.hide();
    const c = this.plugin.controller;
    this.homeDate = localDate(c.now());
    this.contentEl.innerHTML = `<header><strong>${this.stats ? "\u6BCF\u65E5\u7EDF\u8BA1" : "\u5F85\u529E\u6E05\u5355"}</strong><button data-action="stats">${this.stats ? "\u8FD4\u56DE\u4EFB\u52A1" : "\u7EDF\u8BA1"}</button></header><p class="readonly-notice">\u672C\u5730\u4FDD\u5B58 \xB7 \u6301\u7EED\u79EF\u7D2F</p>${c.storageError ? `<p class="storage-error" role="alert">${escapeHtml(c.storageError)} <button data-action="retry-save">\u91CD\u8BD5\u4FDD\u5B58</button></p>` : ""}${this.stats ? this.statistics() : `<div class="home-modules note-workspace-statistics">${renderModuleDistribution(c.state, localDate(c.now()), c.analyticsContext)}</div><div class="readonly-disclosure"><button class="readonly-toggle" data-action="tasks" aria-expanded="${this.tasksOpen}" aria-controls="readonly-task-body" aria-label="${this.tasksOpen ? "\u6536\u8D77" : "\u5C55\u5F00"}\u4EFB\u52A1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="transform:rotate(${this.tasksOpen ? 180 : 0}deg)"><path d="m6 9 6 6 6-6"/></svg></button><span class="tasks-heading">\u5F85\u529E</span><button class="task-add-header" data-action="new-task" aria-label="\u521B\u5EFA\u5F85\u529E">\uFF0B</button></div><div id="readonly-task-body" class="readonly-task-body" ${this.tasksOpen ? "" : "hidden"}>${this.tasks()}${this.lastDeleted ? `<p class="task-undo" role="status">\u5DF2\u5220\u9664\u5F85\u529E <button data-action="undo-delete" data-task="${escapeHtml(this.lastDeleted)}">\u64A4\u9500\u5220\u9664</button></p>` : ""}</div>`}<details><summary>\u8BB0\u5F55\u4E0E\u5BFC\u5165\u72B6\u6001</summary><p>\u7D2F\u8BA1 ${c.tasks.length} \u6761\u4EFB\u52A1 \xB7 ${c.pending.length} \u6761\u5F85\u529E \xB7 \u4EFB\u52A1\u4E0E\u5386\u53F2\u4FDD\u5B58\u5728\u63D2\u4EF6\u672C\u5730\u6587\u4EF6</p>${Object.entries(c.data.decisions).filter(([, decision]) => decision === "skip").map(([id2]) => `<p>${escapeHtml(c.title(id2))} \xB7 \u5DF2\u8DF3\u8FC7 <button data-action="recheck" data-note="${escapeHtml(id2)}">\u91CD\u65B0\u8BFB\u53D6</button></p>`).join("")}${[...c.observed.values()].filter((n) => n.error).map((n) => `<p>${escapeHtml(n.path)}\uFF1A${escapeHtml(n.error)}</p>`).join("")}</details>`;
  }
  statistics() {
    return renderStatistics(this.plugin.controller.state, this.statsDate, { title: this.title, time, dateControls: true, source: this.plugin.controller.analyticsContext });
  }
  refreshTimedUI() {
    if (!this.stats && this.homeDate !== localDate(this.plugin.controller.now())) this.render();
    else paintDeadlines(this.contentEl, this.plugin.controller);
  }
  openModule(moduleId) {
    const module2 = this.plugin.controller.modules.find((m) => m.id === moduleId);
    if (!module2) return;
    this.moduleModal?.close();
    this.moduleModal = new ModuleEditorModal(this.app, this.plugin.controller, module2, (id2) => {
      this.moduleFilter = id2;
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
    this.editorModal = new TaskEditorModal(this.app, this.plugin.controller, task, (id2) => {
      this.lastDeleted = id2;
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
    if (action === "module-menu") {
      this.openModule(b.dataset.moduleId);
      return;
    }
    if (action === "clear-module") {
      this.moduleFilter = void 0;
      this.render();
      return;
    }
    if (action === "restore-module") {
      void this.plugin.controller.showModule(b.dataset.moduleId).catch((error) => new import_obsidian.Notice(String(error)));
      return;
    }
    if (action === "new-task" || action === "edit-task") {
      this.openEditor(b.dataset.task);
      return;
    }
    if (action === "undo-delete") {
      void this.plugin.controller.restoreTask(b.dataset.task).then(() => {
        this.lastDeleted = null;
        this.render();
      }).catch((error) => new import_obsidian.Notice(String(error)));
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
      if (file) void this.plugin.controller.open(file).then(() => this.plugin.controller.collect(n.id, true)).catch((error) => new import_obsidian.Notice(String(error)));
      return;
    }
    if (action === "source-note") {
      event.preventDefault();
      event.stopPropagation();
      const n = this.plugin.controller.state.notes.find((n2) => n2.id === b.dataset.note), file = n && this.app.vault.getFileByPath(n.path);
      if (file) void this.app.workspace.getLeaf("tab").openFile(file, { active: true, eState: { line: Number(b.dataset.line) } });
      else new import_obsidian.Notice("\u6E90\u7B14\u8BB0\u5DF2\u4E0D\u53EF\u7528\u3002");
      return;
    }
    if (action === "day") {
      this.statsDate = b.dataset.date;
      this.render();
      return;
    }
    if (action === "stats") {
      if (!this.stats) this.savedScroll = this.contentEl.scrollTop;
      this.plugin.controller.pause();
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
var ImportModal = class extends import_obsidian.Modal {
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
var TaskEditorModal = class extends import_obsidian.Modal {
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
    this.contentEl.innerHTML = taskEditor(this.task);
    this.unbind = bindTaskEditor(this.contentEl, this.controller, this.task, () => this.close(), this.deleted);
  }
  onClose() {
    this.unbind?.();
    this.contentEl.empty();
    this.closed();
  }
};
var ModuleEditorModal = class extends import_obsidian.Modal {
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
    this.setTitle("\u7BA1\u7406\u6A21\u5757");
    this.contentEl.innerHTML = moduleEditor(this.controller, this.module);
    this.unbind = bindModuleEditor(this.contentEl, this.controller, this.module, () => this.close(), this.viewTasks, this.removed);
  }
  onClose() {
    this.unbind?.();
    this.contentEl.empty();
  }
};
