import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2, Search, Plus, Network, CheckCircle2 } from 'lucide-react'
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
import { GlassCard } from '@/components/glass-card'
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
  const queryClient = useQueryClient()

  const [activeTag, setActiveTag] = useState<string>('P-102')
  const [searchInput, setSearchInput] = useState<string>('')
  const [selectedNode, setSelectedNode] = useState<string | null>('P-102')
  const [remedies, setRemedies] = useState<Remedy[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Modal State for Adding New Equipment
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [newEqId, setNewEqId] = useState<string>('')
  const [newEqName, setNewEqName] = useState<string>('')
  const [newEqType, setNewEqType] = useState<string>('equipment')
  const [newSymptom, setNewSymptom] = useState<string>('')
  const [newFix, setNewFix] = useState<string>('')

  const { data: trace, isLoading } = useQuery<Trace>({
    queryKey: ['trace', activeTag],
    queryFn: () => api.getTrace(activeTag),
  })

  // Hydrate remedies once trace arrives
  useEffect(() => {
    if (trace) setRemedies(trace.remedies)
  }, [trace])

  const pushAlert = useCallback((alert: Alert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS))
  }, [])

  const { status } = useSSE(pushAlert)

  // Feedback voting mutation
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
              description: 'Reverting confidence update.',
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

  const handleTraceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    const tag = searchInput.trim().toUpperCase()
    setActiveTag(tag)
    setSelectedNode(tag)
    setSearchInput('')
  }

  const createEquipmentMutation = useMutation({
    mutationFn: api.createEquipment,
    onSuccess: (res) => {
      const tag = res.equipment_id.toUpperCase()
      setShowAddModal(false)
      setNewEqId('')
      setNewEqName('')
      setNewSymptom('')
      setNewFix('')

      queryClient.invalidateQueries({ queryKey: ['trace'] })
      setActiveTag(tag)
      setSelectedNode(tag)

      toast({
        kind: 'success',
        title: 'Equipment Registered',
        description: res.message,
      })
    },
    onError: (err) => {
      toast({
        kind: 'error',
        title: 'Registration Failed',
        description: String(err),
      })
    },
  })

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEqId.trim() || !newEqName.trim()) {
      toast({
        kind: 'error',
        title: 'Missing Fields',
        description: 'Equipment ID and Name are required.',
      })
      return
    }
    createEquipmentMutation.mutate({
      id: newEqId,
      name: newEqName,
      type: newEqType,
      symptom: newSymptom,
      fix: newFix,
    })
  }

  const simulate = useMutation({
    mutationFn: api.simulateAnomaly,
    onSuccess: (res) => {
      pushAlert(res.alert)
      setSelectedNode(res.alert.nodeId ?? selectedNode)
      toast({
        kind: 'error',
        title: 'Anomaly simulated',
        description: `Injected critical event on ${res.alert.nodeId ?? 'P-102'}.`,
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
            value={stats?.contextRetained ?? 78.5}
            tone="teal"
            trend={6}
            trendGood="up"
            caption="Share of incidents resolvable from captured memory."
            delay={0.1}
          />
          <MetricGauge
            label="Expert Dependency"
            value={stats?.expertDependency ?? 35}
            tone="amber"
            trend={-4}
            trendGood="down"
            caption="Incidents still requiring a senior operator escalation."
            delay={0.2}
          />
          <MetricGauge
            label="Compliance Flags"
            value={stats?.complianceFlags ?? 3}
            unit=""
            max={10}
            tone="critical"
            trend={1}
            trendGood="down"
            caption="Open permit or procedure deviations awaiting review."
            delay={0.3}
          />
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* Interactive Equipment Trace & Add Asset Control Bar           */}
        {/* ------------------------------------------------------------- */}
        <motion.div variants={item} className="mt-4">
          <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Network className="size-4 text-teal" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trace Target:
                </span>
              </div>

              {/* Preset Equipment Tag Pills */}
              {['P-102', 'C-201', 'R-301', 'T-401'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setActiveTag(tag)
                    setSelectedNode(tag)
                  }}
                  className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                    activeTag === tag
                      ? 'bg-teal text-background shadow-md shadow-teal/20'
                      : 'border border-border bg-secondary/40 text-foreground hover:bg-secondary'
                  }`}
                >
                  {tag}
                </button>
              ))}

              {/* Custom Search Trace Form */}
              <form onSubmit={handleTraceSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Custom Tag (e.g. P-103)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background/60 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-teal/20 px-3 text-xs font-medium text-teal hover:bg-teal/30"
                >
                  <Search className="size-3.5" />
                  Trace
                </button>
              </form>
            </div>

            {/* Add New Asset Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald px-4 py-2 text-xs font-semibold text-background shadow-lg shadow-emerald/20 transition-all hover:bg-emerald/90"
            >
              <Plus className="size-4" />
              Add New Equipment / Asset
            </button>
          </GlassCard>
        </motion.div>

        {/* ------------------------------------------------------------- */}
        {/* Main Grid: Topology Graph & Remedy Diagnostics                */}
        {/* ------------------------------------------------------------- */}
        {isLoading || !trace ? (
          <div className="flex h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-teal" />
              <p className="text-sm">Tracing 3-hop topology for <span className="font-mono text-teal font-semibold">{activeTag}</span>…</p>
            </div>
          </div>
        ) : (
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
        )}
      </motion.main>

      <Copilot equipmentId={selectedNode} />

      {/* ------------------------------------------------------------- */}
      {/* Add New Equipment Asset Modal Dialog                         */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-bold text-foreground">Register New Equipment Asset</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground">Equipment ID (Tag)</label>
                <input
                  type="text"
                  placeholder="e.g. P-103 or C-202"
                  value={newEqId}
                  onChange={(e) => setNewEqId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground">Equipment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Boiler Feed Water Pump P-103"
                  value={newEqName}
                  onChange={(e) => setNewEqName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground">Asset Type</label>
                <select
                  value={newEqType}
                  onChange={(e) => setNewEqType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                >
                  <option value="equipment">Pump / Compressor / Motor</option>
                  <option value="valve">Control / Isolation Valve</option>
                  <option value="tank">Storage Tank / Vessel</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground">Observed Symptom (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. High bearing temperature & flow fluctuation"
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground">Recommended Remedy / Fix (Optional)</label>
                <textarea
                  placeholder="e.g. Inspect impeller alignment & lubricate drive coupling"
                  value={newFix}
                  onChange={(e) => setNewFix(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEquipmentMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-emerald px-5 py-2 font-semibold text-background hover:bg-emerald/90"
                >
                  {createEquipmentMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Register Asset
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
