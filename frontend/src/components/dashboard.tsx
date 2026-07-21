import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AlertsLog } from '@/components/alerts-log'
import { Copilot } from '@/components/copilot'
import { DashboardBackground } from '@/components/dashboard-background'
import { Header } from '@/components/header'
import { IngestionHub } from '@/components/ingestion-hub'
import { MetricGauge } from '@/components/metric-gauge'
import { RemediesPanel } from '@/components/remedies-panel'
import { TopologyGraph } from '@/components/topology-graph'
import { useToast } from '@/components/toast'
import { useSSE } from '@/hooks/use-sse'
import { api } from '@/lib/api'
import type { Alert, Remedy, Trace } from '@/lib/types'

const MAX_ALERTS = 20

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 26 },
  },
} as const

export function Dashboard() {
  const { toast } = useToast()
  const [selectedNode, setSelectedNode] = useState<string | null>('P-102')
  const [remedies, setRemedies] = useState<Remedy[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  const { data: trace, isLoading } = useQuery<Trace>({
    queryKey: ['trace', 'P-102'],
    queryFn: () => api.getTrace('P-102'),
  })

  // Hydrate remedies once the trace arrives.
  useEffect(() => {
    if (trace) setRemedies(trace.remedies)
  }, [trace])

  const pushAlert = useCallback((alert: Alert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS))
  }, [])

  const { status } = useSSE(pushAlert)

  // Optimistic feedback voting.
  const feedback = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: 'confirm' | 'reject' }) =>
      api.sendFeedback(id, vote),
  })

  const handleVote = useCallback(
    (remedyId: string, vote: 'confirm' | 'reject') => {
      setRemedies((prev) =>
        prev.map((r) => {
          if (r.id !== remedyId) return r
          const delta = vote === 'confirm' ? 0.08 : -0.12
          return {
            ...r,
            status: vote === 'confirm' ? 'confirmed' : 'rejected',
            confidence: Math.max(0.02, Math.min(1, r.confidence + delta)),
          }
        }),
      )
      feedback.mutate(
        { id: remedyId, vote },
        {
          onError: () => {
            toast({
              kind: 'error',
              title: 'Feedback failed',
              description: 'Reverting the confidence update.',
            })
            if (trace) setRemedies(trace.remedies)
          },
        },
      )
      toast({
        kind: vote === 'confirm' ? 'success' : 'info',
        title: vote === 'confirm' ? 'Remedy confirmed' : 'Remedy rejected',
        description: 'Confidence model updated from your feedback.',
      })
    },
    [feedback, toast, trace],
  )

  const simulate = useMutation({
    mutationFn: api.simulateAnomaly,
    onSuccess: (res) => {
      pushAlert(res.alert)
      setSelectedNode(res.alert.nodeId ?? selectedNode)
      toast({
        kind: 'error',
        title: 'Anomaly simulated',
        description: 'Injected a critical event on P-102.',
      })
    },
    onError: () => {
      toast({ kind: 'error', title: 'Simulate failed', description: 'Could not reach backend.' })
    },
  })

  const sync = useMutation({
    mutationFn: api.syncVectors,
    onSuccess: (res) => {
      pushAlert({
        id: `a-${Date.now()}-sync`,
        tag: 'ingest',
        severity: 'info',
        message: `Vector index re-run complete — ${res.embedded} chunks embedded.`,
        timestamp: Date.now(),
      })
      toast({
        kind: 'success',
        title: 'Ingestion re-run complete',
        description: `${res.embedded} chunks embedded into the index.`,
      })
    },
    onError: () => {
      toast({ kind: 'error', title: 'Sync failed', description: 'Could not reach backend.' })
    },
  })

  const stats = trace?.stats

  return (
    <div className="min-h-screen">
      <DashboardBackground />
      <Header
        status={status}
        onSimulate={() => simulate.mutate()}
        onSync={() => sync.mutate()}
        simulating={simulate.isPending}
        syncing={sync.isPending}
      />

      {isLoading || !trace ? (
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-teal" />
            <p className="text-sm">Tracing P-102 memory graph…</p>
          </div>
        </div>
      ) : (
        <motion.main
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6"
        >
          {/* KPI Row */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <MetricGauge
              label="Context Retained"
              value={stats?.contextRetained ?? 0}
              tone="teal"
              trend={6}
              trendGood="up"
              caption="Share of incidents resolvable from captured memory."
              delay={0.1}
            />
            <MetricGauge
              label="Expert Dependency"
              value={stats?.expertDependency ?? 0}
              tone="amber"
              trend={-4}
              trendGood="down"
              caption="Incidents still requiring a senior operator escalation."
              delay={0.2}
            />
            <MetricGauge
              label="Compliance Flags"
              value={stats?.complianceFlags ?? 0}
              unit=""
              max={10}
              tone="critical"
              trend={1}
              trendGood="down"
              caption="Open permit or procedure deviations awaiting review."
              delay={0.3}
            />
          </motion.div>

          {/* Main grid */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4 auto-rows-fr">
            <motion.div variants={item} className="lg:col-span-2 h-full">
              <TopologyGraph
                trace={trace}
                selectedId={selectedNode}
                onSelect={setSelectedNode}
              />
            </motion.div>

            <motion.div variants={item} className="lg:col-span-2 h-full">
              <RemediesPanel
                remedies={remedies}
                selectedNode={selectedNode}
                onVote={handleVote}
              />
            </motion.div>

            <motion.div variants={item} className="lg:col-span-2 h-full">
              <AlertsLog alerts={alerts} onFocusNode={setSelectedNode} />
            </motion.div>

            <motion.div variants={item} className="lg:col-span-2 h-full">
              <IngestionHub />
            </motion.div>
          </div>
        </motion.main>
      )}

      <Copilot equipmentId={selectedNode} />
    </div>
  )
}
