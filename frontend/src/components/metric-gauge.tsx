import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { GlassCard } from '@/components/glass-card'

type GaugeTone = 'teal' | 'amber' | 'critical'

const TONES: Record<GaugeTone, string> = {
  teal: 'var(--teal)',
  amber: 'var(--amber)',
  critical: 'var(--critical)',
}

interface MetricGaugeProps {
  label: string
  value: number
  unit?: string
  max?: number
  tone: GaugeTone
  trend: number
  trendGood: 'up' | 'down'
  caption: string
  delay?: number
}

export function MetricGauge({
  label,
  value,
  unit = '%',
  max = 100,
  tone,
  trend,
  trendGood,
  caption,
  delay = 0,
}: MetricGaugeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const radius = 42
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const color = TONES[tone]

  const trendUp = trend >= 0
  const trendPositive = (trendUp ? 'up' : 'down') === trendGood

  return (
    <GlassCard className="p-5" ref={ref}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-mono text-3xl font-semibold tabular-nums">
              <CountUp to={value} inView={inView} delay={delay} />
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">
              {unit}
            </span>
          </div>

          <div
            className="mt-3 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: trendPositive ? 'var(--emerald)' : 'var(--critical)',
              background: `color-mix(in srgb, ${
                trendPositive ? 'var(--emerald)' : 'var(--critical)'
              } 12%, transparent)`,
            }}
          >
            {trendUp ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {Math.abs(trend)}
            {unit}
          </div>
        </div>

        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="color-mix(in srgb, var(--foreground) 8%, transparent)"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={
                inView
                  ? { strokeDashoffset: circumference * (1 - pct) }
                  : {}
              }
              transition={{ duration: 1.1, delay, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
        </div>
      </div>

      <p className="mt-4 text-xs leading-snug text-muted-foreground">{caption}</p>
    </GlassCard>
  )
}

function CountUp({
  to,
  inView,
  delay,
}: {
  to: number
  inView: boolean
  delay: number
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, to, {
      duration: 1.1,
      delay,
      ease: 'easeOut',
    })
    return controls.stop
  }, [inView, to, delay, count])

  return <motion.span>{rounded}</motion.span>
}
