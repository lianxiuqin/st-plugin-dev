// agent_plugin_dev/chat-stream-plugin/tests/sse.spec.ts
import { describe, it, expect } from 'vitest'
import { parseSseLine } from '../src/sse.ts'

describe('parseSseLine', () => {
  it('delta / done / error 事件与噪声行', () => {
    expect(parseSseLine('data: {"t":"delta","d":"你"}')).toEqual({ t: 'delta', d: '你' })
    expect(parseSseLine('data: {"t":"done"}')).toEqual({ t: 'done' })
    expect(parseSseLine('data: {"t":"error","message":"请求超时"}')).toEqual({ t: 'error', message: '请求超时' })
    expect(parseSseLine('')).toBeNull()
    expect(parseSseLine('event: x')).toBeNull()
    expect(parseSseLine('data: not-json')).toBeNull()
    expect(parseSseLine('data: {"t":"unknown"}')).toBeNull()
  })
})
