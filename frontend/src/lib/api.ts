import type { Trace } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

interface ChatAskResponse {
  answer: string
  retrieved_edges?: unknown[]
  session_id?: string
  mode?: string
}

const RENDER_BACKEND_URL = 'https://smriti-tbxd.onrender.com'
const rawEnvUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const BASE = rawEnvUrl && !rawEnvUrl.includes('vercel.app') ? rawEnvUrl : RENDER_BACKEND_URL

function url(path: string) {
  return BASE.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path)
}

export const api = {
  getTrace: (id: string) =>
    fetch(url(`/api/trace/${encodeURIComponent(id)}`)).then((r) => json<Trace>(r)),

  simulateAnomaly: () =>
    fetch(url('/api/telemetry/simulate'), { method: 'POST' }).then((r) =>
      json<{ ok: boolean; alert: import('./types').Alert }>(r),
    ),

  sendFeedback: (remedyId: string, vote: 'confirm' | 'reject') =>
    fetch(url('/api/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remedyId, vote }),
    }).then((r) => json<{ ok: boolean; remedyId: string; delta: number }>(r)),

  syncVectors: () =>
    fetch(url('/api/vector/sync'), { method: 'POST' }).then((r) =>
      json<{ ok: boolean; embedded: number }>(r),
    ),

  createEquipment: (payload: { id: string; name: string; type?: string; symptom?: string; fix?: string }) =>
    fetch(url('/api/equipment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => json<{ status: string; equipment_id: string; message: string }>(r)),

  /**
   * POST /api/chat/ask — returns JSON payload string with answer, mode, and retrieved edges.
   */
  askChat: async (question: string, equipmentId?: string): Promise<string> => {
    const res = await fetch(url('/api/chat/ask'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, equipmentId }),
    })
    if (!res.ok) throw new Error(`Chat request failed: ${res.status}`)
    const data: ChatAskResponse = await res.json()
    return JSON.stringify({
      answer: data.answer ?? 'No response from the memory index.',
      mode: data.mode ?? 'cloud_rag',
      retrieved_edges: data.retrieved_edges ?? [],
    })
  },

  /**
   * POST /api/chat/vision — returns JSON payload string with vision answer and mode.
   */
  askVision: async (file: File, equipmentId?: string): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    if (equipmentId) form.append('equipment_id', equipmentId)
    const res = await fetch(url('/api/chat/vision'), { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Vision request failed: ${res.status}`)
    const data = await res.json()
    return JSON.stringify({
      answer: data.response ?? 'Could not analyse the image.',
      mode: 'cloud_vision',
    })
  },
}
