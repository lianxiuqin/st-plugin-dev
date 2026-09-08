const KIND_OF = { page: 'page', bubble: 'bubble', tool: 'tool', region: 'region' };
/** 排序:priority 高者先;同 priority 按注册先后(先注册先生效) */
function byPriority(a, b) {
    return b.priority - a.priority || a._seq - b._seq;
}
export class ChatRegistry {
    pages = new Map();
    bubbles = new Map();
    tools = new Map();
    regions = new Map();
    transports = new Map();
    defaultPage = true;
    defaultBubble = true;
    listeners = new Set();
    seq = 0;
    notify() {
        for (const fn of [...this.listeners])
            fn();
    }
    /** 同名注册:后到覆盖,旧项先 unmount */
    put(kind, item, map) {
        const name = item.name;
        const old = map.get(name);
        if (old && old !== item)
            old.unmount?.();
        map.set(name, { ...item, priority: item.priority ?? 0, _seq: this.seq++ });
        this.notify();
    }
    registerPage(o) {
        if (!o.name || typeof o.render !== 'function')
            throw new Error('ui-chat: 非法 page 注册');
        this.put('page', o, this.pages);
    }
    registerBubble(o) {
        if (!o.name || typeof o.match !== 'function' || typeof o.render !== 'function')
            throw new Error('ui-chat: 非法 bubble 注册');
        this.put('bubble', o, this.bubbles);
    }
    registerTool(o) {
        if (!o.name || !['bubble', 'session-head', 'composer'].includes(o.scope) || typeof o.render !== 'function')
            throw new Error('ui-chat: 非法 tool 注册');
        this.put('tool', o, this.tools);
    }
    registerRegion(o) {
        if (!o.name || !['page-head', 'side', 'composer-top'].includes(o.slot) || typeof o.render !== 'function')
            throw new Error('ui-chat: 非法 region 注册');
        this.put('region', o, this.regions);
    }
    registerTransport(o) {
        if (!o.name || typeof o.match !== 'function' || typeof o.send !== 'function')
            throw new Error('ui-chat: 非法 transport 注册');
        this.put('transport', o, this.transports);
    }
    unregister(kind, name) {
        const map = kind === 'page' ? this.pages : kind === 'bubble' ? this.bubbles : kind === 'tool' ? this.tools : kind === 'transport' ? this.transports : this.regions;
        const item = map.get(name);
        if (!item)
            return;
        item.unmount?.();
        map.delete(name);
        this.notify();
    }
    subscribe(fn) {
        this.listeners.add(fn);
        return () => { this.listeners.delete(fn); };
    }
    setDefault(kind, enabled) {
        if (kind === 'page')
            this.defaultPage = enabled;
        else
            this.defaultBubble = enabled;
        this.notify();
    }
    isDefaultEnabled(kind) {
        return kind === 'page' ? this.defaultPage : this.defaultBubble;
    }
    /** 生效 page:priority 最高者;无则 null(由装配层决定回退默认) */
    pickPage() {
        const list = [...this.pages.values()].sort(byPriority);
        return list[0] ?? null;
    }
    /** 生效 bubble:遍历已排序列表,返回首个 match 命中;无则 null */
    pickBubble(role, msg) {
        const list = [...this.bubbles.values()].sort(byPriority);
        for (const b of list) {
            try {
                if (b.match(role, msg))
                    return b;
            }
            catch { /* 单个 match 抛错跳过 */ }
        }
        return null;
    }
    /** 生效 transport:priority 降序,首个 match(text) 命中;无则 null(装配层回退默认 fetch transport) */
    pickTransport(text) {
        const list = [...this.transports.values()].sort(byPriority);
        for (const t of list) {
            try {
                if (t.match(text))
                    return t;
            }
            catch { /* 单个 match 抛错跳过 */ }
        }
        return null;
    }
    toolsOf(scope) {
        return [...this.tools.values()].filter((t) => t.scope === scope).sort(byPriority);
    }
    regionsOf(slot) {
        return [...this.regions.values()].filter((r) => r.slot === slot).sort(byPriority);
    }
    // 供测试/调试:注册数量快照
    counts() {
        return { page: this.pages.size, bubble: this.bubbles.size, tool: this.tools.size, region: this.regions.size, transport: this.transports.size };
    }
}
