export const PROVIDER_BASE_URLS = {
    openai: 'api.openai.com/v1',
    deepseek: 'api.deepseek.com/v1',
    zhipu: 'open.bigmodel.cn/api/paas/v4',
    qwen: 'dashscope.aliyuncs.com/compatible-mode/v1',
    anthropic: 'api.anthropic.com/v1',
    google: 'generativelanguage.googleapis.com/v1beta',
};
export const PROVIDER_FORMATS = {
    openai: 'openai_compatible',
    deepseek: 'openai_compatible',
    zhipu: 'openai_compatible',
    qwen: 'openai_compatible',
    anthropic: 'anthropic',
    google: 'google',
};
export function normalizeBase(url) {
    return url.replace(/\/+$/, '');
}
function withProtocol(base) {
    return /^https?:\/\//i.test(base) ? base : `https://${base}`;
}
export function buildModelRequest(format, baseUrl, key) {
    const base = withProtocol(normalizeBase(baseUrl));
    if (format === 'anthropic') {
        return { method: 'GET', url: `${base}/models`, headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } };
    }
    if (format === 'google') {
        return { method: 'GET', url: `${base}/models?key=${encodeURIComponent(key)}`, headers: {} };
    }
    return { method: 'GET', url: `${base}/models`, headers: { Authorization: `Bearer ${key}` } };
}
export function parseModelList(format, json) {
    const j = json;
    if (!j)
        return [];
    if (format === 'google') {
        const rows = (j.models ?? []);
        return rows.map((m) => String(m.name ?? '').replace(/^models\//, '')).filter(Boolean);
    }
    const rows = (j.data ?? []);
    return rows.map((m) => String(m.id ?? '')).filter(Boolean);
}
export function buildTestRequest(format, opts) {
    const base = withProtocol(normalizeBase(opts.baseUrl));
    if (format === 'anthropic') {
        return {
            method: 'POST',
            url: `${base}/messages`,
            headers: { 'x-api-key': opts.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model: opts.model, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] }),
        };
    }
    if (format === 'google') {
        const body = JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] });
        return {
            method: 'POST',
            url: `${base}/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
            headers: { 'content-type': 'application/json' },
            body,
        };
    }
    return {
        method: 'POST',
        url: `${base}/chat/completions`,
        headers: { Authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: opts.model, messages: [{ role: 'user', content: 'ping' }] }),
    };
}
export async function sendJson(req, timeout, fetchImpl = fetch) {
    const res = await fetchImpl(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: AbortSignal.timeout(timeout * 1000),
    });
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        json = null;
    }
    return { status: res.status, json };
}
export function isOk(format, json) {
    const j = json;
    if (!j)
        return false;
    if (format === 'google')
        return Array.isArray(j.candidates) && j.candidates.length > 0;
    if (format === 'anthropic')
        return Array.isArray(j.content) && j.content.length > 0;
    return Array.isArray(j.choices) && j.choices.length > 0;
}
export async function sendChat(format, opts, timeout, fetchImpl = fetch) {
    const base = withProtocol(normalizeBase(opts.baseUrl));
    if (opts.messages.length === 0)
        throw new Error('messages 不能为空');
    if (format === 'anthropic') {
        return sendJson({
            method: 'POST',
            url: `${base}/messages`,
            headers: { 'x-api-key': opts.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model: opts.model, max_tokens: 8, messages: opts.messages }),
        }, timeout, fetchImpl);
    }
    if (format === 'google') {
        const contents = opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        return sendJson({
            method: 'POST',
            url: `${base}/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ contents }),
        }, timeout, fetchImpl);
    }
    return sendJson({
        method: 'POST',
        url: `${base}/chat/completions`,
        headers: { Authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: opts.model, messages: opts.messages }),
    }, timeout, fetchImpl);
}
function pickPart(parts, thought) {
    return parts
        .filter((p) => (thought ? p.thought === true : p.thought !== true))
        .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
        .join('');
}
export function parseDeltaLine(format, line) {
    const s = typeof line === 'string' ? line.trim() : '';
    if (!s.startsWith('data:'))
        return null;
    const payload = s.slice(5).trim();
    if (!payload || payload === '[DONE]')
        return null;
    let j;
    try {
        j = JSON.parse(payload);
    }
    catch {
        return null;
    }
    if (format === 'anthropic') {
        if (j.type !== 'content_block_delta')
            return null;
        const delta = j.delta;
        if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string' && delta.thinking !== '')
            return { r: delta.thinking };
        if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text !== '')
            return { t: delta.text };
        return null;
    }
    if (format === 'google') {
        const cands = j.candidates;
        const parts = cands?.[0]?.content?.parts;
        if (!Array.isArray(parts) || parts.length === 0)
            return null;
        const r = pickPart(parts, true);
        if (r !== '')
            return { r };
        const t = pickPart(parts, false);
        return t === '' ? null : { t };
    }
    const delta = j.choices?.[0]?.delta;
    if (delta) {
        const rc = delta.reasoning_content ?? delta.reasoning;
        if (typeof rc === 'string' && rc !== '')
            return { r: rc };
        if (typeof delta.content === 'string' && delta.content !== '')
            return { t: delta.content };
    }
    return null;
}
/**
 * 流式聊天请求:async generator,逐块产出增量文本。
 * signal 由调用方传入(req close / 用户停止);abort 时 reader.read() 抛 AbortError 上抛。
 * 非 2xx 抛 `HTTP <status>`(由 service 包装成中文)。
 */
export async function* sendChatStream(format, opts, _timeout, signal, fetchImpl = fetch) {
    const base = withProtocol(normalizeBase(opts.baseUrl));
    if (opts.messages.length === 0)
        throw new Error('messages 不能为空');
    let url;
    let headers;
    let body;
    if (format === 'anthropic') {
        url = `${base}/messages`;
        headers = { 'x-api-key': opts.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
        // max_tokens 与现有 sendChat 保持一致(历史值,非本次范围)
        body = JSON.stringify({ model: opts.model, max_tokens: 8, stream: true, messages: opts.messages });
    }
    else if (format === 'google') {
        const contents = opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        url = `${base}/models/${encodeURIComponent(opts.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(opts.key)}`;
        headers = { 'content-type': 'application/json' };
        body = JSON.stringify({ contents });
    }
    else {
        url = `${base}/chat/completions`;
        headers = { Authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' };
        body = JSON.stringify({ model: opts.model, messages: opts.messages, stream: true });
    }
    const res = await fetchImpl(url, { method: 'POST', headers, body, signal });
    if (res.status < 200 || res.status >= 300)
        throw new Error(`HTTP ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader)
        throw new Error('无响应流');
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            // EOF flush:末行可能无 \n 结尾(测试/部分实现边界)
            const delta = parseDeltaLine(format, buf);
            if (delta)
                yield delta;
            break;
        }
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            const delta = parseDeltaLine(format, line);
            if (delta)
                yield delta;
        }
    }
}
