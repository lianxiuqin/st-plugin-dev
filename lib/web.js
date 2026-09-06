import { createPanel } from "./ui/panel.js";
let navTimer;
const webPlugin = {
    name: 'prompt',
    mount() {
        if (navTimer) {
            clearInterval(navTimer);
            navTimer = undefined;
        }
        const tryRegister = () => {
            const slots = window.__uiSlots__;
            const tools = window.__uiTools__;
            if (!slots || !tools)
                return false;
            slots.register('nav', {
                name: 'prompt',
                render(el) {
                    const btn = document.createElement('button');
                    btn.textContent = 'prompt';
                    btn.style.cssText = 'border-radius:16px;padding:0 14px;font-size:12px;font-weight:600;color:var(--ui-text,#444444);background:var(--ui-surface,#ffffff);border:1px solid var(--ui-border,#e0e0e0);cursor:pointer;height:30px;';
                    btn.addEventListener('click', () => {
                        tools.pluginModal({
                            title: 'Prompt 预设',
                            source: 'prompt',
                            width: 800,
                            content: (c) => { c.appendChild(createPanel((m) => tools.toast(m))); },
                        });
                    });
                    el.appendChild(btn);
                },
            });
            return true;
        };
        if (tryRegister())
            return;
        navTimer = setInterval(() => { if (tryRegister()) {
            clearInterval(navTimer);
            navTimer = undefined;
        } }, 200);
    },
    unmount() {
        if (navTimer) {
            clearInterval(navTimer);
            navTimer = undefined;
        }
        const slots = window.__uiSlots__;
        slots?.unregister('nav', 'prompt');
    },
};
export default webPlugin;
