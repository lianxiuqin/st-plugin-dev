import { getPreset, getActivePresetId } from "./db.js";
import { sendChat, sendChatStream } from "./format.js";
const VALID_ROLES = ['system', 'user', 'assistant'];
function assertMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0)
        throw new Error('messages 不能为空数组');
    for (const m of messages) {
        if (!VALID_ROLES.includes(m.role))
            throw new Error(`messages 非法: role 必须是 ${VALID_ROLES.join('/')}`);
        if (typeof m.content !== 'string' || !m.content)
            throw new Error('messages 非法: content 必须为非空字符串');
    }
}
export function createLlmPromptService(dep) {
    const fetchFn = dep.fetchImpl ?? fetch;
    return {
        async send(messages) {
            assertMessages(messages);
            const activeId = getActivePresetId(dep.db);
            if (activeId == null)
                throw new Error('未选择预设,请先在 LLM 面板选择一套预设');
            const p = getPreset(dep.db, activeId);
            if (!p)
                throw new Error('当前激活预设不存在,请在 LLM 面板重新选择');
            const key = (await dep.cred.get(`llm:${activeId}`)) ?? '';
            if (!key)
                throw new Error('当前预设未保存密钥,请重新保存');
            try {
                const { status, json } = await sendChat(p.format, { baseUrl: p.baseUrl, key, model: p.model, messages }, p.timeout, fetchFn);
                if (status < 200 || status >= 300)
                    throw new Error(`HTTP ${status}`);
                return json;
            }
            catch (e) {
                const err = e;
                const isTimeout = (err instanceof DOMException && err.name === 'TimeoutError') || /timeout/i.test(err.message);
                if (isTimeout)
                    throw new Error('请求超时');
                throw new Error('请求失败: ' + err.message);
            }
        },
        async *stream(messages, opts) {
            assertMessages(messages);
            const activeId = getActivePresetId(dep.db);
            if (activeId == null)
                throw new Error('未选择预设,请先在 LLM 面板选择一套预设');
            const p = getPreset(dep.db, activeId);
            if (!p)
                throw new Error('当前激活预设不存在,请在 LLM 面板重新选择');
            const key = (await dep.cred.get(`llm:${activeId}`)) ?? '';
            if (!key)
                throw new Error('当前预设未保存密钥,请重新保存');
            try {
                for await (const delta of sendChatStream(p.format, { baseUrl: p.baseUrl, key, model: p.model, messages }, p.timeout, opts?.signal, fetchFn)) {
                    yield delta;
                }
            }
            catch (e) {
                const err = e;
                if (err.name === 'AbortError')
                    throw err; // 中断原样上抛,不包装(调用方自行处理)
                const isTimeout = (err instanceof DOMException && err.name === 'TimeoutError') || /timeout/i.test(err.message);
                if (isTimeout)
                    throw new Error('请求超时');
                throw new Error('请求失败: ' + err.message);
            }
        },
    };
}
