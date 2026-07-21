import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  FileText,
  MessageSquare,
  Waypoints,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { GlassCard } from '@/components/glass-card'
import { cn } from '@/lib/utils'
import type { Remedy, SourceType } from '@/lib/types'

const SOURCE_META: Record<
  SourceType,
  { label: string; icon: typeof FileText }
> = {
  shift_note: { label: 'Shift Note', icon: MessageSquare },
  pid: { label: 'P&ID', icon: Waypoints },
  feedback: { label: 'Feedback', icon: FileText },
}

function confidenceTone(c: number) {
  if (c >= 0.7) return { color: 'var(--emerald)', label: 'High' }
  if (c >= 0.4) return { color: 'var(--amber)', label: 'Medium' }
  return { color: 'var(--critical)', label: 'Low' }
}

interface RemediesPanelProps {
  remedies: Remedy[]
  selectedNode: string | null
  onVote: (remedyId: string, vote: 'confirm' | 'reject') => void
}

export function RemediesPanel({
  remedies,
  selectedNode,
  onVote,
}: RemediesPanelProps) {
  const visible = selectedNode
    ? remedies.filter((r) => r.nodeId === selectedNode)
    : remedies

  return (
    <GlassCard hoverLift={false} className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Remedy Diagnostics</h2>
          <p className="text-xs text-muted-foreground">
            {selectedNode ? (
              <>
                Ranked fixes for{' '}
                <span className="font-mono text-teal">{selectedNode}</span>
              </>
            ) : (
              'Select a node to focus'
            )}
          </p>
        </div>
        <span className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 font-mono text-xs">
          {visible.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {visible.map((remedy, i) => (
            <RemedyCard
              key={remedy.id}
              remedy={remedy}
              delay={i * 0.06}
              onVote={onVote}
            />
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            No remedies captured for this node yet.
          </div>
        )}
      </div>
    </GlassCard>
  )
}

function RemedyCard({
  remedy,
  delay,
  onVote,
}: {
  remedy: Remedy
  delay: number
  onVote: (remedyId: string, vote: 'confirm' | 'reject') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const tone = confidenceTone(remedy.confidence)
  const source = SOURCE_META[remedy.source]
  const SourceIcon = source.icon
  const pct = Math.round(remedy.confidence * 100)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'rounded-xl border border-border bg-secondary/30 p-4 transition-colors',
        remedy.status === 'confirmed' && 'border-emerald/40 bg-emerald/5',
        remedy.status === 'rejected' && 'opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-snug text-pretty">{remedy.symptom}</p>
        <div
          className="flex shrink-0 flex-col items-center rounded-lg px-2 py-1"
          style={{
            background: `color-mix(in srgb, ${tone.color} 14%, transparent)`,
            color: tone.color,
          }}
        >
          <span className="font-mono text-sm font-semibold leading-none">
            {pct}%
          </span>
          <span className="text-[9px] uppercase tracking-wide">
            {tone.label}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        {remedy.action}
      </p>

      {/* Confidence bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60">
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <SourceIcon className="size-3" />
          {source.label}
          <ChevronDown
            className={cn(
              'size-3 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Confirm remedy"
            onClick={() => onVote(remedy.id, 'confirm')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
              remedy.status === 'confirmed'
                ? 'border-emerald/50 bg-emerald/15 text-emerald'
                : 'border-border text-muted-foreground hover:border-emerald/40 hover:text-emerald',
            )}
          >
            <Check className="size-3" />
            Confirm
          </button>
          <button
            type="button"
            aria-label="Reject remedy"
            onClick={() => onVote(remedy.id, 'reject')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
              remedy.status === 'rejected'
                ? 'border-critical/50 bg-critical/15 text-critical'
                : 'border-border text-muted-foreground hover:border-critical/40 hover:text-critical',
            )}
          >
            <X className="size-3" />
            Reject
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="mt-3 rounded-lg border-l-2 border-teal/50 bg-background/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
              {remedy.sourceExcerpt}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
