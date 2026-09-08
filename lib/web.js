let reg = null;
let timer;
const STYLE_ID = 'ui-chat-flat-style';
const BUBBLE_NAME = 'flat-bubble';
const flatStyle = () => {
    if (document.getElementById(STYLE_ID))
        return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    // 注:本 style 由 flat 插件 mount 时注入,可能先于 ui-chat-plugin 默认样式;
    // 覆盖一律提高特异性(body 前缀)或加 !important,避免同特异度时被后注入的默认样式压过。
    s.textContent = `
/* 1) 整页对话列收窄居中:标题 / 消息 / 输入区同一条居中的对话列,左右留白对称 */
body .uchat-page { align-items: center; }
body .uchat-page > .uchat-head,
body .uchat-page > .uchat-body,
body .uchat-page > .uchat-composer { width: min(720px, 100%); box-sizing: border-box; }
body .uchat-page .uchat-body .uchat-list { padding: 30px 16px; gap: 24px; }
/* 2) 默认气泡壳(发送中的即时行等)强制透明无框无底,与历史消息一致、不闪深色块 */
.uchat-page .uchat-list > .uchat-row .uchat-bubble { background: transparent !important; color: var(--ui-text, #444) !important; border-radius: 0 !important; padding: 0 !important; box-shadow: none !important; font-size: 14px; line-height: 1.8; }
/* 3) 扁平气泡:纯文本无任何容器视觉,左右位置由 .uchat-row.ai/.user 对齐决定 */
.uchat-flat-msg { max-width: 78%; padding: 0; white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.8; color: var(--ui-text, #444); }
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
        priority: 20, // 高于 ui-chat-demo-plugin 的卡片气泡(10),接管所有消息
        match: () => true, // ai / user / system 全部走扁平渲染
        render(box, msg) {
            box.className = 'uchat-flat-msg'; // 不带任何背景/边框/阴影
            box.textContent = msg.content;
        },
    });
    return true;
}
export default {
    name: 'ui-chat-flat-plugin',
    mount() {
        flatStyle();
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
