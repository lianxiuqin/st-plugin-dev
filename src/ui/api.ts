// agent_plugin_dev/ui-chat-plugin/src/ui/api.ts —— 聊天页 HTTP api 层(fetch chat-plugin 后端 /api/chat/*,契约不变)
import type { ChatMessage } from '../registry.ts'

export interface ApiResult { ok: boolean; data?: unknown; message?: string }

async function apiFetch(path: string, init?: RequestInit): Promise<ApiResult> {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...init })
  let body: ApiResult | null = null
  try { body = (await res.json()) as ApiResult } catch { /* 非 JSON */ }
  if (!res.ok || !body?.ok) throw new Error(body?.message || `HTTP ${res.status}`)
  return body
}

export function listMessages(): Promise<ChatMessage[]> {
  return apiFetch('/api/chat/messages').then((r) => r.data as ChatMessage[])
}

export async function sendText(text: string): Promise<string> {
  const r = await apiFetch('/api/chat/send', { method: 'POST', body: JSON.stringify({ text }) })
  return (r.data as { reply: string }).reply
}

export function getActiveSession(): Promise<string | null> {
  return apiFetch('/api/session/active').then((r) => r.data as string | null)
}
