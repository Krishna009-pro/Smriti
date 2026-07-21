import { useCallback, useEffect, useRef, useState } from 'react'
import type { Alert, SseStatus } from '@/lib/types'

const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000]

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export function useSSE(onAlert: (alert: Alert) => void) {
  const [status, setStatus] = useState<SseStatus>('reconnecting')
  const onAlertRef = useRef(onAlert)
  onAlertRef.current = onAlert

  const retryRef = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    setStatus('reconnecting')

    const sseUrl = API_BASE ? `${API_BASE}/api/alerts/stream` : '/api/alerts/stream'
    const es = new EventSource(sseUrl)
    esRef.current = es

    es.addEventListener('hello', () => {
      retryRef.current = 0
      setStatus('live')
    })

    es.addEventListener('alert', (e) => {
      try {
        onAlertRef.current(JSON.parse((e as MessageEvent).data) as Alert)
      } catch {
        // ignore malformed
      }
    })

    es.onerror = () => {
      es.close()
      esRef.current = null

      const attempt = Math.min(retryRef.current, BACKOFF.length - 1)
      const jitter = Math.random() * 400
      const delay = BACKOFF[attempt] + jitter
      retryRef.current += 1

      setStatus(retryRef.current > 3 ? 'offline' : 'reconnecting')
      timerRef.current = setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      esRef.current?.close()
    }
  }, [connect])

  return { status }
}
