const PREFIX = '/api/chat-stream/';
function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => resolve(raw));
    });
}
export function registerRoutes(register, dep) {
    const disposers = [];
    disposers.push(register({
        kind: 'prefix', path: PREFIX,
        handler: async (req, res) => {
            try {
                const url = (req.url ?? '/').split('?')[0];
                const rest = url.startsWith(PREFIX) ? url.slice(PREFIX.length) : '';
                const seg = rest.split('/').filter((s) => s !== '');
                if (seg.length !== 1 || seg[0] !== 'send' || (req.method ?? 'GET') !== 'POST') {
                    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ ok: false, message: '接口不存在' }));
                    return;
                }
                const raw = await readBody(req);
                let text = '';
                try {
                    text = String(JSON.parse(raw || '{}').text ?? '');
                }
                catch { /* 走 stream 的 400 文案 */ }
                res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' });
                const ac = new AbortController();
                req.on('close', () => ac.abort());
                try {
                    for await (const d of dep.streamer.stream(text, { signal: ac.signal })) {
                        if (res.writableEnded)
                            return;
                        res.write(`data: ${JSON.stringify({ t: 'delta', d })}\n\n`);
                    }
                    if (!res.writableEnded)
                        res.write('data: {"t":"done"}\n\n');
                }
                catch (e) {
                    if (res.writableEnded)
                        return;
                    res.write(`data: ${JSON.stringify({ t: 'error', message: e?.message || '流式请求失败' })}\n\n`);
                }
                finally {
                    res.end();
                }
            }
            catch (e) {
                res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, message: e?.message || '服务器错误' }));
            }
        },
    }));
    return () => { for (const d of disposers)
        d(); };
}
