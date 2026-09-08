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
/* 1) \u4E2D\u592E\u5BF9\u8BDD\u5217:\u5360\u5185\u5BB9\u533A 80% \u5C45\u4E2D(\u5DE6\u53F3\u5404\u7559\u767D 10%);\u6807\u9898/\u6D88\u606F/\u8F93\u5165\u540C\u5217 */
body .uchat-page { align-items: center; }
body .uchat-page > .uchat-head,
body .uchat-page > .uchat-body,
body .uchat-page > .uchat-composer { width: 80%; box-sizing: border-box; }
body .uchat-page .uchat-body .uchat-list { padding: 24px 20px; gap: 20px; }
/* 2) \u9ED8\u8BA4\u6C14\u6CE1\u58F3(\u53D1\u9001\u4E2D\u7684\u5373\u65F6\u884C\u7B49)\u5F3A\u5236\u900F\u660E\u65E0\u6846\u65E0\u5E95;\u5BBD\u5EA6\u540C\u6837\u653E\u5F00\u4E3A\u5360\u6EE1\u6846\u67B6 */
.uchat-page .uchat-list > .uchat-row .uchat-bubble { background: transparent !important; color: var(--ui-text, #444) !important; border-radius: 0 !important; padding: 0 !important; box-shadow: none !important; max-width: 100% !important; font-size: 15px; line-height: 1.7; }
.uchat-page .uchat-list > .uchat-row.user .uchat-bubble { text-align: right; }
/* 3) \u6241\u5E73\u6D88\u606F:\u5BBD\u5EA6\u7531\u5185\u5BB9\u6491\u5F00\u4F46\u53EF\u5360\u6EE1\u6574\u4E2A\u6846\u67B6(max-width 100%);\u77ED\u6587\u672C\u81EA\u9002\u5E94,
     \u957F\u6587\u672C\u5360\u6EE1\u6574\u884C\u3002\u65E0\u6C14\u6CE1\u58F3,\u6765\u6E90\u9760\u884C\u4F4D\u7F6E + \u5757\u5185\u6587\u672C\u65B9\u5411\u533A\u5206:AI \u5DE6\u5BF9\u9F50 / user \u53F3\u5BF9\u9F50 */
.uchat-flat-msg { max-width: 100%; padding: 0; white-space: pre-wrap; word-break: break-word; font-size: 15px; line-height: 1.7; color: var(--ui-text, #444); }
.uchat-row.ai .uchat-flat-msg { text-align: left; }
.uchat-row.user .uchat-flat-msg { text-align: right; }
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
