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
var reg = null;
var timer;
var STYLE_ID = "ui-chat-flat-style";
var BUBBLE_NAME = "flat-bubble";
var flatStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
/* 1) \u6574\u9875\u5BF9\u8BDD\u5217\u6536\u7A84\u5C45\u4E2D:\u6807\u9898 / \u6D88\u606F / \u8F93\u5165\u533A\u540C\u4E00\u6761\u5C45\u4E2D\u7684\u5BF9\u8BDD\u5217,\u5DE6\u53F3\u7559\u767D\u5BF9\u79F0 */
body .uchat-page { align-items: center; }
body .uchat-page > .uchat-head,
body .uchat-page > .uchat-body,
body .uchat-page > .uchat-composer { width: min(720px, 100%); box-sizing: border-box; }
body .uchat-page .uchat-body .uchat-list { padding: 30px 16px; gap: 24px; }
/* 2) \u9ED8\u8BA4\u6C14\u6CE1\u58F3(\u53D1\u9001\u4E2D\u7684\u5373\u65F6\u884C\u7B49)\u5F3A\u5236\u900F\u660E\u65E0\u6846\u65E0\u5E95,\u4E0E\u5386\u53F2\u6D88\u606F\u4E00\u81F4\u3001\u4E0D\u95EA\u6DF1\u8272\u5757 */
.uchat-page .uchat-list > .uchat-row .uchat-bubble { background: transparent !important; color: var(--ui-text, #444) !important; border-radius: 0 !important; padding: 0 !important; box-shadow: none !important; font-size: 14px; line-height: 1.8; }
/* 3) \u6241\u5E73\u6C14\u6CE1:\u7EAF\u6587\u672C\u65E0\u4EFB\u4F55\u5BB9\u5668\u89C6\u89C9,\u5DE6\u53F3\u4F4D\u7F6E\u7531 .uchat-row.ai/.user \u5BF9\u9F50\u51B3\u5B9A */
.uchat-flat-msg { max-width: 78%; padding: 0; white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.8; color: var(--ui-text, #444); }
`;
  document.head.appendChild(s);
};
function tryRegister() {
  const chat = window.__uiChat__;
  if (!chat) return false;
  reg = chat;
  chat.registerBubble({
    name: BUBBLE_NAME,
    priority: 20,
    // 高于 ui-chat-demo-plugin 的卡片气泡(10),接管所有消息
    match: () => true,
    // ai / user / system 全部走扁平渲染
    render(box, msg) {
      box.className = "uchat-flat-msg";
      box.textContent = msg.content;
    }
  });
  return true;
}
var web_default = {
  name: "ui-chat-flat-plugin",
  mount() {
    flatStyle();
    if (tryRegister()) return;
    timer = setInterval(() => {
      if (tryRegister()) {
        clearInterval(timer);
        timer = void 0;
      }
    }, 200);
  },
  unmount() {
    if (timer) {
      clearInterval(timer);
      timer = void 0;
    }
    reg?.unregister("bubble", BUBBLE_NAME);
    reg = null;
    document.getElementById(STYLE_ID)?.remove();
  }
};
module.exports = module.exports.default
