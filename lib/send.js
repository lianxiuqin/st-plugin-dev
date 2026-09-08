import { extractAssistant } from "./extract.js";
export async function sendMessage(dep, text) {
    const t = typeof text === 'string' ? text.trim() : '';
    if (t === '')
        throw new Error('消息内容不能为空');
    const { session, chaining, llm, pending } = dep;
    pending.set(t);
    try {
        const sid = await session.getActive();
        if (!sid)
            throw new Error('请先在右侧新建或选择会话');
        const fid = await chaining.active();
        if (!fid)
            throw new Error('未选择使用表单,请先在 Prompt 面板停留选择一张表单');
        const hasH = await chaining.hasRegistered(fid, 'history');
        const hasI = await chaining.hasRegistered(fid, 'input');
        if (!hasH || !hasI) {
            throw new Error('使用表单缺少动态注入条目(history/input),请先在 Prompt 面板为表单添加注册条目');
        }
        const messages = await chaining.build(fid);
        const json = await llm.send(messages);
        const reply = extractAssistant(json);
        await session.append('user', t);
        await session.append('assistant', reply);
        return reply;
    }
    finally {
        pending.set(null);
    }
}
/** 流式发送:编排同 sendMessage,逐块产出增量;完整收流且非空才落库(整轮语义),提前退出/失败不落 */
export async function* streamMessage(dep, text, opts) {
    const t = typeof text === 'string' ? text.trim() : '';
    if (t === '')
        throw new Error('消息内容不能为空');
    const { session, chaining, llm, pending } = dep;
    pending.set(t);
    try {
        const sid = await session.getActive();
        if (!sid)
            throw new Error('请先在右侧新建或选择会话');
        const fid = await chaining.active();
        if (!fid)
            throw new Error('未选择使用表单,请先在 Prompt 面板停留选择一张表单');
        const hasH = await chaining.hasRegistered(fid, 'history');
        const hasI = await chaining.hasRegistered(fid, 'input');
        if (!hasH || !hasI) {
            throw new Error('使用表单缺少动态注入条目(history/input),请先在 Prompt 面板为表单添加注册条目');
        }
        const messages = await chaining.build(fid);
        let full = '';
        for await (const delta of llm.stream(messages, opts)) {
            full += delta;
            yield delta;
        }
        if (full === '')
            throw new Error('无法解析模型回复');
        await session.append('user', t);
        await session.append('assistant', full);
    }
    finally {
        pending.set(null);
    }
}
