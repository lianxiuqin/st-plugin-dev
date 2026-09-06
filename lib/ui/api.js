async function apiFetch(path, init) {
    const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...init });
    let body = null;
    try {
        body = (await res.json());
    }
    catch { /* 非 JSON */ }
    if (!res.ok || !body?.ok)
        throw new Error(body?.message || `HTTP ${res.status}`);
    return body;
}
export function listMessages() {
    return apiFetch('/api/chat/messages').then((r) => r.data);
}
export async function sendText(text) {
    const r = await apiFetch('/api/chat/send', { method: 'POST', body: JSON.stringify({ text }) });
    return r.data.reply;
}
export function getActiveSession() {
    return apiFetch('/api/session/active').then((r) => r.data);
}
