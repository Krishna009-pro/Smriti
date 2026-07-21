import type { Trace } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  getTrace: (id: string) =>
    fetch(`/api/trace/${encodeURIComponent(id)}`).then((r) => json<Trace>(r)),

  simulateAnomaly: () =>
    fetch('/api/telemetry/simulate', { method: 'POST' }).then((r) =>
      json<{ ok: boolean; alert: import('./types').Alert }>(r),
    ),

  sendFeedback: (remedyId: string, vote: 'confirm' | 'reject') =>
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remedyId, vote }),
    }).then((r) => json<{ ok: boolean; remedyId: string; delta: number }>(r)),

  syncVectors: () =>
    fetch('/api/vector/sync', { method: 'POST' }).then((r) =>
      json<{ ok: boolean; embedded: number }>(r),
    ),

  askChat: (question: string, equipmentId?: string) =>
    fetch('/api/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, equipmentId }),
    }),
}
