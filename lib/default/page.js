import { injectChatStyle } from "./style.js";
import { createDefaultPanel } from "../assemble.js";
export function createChatPage(reg, deps) {
    injectChatStyle();
    return createDefaultPanel(reg, deps);
}
