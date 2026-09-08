// agent_plugin_dev/ui-chat-plugin/src/boot.ts —— window.__uiChat__ 桥 + main 插槽挂载
import { ChatRegistry } from "./registry.js";
import * as api from "./ui/api.js";
import { createChatPage } from "./default/page.js";
export function mountChatPlugin() {
    const reg = new ChatRegistry();
    const uiChat = {
        registerPage: (o) => reg.registerPage(o),
        registerBubble: (o) => reg.registerBubble(o),
        registerTool: (o) => reg.registerTool(o),
        registerRegion: (o) => reg.registerRegion(o),
        registerTransport: (o) => reg.registerTransport(o),
        unregister: (kind, name) => reg.unregister(kind, name),
        subscribe: (fn) => reg.subscribe(fn),
        setDefault: (kind, enabled) => reg.setDefault(kind, enabled),
        isDefaultEnabled: (kind) => reg.isDefaultEnabled(kind),
    };
    window.__uiChat__ = uiChat;
    const deps = {
        api,
        getActive: () => api.getActiveSession(),
        getMessages: () => api.listMessages(),
        send: (text) => api.sendText(text),
        onSessionChanged: (reason) => {
            window.dispatchEvent(new CustomEvent('st:session-changed', { detail: { reason } }));
        },
    };
    let handle = null;
    let timer;
    const tryMount = () => {
        const slots = window.__uiSlots__;
        if (!slots)
            return false;
        slots.register('main', {
            name: 'chat',
            render(el) {
                handle?.dispose();
                handle = createChatPage(reg, deps);
                const node = handle.whenReady ?? Promise.resolve(handle.el);
                node.then((n) => { if (handle && !handle.disposed)
                    el.appendChild(n); });
            },
        });
        return true;
    };
    if (!tryMount()) {
        timer = setInterval(() => { if (tryMount()) {
            clearInterval(timer);
            timer = undefined;
        } }, 200);
    }
    return {
        dispose() {
            if (timer) {
                clearInterval(timer);
                timer = undefined;
            }
            handle?.dispose();
            handle = null;
            delete window.__uiChat__;
        },
    };
}
