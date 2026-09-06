import { createPanelState, applyList, upsertForm, removeForm, selectForm, setExpand, toggleExpand, toTree } from "./state.js";
import * as api from "./api.js";
import { isGroup, isPlain, isPlaceholder } from "../messages.js";
import { ensureStyle } from "./style.js";
import { el, button } from "./dom.js";
import { openEntryEditor, openGroupCreator, openChildCreator, openChildEditor } from "./sub-modal.js";
import { confirmDialog } from "./confirm.js";
import { openResult } from "./result-modal.js";
import { createLayer, headOf, footOf } from "./layers.js";
import { makeSortable } from "./sortable.js";
export function createPanel(toast) {
    ensureStyle();
    const root = el('div', 'prp');
    let state = createPanelState();
    let rows = [];
    let savingOrder = false; // 保存顺序在途保护
    let activeId = null; // v4.1:使用表单(active form),select 切换/新建时上报
    const toastError = (e) => toast(e?.message || '操作失败');
    // ===== DOM 骨架 =====
    const formBar = el('div', 'prp row-preset');
    const actionsRow = el('div', 'prp row-actions');
    const listBox = el('div', 'prp entry-list');
    const entriesWrap = el('div', 'prp fg');
    entriesWrap.append(listBox);
    const sendBtn = button('prp send-btn', '预览 Prompt', () => void doPreview());
    sendBtn.disabled = true;
    const saveOrderBtn = button('prp save-order-btn', '保存顺序', () => void doSaveOrder());
    saveOrderBtn.disabled = true;
    const beta = el('span', 'prp pid', '测试版');
    const dot = el('span', 'prp status-dot');
    const statusText = el('span', 'prp status-text', '就绪');
    const statusRow = el('div', 'prp status-row');
    statusRow.append(dot, statusText);
    const sendRow = el('div', 'prp row-bottom');
    const leftBox = el('div', 'prp btn-group-left');
    leftBox.append(sendBtn, saveOrderBtn, beta);
    sendRow.append(leftBox, statusRow);
    root.append(formBar, actionsRow, entriesWrap, sendRow);
    const setStatus = (msg, type) => {
        dot.className = 'prp status-dot' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
        statusText.textContent = msg;
        if (type !== 'idle')
            setTimeout(() => { statusText.textContent = '就绪'; }, 3000);
    };
    const current = () => state.forms.find((f) => f.id === state.currentId) ?? null;
    function curId() {
        const cur = current();
        if (!cur)
            throw new Error('请先新建一个表单');
        return cur.id;
    }
    // ===== 排序器(plugin-setting 式绝对定位) =====
    const childSorts = [];
    function destroyChildSorts() {
        for (const s of childSorts)
            s.destroy();
        childSorts.length = 0;
    }
    const topSort = makeSortable({
        container: listBox,
        rowSelector: '.prp.entry-wrap',
        handleSelector: '.prp.entry-head .prp.drag-handle',
        gap: 8,
        onDrop: (items) => {
            const ids = items.map((it) => it.dataset.entryId ?? '').filter((x) => x !== '');
            const cur = state.topOrder;
            if (ids.length !== cur.length)
                return;
            if (ids.join('|') === cur.join('|'))
                return;
            state = { ...state, topOrder: ids, dirtyOrder: true };
            updateSendAndSave();
            setStatus('顺序已调整,点击「保存顺序」提交', 'idle');
        },
    });
    async function refreshAll() {
        const cur = current();
        if (!cur) {
            renderEmpty('暂无表单');
            updateSendAndSave();
            return;
        }
        try {
            rows = await api.listEntries(cur.id);
            // 首次载入或保存成功后,以服务端序重置内存序(仅当无未保存脏序时)
            if (!state.dirtyOrder) {
                const { top } = toTree(rows);
                state = { ...state, topOrder: top.map((e) => e.id), childOrder: childOrderOf(rows) };
            }
            renderList();
        }
        catch (e) {
            renderEmpty('条目加载失败:' + (e?.message ?? e));
        }
        updateSendAndSave();
    }
    function childOrderOf(list) {
        const out = {};
        for (const e of list) {
            if (isGroup(e))
                out[e.id] = [...e.children];
        }
        return out;
    }
    function renderEmpty(msg) {
        destroyChildSorts();
        listBox.innerHTML = '';
        listBox.appendChild(el('div', 'prp empty-state', msg));
        topSort.layout();
    }
    function renderList() {
        destroyChildSorts();
        const { top, childrenByParent } = toTree(rows);
        const byId = new Map(top.map((e) => [e.id, e]));
        listBox.innerHTML = '';
        // 渲染序:内存序(state.topOrder 若与当前顶层 id 集合一致)优先,否则服务端序
        let orderedIds = top.map((e) => e.id);
        const mem = state.topOrder;
        if (mem.length === byId.size && byId.size > 0
            && new Set(mem).size === mem.length && mem.every((id) => byId.has(id))) {
            orderedIds = mem;
        }
        if (orderedIds.length === 0) {
            listBox.appendChild(el('div', 'prp empty-state', '暂无条目'));
            topSort.layout();
            return;
        }
        for (const id of orderedIds) {
            const e = byId.get(id);
            if (!e)
                continue;
            const wrap = renderTopRow(e, childrenByParent);
            listBox.appendChild(wrap);
        }
        // 子列表先布局(绝对定位需显式高度,参与父行 offsetHeight),再布局顶层
        for (const s of childSorts)
            s.layout();
        topSort.layout();
    }
    /** 父条目子序:内存序(state.childOrder[g.id] 与子集合一致)优先,否则服务端 children 序 */
    function orderedChildren(g, childrenByParent) {
        const all = childrenByParent[g.id] ?? [];
        const mem = state.childOrder[g.id];
        if (mem && mem.length === all.length && new Set(mem).size === mem.length
            && mem.every((id) => all.some((c) => c.id === id))) {
            const map = new Map(all.map((c) => [c.id, c]));
            return mem.map((id) => map.get(id)).filter((c) => !!c);
        }
        return all;
    }
    function renderTopRow(e, childrenByParent) {
        const wrap = el('div', 'prp entry-wrap');
        wrap.dataset.entryId = e.id;
        if ((isGroup(e) || isPlain(e)) && e.enabled === false)
            wrap.classList.add('prp-entry-off');
        const head = el('div', 'prp entry-head');
        const handle = el('span', 'prp drag-handle', '⋮⋮');
        handle.title = '拖动排序';
        const group = isGroup(e);
        const children = group ? (childrenByParent[e.id] ?? []) : [];
        const isRegParent = group && children.some(isPlaceholder);
        const role = el('span', 'prp entry-role', isRegParent ? `⛁ ${e.role}` : isGroup(e) ? e.role : isPlain(e) ? e.role : '');
        // 内容列:名称 + 副文本(demo list-item 标题列)
        const content = el('div', 'prp entry-content');
        const name = el('span', 'prp entry-name', e.name);
        name.title = e.name;
        content.append(name);
        if (group) {
            const sub = el('span', 'prp sub-text', `包含 ${children.length} 个子项`);
            content.appendChild(sub);
        }
        const expanded = state.expandedId === e.id;
        const caretBtn = button('prp text-btn', '', () => { if (group)
            void doToggleExpand(e.id); });
        caretBtn.textContent = group ? (expanded ? '收起' : '展开') : '';
        if (!group)
            caretBtn.style.visibility = 'hidden';
        const spacer = el('span', 'prp entry-spacer');
        const editBtn = button('prp text-btn', '编辑', () => {
            if (group) {
                openEntryEditor({
                    title: '编辑父条目', entry: { name: e.name, role: e.role }, withRole: true, withText: false,
                    onSave: async (input) => {
                        if (!input.name) {
                            toast('名称不能为空');
                            throw new Error('名称不能为空');
                        }
                        try {
                            const isRegParent = (childrenByParent[e.id] ?? []).some(isPlaceholder);
                            await api.updateEntry(curId(), e.id, isRegParent ? { role: input.role } : { name: input.name, role: input.role });
                            await refreshAll();
                            toast('已保存');
                        }
                        catch (err) {
                            toastError(err);
                            throw err;
                        }
                    },
                });
            }
            else if (isPlain(e)) {
                openEntryEditor({
                    title: '编辑条目', entry: { name: e.name, role: e.role, text: e.text }, withRole: true, withText: true,
                    onSave: async (input) => {
                        if (!input.name) {
                            toast('名称不能为空');
                            throw new Error('名称不能为空');
                        }
                        try {
                            await api.updateEntry(curId(), e.id, { name: input.name, role: input.role, text: input.text });
                            await refreshAll();
                            toast('已保存');
                        }
                        catch (err) {
                            toastError(err);
                            throw err;
                        }
                    },
                });
            }
        });
        const delBtn = button('prp text-btn danger', '删除', () => {
            const childCount = group ? e.children.length : 0;
            confirmDialog({
                title: group ? '删除父条目' : '删除条目',
                desc: group && childCount > 0
                    ? `确定要删除父条目「${e.name}」及其 ${childCount} 个子条目吗?此操作不可撤销。`
                    : `确定要删除${group ? '父条目' : '条目'}「${e.name}」吗?`,
                onOk: () => {
                    void (async () => {
                        try {
                            await api.deleteEntry(curId(), e.id);
                            await refreshAll();
                            toast('已删除');
                        }
                        catch (err) {
                            toastError(err);
                        }
                    })();
                },
            });
        });
        // 启用开关(v4):switch 外观,P2 起包 label.prp.switch(input + slider);change 语义不变
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'entry-toggle';
        toggle.checked = !((isGroup(e) || isPlain(e)) && e.enabled === false);
        toggle.title = '启用';
        const toggleWrap = document.createElement('label');
        toggleWrap.className = 'prp switch';
        const slider = document.createElement('span');
        slider.className = 'slider';
        toggleWrap.append(toggle, slider);
        toggle.addEventListener('change', () => {
            void (async () => {
                try {
                    await api.updateEntry(curId(), e.id, { enabled: toggle.checked });
                    await refreshAll();
                    toast(toggle.checked ? '已启用' : '已停用');
                }
                catch (err) {
                    toastError(err);
                    toggle.checked = !toggle.checked;
                }
            })();
        });
        head.append(handle, role, content, caretBtn, spacer, toggleWrap, editBtn, delBtn);
        wrap.appendChild(head);
        if (group && expanded) {
            wrap.appendChild(renderDetail(e, childrenByParent));
        }
        return wrap;
    }
    function renderDetail(g, childrenByParent) {
        const children = orderedChildren(g, childrenByParent);
        const detail = el('div', 'prp entry-detail');
        const label = el('label', 'prp detail-label');
        label.textContent = `子条目 · ${children.length} 项`;
        detail.append(label);
        const childList = el('div', 'prp block-list');
        detail.appendChild(childList);
        if (children.length === 0) {
            childList.appendChild(el('div', 'prp block-empty', '暂无子条目'));
        }
        else {
            for (const c of children) {
                const rowEl = renderChildRow(g, c);
                childList.appendChild(rowEl);
            }
            const childSort = makeSortable({
                container: childList,
                rowSelector: '.prp.block-row',
                handleSelector: '.prp.block-row .prp.drag-handle',
                gap: 4,
                onDrop: (items) => {
                    const ids = items.map((it) => it.dataset.blockId ?? '').filter((x) => x !== '');
                    const cur = state.childOrder[g.id] ?? [];
                    if (ids.length !== cur.length)
                        return;
                    if (ids.join('|') === cur.join('|'))
                        return;
                    state = { ...state, childOrder: { ...state.childOrder, [g.id]: ids }, dirtyOrder: true };
                    updateSendAndSave();
                    setStatus('顺序已调整,点击「保存顺序」提交', 'idle');
                },
            });
            childSorts.push(childSort);
        }
        detail.appendChild(button('prp dashed-btn', '新建子条目', () => void doCreateChild(g)));
        return detail;
    }
    function renderChildRow(_g, c) {
        const rowEl = el('div', 'prp block-row');
        rowEl.dataset.blockId = c.id;
        const handle = el('span', 'prp drag-handle', '⋮⋮');
        handle.title = '拖动排序';
        const name = el('span', 'prp entry-name', c.name);
        if (isPlaceholder(c)) {
            // 占位符子条:只读锚点,可拖动,无编辑/删除
            rowEl.classList.add('readonly');
            const pin = el('span', 'prp child-preview', `⛁ ${c.placeholder.name}`);
            rowEl.append(handle, name, pin);
            return rowEl;
        }
        const preview = el('span', 'prp child-preview', c.text.trim() === '' ? '(空)' : c.text);
        preview.title = c.text;
        const editBtn = button('prp text-btn', '编辑', () => {
            openChildEditor({
                entry: { name: c.name, text: c.text },
                onSave: async (input) => {
                    if (!input.name) {
                        toast('名称不能为空');
                        throw new Error('名称不能为空');
                    }
                    try {
                        await api.updateEntry(curId(), c.id, { name: input.name, text: input.text });
                        await refreshAll();
                        toast('已保存');
                    }
                    catch (err) {
                        toastError(err);
                        throw err;
                    }
                },
            });
        });
        const delBtn = button('prp text-btn danger', '删除', () => {
            confirmDialog({
                title: '删除子条目', desc: `确定要删除子条目「${c.name}」吗?`, onOk: () => {
                    void (async () => {
                        try {
                            await api.deleteEntry(curId(), c.id);
                            await refreshAll();
                            toast('已删除');
                        }
                        catch (err) {
                            toastError(err);
                        }
                    })();
                },
            });
        });
        rowEl.append(handle, name, preview, editBtn, delBtn);
        return rowEl;
    }
    async function doSaveOrder() {
        if (savingOrder)
            return;
        const cur = current();
        if (!cur || !state.dirtyOrder)
            return;
        savingOrder = true;
        saveOrderBtn.disabled = true;
        try {
            await api.saveLayout(cur.id, { entries: state.topOrder, children: state.childOrder });
            state = { ...state, dirtyOrder: false };
            await refreshAll();
            toast('已保存顺序');
        }
        catch (e) {
            toastError(e);
            // 回滚:重新拉服务端序
            state = { ...state, dirtyOrder: false };
            await refreshAll();
        }
        finally {
            savingOrder = false;
            updateSendAndSave();
        }
    }
    // ---------- 预览(只拼不发) ----------
    function updateSendAndSave() {
        const cur = current();
        const { childrenByParent } = toTree(rows);
        const hasContent = rows.some((e) => {
            if ((isGroup(e) || isPlain(e)) && e.enabled === false)
                return false;
            if (isGroup(e)) {
                const children = childrenByParent[e.id] ?? [];
                return children.some((c) => c.text.trim() !== '') || children.some(isPlaceholder);
            }
            if (isPlain(e))
                return e.text.trim() !== '';
            return false;
        });
        sendBtn.disabled = !cur || !hasContent;
        saveOrderBtn.disabled = !state.dirtyOrder;
    }
    async function doPreview() {
        const cur = current();
        if (!cur)
            return;
        try {
            const payload = await api.previewPrompt(cur.id);
            openResult('预览结果(注册条目为占位符,未发送)', payload);
            setStatus('预览完成', 'success');
        }
        catch (e) {
            openResult('预览失败', { ok: false, message: e?.message || '预览失败' });
            setStatus('预览失败', 'error');
        }
    }
    /** 打开"添加注册条目"选择弹窗(过滤已在当前表单的) */
    async function doPickRegistered() {
        const cur = current();
        if (!cur)
            return;
        try {
            const list = await api.listRegistered();
            const existing = new Set(rows.filter((e) => isGroup(e)).map((e) => e.id));
            const { modal, close } = createLayer('min(420px,92vw)');
            headOf(modal, '添加注册条目', close);
            const body = el('div', 'prp float-body');
            const pool = list.filter((r) => !existing.has(r.id));
            if (pool.length === 0)
                body.appendChild(el('div', 'prp block-empty', '暂无可添加的注册条目'));
            for (const r of pool) {
                body.appendChild(button('prp dashed-btn', r.name, () => {
                    void (async () => {
                        try {
                            await api.addRegisteredEntry(cur.id, r.id);
                            close();
                            await refreshAll();
                            toast(`已添加「${r.name}」`);
                        }
                        catch (err) {
                            toastError(err);
                        }
                    })();
                }));
            }
            modal.appendChild(body);
            footOf(modal, [{ label: '关闭', variant: 's', onClick: close }]);
        }
        catch (e) {
            toastError(e);
        }
    }
    // ---------- 表单/操作行 ----------
    function renderBar() {
        formBar.innerHTML = '';
        if (state.forms.length === 0) {
            formBar.appendChild(el('span', '', '暂无表单'));
            return;
        }
        const sel = document.createElement('select');
        for (const f of state.forms) {
            const o = document.createElement('option');
            o.value = f.id;
            o.textContent = f.name; // v6:使用中信息移出 option,改由徽标呈现
            if (f.id === state.currentId)
                o.selected = true;
            sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
            state = selectForm(state, sel.value);
            state = { ...state, expandedId: null, dirtyOrder: false, topOrder: [], childOrder: {} };
            void refreshAll();
            renderBar();
            void api.setActiveForm(sel.value).then(() => { activeId = sel.value; renderBar(); }).catch(toastError);
        });
        const cur = current();
        formBar.appendChild(sel);
        if (cur) {
            if (cur.id === activeId)
                formBar.appendChild(el('span', 'prp active-pill', '使用中'));
            formBar.appendChild(el('span', 'prp pid', `${cur.entryCount} 项`));
        }
        formBar.appendChild(button('prp text-btn', '改名', () => startRename()));
        formBar.appendChild(button('prp text-btn', '新建表单', () => void doCreateForm()));
    }
    function startRename() {
        const cur = current();
        if (!cur)
            return;
        formBar.innerHTML = '';
        const input = el('input');
        input.value = cur.name;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')
                void confirmRename(input);
            if (e.key === 'Escape')
                renderBar();
        });
        formBar.append(input, button('prp text-btn', '确定', () => void confirmRename(input)), button('prp text-btn', '取消', () => renderBar()));
        input.focus();
        input.select();
    }
    async function confirmRename(input) {
        const cur = current();
        if (!cur)
            return;
        const name = input.value.trim();
        if (!name) {
            toast('名称不能为空');
            return;
        }
        try {
            await api.renameForm(cur.id, name);
            state = upsertForm(state, { ...cur, name });
            renderBar();
            toast('已更新表单名称');
        }
        catch (e) {
            toastError(e);
        }
    }
    function defaultFormName() {
        const base = '新预设';
        const names = new Set(state.forms.map((f) => f.name));
        let n = 1;
        while (names.has(base + (n > 1 ? ' ' + n : '')))
            n++;
        return n > 1 ? base + ' ' + n : base;
    }
    async function doCreateForm() {
        const name = defaultFormName();
        try {
            const { id } = await api.createForm(name);
            state = selectForm(upsertForm(state, { id, name, entryCount: 0 }), id);
            state = { ...state, expandedId: null, dirtyOrder: false, topOrder: [], childOrder: {} };
            await refreshAll();
            renderBar();
            renderActions();
            toast('已创建新表单');
            void api.setActiveForm(id).then(() => { activeId = id; renderBar(); }).catch(toastError);
        }
        catch (e) {
            toastError(e);
        }
    }
    function renderActions() {
        actionsRow.innerHTML = '';
        const hasForm = state.forms.length > 0;
        const newEntryBtn = button('', '新建条目', () => doCreateEntryWizard());
        const regBtn = button('prp add-reg-btn', '＋ 注册条目', () => void doPickRegistered());
        const deleteFormBtn = button('danger', '删除表单', () => confirmDeleteForm());
        newEntryBtn.disabled = !hasForm;
        regBtn.disabled = !hasForm;
        deleteFormBtn.disabled = !hasForm;
        actionsRow.append(newEntryBtn, regBtn, deleteFormBtn);
    }
    function doCreateEntryWizard() {
        if (!current()) {
            toast('请先新建一个表单');
            return;
        }
        askEntryKind();
    }
    function askEntryKind() {
        const { modal, close } = createLayer('min(380px,90vw)');
        headOf(modal, '新建条目', close);
        const body = el('div', 'prp float-body');
        const plainBtn = document.createElement('button');
        plainBtn.className = 'prp wizard-opt';
        plainBtn.type = 'button';
        plainBtn.textContent = '普通条目';
        plainBtn.addEventListener('click', () => { close(); void createPlainEntry(); });
        const groupBtn = document.createElement('button');
        groupBtn.className = 'prp wizard-opt';
        groupBtn.type = 'button';
        groupBtn.textContent = '父条目';
        groupBtn.addEventListener('click', () => { close(); createGroupEntry(); });
        body.append(plainBtn, groupBtn);
        modal.appendChild(body);
        footOf(modal, [{ label: '取消', variant: 's', onClick: close }]);
        setTimeout(() => plainBtn.focus(), 30);
    }
    async function createPlainEntry() {
        const id = curId();
        try {
            const { entryId } = await api.createEntry(id, { name: '新条目', role: 'user', text: '' });
            await refreshAll();
            const created = rows.find((r) => r.id === entryId);
            if (created && isPlain(created)) {
                openEntryEditor({
                    title: '编辑条目', entry: { name: created.name, role: created.role, text: created.text }, withRole: true, withText: true,
                    onSave: async (input) => {
                        if (!input.name) {
                            toast('名称不能为空');
                            throw new Error('名称不能为空');
                        }
                        try {
                            await api.updateEntry(id, entryId, { name: input.name, role: input.role, text: input.text });
                            await refreshAll();
                            toast('已保存');
                        }
                        catch (err) {
                            toastError(err);
                            throw err;
                        }
                    },
                });
            }
        }
        catch (e) {
            toastError(e);
        }
    }
    function createGroupEntry() {
        const id = curId();
        openGroupCreator({
            title: '新建父条目',
            onSave: async (input) => {
                try {
                    const { entryId } = await api.createEntry(id, { name: input.name, role: input.role, kind: 'group' });
                    state = setExpand(state, entryId);
                    await refreshAll();
                    const addBtn = listBox.querySelector(`.entry-wrap[data-entry-id="${entryId}"] .dashed-btn`);
                    addBtn?.focus();
                    toast('已创建父条目');
                }
                catch (e) {
                    toastError(e);
                }
            },
        });
    }
    async function doCreateChild(g) {
        const id = curId();
        openChildCreator({
            onSave: async (input) => {
                try {
                    await api.createEntry(id, { name: input.name, base: g.id, text: input.text });
                    await refreshAll();
                    toast('已新建子条目');
                }
                catch (e) {
                    toastError(e);
                }
            },
        });
    }
    async function doToggleExpand(entryId) {
        state = toggleExpand(state, entryId);
        renderList();
    }
    function confirmDeleteForm() {
        const cur = current();
        if (!cur)
            return;
        confirmDialog({
            title: '删除表单', desc: `确定要删除表单「${cur.name}」及其所有条目吗?此操作不可撤销。`, onOk: () => {
                void (async () => {
                    try {
                        await api.deleteForm(cur.id);
                        state = removeForm(state, cur.id);
                        state = { ...state, dirtyOrder: false, topOrder: [], childOrder: {} };
                        if (cur.id === activeId)
                            activeId = null; // 后端已联动清空 active,此处仅清前端标注
                        await refreshAll();
                        renderBar();
                        renderActions();
                        toast('已删除表单');
                    }
                    catch (e) {
                        toastError(e);
                    }
                })();
            },
        });
    }
    // ---------- 初始化 ----------
    void (async () => {
        try {
            state = applyList(state, await api.listForms());
            renderBar();
            renderActions();
            await refreshAll();
            try {
                activeId = await api.getActiveForm();
            }
            catch { /* 后端不支持时静默 */ }
            renderBar();
        }
        catch (e) {
            toastError(e);
        }
    })();
    return root;
}
