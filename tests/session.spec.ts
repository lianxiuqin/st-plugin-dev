// agent_plugin_dev/ui-chat-plugin/tests/session.spec.ts —— 会话切换事件是否应触发主面板重载的决策
import { describe, expect, it } from 'vitest'
import { shouldReloadOnSessionChange } from '../src/assemble.ts'

describe('shouldReloadOnSessionChange 会话联动决策', () => {
  it('active-changed(切换/新建会话)→ true', () => {
    expect(shouldReloadOnSessionChange('active-changed')).toBe(true)
  })
  it('deleted(删除会话)→ true', () => {
    expect(shouldReloadOnSessionChange('deleted')).toBe(true)
  })
  it('message-appended(本面板发送后派发,已自行 reload)→ false,避免重复重载', () => {
    expect(shouldReloadOnSessionChange('message-appended')).toBe(false)
  })
  it('created 与未知 reason → false', () => {
    expect(shouldReloadOnSessionChange('created')).toBe(false)
    expect(shouldReloadOnSessionChange('whatever')).toBe(false)
  })
  it('detail 缺失(undefined)/非字符串 → false', () => {
    expect(shouldReloadOnSessionChange(undefined)).toBe(false)
    expect(shouldReloadOnSessionChange(null)).toBe(false)
    expect(shouldReloadOnSessionChange(42)).toBe(false)
  })
})
