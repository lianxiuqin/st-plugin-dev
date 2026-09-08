// agent_plugin_dev/ui-chat-plugin/src/registry.ts —— __uiChat__ 注册表纯逻辑(同名覆盖 + priority + 订阅通知)
export type ChatRole = 'ai' | 'user' | 'system'
export interface ChatMessage { id: number; role: ChatRole; content: string; createdAt: string }
export interface ChatPageCtx { active: string | null; reload(): void }
export interface BubbleApi { copy(): void }
export interface ToolApi { reload(): void }
export type ToolScope = 'bubble' | 'session-head' | 'composer'
export type RegionSlot = 'page-head' | 'side' | 'composer-top'
export type RegKind = 'page' | 'bubble' | 'tool' | 'region' | 'transport'

export interface PageItem { name: string; priority: number; render(ctx: ChatPageCtx): HTMLElement | Promise<HTMLElement>; unmount?: () => void }
export interface BubbleItem {
  name: string
  priority: number
  match(role: ChatRole, msg: ChatMessage): boolean
  render(el: HTMLElement, msg: ChatMessage, api: BubbleApi): void | Promise<void>
  unmount?: () => void
}
export interface ToolItem { name: string; scope: ToolScope; priority: number; render(el: HTMLElement, api: ToolApi): void | Promise<void>; unmount?: () => void }
export interface RegionItem { name: string; slot: RegionSlot; priority: number; render(el: HTMLElement): void | Promise<void>; unmount?: () => void }
export interface TransportHooks { onDelta?(delta: string): void; onReasoning?(chunk: string): void }
export interface TransportItem {
  name: string
  priority: number
  match(text: string): boolean
  send(text: string, hooks: TransportHooks): string | Promise<string>
  unmount?: () => void
}

const KIND_OF = { page: 'page', bubble: 'bubble', tool: 'tool', region: 'region' } as const

interface Item { name: string; priority: number; unmount?: () => void }

/** 排序:priority 高者先;同 priority 按注册先后(先注册先生效) */
function byPriority(a: Item & { _seq: number }, b: Item & { _seq: number }): number {
  return b.priority - a.priority || a._seq - b._seq
}

export class ChatRegistry {
  private pages = new Map<string, PageItem & { _seq: number; unmount?: () => void }>()
  private bubbles = new Map<string, BubbleItem & { _seq: number; unmount?: () => void }>()
  private tools = new Map<string, ToolItem & { _seq: number; unmount?: () => void }>()
  private regions = new Map<string, RegionItem & { _seq: number; unmount?: () => void }>()
  private transports = new Map<string, TransportItem & { _seq: number; unmount?: () => void }>()
  private defaultPage = true
  private defaultBubble = true
  private listeners = new Set<() => void>()
  private seq = 0

  private notify(): void {
    for (const fn of [...this.listeners]) fn()
  }

  /** 同名注册:后到覆盖,旧项先 unmount */
  private put<K extends 'page' | 'bubble' | 'tool' | 'region' | 'transport'>(
    kind: K,
    item: { name: string; priority?: number; unmount?: () => void },
    map: Map<string, any>,
  ): void {
    const name = item.name
    const old = map.get(name)
    if (old && old !== item) old.unmount?.()
    map.set(name, { ...item, priority: item.priority ?? 0, _seq: this.seq++ })
    this.notify()
  }

  registerPage(o: { name: string; priority?: number; render(ctx: ChatPageCtx): HTMLElement | Promise<HTMLElement>; unmount?: () => void }): void {
    if (!o.name || typeof o.render !== 'function') throw new Error('ui-chat: 非法 page 注册')
    this.put('page', o, this.pages)
  }
  registerBubble(o: { name: string; priority?: number; match(role: ChatRole, msg: ChatMessage): boolean; render(el: HTMLElement, msg: ChatMessage, api: BubbleApi): void | Promise<void>; unmount?: () => void }): void {
    if (!o.name || typeof o.match !== 'function' || typeof o.render !== 'function') throw new Error('ui-chat: 非法 bubble 注册')
    this.put('bubble', o, this.bubbles)
  }
  registerTool(o: { name: string; scope: ToolScope; priority?: number; render(el: HTMLElement, api: ToolApi): void | Promise<void>; unmount?: () => void }): void {
    if (!o.name || !['bubble', 'session-head', 'composer'].includes(o.scope) || typeof o.render !== 'function') throw new Error('ui-chat: 非法 tool 注册')
    this.put('tool', o, this.tools)
  }
  registerRegion(o: { name: string; slot: RegionSlot; priority?: number; render(el: HTMLElement): void | Promise<void>; unmount?: () => void }): void {
    if (!o.name || !['page-head', 'side', 'composer-top'].includes(o.slot) || typeof o.render !== 'function') throw new Error('ui-chat: 非法 region 注册')
    this.put('region', o, this.regions)
  }
  registerTransport(o: { name: string; priority?: number; match(text: string): boolean; send(text: string, hooks: TransportHooks): string | Promise<string>; unmount?: () => void }): void {
    if (!o.name || typeof o.match !== 'function' || typeof o.send !== 'function') throw new Error('ui-chat: 非法 transport 注册')
    this.put('transport', o, this.transports)
  }

  unregister(kind: RegKind, name: string): void {
    const map = kind === 'page' ? this.pages : kind === 'bubble' ? this.bubbles : kind === 'tool' ? this.tools : kind === 'transport' ? this.transports : this.regions
    const item = map.get(name)
    if (!item) return
    item.unmount?.()
    map.delete(name)
    this.notify()
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  setDefault(kind: 'page' | 'bubble', enabled: boolean): void {
    if (kind === 'page') this.defaultPage = enabled
    else this.defaultBubble = enabled
    this.notify()
  }

  isDefaultEnabled(kind: 'page' | 'bubble'): boolean {
    return kind === 'page' ? this.defaultPage : this.defaultBubble
  }

  /** 生效 page:priority 最高者;无则 null(由装配层决定回退默认) */
  pickPage(): PageItem | null {
    const list = [...this.pages.values()].sort(byPriority)
    return list[0] ?? null
  }
  /** 生效 bubble:遍历已排序列表,返回首个 match 命中;无则 null */
  pickBubble(role: ChatRole, msg: ChatMessage): BubbleItem | null {
    const list = [...this.bubbles.values()].sort(byPriority)
    for (const b of list) {
      try {
        if (b.match(role, msg)) return b
      } catch { /* 单个 match 抛错跳过 */ }
    }
    return null
  }
  /** 生效 transport:priority 降序,首个 match(text) 命中;无则 null(装配层回退默认 fetch transport) */
  pickTransport(text: string): TransportItem | null {
    const list = [...this.transports.values()].sort(byPriority)
    for (const t of list) {
      try {
        if (t.match(text)) return t
      } catch { /* 单个 match 抛错跳过 */ }
    }
    return null
  }
  toolsOf(scope: ToolScope): ToolItem[] {
    return [...this.tools.values()].filter((t) => t.scope === scope).sort(byPriority)
  }
  regionsOf(slot: RegionSlot): RegionItem[] {
    return [...this.regions.values()].filter((r) => r.slot === slot).sort(byPriority)
  }
  // 供测试/调试:注册数量快照
  counts(): Record<RegKind, number> {
    return { page: this.pages.size, bubble: this.bubbles.size, tool: this.tools.size, region: this.regions.size, transport: this.transports.size }
  }
}
