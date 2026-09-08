export function parseSseLine(line) {
    const s = typeof line === 'string' ? line.trim() : '';
    if (!s.startsWith('data:'))
        return null;
    const payload = s.slice(5).trim();
    if (!payload)
        return null;
    let j;
    try {
        j = JSON.parse(payload);
    }
    catch {
        return null;
    }
    if (j.t === 'r' && typeof j.d === 'string')
        return { t: 'r', d: j.d };
    if (j.t === 'delta' && typeof j.d === 'string')
        return { t: 'delta', d: j.d };
    if (j.t === 'done')
        return { t: 'done' };
    if (j.t === 'error')
        return { t: 'error', message: typeof j.message === 'string' ? j.message : '流式请求失败' };
    return null;
}
