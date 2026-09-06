export function renderDefaultBubble(el, msg) {
    el.className = 'uchat-bubble';
    el.dataset.role = msg.role;
    el.textContent = msg.content;
}
