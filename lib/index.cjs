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
var STYLE_ID = "ui-chat-thinking-style";
var BUBBLE_NAME = "thinking-bubble";
var thinkingStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
/* 1) \u94FE\u5757:\u601D\u8003\u4E2D\u865A\u7EBF \u2192 \u6536\u8D77\u5B9E\u7EBF;\u6D45\u5E95\u4E2D\u6027\u914D\u8272 */
body .uchat-page .uchat-row.ai .uchat-chain { border-color: #9a9a9a; background: #fbfbfb; }
body .uchat-page .uchat-chain.thinking { border-style: dashed; }
body .uchat-page .uchat-chain:not(.thinking) { border-style: solid; }
body .uchat-page .uchat-chain-head { color: #777; font-size: 12px; }
body .uchat-page .uchat-chain-label { background: #3a3a3a; }
body .uchat-page .uchat-chain-body { color: #666; background: #f4f4f4; }
/* 2) \u9759\u6001\u6C14\u6CE1\u63A5\u7BA1:AI \u5DE6 / user \u53F3,\u767D\u5E95\u7EC6\u8FB9\u6846(\u4E0E demo \u4E00\u81F4);\u6587\u672C\u5360\u6EE1\u5BBD\u5EA6\u4EE5\u5185\u81EA\u9002\u5E94 */
body .uchat-page .uchat-list > .uchat-row .uchat-bubble { background: #fff !important; border: 1px solid #d9d9d9 !important; border-radius: 4px !important; box-shadow: none !important; max-width: 100% !important; font-size: 14px; line-height: 1.7; }
body .uchat-page .uchat-list > .uchat-row.user .uchat-bubble { background: #ececec !important; border-color: transparent !important; }
`;
  document.head.appendChild(s);
};
function tryRegister() {
  const chat = window.__uiChat__;
  if (!chat) return false;
  reg = chat;
  chat.registerBubble({
    name: BUBBLE_NAME,
    priority: 15,
    // 高于 ui-chat-demo-plugin(10);低于 ui-chat-flat-plugin(20)时被 flat 接管
    match: () => true,
    render(box, msg) {
      box.textContent = msg.content;
    }
  });
  return true;
}
var web_default = {
  name: "ui-chat-thinking-plugin",
  mount() {
    thinkingStyle();
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
