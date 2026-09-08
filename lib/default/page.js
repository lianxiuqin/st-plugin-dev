import { injectChatStyle } from "./style.js";
import { createDefaultPanel } from "../assemble.js";
function isElement(v) {
    return typeof HTMLElement !== 'undefined' && v instanceof HTMLElement;
}
export function createChatPage(reg, deps) {
    injectChatStyle();
    const picked = reg.pickPage();
    if (!picked)
        return createDefaultPanel(reg, deps);
    try {
        const out = picked.render({ active: null, reload() { void deps.getActive().then(() => { }); } });
        if (isElement(out)) {
            return {
                el: out,
                reload: () => deps.getActive().then(() => { }),
                dispose() { picked.unmount?.(); },
            };
        }
        // 异步 page:el 暂为占位,whenReady 就绪后由 boot 层替换 append
        const ready = Promise.resolve(out);
        const handle = {
            el: document.createElement('div'),
            reload: () => deps.getActive().then(() => { }),
            dispose() { picked.unmount?.(); handle.disposed = true; },
            whenReady: ready,
        };
        return handle;
    }
    catch (e) {
        console.error(`[ui-chat] page ${picked.name} 渲染失败,回退默认页`, e);
        return createDefaultPanel(reg, deps);
    }
}
