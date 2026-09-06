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

// src/registry.ts
function byPriority(a, b) {
  return b.priority - a.priority || a._seq - b._seq;
}
var ChatRegistry = class {
  pages = /* @__PURE__ */ new Map();
  bubbles = /* @__PURE__ */ new Map();
  tools = /* @__PURE__ */ new Map();
  regions = /* @__PURE__ */ new Map();
  defaultPage = true;
  defaultBubble = true;
  listeners = /* @__PURE__ */ new Set();
  seq = 0;
  notify() {
    for (const fn of [...this.listeners]) fn();
  }
  /** 同名注册:后到覆盖,旧项先 unmount */
  put(kind, item, map) {
    const name = item.name;
    const old = map.get(name);
    if (old && old !== item) old.unmount?.();
    map.set(name, { ...item, priority: item.priority ?? 0, _seq: this.seq++ });
    this.notify();
  }
  registerPage(o) {
    if (!o.name || typeof o.render !== "function") throw new Error("ui-chat: \u975E\u6CD5 page \u6CE8\u518C");
    this.put("page", o, this.pages);
  }
  registerBubble(o) {
    if (!o.name || typeof o.match !== "function" || typeof o.render !== "function") throw new Error("ui-chat: \u975E\u6CD5 bubble \u6CE8\u518C");
    this.put("bubble", o, this.bubbles);
  }
  registerTool(o) {
    if (!o.name || !["bubble", "session-head", "composer"].includes(o.scope) || typeof o.render !== "function") throw new Error("ui-chat: \u975E\u6CD5 tool \u6CE8\u518C");
    this.put("tool", o, this.tools);
  }
  registerRegion(o) {
    if (!o.name || !["page-head", "side", "composer-top"].includes(o.slot) || typeof o.render !== "function") throw new Error("ui-chat: \u975E\u6CD5 region \u6CE8\u518C");
    this.put("region", o, this.regions);
  }
  unregister(kind, name) {
    const map = kind === "page" ? this.pages : kind === "bubble" ? this.bubbles : kind === "tool" ? this.tools : this.regions;
    const item = map.get(name);
    if (!item) return;
    item.unmount?.();
    map.delete(name);
    this.notify();
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  setDefault(kind, enabled) {
    if (kind === "page") this.defaultPage = enabled;
    else this.defaultBubble = enabled;
    this.notify();
  }
  isDefaultEnabled(kind) {
    return kind === "page" ? this.defaultPage : this.defaultBubble;
  }
  /** 生效 page:priority 最高者;无则 null(由装配层决定回退默认) */
  pickPage() {
    const list = [...this.pages.values()].sort(byPriority);
    return list[0] ?? null;
  }
  /** 生效 bubble:遍历已排序列表,返回首个 match 命中;无则 null */
  pickBubble(role, msg) {
    const list = [...this.bubbles.values()].sort(byPriority);
    for (const b of list) {
      try {
        if (b.match(role, msg)) return b;
      } catch {
      }
    }
    return null;
  }
  toolsOf(scope) {
    return [...this.tools.values()].filter((t) => t.scope === scope).sort(byPriority);
  }
  regionsOf(slot) {
    return [...this.regions.values()].filter((r) => r.slot === slot).sort(byPriority);
  }
  // 供测试/调试:注册数量快照
  counts() {
    return { page: this.pages.size, bubble: this.bubbles.size, tool: this.tools.size, region: this.regions.size };
  }
};

// src/ui/api.ts
var api_exports = {};
__export(api_exports, {
  getActiveSession: () => getActiveSession,
  listMessages: () => listMessages,
  sendText: () => sendText
});
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
function listMessages() {
  return apiFetch("/api/chat/messages").then((r) => r.data);
}
async function sendText(text) {
  const r = await apiFetch("/api/chat/send", { method: "POST", body: JSON.stringify({ text }) });
  return r.data.reply;
}
function getActiveSession() {
  return apiFetch("/api/session/active").then((r) => r.data);
}

// src/default/style.ts
var STYLE_ID = "ui-chat-plugin-style";
function injectChatStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.uchat-page { position: absolute; inset: 0; display: flex; flex-direction: column; min-height: 0; font-family: system-ui, "Microsoft YaHei", sans-serif; color: var(--ui-text, #444); }
.uchat-page .uchat-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--ui-border, #e0e0e0); }
.uchat-page .uchat-head .uchat-badge { font-size: 11px; font-weight: 400; color: var(--ui-text-muted, #888); border: 1px solid var(--ui-border, #e0e0e0); border-radius: 999px; padding: 1px 8px; }
.uchat-page .uchat-head .uchat-tools { display: flex; gap: 4px; margin-left: auto; align-items: center; }
.uchat-page .uchat-body { flex: 1; min-height: 0; display: flex; }
.uchat-page .uchat-list { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.uchat-page .uchat-side { width: 200px; border-left: 1px solid var(--ui-border, #e0e0e0); overflow-y: auto; padding: 10px; }
.uchat-page .uchat-row { display: flex; width: 100%; flex-direction: column; }
.uchat-page .uchat-row.ai { align-items: flex-start; }
.uchat-page .uchat-row.user { align-items: flex-end; }
.uchat-page .uchat-row .uchat-bubble { max-width: 78%; padding: 8px 12px; line-height: 1.6; font-size: 13px; white-space: pre-wrap; word-break: break-word; }
.uchat-page .uchat-row.ai .uchat-bubble { background: var(--ui-accent-soft, #f0f0f0); color: var(--ui-text, #444); border-radius: var(--ui-radius-m, 6px); border-top-left-radius: var(--ui-radius-s, 4px); }
.uchat-page .uchat-row.user .uchat-bubble { background: var(--ui-accent, #333); color: var(--ui-on-accent, #fff); border-radius: var(--ui-radius-m, 6px); border-top-right-radius: var(--ui-radius-s, 4px); }
.uchat-page .uchat-row .uchat-bubble-tools { display: flex; gap: 6px; padding: 2px 2px 0; opacity: 0; transition: opacity .15s; }
.uchat-page .uchat-row:hover .uchat-bubble-tools { opacity: 1; }
.uchat-page .uchat-row .uchat-bubble-tools button { border: none; background: none; color: var(--ui-text-muted, #888); font-size: 11px; cursor: pointer; padding: 1px 4px; border-radius: 3px; }
.uchat-page .uchat-row .uchat-bubble-tools button:hover { color: var(--ui-accent, #333); background: var(--ui-accent-soft, #f0f0f0); }
.uchat-page .uchat-empty { margin: auto; color: var(--ui-text-muted, #888); font-size: 13px; text-align: center; }
.uchat-page .uchat-error { justify-content: center; color: var(--ui-danger, #d9534f); font-size: 12px; text-align: center; }
.uchat-page .uchat-composer { border-top: 1px solid var(--ui-border, #e0e0e0); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.uchat-page .uchat-composer textarea { width: 100%; resize: none; height: 64px; padding: 8px 10px; font: inherit; font-size: 13px; line-height: 1.5; color: var(--ui-text, #444); background: var(--ui-surface, #fff); border: 1px solid var(--ui-border, #e0e0e0); border-radius: var(--ui-radius-m, 6px); outline: none; box-sizing: border-box; }
.uchat-page .uchat-composer textarea:focus { border-color: var(--ui-accent, #333); box-shadow: 0 0 0 3px var(--ui-accent-ring, rgba(51,51,51,.15)); }
.uchat-page .uchat-composer textarea::placeholder { color: var(--ui-text-muted, #888); }
.uchat-page .uchat-send-row { display: flex; gap: 8px; align-items: flex-end; }
.uchat-page .uchat-send-row .uchat-send { padding: 8px 16px; font-size: 13px; cursor: pointer; background: var(--ui-accent, #333); color: var(--ui-on-accent, #fff); border: none; border-radius: var(--ui-radius-m, 6px); }
.uchat-page .uchat-send-row .uchat-send:disabled { opacity: .5; cursor: default; }
.uchat-page .uchat-send-row .uchat-composer-tools { display: flex; gap: 4px; margin-left: auto; align-items: center; }
`;
  document.head.appendChild(style);
}

// src/default/bubble.ts
function renderDefaultBubble(el, msg) {
  el.className = "uchat-bubble";
  el.dataset.role = msg.role;
  el.textContent = msg.content;
}

// src/assemble.ts
function h(tag, cls, text = "") {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
}
var bubbleApi = { copy() {
} };
var toolApi = { reload() {
} };
function createDefaultPanel(reg, deps) {
  const root = h("div", "uchat-page");
  const head = h("div", "uchat-head");
  head.append(h("span", "", "\u5BF9\u8BDD"));
  const sessionToolsBox = h("div", "uchat-tools");
  const headRegionsBox = h("div", "uchat-head-regions");
  head.append(headRegionsBox, sessionToolsBox);
  const body = h("div", "uchat-body");
  const list = h("div", "uchat-list");
  const sideBox = h("div", "uchat-side");
  body.append(list, sideBox);
  const composer = h("div", "uchat-composer");
  const composerTopBox = h("div", "uchat-composer-top");
  const ta = document.createElement("textarea");
  ta.placeholder = "\u8F93\u5165\u6D88\u606F,Enter \u53D1\u9001,Shift+Enter \u6362\u884C\u2026";
  const sendRow = h("div", "uchat-send-row");
  const composerToolsBox = h("div", "uchat-composer-tools");
  const sendBtn = h("button", "uchat-send", "\u53D1\u9001");
  sendRow.append(composerToolsBox, sendBtn);
  composer.append(composerTopBox, ta, sendRow);
  root.append(head, body, composer);
  let disposed = false;
  let sending = false;
  let reloading = null;
  function renderRegions(box, slot) {
    box.textContent = "";
    for (const item of reg.regionsOf(slot)) {
      try {
        item.render(box);
      } catch (e) {
        console.error(`[ui-chat] region ${item.name} \u6E32\u67D3\u5931\u8D25,\u5DF2\u8DF3\u8FC7`, e);
      }
    }
  }
  function renderHeadTools() {
    sessionToolsBox.textContent = "";
    for (const item of reg.toolsOf("session-head")) {
      try {
        item.render(sessionToolsBox, toolApi);
      } catch (e) {
        console.error(`[ui-chat] tool ${item.name} \u6E32\u67D3\u5931\u8D25,\u5DF2\u8DF3\u8FC7`, e);
      }
    }
  }
  function renderComposerTools() {
    composerToolsBox.textContent = "";
    for (const item of reg.toolsOf("composer")) {
      try {
        item.render(composerToolsBox, toolApi);
      } catch (e) {
        console.error(`[ui-chat] tool ${item.name} \u6E32\u67D3\u5931\u8D25,\u5DF2\u8DF3\u8FC7`, e);
      }
    }
  }
  function scrollBottom() {
    list.scrollTop = list.scrollHeight;
  }
  function appendEmpty(text) {
    list.textContent = "";
    list.appendChild(h("div", "uchat-empty", text));
  }
  function appendErrorRow(text) {
    list.textContent = "";
    const row = h("div", "uchat-row");
    row.classList.add("uchat-error");
    row.textContent = text;
    list.appendChild(row);
  }
  function appendBubble(msg) {
    const row = h("div", "uchat-row");
    row.classList.add(msg.role === "user" ? "user" : "ai");
    const bubbleBox = h("div", "uchat-bubble-box");
    const picked = reg.pickBubble(msg.role, msg);
    if (picked) {
      try {
        picked.render(bubbleBox, msg, bubbleApi);
      } catch (e) {
        console.error(`[ui-chat] bubble ${picked.name} \u6E32\u67D3\u5931\u8D25,\u56DE\u9000\u9ED8\u8BA4`, e);
        bubbleBox.textContent = "";
        renderDefaultBubble(bubbleBox, msg);
      }
    } else if (reg.isDefaultEnabled("bubble")) {
      renderDefaultBubble(bubbleBox, msg);
    } else {
      console.warn(`[ui-chat] \u65E0\u6C14\u6CE1\u6E32\u67D3\u5668\u5339\u914D role=${msg.role} \u4E14\u9ED8\u8BA4\u5DF2\u505C\u7528,\u8DF3\u8FC7\u8BE5\u6761`);
      return;
    }
    row.appendChild(bubbleBox);
    const bt = reg.toolsOf("bubble");
    if (bt.length > 0) {
      const toolsRow = h("div", "uchat-bubble-tools");
      for (const item of bt) {
        try {
          item.render(toolsRow, toolApi);
        } catch (e) {
          console.error(`[ui-chat] tool ${item.name} \u6E32\u67D3\u5931\u8D25,\u5DF2\u8DF3\u8FC7`, e);
        }
      }
      row.appendChild(toolsRow);
    }
    list.appendChild(row);
  }
  async function reload() {
    if (disposed || reloading) {
      if (reloading) return reloading;
      return;
    }
    const taValue = ta.value;
    reloading = (async () => {
      renderHeadTools();
      renderRegions(headRegionsBox, "page-head");
      renderRegions(sideBox, "side");
      sideBox.style.display = reg.regionsOf("side").length > 0 ? "" : "none";
      renderComposerTools();
      renderRegions(composerTopBox, "composer-top");
      try {
        const active = await deps.getActive();
        if (!active) {
          appendEmpty("\u70B9\u51FB\u53F3\u4FA7 \uFF0B \u65B0\u5EFA\u4F1A\u8BDD");
          return;
        }
        const rows = await deps.getMessages();
        list.textContent = "";
        if (rows.length === 0) {
          appendEmpty("\u5F00\u59CB\u7B2C\u4E00\u6BB5\u5BF9\u8BDD\u5427");
          return;
        }
        for (const m of rows) appendBubble(m);
        scrollBottom();
      } catch (e) {
        appendErrorRow(e.message || "\u5386\u53F2\u52A0\u8F7D\u5931\u8D25");
      } finally {
        ta.value = taValue;
      }
    })();
    try {
      await reloading;
    } finally {
      reloading = null;
    }
  }
  function doSend() {
    if (sending) return;
    const text = ta.value;
    if (!text.trim()) return;
    const row = h("div", "uchat-row user");
    const box = h("div", "uchat-bubble-box");
    renderDefaultBubble(box, { id: 0, role: "user", content: text, createdAt: "" });
    row.appendChild(box);
    list.appendChild(row);
    ta.value = "";
    sending = true;
    sendBtn.disabled = true;
    sendBtn.textContent = "\u53D1\u9001\u4E2D\u2026";
    deps.send(text.trim()).then(async () => {
      await reload();
      deps.onSessionChanged?.("message-appended");
    }).catch((e) => {
      appendErrorRow(e.message || "\u53D1\u9001\u5931\u8D25");
    }).finally(() => {
      sending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "\u53D1\u9001";
      ta.focus();
    });
  }
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });
  sendBtn.addEventListener("click", doSend);
  toolApi.reload = () => {
    void reload();
  };
  const unsub = reg.subscribe(() => {
    void reload();
  });
  void reload();
  return {
    el: root,
    reload,
    dispose() {
      disposed = true;
      unsub();
      root.remove();
    }
  };
}

// src/default/page.ts
function createChatPage(reg, deps) {
  injectChatStyle();
  return createDefaultPanel(reg, deps);
}

// src/boot.ts
function mountChatPlugin() {
  const reg = new ChatRegistry();
  const uiChat = {
    registerPage: (o) => reg.registerPage(o),
    registerBubble: (o) => reg.registerBubble(o),
    registerTool: (o) => reg.registerTool(o),
    registerRegion: (o) => reg.registerRegion(o),
    unregister: (kind, name) => reg.unregister(kind, name),
    subscribe: (fn) => reg.subscribe(fn),
    setDefault: (kind, enabled) => reg.setDefault(kind, enabled),
    isDefaultEnabled: (kind) => reg.isDefaultEnabled(kind)
  };
  window.__uiChat__ = uiChat;
  const deps = {
    api: api_exports,
    getActive: () => getActiveSession(),
    getMessages: () => listMessages(),
    send: (text) => sendText(text),
    onSessionChanged: (reason) => {
      window.dispatchEvent(new CustomEvent("st:session-changed", { detail: { reason } }));
    }
  };
  let handle = null;
  let timer;
  const tryMount = () => {
    const slots = window.__uiSlots__;
    if (!slots) return false;
    slots.register("main", {
      name: "chat",
      render(el) {
        handle?.dispose();
        handle = createChatPage(reg, deps);
        const node = handle.whenReady ?? Promise.resolve(handle.el);
        node.then((n) => {
          if (handle && !handle.disposed) el.appendChild(n);
        });
      }
    });
    return true;
  };
  if (!tryMount()) {
    timer = setInterval(() => {
      if (tryMount()) {
        clearInterval(timer);
        timer = void 0;
      }
    }, 200);
  }
  return {
    dispose() {
      if (timer) {
        clearInterval(timer);
        timer = void 0;
      }
      handle?.dispose();
      handle = null;
      delete window.__uiChat__;
    }
  };
}

// src/web.tsx
var disposer = null;
var webPlugin = {
  name: "ui-chat-plugin",
  mount() {
    if (disposer) {
      disposer.dispose();
      disposer = null;
    }
    disposer = mountChatPlugin();
  },
  unmount() {
    disposer?.dispose();
    disposer = null;
  }
};
var web_default = webPlugin;
module.exports = module.exports.default
