"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/web.tsx
var web_exports = {};
__export(web_exports, {
  default: () => web_default
});
module.exports = __toCommonJS(web_exports);

// src/ui/state.ts
function createPanelState() {
  return { forms: [], currentId: null, expandedId: null, topOrder: [], childOrder: {}, dirtyOrder: false };
}
function fallback(forms, currentId) {
  if (currentId && forms.some((f) => f.id === currentId)) return currentId;
  return forms.length > 0 ? forms[0].id : null;
}
function applyList(s, forms) {
  return { ...s, forms, currentId: fallback(forms, s.currentId) };
}
function upsertForm(s, row) {
  const idx = s.forms.findIndex((f) => f.id === row.id);
  const forms = idx >= 0 ? s.forms.map((f, i) => i === idx ? row : f) : [...s.forms, row];
  return { ...s, forms };
}
function removeForm(s, id) {
  const forms = s.forms.filter((f) => f.id !== id);
  const currentId = s.currentId === id ? fallback(forms, null) : s.currentId;
  return { ...s, forms, currentId, expandedId: s.expandedId === id || s.currentId === id ? null : s.expandedId };
}
function selectForm(s, id) {
  if (!s.forms.some((f) => f.id === id)) return s;
  return { ...s, currentId: id };
}
function setExpand(s, id) {
  return { ...s, expandedId: id };
}
function toggleExpand(s, id) {
  return { ...s, expandedId: s.expandedId === id ? null : id };
}
function toTree(entries) {
  const top = [];
  const childrenByParent = {};
  const isChild2 = (e) => typeof e.base === "string";
  for (const e of entries) {
    if (isChild2(e)) {
      const arr = childrenByParent[e.base] ?? [];
      arr.push(e);
      childrenByParent[e.base] = arr;
    } else {
      top.push(e);
    }
  }
  return { top, childrenByParent };
}

// src/ui/api.ts
async function apiFetch(path, init) {
  const res = await fetch(path, { headers: { "content-type": "application/json" }, ...init });
  let body = null;
  try {
    body = await res.json();
  } catch {
  }
  if (!res.ok || !body?.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  return body;
}
function listForms() {
  return apiFetch("/api/prompt/forms").then((r) => r.data);
}
function createForm(name) {
  return apiFetch("/api/prompt/forms", { method: "POST", body: JSON.stringify({ name }) }).then((r) => r.data);
}
function renameForm(id, name) {
  return apiFetch(`/api/prompt/forms/${id}`, { method: "PUT", body: JSON.stringify({ name }) }).then(() => void 0);
}
function deleteForm(id) {
  return apiFetch(`/api/prompt/forms/${id}`, { method: "DELETE" }).then(() => void 0);
}
function listEntries(formId) {
  return apiFetch(`/api/prompt/forms/${formId}/entries`).then((r) => r.data);
}
function createEntry(formId, input) {
  return apiFetch(`/api/prompt/forms/${formId}/entries`, { method: "POST", body: JSON.stringify(input) }).then((r) => r.data);
}
function updateEntry(formId, entryId, input) {
  return apiFetch(`/api/prompt/forms/${formId}/entries/${entryId}`, { method: "PUT", body: JSON.stringify(input) }).then(() => void 0);
}
function deleteEntry(formId, entryId) {
  return apiFetch(`/api/prompt/forms/${formId}/entries/${entryId}`, { method: "DELETE" }).then(() => void 0);
}
function saveLayout(formId, layout) {
  return apiFetch(`/api/prompt/forms/${formId}/order`, { method: "PUT", body: JSON.stringify(layout) }).then(() => void 0);
}
function previewPrompt(formId) {
  return apiFetch(`/api/prompt/forms/${formId}/preview`, { method: "POST", body: JSON.stringify({}) }).then((r) => r.data);
}
function listRegistered() {
  return apiFetch("/api/prompt/registered").then((r) => r.data);
}
function addRegisteredEntry(formId, id) {
  return apiFetch(`/api/prompt/forms/${formId}/registered-entry`, { method: "POST", body: JSON.stringify({ id }) }).then((r) => r.data);
}
function getActiveForm() {
  return apiFetch("/api/prompt/active").then((r) => r.data);
}
function setActiveForm(formId) {
  return apiFetch("/api/prompt/active", { method: "PUT", body: JSON.stringify({ formId }) }).then(() => void 0);
}

// src/messages.ts
function isGroup(e) {
  return e.kind === "group";
}
function isChild(e) {
  return typeof e.base === "string";
}
function isPlain(e) {
  return !isGroup(e) && !isChild(e);
}
function isPlaceholder(e) {
  return isChild(e) && e.placeholder !== void 0;
}

// src/ui/style.ts
var STYLE_ID = "prompt-plugin-style";
var CSS = `
.prp .row-preset{display:flex;align-items:center;gap:8px;margin-bottom:14px;border:1px solid var(--ui-border,#e0e0e0);border-radius:10px;padding:8px 12px;background:var(--ui-accent-soft,#f0f0f0);flex-wrap:wrap}
.prp .row-preset select{flex:1;min-width:0;padding:7px 26px 7px 12px;font-size:13px;font-weight:500;border:none;border-radius:6px;background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.prp .row-preset input{flex:1;min-width:0;padding:7px 10px;font-size:13px;border:1px solid var(--ui-border,#e0e0e0);border-radius:6px;background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);outline:none}
.prp .active-pill{font-size:11px;font-weight:600;background:var(--ui-accent,#333333);color:var(--ui-on-accent,#ffffff);padding:3px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.prp .text-btn{padding:5px 10px;font-size:12px;font-weight:500;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--ui-text-muted,#888888);cursor:pointer;white-space:nowrap}
.prp .text-btn:hover{background:var(--ui-surface,#ffffff);border-color:var(--ui-border,#e0e0e0);color:var(--ui-text,#444444)}
.prp .text-btn.danger{color:var(--ui-danger,#d9534f)}
.prp .text-btn.danger:hover{background:var(--ui-danger-soft,#fef3f2);border-color:var(--ui-danger-soft,#fef3f2)}
.prp .pid{font-size:11px;color:var(--ui-text-muted,#888888);background:var(--ui-surface,#ffffff);padding:3px 10px;border-radius:20px;border:1px solid var(--ui-border,#e0e0e0);font-family:monospace;white-space:nowrap;flex-shrink:0}
.prp .row-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px}
.prp .row-actions button{padding:11px 10px;font-size:13px;font-weight:500;border-radius:8px;border:1px solid var(--ui-border,#e0e0e0);background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);cursor:pointer;transition:all .15s}
.prp .row-actions button:hover:not(:disabled){background:var(--ui-accent-soft,#f0f0f0)}
.prp .row-actions button.danger{color:var(--ui-danger,#d9534f)}
.prp .row-actions button.danger:hover:not(:disabled){background:var(--ui-danger-soft,#fef3f2);border-color:var(--ui-danger-soft,#fef3f2)}
.prp .row-actions button:disabled{opacity:.5;cursor:not-allowed}
.prp .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.prp .fg>label{font-size:13px;font-weight:500;color:var(--ui-text,#444444)}
.prp .fg input,.prp .fg select,.prp .fg textarea{width:100%;padding:10px 14px;font-size:13px;font-family:inherit;border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;background:var(--ui-surface,#ffffff);color:var(--ui-text,#444444);outline:none;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.prp .fg textarea{resize:vertical;min-height:120px;line-height:1.6}
.prp .entry-item{display:flex;align-items:center;gap:8px;border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;padding:6px 10px;background:var(--ui-surface,#ffffff)}
.prp .entry-name{font-size:13.5px;font-weight:500;color:var(--ui-text,#444444);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.prp .entry-role{font-size:11px;color:var(--ui-text,#444444);background:var(--ui-accent-soft,#f0f0f0);border:1px solid var(--ui-border,#e0e0e0);padding:3px 0;min-width:64px;text-align:center;border-radius:12px;flex-shrink:0;font-family:monospace;font-weight:600}
.prp .entry-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:0 4px}
.prp .sub-text{font-size:11.5px;color:var(--ui-text-muted,#888888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prp .entry-spacer{flex:1}
.prp .row-bottom{display:flex;align-items:center;gap:10px;margin-top:16px;border-top:1px solid var(--ui-border,#e0e0e0);padding-top:14px}
.prp .btn-group-left{display:flex;align-items:center;gap:10px}
.prp .send-btn{padding:9px 20px;font-size:13px;font-weight:600;border:1px solid var(--ui-accent,#333333);border-radius:8px;background:var(--ui-accent,#333333);color:var(--ui-on-accent,#ffffff);cursor:pointer}
.prp .send-btn:hover{background:var(--ui-accent,#333333)}
.prp .send-btn:disabled{opacity:.45;cursor:not-allowed}
.prp .empty-state{text-align:center;padding:28px 12px;color:var(--ui-text-muted,#888888);font-size:13px}
.prp.overlay{position:fixed;inset:0;background:var(--ui-overlay,rgba(0,0,0,0.28));z-index:10020;display:flex;align-items:center;justify-content:center;padding:20px}
.prp .float-modal{background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);box-shadow:var(--ui-shadow-m,0 4px 16px rgba(0,0,0,0.12));border-radius:12px;width:min(480px,94vw);display:flex;flex-direction:column;max-height:86vh;overflow:hidden}
.prp .float-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--ui-border,#e0e0e0)}
.prp .float-head b{font-size:14px;color:var(--ui-text,#444444)}
.prp .float-head .x{width:22px;height:22px;border-radius:50%;border:none;background:var(--ui-accent-soft,#f0f0f0);color:var(--ui-text-muted,#888888);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center}
.prp .float-body{padding:18px;overflow:auto;flex:1;font-size:13px;color:var(--ui-text,#444444);line-height:1.7}
.prp .float-foot{display:flex;gap:10px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--ui-border,#e0e0e0)}
.prp .float-foot button{border:none;border-radius:40px;padding:9px 22px;font-size:12px;font-weight:600;cursor:pointer}
.prp .float-foot .s{background:var(--ui-surface,#ffffff);color:var(--ui-text-muted,#888888);border:1px solid var(--ui-border-strong,#ccc)}
.prp .float-foot .p{background:var(--ui-accent,#333333);color:var(--ui-on-accent,#ffffff);border:1px solid var(--ui-accent,#333333)}
.prp .float-foot .d{background:var(--ui-surface,#ffffff);color:var(--ui-danger,#d9534f);border:1px solid var(--ui-danger-soft,#fef3f2)}
.prp .confirm-t{text-align:center;font-size:14px;font-weight:600;color:var(--ui-text,#444444)}
.prp .confirm-d{text-align:center;font-size:12.5px;color:var(--ui-text-muted,#888888);line-height:1.7;margin-top:6px;word-break:break-all}
.prp .result-meta{background:var(--ui-accent-soft,#f0f0f0);border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.7;color:var(--ui-text-muted,#888888);white-space:pre-wrap;word-break:break-all;max-height:130px;overflow:auto;margin-bottom:12px}
.prp .result-body{background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);border-radius:8px;padding:12px 14px;font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.6;color:var(--ui-text,#444444);overflow:auto;white-space:pre-wrap;word-break:break-all;min-height:180px;flex:1}
.prp .status-row{display:flex;align-items:center;gap:8px;margin-left:auto}
.prp .status-dot{width:10px;height:10px;border-radius:50%;background:var(--ui-border,#e0e0e0);transition:background .2s}
.prp .status-dot.success{background:var(--ui-accent,#333333)}
.prp .status-dot.error{background:var(--ui-danger,#d9534f)}
.prp .status-text{font-size:12px;color:var(--ui-text-muted,#888888)}
.prp .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.prp .entry-list{display:block;position:relative;min-height:0}
.prp .entry-wrap{position:absolute;left:0;right:0;top:0;transition:top .3s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,border-color .2s ease;will-change:top}
.prp .entry-wrap.prp-dragging{z-index:100;box-shadow:0 12px 40px rgba(31,38,135,.25);border-color:var(--ui-accent,#333333);cursor:grabbing;transition:box-shadow .2s ease,border-color .2s ease}
.prp .entry-head{display:flex;align-items:center;gap:10px;border:1px solid var(--ui-border,#e0e0e0);border-radius:10px;padding:8px 10px;background:var(--ui-surface,#ffffff)}
.prp .entry-head:hover{border-color:var(--ui-border,#e0e0e0)}
.prp .drag-handle{cursor:grab;color:var(--ui-text-muted,#888888);font-size:12px;user-select:none;flex-shrink:0;padding:0 2px}
.prp .drag-handle:hover{color:var(--ui-accent,#333333)}
.prp .drag-handle:active{cursor:grabbing}
.prp .entry-wrap.prp-dragging .drag-handle,.prp .block-row.prp-dragging .drag-handle{color:var(--ui-accent,#333333)}
.prp .pid-empty{flex-shrink:0}
.prp .entry-detail{margin:2px 0 0 22px;padding:10px 12px 14px;background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);border-radius:10px}
.prp .detail-label{display:block;font-size:12px;color:var(--ui-text-muted,#888888);margin:4px 0}
.prp .detail-text{font-size:12px;color:var(--ui-text-muted,#888888);white-space:pre-wrap;word-break:break-all;max-height:96px;overflow:auto;background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);border-radius:6px;padding:6px 8px;margin-bottom:6px}
.prp .block-list{display:block;position:relative;min-height:0}
.prp .block-row{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-start;gap:6px;background:var(--ui-surface,#ffffff);border:1px solid var(--ui-accent-soft,#f0f0f0);border-radius:8px;padding:5px;transition:top .3s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,border-color .2s ease;will-change:top}
.prp .block-row:hover{border-color:var(--ui-border,#e0e0e0)}
.prp .block-row.prp-dragging{z-index:100;box-shadow:0 12px 40px rgba(31,38,135,.25);border-color:var(--ui-accent,#333333);cursor:grabbing;transition:box-shadow .2s ease,border-color .2s ease}
.prp .prp-drop-indicator{position:absolute;left:0;right:0;height:3px;border-radius:3px;background:var(--ui-accent,#333333);opacity:0;transition:opacity .15s ease;pointer-events:none;box-shadow:var(--ui-accent-ring,rgba(51,51,51,0.15));z-index:101}
.prp .prp-drop-indicator.visible{opacity:1}
.prp .block-textarea{flex:1;min-height:44px;resize:vertical;font-family:inherit;font-size:12px;line-height:1.6;border:1px solid var(--ui-border,#e0e0e0);border-radius:6px;padding:5px 7px;background:var(--ui-surface,#ffffff)}
.prp .block-textarea:focus{outline:none;border-color:var(--ui-border-strong,#ccc)}
.prp .dashed-btn{border:1px dashed var(--ui-border-strong,#ccc);background:none;color:var(--ui-text-muted,#888888);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;margin-top:6px}
.prp .dashed-btn:hover{background:var(--ui-accent-soft,#f0f0f0);color:var(--ui-text,#444444)}
.prp .block-empty{font-size:12px;color:var(--ui-text-muted,#888888);padding:8px 4px;text-align:center}
.prp .wizard-tip{font-size:12px;color:var(--ui-text-muted,#888888);margin-bottom:8px}
.prp .wizard-opt{display:block;width:100%;text-align:left;border:1px solid var(--ui-border,#e0e0e0);background:var(--ui-surface,#ffffff);border-radius:10px;padding:12px 14px;cursor:pointer;font-size:13px;color:var(--ui-text,#444444);margin-bottom:8px;transition:all .15s}
.prp .wizard-opt:hover{border-color:var(--ui-border-strong,#ccc);background:var(--ui-accent-soft,#f0f0f0)}
.prp .save-order-btn{margin-left:0;padding:9px 20px;font-size:13px;font-weight:600;border:1px dashed var(--ui-border-strong,#ccc);border-radius:8px;background:var(--ui-surface,#ffffff);color:var(--ui-text-muted,#888888);cursor:pointer}
.prp .save-order-btn:hover:not(:disabled){background:var(--ui-accent-soft,#f0f0f0);border-style:solid}
.prp .save-order-btn:disabled{opacity:.45;cursor:not-allowed}
.prp .child-preview{flex:1;min-width:0;font-size:12px;color:var(--ui-text-muted,#888888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.6;padding-top:6px}
.prp .block-row .entry-name{flex-shrink:0;max-width:150px}
.prp .switch{position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;margin:0 4px;cursor:pointer;vertical-align:middle}
.prp .switch input{opacity:0;width:0;height:0}
.prp .switch .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--ui-border,#cbd5e1);transition:.3s;border-radius:20px}
.prp .switch .slider:before{position:absolute;content:"";height:16px;width:16px;left:2px;bottom:2px;background:#ffffff;transition:.3s;border-radius:50%}
.prp .switch input:checked + .slider{background:var(--ui-accent,#333333)}
.prp .switch input:checked + .slider:before{transform:translateX(16px)}
.prp .switch input:focus-visible + .slider{box-shadow:0 0 0 2px var(--ui-accent-soft,#f0f0f0)}
.prp .prp-entry-off{opacity:.45}
.prp .block-row.readonly{opacity:.6;font-style:italic;background:var(--ui-accent-soft,#f0f0f0)}
@media (max-width:600px){
  .prp .row-actions{grid-template-columns:1fr}
  .prp .row-bottom{flex-wrap:wrap}
}
`;
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

// src/ui/dom.ts
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== void 0) node.textContent = text;
  return node;
}
function button(className, text, onClick) {
  const b = el("button", className, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// src/ui/layers.ts
function createLayer(width) {
  const root = document.createElement("div");
  root.className = "prp overlay";
  const modal = document.createElement("div");
  modal.className = "prp float-modal";
  modal.style.width = width;
  root.appendChild(modal);
  function close() {
    document.removeEventListener("keydown", onKey);
    root.remove();
  }
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(root);
  return { root, modal, close };
}
function headOf(modal, title, close) {
  const head = document.createElement("div");
  head.className = "prp float-head";
  const b = document.createElement("b");
  b.textContent = title;
  const x = document.createElement("button");
  x.className = "x";
  x.textContent = "\u2715";
  x.title = "\u5173\u95ED";
  x.addEventListener("click", close);
  head.append(b, x);
  modal.appendChild(head);
}
function footOf(modal, actions) {
  const foot = document.createElement("div");
  foot.className = "prp float-foot";
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.className = a.variant;
    btn.textContent = a.label;
    btn.type = "button";
    btn.addEventListener("click", a.onClick);
    foot.appendChild(btn);
  }
  modal.appendChild(foot);
}

// src/ui/sub-modal.ts
function openEntryEditor(opts) {
  const { modal, close } = createLayer("min(520px,94vw)");
  headOf(modal, opts.title, close);
  const body = el("div", "prp float-body");
  const fg = (label, control) => {
    const w = el("div", "prp fg");
    const l = document.createElement("label");
    l.textContent = label;
    w.append(l, control);
    return w;
  };
  const nameInput = el("input");
  nameInput.value = opts.entry.name;
  nameInput.maxLength = 50;
  body.append(fg("\u540D\u79F0", nameInput));
  let roleValue = opts.entry.role;
  if (opts.withRole) {
    const roleSelect = document.createElement("select");
    for (const r of ["system", "assistant", "user"]) {
      const o = document.createElement("option");
      o.value = r;
      o.textContent = r;
      roleSelect.appendChild(o);
    }
    roleSelect.value = opts.entry.role ?? "user";
    roleSelect.addEventListener("change", () => {
      roleValue = roleSelect.value;
    });
    body.append(fg("\u89D2\u8272 (role)", roleSelect));
  }
  let textValue = opts.entry.text ?? "";
  if (opts.withText) {
    const textArea = el("textarea");
    textArea.value = textValue;
    textArea.addEventListener("input", () => {
      textValue = textArea.value;
    });
    body.append(fg("\u5185\u5BB9 (text)", textArea));
  }
  modal.appendChild(body);
  footOf(modal, [
    { label: "\u53D6\u6D88", variant: "s", onClick: close },
    {
      label: "\u4FDD\u5B58",
      variant: "p",
      onClick: async () => {
        try {
          const draft = { name: nameInput.value.trim() };
          if (roleValue) draft.role = roleValue;
          if (opts.withText) draft.text = textValue;
          await opts.onSave(draft);
          close();
        } catch {
        }
      }
    }
  ]);
  setTimeout(() => nameInput.focus(), 30);
}
function openGroupCreator(opts) {
  openEntryEditor({
    title: opts.title,
    entry: { name: "\u65B0\u6761\u76EE", role: "user", text: "" },
    withRole: true,
    withText: false,
    onSave: (input) => {
      if (!input.name) throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      return opts.onSave({ name: input.name, role: input.role ?? "user" });
    }
  });
}
function openChildCreator(opts) {
  openEntryEditor({
    title: "\u65B0\u5EFA\u5B50\u6761\u76EE",
    entry: { name: "\u65B0\u5B50\u6761\u76EE", text: "" },
    withRole: false,
    withText: true,
    onSave: (input) => opts.onSave({ name: input.name, text: input.text ?? "" })
  });
}
function openChildEditor(opts) {
  openEntryEditor({
    title: "\u7F16\u8F91\u5B50\u6761\u76EE",
    entry: opts.entry,
    withRole: false,
    withText: true,
    onSave: (input) => opts.onSave({ name: input.name, text: input.text ?? "" })
  });
}

// src/ui/confirm.ts
function confirmDialog(opts) {
  const { root, modal, close } = createLayer("min(360px,90vw)");
  const body = el("div", "prp float-body");
  const t = el("div", "prp confirm-t", opts.title);
  const d = el("div", "prp confirm-d", opts.desc);
  body.append(t, d);
  modal.appendChild(body);
  footOf(modal, [
    { label: "\u53D6\u6D88", variant: "s", onClick: close },
    { label: "\u5220\u9664", variant: "d", onClick: () => {
      opts.onOk();
      close();
    } }
  ]);
  void root;
}

// src/ui/result-modal.ts
function openResult(metaText, payload) {
  const { modal, close } = createLayer("min(680px,94vw)");
  headOf(modal, "\u53D1\u9001\u7ED3\u679C", close);
  const body = el("div", "prp float-body");
  body.style.display = "flex";
  body.style.flexDirection = "column";
  const meta = el("div", "prp result-meta", metaText);
  const pre = el("pre", "prp result-body");
  pre.textContent = JSON.stringify(payload, null, 2);
  body.append(meta, pre);
  modal.appendChild(body);
  footOf(modal, [{ label: "\u5173\u95ED", variant: "s", onClick: close }]);
}

// src/ui/sortable.ts
var INDICATOR_CLASS = "prp-drop-indicator";
var DRAGGING_CLASS = "prp-dragging";
function makeSortable(opts) {
  const { container, rowSelector, handleSelector, gap = 8, onDrop } = opts;
  const indicator = document.createElement("div");
  indicator.className = INDICATOR_CLASS;
  let rows = [];
  let order = [];
  let isDragging = false;
  let dragIndex = -1;
  let dragStartY = 0;
  let currentTarget = -1;
  let animFrame = null;
  function collect() {
    return [...container.children].filter(
      (c) => c instanceof HTMLElement && c.matches(rowSelector)
    );
  }
  function heightOf(i) {
    return (rows[i]?.offsetHeight ?? 40) + gap;
  }
  function topAt(pos) {
    let y = 0;
    for (let p = 0; p < pos; p++) y += heightOf(order[p]);
    return y;
  }
  function layout() {
    rows = collect();
    if (!indicator.parentElement) container.appendChild(indicator);
    if (rows.length === 0) {
      container.style.height = "";
      order = [];
      indicator.classList.remove("visible");
      return;
    }
    if (order.length !== rows.length) order = rows.map((_, i) => i);
    let y = 0;
    for (let i = 0; i < order.length; i++) {
      const idx = order[i];
      const el2 = rows[idx];
      if (!el2) continue;
      if (isDragging && idx === dragIndex) continue;
      el2.style.top = y + "px";
      y += heightOf(idx);
    }
    if (!isDragging) container.style.height = Math.max(0, y - gap) + "px";
    if (isDragging && currentTarget >= 0) {
      indicator.style.top = topAt(currentTarget) - 2 + "px";
      indicator.classList.add("visible");
    } else {
      indicator.classList.remove("visible");
    }
  }
  function updateOrder(targetPos) {
    const cur = order.indexOf(dragIndex);
    if (cur < 0) return;
    order.splice(cur, 1);
    order.splice(targetPos, 0, dragIndex);
    currentTarget = targetPos;
  }
  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    if (animFrame !== null) cancelAnimationFrame(animFrame);
    const mouseY = e.clientY;
    animFrame = requestAnimationFrame(() => {
      const el2 = rows[dragIndex];
      if (!el2) return;
      el2.style.transform = `translateY(${mouseY - dragStartY}px) scale(1.02)`;
      const relY = mouseY - container.getBoundingClientRect().top;
      const rest = order.filter((i) => i !== dragIndex);
      let pos = rest.length;
      for (let p = 0; p < rest.length; p++) {
        const other = rows[rest[p]];
        const center = parseFloat(other.style.top || "0") + other.offsetHeight / 2;
        if (relY < center) {
          pos = p;
          break;
        }
      }
      if (pos !== currentTarget) updateOrder(pos);
      layout();
    });
  }
  function endDrag() {
    if (!isDragging) return;
    if (animFrame !== null) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    isDragging = false;
    const el2 = rows[dragIndex];
    if (el2) {
      const finalTop = topAt(order.indexOf(dragIndex));
      el2.style.transition = "none";
      el2.style.top = finalTop + "px";
      el2.style.transform = "";
      el2.style.zIndex = "";
      el2.classList.remove(DRAGGING_CLASS);
      void el2.offsetHeight;
      el2.style.transition = "";
    }
    currentTarget = -1;
    dragIndex = -1;
    layout();
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", endDrag);
    if (onDrop) {
      const sorted = order.map((i) => rows[i]).filter((r) => !!r);
      onDrop(sorted);
    }
  }
  function onDown(e) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const target = e.target;
    const handle = target.closest(handleSelector);
    if (!handle) return;
    const row = handle.closest(rowSelector);
    if (!row) return;
    layout();
    const idx = rows.indexOf(row);
    if (idx < 0) return;
    e.preventDefault();
    if (isDragging) return;
    isDragging = true;
    dragIndex = idx;
    dragStartY = e.clientY;
    currentTarget = order.indexOf(idx);
    if (!indicator.parentElement) container.appendChild(indicator);
    const el2 = rows[idx];
    el2.style.zIndex = "100";
    el2.style.transform = "translateY(0px) scale(1.02)";
    el2.classList.add(DRAGGING_CLASS);
    layout();
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", endDrag);
  }
  const onDragStartPrevent = (e) => {
    e.preventDefault();
  };
  container.addEventListener("mousedown", onDown);
  container.addEventListener("dragstart", onDragStartPrevent);
  container.appendChild(indicator);
  return {
    layout,
    destroy() {
      container.removeEventListener("mousedown", onDown);
      container.removeEventListener("dragstart", onDragStartPrevent);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", endDrag);
      indicator.remove();
    }
  };
}

// src/ui/panel.ts
function createPanel(toast) {
  ensureStyle();
  const root = el("div", "prp");
  let state = createPanelState();
  let rows = [];
  let savingOrder = false;
  let activeId = null;
  const toastError = (e) => toast(e?.message || "\u64CD\u4F5C\u5931\u8D25");
  const formBar = el("div", "prp row-preset");
  const actionsRow = el("div", "prp row-actions");
  const listBox = el("div", "prp entry-list");
  const entriesWrap = el("div", "prp fg");
  entriesWrap.append(listBox);
  const sendBtn = button("prp send-btn", "\u9884\u89C8 Prompt", () => void doPreview());
  sendBtn.disabled = true;
  const saveOrderBtn = button("prp save-order-btn", "\u4FDD\u5B58\u987A\u5E8F", () => void doSaveOrder());
  saveOrderBtn.disabled = true;
  const beta = el("span", "prp pid", "\u6D4B\u8BD5\u7248");
  const dot = el("span", "prp status-dot");
  const statusText = el("span", "prp status-text", "\u5C31\u7EEA");
  const statusRow = el("div", "prp status-row");
  statusRow.append(dot, statusText);
  const sendRow = el("div", "prp row-bottom");
  const leftBox = el("div", "prp btn-group-left");
  leftBox.append(sendBtn, saveOrderBtn, beta);
  sendRow.append(leftBox, statusRow);
  root.append(formBar, actionsRow, entriesWrap, sendRow);
  const setStatus = (msg, type) => {
    dot.className = "prp status-dot" + (type === "success" ? " success" : type === "error" ? " error" : "");
    statusText.textContent = msg;
    if (type !== "idle") setTimeout(() => {
      statusText.textContent = "\u5C31\u7EEA";
    }, 3e3);
  };
  const current = () => state.forms.find((f) => f.id === state.currentId) ?? null;
  function curId() {
    const cur = current();
    if (!cur) throw new Error("\u8BF7\u5148\u65B0\u5EFA\u4E00\u4E2A\u8868\u5355");
    return cur.id;
  }
  const childSorts = [];
  function destroyChildSorts() {
    for (const s of childSorts) s.destroy();
    childSorts.length = 0;
  }
  const topSort = makeSortable({
    container: listBox,
    rowSelector: ".prp.entry-wrap",
    handleSelector: ".prp.entry-head .prp.drag-handle",
    gap: 8,
    onDrop: (items) => {
      const ids = items.map((it) => it.dataset.entryId ?? "").filter((x) => x !== "");
      const cur = state.topOrder;
      if (ids.length !== cur.length) return;
      if (ids.join("|") === cur.join("|")) return;
      state = { ...state, topOrder: ids, dirtyOrder: true };
      updateSendAndSave();
      setStatus("\u987A\u5E8F\u5DF2\u8C03\u6574,\u70B9\u51FB\u300C\u4FDD\u5B58\u987A\u5E8F\u300D\u63D0\u4EA4", "idle");
    }
  });
  async function refreshAll() {
    const cur = current();
    if (!cur) {
      renderEmpty("\u6682\u65E0\u8868\u5355");
      updateSendAndSave();
      return;
    }
    try {
      rows = await listEntries(cur.id);
      if (!state.dirtyOrder) {
        const { top } = toTree(rows);
        state = { ...state, topOrder: top.map((e) => e.id), childOrder: childOrderOf(rows) };
      }
      renderList();
    } catch (e) {
      renderEmpty("\u6761\u76EE\u52A0\u8F7D\u5931\u8D25:" + (e?.message ?? e));
    }
    updateSendAndSave();
  }
  function childOrderOf(list) {
    const out = {};
    for (const e of list) {
      if (isGroup(e)) out[e.id] = [...e.children];
    }
    return out;
  }
  function renderEmpty(msg) {
    destroyChildSorts();
    listBox.innerHTML = "";
    listBox.appendChild(el("div", "prp empty-state", msg));
    topSort.layout();
  }
  function renderList() {
    destroyChildSorts();
    const { top, childrenByParent } = toTree(rows);
    const byId = new Map(top.map((e) => [e.id, e]));
    listBox.innerHTML = "";
    let orderedIds = top.map((e) => e.id);
    const mem = state.topOrder;
    if (mem.length === byId.size && byId.size > 0 && new Set(mem).size === mem.length && mem.every((id) => byId.has(id))) {
      orderedIds = mem;
    }
    if (orderedIds.length === 0) {
      listBox.appendChild(el("div", "prp empty-state", "\u6682\u65E0\u6761\u76EE"));
      topSort.layout();
      return;
    }
    for (const id of orderedIds) {
      const e = byId.get(id);
      if (!e) continue;
      const wrap = renderTopRow(e, childrenByParent);
      listBox.appendChild(wrap);
    }
    for (const s of childSorts) s.layout();
    topSort.layout();
  }
  function orderedChildren(g, childrenByParent) {
    const all = childrenByParent[g.id] ?? [];
    const mem = state.childOrder[g.id];
    if (mem && mem.length === all.length && new Set(mem).size === mem.length && mem.every((id) => all.some((c) => c.id === id))) {
      const map = new Map(all.map((c) => [c.id, c]));
      return mem.map((id) => map.get(id)).filter((c) => !!c);
    }
    return all;
  }
  function renderTopRow(e, childrenByParent) {
    const wrap = el("div", "prp entry-wrap");
    wrap.dataset.entryId = e.id;
    if ((isGroup(e) || isPlain(e)) && e.enabled === false) wrap.classList.add("prp-entry-off");
    const head = el("div", "prp entry-head");
    const handle = el("span", "prp drag-handle", "\u22EE\u22EE");
    handle.title = "\u62D6\u52A8\u6392\u5E8F";
    const group = isGroup(e);
    const children = group ? childrenByParent[e.id] ?? [] : [];
    const isRegParent = group && children.some(isPlaceholder);
    const role = el("span", "prp entry-role", isRegParent ? `\u26C1 ${e.role}` : isGroup(e) ? e.role : isPlain(e) ? e.role : "");
    const content = el("div", "prp entry-content");
    const name = el("span", "prp entry-name", e.name);
    name.title = e.name;
    content.append(name);
    if (group) {
      const sub = el("span", "prp sub-text", `\u5305\u542B ${children.length} \u4E2A\u5B50\u9879`);
      content.appendChild(sub);
    }
    const expanded = state.expandedId === e.id;
    const caretBtn = button("prp text-btn", "", () => {
      if (group) void doToggleExpand(e.id);
    });
    caretBtn.textContent = group ? expanded ? "\u6536\u8D77" : "\u5C55\u5F00" : "";
    if (!group) caretBtn.style.visibility = "hidden";
    const spacer = el("span", "prp entry-spacer");
    const editBtn = button("prp text-btn", "\u7F16\u8F91", () => {
      if (group) {
        openEntryEditor({
          title: "\u7F16\u8F91\u7236\u6761\u76EE",
          entry: { name: e.name, role: e.role },
          withRole: true,
          withText: false,
          onSave: async (input) => {
            if (!input.name) {
              toast("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
              throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
            }
            try {
              const isRegParent2 = (childrenByParent[e.id] ?? []).some(isPlaceholder);
              await updateEntry(curId(), e.id, isRegParent2 ? { role: input.role } : { name: input.name, role: input.role });
              await refreshAll();
              toast("\u5DF2\u4FDD\u5B58");
            } catch (err) {
              toastError(err);
              throw err;
            }
          }
        });
      } else if (isPlain(e)) {
        openEntryEditor({
          title: "\u7F16\u8F91\u6761\u76EE",
          entry: { name: e.name, role: e.role, text: e.text },
          withRole: true,
          withText: true,
          onSave: async (input) => {
            if (!input.name) {
              toast("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
              throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
            }
            try {
              await updateEntry(curId(), e.id, { name: input.name, role: input.role, text: input.text });
              await refreshAll();
              toast("\u5DF2\u4FDD\u5B58");
            } catch (err) {
              toastError(err);
              throw err;
            }
          }
        });
      }
    });
    const delBtn = button("prp text-btn danger", "\u5220\u9664", () => {
      const childCount = group ? e.children.length : 0;
      confirmDialog({
        title: group ? "\u5220\u9664\u7236\u6761\u76EE" : "\u5220\u9664\u6761\u76EE",
        desc: group && childCount > 0 ? `\u786E\u5B9A\u8981\u5220\u9664\u7236\u6761\u76EE\u300C${e.name}\u300D\u53CA\u5176 ${childCount} \u4E2A\u5B50\u6761\u76EE\u5417?\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002` : `\u786E\u5B9A\u8981\u5220\u9664${group ? "\u7236\u6761\u76EE" : "\u6761\u76EE"}\u300C${e.name}\u300D\u5417?`,
        onOk: () => {
          void (async () => {
            try {
              await deleteEntry(curId(), e.id);
              await refreshAll();
              toast("\u5DF2\u5220\u9664");
            } catch (err) {
              toastError(err);
            }
          })();
        }
      });
    });
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "entry-toggle";
    toggle.checked = !((isGroup(e) || isPlain(e)) && e.enabled === false);
    toggle.title = "\u542F\u7528";
    const toggleWrap = document.createElement("label");
    toggleWrap.className = "prp switch";
    const slider = document.createElement("span");
    slider.className = "slider";
    toggleWrap.append(toggle, slider);
    toggle.addEventListener("change", () => {
      void (async () => {
        try {
          await updateEntry(curId(), e.id, { enabled: toggle.checked });
          await refreshAll();
          toast(toggle.checked ? "\u5DF2\u542F\u7528" : "\u5DF2\u505C\u7528");
        } catch (err) {
          toastError(err);
          toggle.checked = !toggle.checked;
        }
      })();
    });
    head.append(handle, role, content, caretBtn, spacer, toggleWrap, editBtn, delBtn);
    wrap.appendChild(head);
    if (group && expanded) {
      wrap.appendChild(renderDetail(e, childrenByParent));
    }
    return wrap;
  }
  function renderDetail(g, childrenByParent) {
    const children = orderedChildren(g, childrenByParent);
    const detail = el("div", "prp entry-detail");
    const label = el("label", "prp detail-label");
    label.textContent = `\u5B50\u6761\u76EE \xB7 ${children.length} \u9879`;
    detail.append(label);
    const childList = el("div", "prp block-list");
    detail.appendChild(childList);
    if (children.length === 0) {
      childList.appendChild(el("div", "prp block-empty", "\u6682\u65E0\u5B50\u6761\u76EE"));
    } else {
      for (const c of children) {
        const rowEl = renderChildRow(g, c);
        childList.appendChild(rowEl);
      }
      const childSort = makeSortable({
        container: childList,
        rowSelector: ".prp.block-row",
        handleSelector: ".prp.block-row .prp.drag-handle",
        gap: 4,
        onDrop: (items) => {
          const ids = items.map((it) => it.dataset.blockId ?? "").filter((x) => x !== "");
          const cur = state.childOrder[g.id] ?? [];
          if (ids.length !== cur.length) return;
          if (ids.join("|") === cur.join("|")) return;
          state = { ...state, childOrder: { ...state.childOrder, [g.id]: ids }, dirtyOrder: true };
          updateSendAndSave();
          setStatus("\u987A\u5E8F\u5DF2\u8C03\u6574,\u70B9\u51FB\u300C\u4FDD\u5B58\u987A\u5E8F\u300D\u63D0\u4EA4", "idle");
        }
      });
      childSorts.push(childSort);
    }
    detail.appendChild(button("prp dashed-btn", "\u65B0\u5EFA\u5B50\u6761\u76EE", () => void doCreateChild(g)));
    return detail;
  }
  function renderChildRow(_g, c) {
    const rowEl = el("div", "prp block-row");
    rowEl.dataset.blockId = c.id;
    const handle = el("span", "prp drag-handle", "\u22EE\u22EE");
    handle.title = "\u62D6\u52A8\u6392\u5E8F";
    const name = el("span", "prp entry-name", c.name);
    if (isPlaceholder(c)) {
      rowEl.classList.add("readonly");
      const pin = el("span", "prp child-preview", `\u26C1 ${c.placeholder.name}`);
      rowEl.append(handle, name, pin);
      return rowEl;
    }
    const preview = el("span", "prp child-preview", c.text.trim() === "" ? "(\u7A7A)" : c.text);
    preview.title = c.text;
    const editBtn = button("prp text-btn", "\u7F16\u8F91", () => {
      openChildEditor({
        entry: { name: c.name, text: c.text },
        onSave: async (input) => {
          if (!input.name) {
            toast("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
            throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
          }
          try {
            await updateEntry(curId(), c.id, { name: input.name, text: input.text });
            await refreshAll();
            toast("\u5DF2\u4FDD\u5B58");
          } catch (err) {
            toastError(err);
            throw err;
          }
        }
      });
    });
    const delBtn = button("prp text-btn danger", "\u5220\u9664", () => {
      confirmDialog({
        title: "\u5220\u9664\u5B50\u6761\u76EE",
        desc: `\u786E\u5B9A\u8981\u5220\u9664\u5B50\u6761\u76EE\u300C${c.name}\u300D\u5417?`,
        onOk: () => {
          void (async () => {
            try {
              await deleteEntry(curId(), c.id);
              await refreshAll();
              toast("\u5DF2\u5220\u9664");
            } catch (err) {
              toastError(err);
            }
          })();
        }
      });
    });
    rowEl.append(handle, name, preview, editBtn, delBtn);
    return rowEl;
  }
  async function doSaveOrder() {
    if (savingOrder) return;
    const cur = current();
    if (!cur || !state.dirtyOrder) return;
    savingOrder = true;
    saveOrderBtn.disabled = true;
    try {
      await saveLayout(cur.id, { entries: state.topOrder, children: state.childOrder });
      state = { ...state, dirtyOrder: false };
      await refreshAll();
      toast("\u5DF2\u4FDD\u5B58\u987A\u5E8F");
    } catch (e) {
      toastError(e);
      state = { ...state, dirtyOrder: false };
      await refreshAll();
    } finally {
      savingOrder = false;
      updateSendAndSave();
    }
  }
  function updateSendAndSave() {
    const cur = current();
    const { childrenByParent } = toTree(rows);
    const hasContent = rows.some((e) => {
      if ((isGroup(e) || isPlain(e)) && e.enabled === false) return false;
      if (isGroup(e)) {
        const children = childrenByParent[e.id] ?? [];
        return children.some((c) => c.text.trim() !== "") || children.some(isPlaceholder);
      }
      if (isPlain(e)) return e.text.trim() !== "";
      return false;
    });
    sendBtn.disabled = !cur || !hasContent;
    saveOrderBtn.disabled = !state.dirtyOrder;
  }
  async function doPreview() {
    const cur = current();
    if (!cur) return;
    try {
      const payload = await previewPrompt(cur.id);
      openResult("\u9884\u89C8\u7ED3\u679C(\u6CE8\u518C\u6761\u76EE\u4E3A\u5360\u4F4D\u7B26,\u672A\u53D1\u9001)", payload);
      setStatus("\u9884\u89C8\u5B8C\u6210", "success");
    } catch (e) {
      openResult("\u9884\u89C8\u5931\u8D25", { ok: false, message: e?.message || "\u9884\u89C8\u5931\u8D25" });
      setStatus("\u9884\u89C8\u5931\u8D25", "error");
    }
  }
  async function doPickRegistered() {
    const cur = current();
    if (!cur) return;
    try {
      const list = await listRegistered();
      const existing = new Set(rows.filter((e) => isGroup(e)).map((e) => e.id));
      const { modal, close } = createLayer("min(420px,92vw)");
      headOf(modal, "\u6DFB\u52A0\u6CE8\u518C\u6761\u76EE", close);
      const body = el("div", "prp float-body");
      const pool = list.filter((r) => !existing.has(r.id));
      if (pool.length === 0) body.appendChild(el("div", "prp block-empty", "\u6682\u65E0\u53EF\u6DFB\u52A0\u7684\u6CE8\u518C\u6761\u76EE"));
      for (const r of pool) {
        body.appendChild(button("prp dashed-btn", r.name, () => {
          void (async () => {
            try {
              await addRegisteredEntry(cur.id, r.id);
              close();
              await refreshAll();
              toast(`\u5DF2\u6DFB\u52A0\u300C${r.name}\u300D`);
            } catch (err) {
              toastError(err);
            }
          })();
        }));
      }
      modal.appendChild(body);
      footOf(modal, [{ label: "\u5173\u95ED", variant: "s", onClick: close }]);
    } catch (e) {
      toastError(e);
    }
  }
  function renderBar() {
    formBar.innerHTML = "";
    if (state.forms.length === 0) {
      formBar.appendChild(el("span", "", "\u6682\u65E0\u8868\u5355"));
      return;
    }
    const sel = document.createElement("select");
    for (const f of state.forms) {
      const o = document.createElement("option");
      o.value = f.id;
      o.textContent = f.name;
      if (f.id === state.currentId) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => {
      state = selectForm(state, sel.value);
      state = { ...state, expandedId: null, dirtyOrder: false, topOrder: [], childOrder: {} };
      void refreshAll();
      renderBar();
      void setActiveForm(sel.value).then(() => {
        activeId = sel.value;
        renderBar();
      }).catch(toastError);
    });
    const cur = current();
    formBar.appendChild(sel);
    if (cur) {
      if (cur.id === activeId) formBar.appendChild(el("span", "prp active-pill", "\u4F7F\u7528\u4E2D"));
      formBar.appendChild(el("span", "prp pid", `${cur.entryCount} \u9879`));
    }
    formBar.appendChild(button("prp text-btn", "\u6539\u540D", () => startRename()));
    formBar.appendChild(button("prp text-btn", "\u65B0\u5EFA\u8868\u5355", () => void doCreateForm()));
  }
  function startRename() {
    const cur = current();
    if (!cur) return;
    formBar.innerHTML = "";
    const input = el("input");
    input.value = cur.name;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void confirmRename(input);
      if (e.key === "Escape") renderBar();
    });
    formBar.append(input, button("prp text-btn", "\u786E\u5B9A", () => void confirmRename(input)), button("prp text-btn", "\u53D6\u6D88", () => renderBar()));
    input.focus();
    input.select();
  }
  async function confirmRename(input) {
    const cur = current();
    if (!cur) return;
    const name = input.value.trim();
    if (!name) {
      toast("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      return;
    }
    try {
      await renameForm(cur.id, name);
      state = upsertForm(state, { ...cur, name });
      renderBar();
      toast("\u5DF2\u66F4\u65B0\u8868\u5355\u540D\u79F0");
    } catch (e) {
      toastError(e);
    }
  }
  function defaultFormName() {
    const base = "\u65B0\u9884\u8BBE";
    const names = new Set(state.forms.map((f) => f.name));
    let n = 1;
    while (names.has(base + (n > 1 ? " " + n : ""))) n++;
    return n > 1 ? base + " " + n : base;
  }
  async function doCreateForm() {
    const name = defaultFormName();
    try {
      const { id } = await createForm(name);
      state = selectForm(upsertForm(state, { id, name, entryCount: 0 }), id);
      state = { ...state, expandedId: null, dirtyOrder: false, topOrder: [], childOrder: {} };
      await refreshAll();
      renderBar();
      renderActions();
      toast("\u5DF2\u521B\u5EFA\u65B0\u8868\u5355");
      void setActiveForm(id).then(() => {
        activeId = id;
        renderBar();
      }).catch(toastError);
    } catch (e) {
      toastError(e);
    }
  }
  function renderActions() {
    actionsRow.innerHTML = "";
    const hasForm = state.forms.length > 0;
    const newEntryBtn = button("", "\u65B0\u5EFA\u6761\u76EE", () => doCreateEntryWizard());
    const regBtn = button("", "\uFF0B \u6CE8\u518C\u6761\u76EE", () => void doPickRegistered());
    const deleteFormBtn = button("danger", "\u5220\u9664\u8868\u5355", () => confirmDeleteForm());
    newEntryBtn.disabled = !hasForm;
    regBtn.disabled = !hasForm;
    deleteFormBtn.disabled = !hasForm;
    actionsRow.append(newEntryBtn, regBtn, deleteFormBtn);
  }
  function doCreateEntryWizard() {
    if (!current()) {
      toast("\u8BF7\u5148\u65B0\u5EFA\u4E00\u4E2A\u8868\u5355");
      return;
    }
    askEntryKind();
  }
  function askEntryKind() {
    const { modal, close } = createLayer("min(380px,90vw)");
    headOf(modal, "\u65B0\u5EFA\u6761\u76EE", close);
    const body = el("div", "prp float-body");
    const plainBtn = document.createElement("button");
    plainBtn.className = "prp wizard-opt";
    plainBtn.type = "button";
    plainBtn.textContent = "\u666E\u901A\u6761\u76EE";
    plainBtn.addEventListener("click", () => {
      close();
      void createPlainEntry();
    });
    const groupBtn = document.createElement("button");
    groupBtn.className = "prp wizard-opt";
    groupBtn.type = "button";
    groupBtn.textContent = "\u7236\u6761\u76EE";
    groupBtn.addEventListener("click", () => {
      close();
      createGroupEntry();
    });
    body.append(plainBtn, groupBtn);
    modal.appendChild(body);
    footOf(modal, [{ label: "\u53D6\u6D88", variant: "s", onClick: close }]);
    setTimeout(() => plainBtn.focus(), 30);
  }
  async function createPlainEntry() {
    const id = curId();
    try {
      const { entryId } = await createEntry(id, { name: "\u65B0\u6761\u76EE", role: "user", text: "" });
      await refreshAll();
      const created = rows.find((r) => r.id === entryId);
      if (created && isPlain(created)) {
        openEntryEditor({
          title: "\u7F16\u8F91\u6761\u76EE",
          entry: { name: created.name, role: created.role, text: created.text },
          withRole: true,
          withText: true,
          onSave: async (input) => {
            if (!input.name) {
              toast("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
              throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
            }
            try {
              await updateEntry(id, entryId, { name: input.name, role: input.role, text: input.text });
              await refreshAll();
              toast("\u5DF2\u4FDD\u5B58");
            } catch (err) {
              toastError(err);
              throw err;
            }
          }
        });
      }
    } catch (e) {
      toastError(e);
    }
  }
  function createGroupEntry() {
    const id = curId();
    openGroupCreator({
      title: "\u65B0\u5EFA\u7236\u6761\u76EE",
      onSave: async (input) => {
        try {
          const { entryId } = await createEntry(id, { name: input.name, role: input.role, kind: "group" });
          state = setExpand(state, entryId);
          await refreshAll();
          const addBtn = listBox.querySelector(`.entry-wrap[data-entry-id="${entryId}"] .dashed-btn`);
          addBtn?.focus();
          toast("\u5DF2\u521B\u5EFA\u7236\u6761\u76EE");
        } catch (e) {
          toastError(e);
        }
      }
    });
  }
  async function doCreateChild(g) {
    const id = curId();
    openChildCreator({
      onSave: async (input) => {
        try {
          await createEntry(id, { name: input.name, base: g.id, text: input.text });
          await refreshAll();
          toast("\u5DF2\u65B0\u5EFA\u5B50\u6761\u76EE");
        } catch (e) {
          toastError(e);
        }
      }
    });
  }
  async function doToggleExpand(entryId) {
    state = toggleExpand(state, entryId);
    renderList();
  }
  function confirmDeleteForm() {
    const cur = current();
    if (!cur) return;
    confirmDialog({
      title: "\u5220\u9664\u8868\u5355",
      desc: `\u786E\u5B9A\u8981\u5220\u9664\u8868\u5355\u300C${cur.name}\u300D\u53CA\u5176\u6240\u6709\u6761\u76EE\u5417?\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002`,
      onOk: () => {
        void (async () => {
          try {
            await deleteForm(cur.id);
            state = removeForm(state, cur.id);
            state = { ...state, dirtyOrder: false, topOrder: [], childOrder: {} };
            if (cur.id === activeId) activeId = null;
            await refreshAll();
            renderBar();
            renderActions();
            toast("\u5DF2\u5220\u9664\u8868\u5355");
          } catch (e) {
            toastError(e);
          }
        })();
      }
    });
  }
  void (async () => {
    try {
      state = applyList(state, await listForms());
      renderBar();
      renderActions();
      await refreshAll();
      try {
        activeId = await getActiveForm();
      } catch {
      }
      renderBar();
    } catch (e) {
      toastError(e);
    }
  })();
  return root;
}

// src/web.tsx
var navTimer;
var webPlugin = {
  name: "prompt",
  mount() {
    if (navTimer) {
      clearInterval(navTimer);
      navTimer = void 0;
    }
    const tryRegister = () => {
      const slots = window.__uiSlots__;
      const tools = window.__uiTools__;
      if (!slots || !tools) return false;
      slots.register("nav", {
        name: "prompt",
        render(el2) {
          const btn = document.createElement("button");
          btn.textContent = "prompt";
          btn.style.cssText = "border-radius:16px;padding:0 14px;font-size:12px;font-weight:600;color:var(--ui-text,#444444);background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);cursor:pointer;height:30px;";
          btn.addEventListener("click", () => {
            tools.pluginModal({
              title: "Prompt \u9884\u8BBE",
              source: "prompt",
              width: 800,
              content: (c) => {
                c.appendChild(createPanel((m) => tools.toast(m)));
              }
            });
          });
          el2.appendChild(btn);
        }
      });
      return true;
    };
    if (tryRegister()) return;
    navTimer = setInterval(() => {
      if (tryRegister()) {
        clearInterval(navTimer);
        navTimer = void 0;
      }
    }, 200);
  },
  unmount() {
    if (navTimer) {
      clearInterval(navTimer);
      navTimer = void 0;
    }
    const slots = window.__uiSlots__;
    slots?.unregister("nav", "prompt");
  }
};
var web_default = webPlugin;
module.exports = module.exports.default
