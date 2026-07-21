import { AnimatePresence, motion } from 'framer-motion'
import { Crosshair, Radio } from 'lucide-react'
import { GlassCard } from '@/components/glass-card'
import type { Alert } from '@/lib/types'

const SEVERITY_COLOR: Record<Alert['severity'], string> = {
  critical: 'var(--critical)',
  warning: 'var(--amber)',
  info: 'var(--teal)',
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return `${m}m ago`
}

interface AlertsLogProps {
  alerts: Alert[]
  onFocusNode: (nodeId: string) => void
}

export function AlertsLog({ alerts, onFocusNode }: AlertsLogProps) {
  return (
    <GlassCard hoverLift={false} className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Active Alerts</h2>
          <p className="text-xs text-muted-foreground">
            Real-time SSE feed · newest first
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">
          <Radio className="size-3" />
          {alerts.length}
        </span>
      </div>

      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {alerts.map((alert) => {
            const color = SEVERITY_COLOR[alert.severity]
            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                className="rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-1 size-2 shrink-0 rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                        style={{
                          color,
                          background: `color-mix(in srgb, ${color} 14%, transparent)`,
                        }}
                      >
                        {alert.tag}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {timeAgo(alert.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-pretty">
                      {alert.message}
                    </p>
                    {alert.nodeId && (
                      <button
                        type="button"
                        onClick={() => onFocusNode(alert.nodeId!)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-teal/40 hover:text-teal"
                      >
                        <Crosshair className="size-3" />
                        Focus {alert.nodeId}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {alerts.length === 0 && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            Listening for anomalies…
          </div>
        )}
      </div>
    </GlassCard>
  )
}
