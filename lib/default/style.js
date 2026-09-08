// agent_plugin_dev/ui-chat-plugin/src/default/style.ts —— 默认对话页样式(var(--ui-*) token;类名前缀 uchat-)
const STYLE_ID = 'ui-chat-plugin-style';
export function injectChatStyle() {
    if (document.getElementById(STYLE_ID))
        return;
    const style = document.createElement('style');
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
/* —— 思维链折叠块(宿主中性样式;风格包可覆写;无 emoji,三角用 border caret) —— */
.uchat-page .uchat-chain { align-self: flex-start; border: 1px dashed var(--ui-border-strong, #b5b5b5); border-radius: var(--ui-radius-m, 6px); background: var(--ui-surface, #fff); max-width: 78%; margin-bottom: 6px; overflow: hidden; }
.uchat-page .uchat-chain:not(.thinking) { border-style: solid; }
.uchat-page .uchat-chain-head { display: flex; align-items: center; gap: 6px; padding: 5px 10px; cursor: pointer; color: var(--ui-text-muted, #888); font-size: 12px; user-select: none; }
.uchat-page .uchat-chain-head:hover { background: var(--ui-accent-soft, #f0f0f0); }
.uchat-page .uchat-chain-caret { width: 0; height: 0; border-left: 5px solid var(--ui-text-muted, #888); border-top: 4px solid transparent; border-bottom: 4px solid transparent; transition: transform .15s; flex: none; }
.uchat-page .uchat-chain.open .uchat-chain-caret { transform: rotate(90deg); }
.uchat-page .uchat-chain-label { flex: none; background: var(--ui-accent, #333); color: var(--ui-on-accent, #fff); font-size: 11px; padding: 0 6px; border-radius: 2px; letter-spacing: .5px; }
.uchat-page .uchat-chain-state { flex: 1; }
.uchat-page .uchat-chain-body { display: none; padding: 8px 10px; font-size: 13px; line-height: 1.8; color: var(--ui-text-muted, #666); background: var(--ui-accent-soft, #f7f7f7); white-space: pre-wrap; word-break: break-word; }
.uchat-page .uchat-chain.thinking .uchat-chain-body, .uchat-page .uchat-chain.open .uchat-chain-body { display: block; }
`;
    document.head.appendChild(style);
}
export function removeChatStyle() {
    document.getElementById(STYLE_ID)?.remove();
}
