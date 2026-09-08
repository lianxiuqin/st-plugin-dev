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

// src/sse.ts
function parseSseLine(line) {
  const s = typeof line === "string" ? line.trim() : "";
  if (!s.startsWith("data:")) return null;
  const payload = s.slice(5).trim();
  if (!payload) return null;
  let j;
  try {
    j = JSON.parse(payload);
  } catch {
    return null;
  }
  if (j.t === "r" && typeof j.d === "string") return { t: "r", d: j.d };
  if (j.t === "delta" && typeof j.d === "string") return { t: "delta", d: j.d };
  if (j.t === "done") return { t: "done" };
  if (j.t === "error") return { t: "error", message: typeof j.message === "string" ? j.message : "\u6D41\u5F0F\u8BF7\u6C42\u5931\u8D25" };
  return null;
}

// src/web.tsx
function configStreamOn() {
  const cfg = window.__CLIENT_CONFIG__;
  const mine = cfg?.["chat-stream-plugin"];
  return mine ? mine.stream !== false : true;
}
async function sendWhole(text, hooks) {
  const res = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
  }
  if (!res.ok || !body?.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  if (typeof body.data?.reasoning === "string" && body.data.reasoning !== "") hooks?.onReasoning?.(body.data.reasoning);
  return body.data?.reply ?? "";
}
async function sendStreamText(text, hooks) {
  const res = await fetch("/api/chat-stream/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok || !res.body) {
    let body = null;
    try {
      body = await res.json();
    } catch {
    }
    if (body?.code === "stream_disabled" || res.status === 404) return sendWhole(text, hooks);
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let reply = "";
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      const ev = parseSseLine(line);
      if (!ev) continue;
      if (ev.t === "r" && ev.d) hooks.onReasoning?.(ev.d);
      else if (ev.t === "delta" && ev.d) {
        reply += ev.d;
        hooks.onDelta?.(ev.d);
      } else if (ev.t === "error") throw new Error(ev.message ?? "\u6D41\u5F0F\u8BF7\u6C42\u5931\u8D25");
      else if (ev.t === "done") return reply;
    }
  }
  return reply;
}
var registered = false;
var webPlugin = {
  name: "chat-stream-plugin",
  mount() {
    if (!configStreamOn() || registered) return;
    const tryReg = () => {
      const chat = window.__uiChat__;
      if (!chat) return false;
      chat.registerTransport({
        name: "chat-stream",
        priority: 10,
        match: () => true,
        send: (text, hooks) => sendStreamText(text, hooks)
      });
      registered = true;
      return true;
    };
    if (!tryReg()) {
      const timer = setInterval(() => {
        if (tryReg()) clearInterval(timer);
      }, 200);
      setTimeout(() => clearInterval(timer), 6e4);
    }
  },
  unmount() {
    if (!registered) return;
    window.__uiChat__?.unregister("transport", "chat-stream");
    registered = false;
  }
};
var web_default = webPlugin;
module.exports = module.exports.default
