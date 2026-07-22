import { motion } from 'framer-motion'
import {
  Activity,
  Brain,
  Moon,
  RefreshCw,
  Sun,
  Zap,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { SseStatus } from '@/lib/types'

const STATUS_MAP: Record<
  SseStatus,
  { label: string; color: string; dot: string }
> = {
  live: { label: 'Live', color: 'var(--emerald)', dot: 'bg-emerald' },
  reconnecting: {
    label: 'Reconnecting',
    color: 'var(--amber)',
    dot: 'bg-amber',
  },
  offline: { label: 'Offline', color: 'var(--critical)', dot: 'bg-critical' },
}

interface HeaderProps {
  status: SseStatus
  onSimulate: () => void
  onSync: () => void
  simulating: boolean
  syncing: boolean
}

export function Header({
  status,
  onSimulate,
  onSync,
  simulating,
  syncing,
}: HeaderProps) {
  const s = STATUS_MAP[status]

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-xl border border-teal/30 bg-teal/10 overflow-hidden shadow-sm">
            <img src="/favicon.svg" alt="SMRITI OS Logo" className="size-7 object-contain" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-tight sm:text-base">
              <span className="text-gradient">SMRITI OS</span>
            </h1>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Institutional Memory Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <StatusPill status={status} config={s} />

          <button
            type="button"
            onClick={onSimulate}
            disabled={simulating}
            className="hidden items-center gap-2 rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-xs font-medium text-critical transition-colors hover:bg-critical/20 disabled:opacity-50 sm:inline-flex"
          >
            <Zap className={cn('size-3.5', simulating && 'animate-pulse')} />
            Simulate Anomaly
          </button>

          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(100deg, var(--teal), var(--emerald))',
            }}
          >
            <RefreshCw className={cn('size-3.5', syncing && 'animate-spin')} />
            <span className="hidden sm:inline">Re-run Ingest</span>
            <span className="sm:hidden">Ingest</span>
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function StatusPill({
  status,
  config,
}: {
  status: SseStatus
  config: { label: string; color: string }
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
      style={{
        borderColor: `color-mix(in srgb, ${config.color} 40%, transparent)`,
        background: `color-mix(in srgb, ${config.color} 10%, transparent)`,
        color: config.color,
      }}
    >
      <span className="relative flex size-2">
        {status !== 'offline' && (
          <motion.span
            className="absolute inline-flex size-full rounded-full"
            style={{ background: config.color }}
            animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{ background: config.color }}
        />
      </span>
      <Activity className="hidden size-3 sm:block" />
      {config.label}
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted && !isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  )
}
