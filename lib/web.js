let reg = null;
let timer;
const STYLE_ID = 'ui-chat-thinking-style';
const BUBBLE_NAME = 'thinking-bubble';
const thinkingStyle = () => {
    if (document.getElementById(STYLE_ID))
        return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    // 覆盖一律提高特异性(body 前缀)或加 !important,避免同特异度时被后注入的默认样式压过
    s.textContent = `
/* 1) 链块:思考中虚线 → 收起实线;浅底中性配色 */
body .uchat-page .uchat-row.ai .uchat-chain { border-color: #9a9a9a; background: #fbfbfb; }
body .uchat-page .uchat-chain.thinking { border-style: dashed; }
body .uchat-page .uchat-chain:not(.thinking) { border-style: solid; }
body .uchat-page .uchat-chain-head { color: #777; font-size: 12px; }
body .uchat-page .uchat-chain-label { background: #3a3a3a; }
body .uchat-page .uchat-chain-body { color: #666; background: #f4f4f4; }
/* 2) 静态气泡接管:AI 左 / user 右,白底细边框(与 demo 一致);文本占满宽度以内自适应 */
body .uchat-page .uchat-list > .uchat-row .uchat-bubble { background: #fff !important; border: 1px solid #d9d9d9 !important; border-radius: 4px !important; box-shadow: none !important; max-width: 100% !important; font-size: 14px; line-height: 1.7; }
body .uchat-page .uchat-list > .uchat-row.user .uchat-bubble { background: #ececec !important; border-color: transparent !important; }
`;
    document.head.appendChild(s);
};
function tryRegister() {
    const chat = window.__uiChat__;
    if (!chat)
        return false;
    reg = chat;
    chat.registerBubble({
        name: BUBBLE_NAME,
        priority: 15, // 高于 ui-chat-demo-plugin(10);低于 ui-chat-flat-plugin(20)时被 flat 接管
        match: () => true,
        render(box, msg) {
            box.textContent = msg.content;
        },
    });
    return true;
}
export default {
    name: 'ui-chat-thinking-plugin',
    mount() {
        thinkingStyle();
        if (tryRegister())
            return;
        timer = setInterval(() => {
            if (tryRegister()) {
                clearInterval(timer);
                timer = undefined;
            }
        }, 200);
    },
    unmount() {
        if (timer) {
            clearInterval(timer);
            timer = undefined;
        }
        reg?.unregister('bubble', BUBBLE_NAME);
        reg = null;
        document.getElementById(STYLE_ID)?.remove();
    },
};
