import { motion } from 'framer-motion'
import { useState } from 'react'
import { GlassCard } from '@/components/glass-card'
import type { GraphEdge, GraphNode, NodeType, Trace } from '@/lib/types'

const NODE_COLORS: Record<NodeType, string> = {
  equipment: 'var(--teal)',
  valve: '#3b82f6',
  tank: 'var(--amber)',
  fix: 'var(--emerald)',
}

const NODE_LABELS: Record<NodeType, string> = {
  equipment: 'Equipment',
  valve: 'Valve',
  tank: 'Tank',
  fix: 'Known Fix',
}

interface TopologyGraphProps {
  trace: Trace
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TopologyGraph({
  trace,
  selectedId,
  onSelect,
}: TopologyGraphProps) {
  const [hover, setHover] = useState<GraphNode | null>(null)
  const nodeById = (id: string) => trace.nodes.find((n) => n.id === id)

  return (
    <GlassCard hoverLift={false} className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Equipment Topology</h2>
          <p className="text-xs text-muted-foreground">
            Trace root:{' '}
            <span className="font-mono text-teal">{trace.rootId}</span>
          </p>
        </div>
        <Legend />
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-background/40">
        <svg
          viewBox="0 0 640 500"
          className="h-full min-h-[360px] w-full"
          role="img"
          aria-label="Equipment topology graph"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--teal)" opacity="0.5" />
            </marker>
          </defs>

          {/* Edges */}
          {trace.edges.map((edge, i) => {
            const from = nodeById(edge.source)
            const to = nodeById(edge.target)
            if (!from || !to) return null
            return (
              <EdgeLine
                key={edge.id}
                edge={edge}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                delay={i * 0.08}
              />
            )
          })}

          {/* Nodes */}
          {trace.nodes.map((node, i) => (
            <NodeShape
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              delay={0.2 + i * 0.08}
              onSelect={() => onSelect(node.id)}
              onHover={setHover}
            />
          ))}
        </svg>

        {hover && (
          <div
            className="glass pointer-events-none absolute z-10 max-w-[200px] rounded-lg border border-border p-3 text-xs shadow-xl"
            style={{
              left: `${(hover.x / 640) * 100}%`,
              top: `${(hover.y / 500) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 28px))',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: NODE_COLORS[hover.type] }}
              />
              <span className="font-mono font-semibold">{hover.label}</span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {NODE_LABELS[hover.type]}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {Object.entries(hover.meta).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="capitalize text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MiniStats trace={trace} />
    </GlassCard>
  )
}

function EdgeLine({
  edge,
  x1,
  y1,
  x2,
  y2,
  delay,
}: {
  edge: GraphEdge
  x1: number
  y1: number
  x2: number
  y2: number
  delay: number
}) {
  const isFix = edge.type === 'has_known_fix'
  const color = isFix ? 'var(--emerald)' : 'var(--teal)'
  const width = isFix ? 1 + (edge.confidence ?? 0.5) * 4 : 2

  return (
    <g>
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeOpacity={isFix ? 0.5 : 0.35}
        strokeDasharray={isFix ? '6 6' : '10 8'}
        strokeLinecap="round"
        markerEnd={isFix ? undefined : 'url(#arrow)'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay }}
      />
      {!isFix && (
        <motion.line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={width}
          strokeDasharray="10 18"
          strokeLinecap="round"
          animate={{ strokeDashoffset: [0, -28] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </g>
  )
}

function NodeShape({
  node,
  selected,
  delay,
  onSelect,
  onHover,
}: {
  node: GraphNode
  selected: boolean
  delay: number
  onSelect: () => void
  onHover: (n: GraphNode | null) => void
}) {
  const color = NODE_COLORS[node.type]
  const size = 26

  const shape = () => {
    switch (node.type) {
      case 'equipment':
        return <circle r={size} />
      case 'valve':
        return (
          <rect
            x={-size}
            y={-size * 0.72}
            width={size * 2}
            height={size * 1.44}
            rx={6}
          />
        )
      case 'tank':
        return (
          <rect
            x={-size * 0.85}
            y={-size * 0.85}
            width={size * 1.7}
            height={size * 1.7}
            rx={4}
            transform="rotate(45)"
          />
        )
      case 'fix':
        return <polygon points={hexPoints(size)} />
    }
  }

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className="cursor-pointer"
      onClick={onSelect}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Anomaly pulse */}
      {node.anomaly && (
        <>
          {[0, 0.6].map((d) => (
            <motion.circle
              key={d}
              r={size}
              fill="none"
              stroke="var(--critical)"
              strokeWidth={2}
              animate={{ r: [size, size + 26], opacity: [0.6, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeOut',
                delay: d,
              }}
            />
          ))}
        </>
      )}

      {/* Selection ring */}
      {selected && (
        <circle
          r={size + 9}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="3 4"
          opacity={0.8}
        />
      )}

      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <g
          fill={`color-mix(in srgb, ${color} 18%, var(--card))`}
          stroke={color}
          strokeWidth={2}
          style={{
            filter: `drop-shadow(0 0 8px color-mix(in srgb, ${color} 45%, transparent))`,
          }}
        >
          {shape()}
        </g>

        <text
          textAnchor="middle"
          dy={4}
          className="font-mono"
          fontSize={11}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {node.label}
        </text>
      </motion.g>
    </g>
  )
}

function hexPoints(r: number) {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function Legend() {
  const items: { type: NodeType; label: string }[] = [
    { type: 'equipment', label: 'Equipment' },
    { type: 'valve', label: 'Valve' },
    { type: 'tank', label: 'Tank' },
    { type: 'fix', label: 'Fix' },
  ]
  return (
    <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex">
      {items.map((it) => (
        <div key={it.type} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ background: NODE_COLORS[it.type] }}
          />
          <span className="text-[11px] text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function MiniStats({ trace }: { trace: Trace }) {
  const stats = [
    { label: 'Nodes', value: trace.stats.nodes },
    { label: 'Active Traces', value: trace.stats.activeTraces },
    { label: 'Anomalies 24h', value: trace.stats.anomalies24h },
  ]
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center"
        >
          <p className="font-mono text-lg font-semibold tabular-nums">
            {s.value}
          </p>
          <p className="text-[11px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
