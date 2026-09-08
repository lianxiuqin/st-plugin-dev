// agent_plugin_dev/chat-plugin/src/extract.ts —— 三格式模型回复抽取(openai_compatible/anthropic/google)
export function extractAssistant(json) {
    const j = json;
    if (j && Array.isArray(j.choices) && j.choices[0]) {
        const msg = j.choices[0].message;
        if (msg && typeof msg.content === 'string')
            return msg.content;
    }
    if (j && Array.isArray(j.content) && j.content[0]) {
        const t = j.content[0].text;
        if (typeof t === 'string')
            return t;
    }
    if (j && Array.isArray(j.candidates) && j.candidates[0]) {
        const content = j.candidates[0].content;
        if (content && Array.isArray(content.parts)) {
            const text = content.parts.filter((p) => p?.thought !== true).map((p) => (p && typeof p.text === 'string' ? p.text : '')).join('');
            if (text !== '')
                return text;
        }
    }
    throw new Error('无法解析模型回复');
}
/** 整回响应里的思维链文本;无则 null。openai: message.reasoning_content/reasoning;google: thought parts;anthropic: 无 */
export function extractReasoning(json) {
    const j = json;
    if (j && Array.isArray(j.choices) && j.choices[0]) {
        const msg = j.choices[0].message;
        const r = msg?.reasoning_content ?? msg?.reasoning;
        if (typeof r === 'string' && r !== '')
            return r;
    }
    if (j && Array.isArray(j.candidates) && j.candidates[0]) {
        const content = j.candidates[0].content;
        if (content && Array.isArray(content.parts)) {
            const r = content.parts.filter((p) => p?.thought === true).map((p) => (typeof p?.text === 'string' ? p.text : '')).join('');
            if (r !== '')
                return r;
        }
    }
    return null;
}
