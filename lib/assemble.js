import { renderDefaultBubble } from "./default/bubble.js";
function h(tag, cls, text = '') {
    const el = document.createElement(tag);
    if (cls)
        el.className = cls;
    if (text)
        el.textContent = text;
    return el;
}
const bubbleApi = { copy() { } };
const toolApi = { reload() { } };
export function createDefaultPanel(reg, deps) {
    // 样式注入由 createChatPage(default/page.ts)统一负责,panel 不重复注入
    const root = h('div', 'uchat-page');
    // —— head:标题 + session-head tools + page-head regions ——
    const head = h('div', 'uchat-head');
    head.append(h('span', '', '对话'));
    const sessionToolsBox = h('div', 'uchat-tools');
    const headRegionsBox = h('div', 'uchat-head-regions');
    head.append(headRegionsBox, sessionToolsBox);
    // —— body:list + side regions ——
    const body = h('div', 'uchat-body');
    const list = h('div', 'uchat-list');
    const sideBox = h('div', 'uchat-side');
    body.append(list, sideBox);
    // —— composer ——
    const composer = h('div', 'uchat-composer');
    const composerTopBox = h('div', 'uchat-composer-top');
    const ta = document.createElement('textarea');
    ta.placeholder = '输入消息,Enter 发送,Shift+Enter 换行…';
    const sendRow = h('div', 'uchat-send-row');
    const composerToolsBox = h('div', 'uchat-composer-tools');
    const sendBtn = h('button', 'uchat-send', '发送');
    sendRow.append(composerToolsBox, sendBtn);
    composer.append(composerTopBox, ta, sendRow);
    root.append(head, body, composer);
    let disposed = false;
    let sending = false;
    let reloading = null;
    function renderRegions(box, slot) {
        box.textContent = '';
        for (const item of reg.regionsOf(slot)) {
            try {
                item.render(box);
            }
            catch (e) {
                console.error(`[ui-chat] region ${item.name} 渲染失败,已跳过`, e);
            }
        }
    }
    function renderHeadTools() {
        sessionToolsBox.textContent = '';
        for (const item of reg.toolsOf('session-head')) {
            try {
                item.render(sessionToolsBox, toolApi);
            }
            catch (e) {
                console.error(`[ui-chat] tool ${item.name} 渲染失败,已跳过`, e);
            }
        }
    }
    function renderComposerTools() {
        composerToolsBox.textContent = '';
        for (const item of reg.toolsOf('composer')) {
            try {
                item.render(composerToolsBox, toolApi);
            }
            catch (e) {
                console.error(`[ui-chat] tool ${item.name} 渲染失败,已跳过`, e);
            }
        }
    }
    function scrollBottom() { list.scrollTop = list.scrollHeight; }
    function appendEmpty(text) {
        list.textContent = '';
        list.appendChild(h('div', 'uchat-empty', text));
    }
    function appendErrorRow(text) {
        list.textContent = '';
        const row = h('div', 'uchat-row');
        row.classList.add('uchat-error');
        row.textContent = text;
        list.appendChild(row);
    }
    function appendBubble(msg) {
        const row = h('div', 'uchat-row');
        row.classList.add(msg.role === 'user' ? 'user' : 'ai');
        const bubbleBox = h('div', 'uchat-bubble-box');
        const picked = reg.pickBubble(msg.role, msg);
        if (picked) {
            try {
                picked.render(bubbleBox, msg, bubbleApi);
            }
            catch (e) {
                console.error(`[ui-chat] bubble ${picked.name} 渲染失败,回退默认`, e);
                bubbleBox.textContent = '';
                renderDefaultBubble(bubbleBox, msg);
            }
        }
        else if (reg.isDefaultEnabled('bubble')) {
            renderDefaultBubble(bubbleBox, msg);
        }
        else {
            console.warn(`[ui-chat] 无气泡渲染器匹配 role=${msg.role} 且默认已停用,跳过该条`);
            return;
        }
        row.appendChild(bubbleBox);
        const bt = reg.toolsOf('bubble');
        if (bt.length > 0) {
            const toolsRow = h('div', 'uchat-bubble-tools');
            for (const item of bt) {
                try {
                    item.render(toolsRow, toolApi);
                }
                catch (e) {
                    console.error(`[ui-chat] tool ${item.name} 渲染失败,已跳过`, e);
                }
            }
            row.appendChild(toolsRow);
        }
        list.appendChild(row);
    }
    async function reload() {
        if (disposed || reloading) {
            if (reloading)
                return reloading;
            return;
        }
        const taValue = ta.value;
        reloading = (async () => {
            renderHeadTools();
            renderRegions(headRegionsBox, 'page-head');
            renderRegions(sideBox, 'side');
            sideBox.style.display = reg.regionsOf('side').length > 0 ? '' : 'none';
            renderComposerTools();
            renderRegions(composerTopBox, 'composer-top');
            try {
                const active = await deps.getActive();
                if (!active) {
                    appendEmpty('点击右侧 ＋ 新建会话');
                    return;
                }
                const rows = await deps.getMessages();
                list.textContent = '';
                if (rows.length === 0) {
                    appendEmpty('开始第一段对话吧');
                    return;
                }
                for (const m of rows)
                    appendBubble(m);
                scrollBottom();
            }
            catch (e) {
                appendErrorRow(e.message || '历史加载失败');
            }
            finally {
                ta.value = taValue;
            }
        })();
        try {
            await reloading;
        }
        finally {
            reloading = null;
        }
    }
    function doSend() {
        if (sending)
            return;
        const text = ta.value;
        if (!text.trim())
            return;
        const row = h('div', 'uchat-row user');
        const box = h('div', 'uchat-bubble-box');
        renderDefaultBubble(box, { id: 0, role: 'user', content: text, createdAt: '' });
        row.appendChild(box);
        list.appendChild(row);
        ta.value = '';
        sending = true;
        sendBtn.disabled = true;
        sendBtn.textContent = '发送中…';
        deps.send(text.trim())
            .then(async () => {
            await reload();
            deps.onSessionChanged?.('message-appended');
        })
            .catch((e) => {
            appendErrorRow(e.message || '发送失败');
        })
            .finally(() => {
            sending = false;
            sendBtn.disabled = false;
            sendBtn.textContent = '发送';
            ta.focus();
        });
    }
    ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            doSend();
        }
    });
    sendBtn.addEventListener('click', doSend);
    toolApi.reload = () => { void reload(); };
    const unsub = reg.subscribe(() => { void reload(); });
    // 右侧会话栏切换/删除会话(st:session-changed)联动:主面板跟随重载,
    // 否则需手动刷新页面才能看到其它会话(旧 chat-plugin web.tsx 的联动在解耦时遗漏,此处补回)
    const onSessionChanged = (e) => {
        const reason = e.detail?.reason;
        if (shouldReloadOnSessionChange(reason))
            void reload();
    };
    window.addEventListener('st:session-changed', onSessionChanged);
    void reload();
    return {
        el: root,
        reload,
        dispose() {
            disposed = true;
            unsub();
            window.removeEventListener('st:session-changed', onSessionChanged);
            root.remove();
        },
    };
}
/** 纯决策:会话切换/删除事件(st:session-changed)是否应触发主面板重载;
 * 与旧 chat-plugin 前端行为一致 —— 仅 active-changed(切换/新建)/deleted 才重载,
 * message-appended 由发送方自行 reload 后派发,不再重复重载 */
export function shouldReloadOnSessionChange(reason) {
    return reason === 'active-changed' || reason === 'deleted';
}
/** 纯决策:单条消息行由谁渲染(default/custom/skip)——供测试与装配复用 */
export function planRow(reg, role, msg) {
    const picked = reg.pickBubble(role, msg);
    if (picked)
        return { kind: 'custom', name: picked.name };
    if (reg.isDefaultEnabled('bubble'))
        return { kind: 'default' };
    return { kind: 'skip' };
}
