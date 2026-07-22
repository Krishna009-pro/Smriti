"use client";

import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArchitectureNode, ArchitectureNodeData } from "@/components/ArchitectureNode";
import { TelegramNode, TelegramNodeData } from "@/components/architecture/TelegramNode";
import { SequenceDiagram, SequenceStep } from "@/components/SequenceDiagram";
import { GlassCard } from "@/components/GlassCard";
import { Section } from "@/components/Section";
import { CodeBlock } from "@/components/CodeBlock";
import { StatusPill } from "@/components/StatusPill";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch, AlertTriangle, Brain, Check, MessageSquare } from "lucide-react";

const nodeTypes = { arch: ArchitectureNode, telegram: TelegramNode };

const initialNodes: Node<ArchitectureNodeData | TelegramNodeData>[] = [
  { id: "pid", type: "arch", position: { x: 0, y: 0 }, data: { label: "P&ID Vision", subtitle: "Gemini 2.5 Flash", kind: "ingest" } },
  { id: "nlp", type: "arch", position: { x: 220, y: 0 }, data: { label: "Shift-Note NLP", subtitle: "entity extraction", kind: "ingest" } },
  { id: "telem", type: "arch", position: { x: 440, y: 0 }, data: { label: "Telemetry", subtitle: "SSE Stream", kind: "ingest" } },
  { id: "bus", type: "arch", position: { x: 220, y: 120 }, data: { label: "Ingestion Bus", subtitle: "async", kind: "core" } },
  { id: "graph", type: "arch", position: { x: 220, y: 240 }, data: { label: "Knowledge Graph", subtitle: "PostgreSQL (CTE)", kind: "store" } },
  { id: "conf", type: "arch", position: { x: 20, y: 360 }, data: { label: "Confidence Engine", subtitle: "Wilson score", kind: "core" } },
  { id: "query", type: "arch", position: { x: 220, y: 360 }, data: { label: "Graph Query API", subtitle: "FastAPI", kind: "serve" } },
  { id: "anomaly", type: "arch", position: { x: 440, y: 360 }, data: { label: "Anomaly Detector", subtitle: "threshold + ML", kind: "core" } },
  { id: "mcp", type: "arch", position: { x: 220, y: 480 }, data: { label: "FastMCP Server", subtitle: "agent tools", kind: "serve" } },
  { id: "alert", type: "arch", position: { x: 440, y: 480 }, data: { label: "Alert Bus", subtitle: "SSE + Telegram", kind: "alert" } },
  { id: "dash", type: "arch", position: { x: 220, y: 600 }, data: { label: "Mission Control UI", subtitle: "TanStack Start", kind: "serve" } },
  { id: "telegram", type: "telegram", position: { x: 800, y: 100 }, data: { label: "Telegram Bot API", icon: MessageSquare, status: "live", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" } },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "pid", target: "bus", animated: true },
  { id: "e2", source: "nlp", target: "bus", animated: true },
  { id: "e3", source: "telem", target: "bus", animated: true },
  { id: "e4", source: "bus", target: "graph", animated: true },
  { id: "e5", source: "graph", target: "conf" },
  { id: "e6", source: "graph", target: "query" },
  { id: "e7", source: "graph", target: "anomaly" },
  { id: "e8", source: "query", target: "mcp" },
  { id: "e9", source: "anomaly", target: "alert", animated: true },
  { id: "e10", source: "mcp", target: "dash" },
  { id: "e11", source: "alert", target: "dash", animated: true },
  { id: "e12", source: "conf", target: "graph" },
  { id: "e13", source: "alert", target: "telegram", animated: true, style: { stroke: "#3B82F6", strokeDasharray: "4,4" } },
];

const sequences: { title: string; actors: string[]; steps: SequenceStep[] }[] = [
  {
    title: "Ingestion",
    actors: ["Operator", "Ingest Bus", "Graph", "Confidence"],
    steps: [
      { from: "Operator", to: "Ingest Bus", label: "upload P&ID / note", detail: "POST /api/ingest/*" },
      { from: "Ingest Bus", to: "Graph", label: "upsert triples", detail: "nodes + edges" },
      { from: "Graph", to: "Confidence", label: "init confidence = 0.5", detail: "n=0" },
      { from: "Confidence", to: "Graph", label: "stamp lower bound", detail: "Wilson(0,0)" },
    ],
  },
  {
    title: "Proactive Alert",
    actors: ["Telemetry", "Detector", "Alert Bus", "Dashboard"],
    steps: [
      { from: "Telemetry", to: "Detector", label: "value > threshold", detail: "P-102 vibration" },
      { from: "Detector", to: "Alert Bus", label: "emit anomaly", detail: "severity + confidence" },
      { from: "Alert Bus", to: "Dashboard", label: "SSE push", detail: "< 500ms" },
      { from: "Alert Bus", to: "Dashboard", label: "Telegram fan-out", detail: "on-call channel" },
    ],
  },
  {
    title: "Feedback Loop",
    actors: ["Operator", "Dashboard", "Confidence", "Graph"],
    steps: [
      { from: "Operator", to: "Dashboard", label: "acknowledge + mark fix", detail: "success/failure" },
      { from: "Dashboard", to: "Confidence", label: "POST /confidence", detail: "outcome" },
      { from: "Confidence", to: "Graph", label: "recompute Wilson", detail: "n++, successes++" },
      { from: "Graph", to: "Graph", label: "re-weight edges", detail: "fix ranks higher" },
    ],
  },
];

const tradeoffs = [
  { decision: "Graph store", choice: "Neo4j", rationale: "Native Cypher, GNN-friendly, ACID", cost: "Operational overhead vs. Postgres+AGE" },
  { decision: "Streaming", choice: "SSE (not WS)", rationale: "One-way, simpler retry, proxy-friendly", cost: "No client→server pushback on same channel" },
  { decision: "Confidence", choice: "Wilson lower bound", rationale: "Conservative, well-behaved at small n", cost: "Slower convergence than Bayesian prior" },
  { decision: "Vision", choice: "GNN on extracted graph", rationale: "Topology-aware, not just OCR", cost: "Requires labeled P&IDs for training" },
  { decision: "Agent surface", choice: "FastMCP", rationale: "Standard tool protocol for LLM agents", cost: "Newer spec, smaller ecosystem" },
  { decision: "Frontend", choice: "Next.js App Router", rationale: "SSR + streaming, RSC for docs", cost: "Heavier than SPA for a pure dashboard" },
];

const wilsonCode = `def wilson_lower(successes: int, failures: int, z: float = 1.96) -> float:
    n = successes + failures
    if n == 0:
        return 0.0
    p_hat = successes / n
    denominator = 1 + z**2 / n
    center = (p_hat + z**2 / (2 * n)) / denominator
    interval = z * (p_hat * (1 - p_hat) / n + z**2 / (4 * n**2))**0.5 / denominator
    return center - interval  # conservative lower bound

# A fix that worked twice (n=2, 0 failures) scores 0.34, not 1.0.
# The system stays skeptical until evidence accumulates.`;

export default function ArchitecturePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeSeq, setActiveSeq] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activatePath = useCallback(
    (path: string[]) => {
      const activeNodes = nodes.map((n) => ({
        ...n,
        data: { ...n.data, active: path.includes(n.id) },
      }));
      setNodes(activeNodes);
      const activeEdges = edges.map((e) => ({
        ...e,
        animated: path.includes(e.source) && path.includes(e.target),
      }));
      setEdges(activeEdges);
    },
    [nodes, edges, setNodes, setEdges]
  );

  return (
    <>
      <Section
        eyebrow="Architecture"
        title="Interactive system diagram"
        description="Click a flow below to highlight the path through the graph. Drag nodes to rearrange."
      >
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => activatePath(["pid", "nlp", "telem", "bus", "graph", "conf"])}
            className="rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
          >
            Ingestion path
          </button>
          <button
            onClick={() => activatePath(["telem", "anomaly", "alert", "dash", "telegram"])}
            className="rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
          >
            Alert path
          </button>
          <button
            onClick={() => activatePath(["graph", "query", "mcp", "dash"])}
            className="rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
          >
            Query path
          </button>
          <button
            onClick={() => activatePath([])}
            className="rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
          >
            Reset
          </button>
        </div>

        <GlassCard className="h-[560px] overflow-hidden p-0">
          {mounted ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{ style: { stroke: "rgba(45,212,191,0.4)" } }}
            >
              <Background color="rgba(255,255,255,0.04)" gap={32} />
              <Controls className="!border-border !bg-surface" />
              <MiniMap
                className="!bg-surface !border-border"
                nodeColor={(n) => {
                  const kind = (n.data as ArchitectureNodeData)?.kind;
                  const map: Record<string, string> = {
                    ingest: "#38bdf8", core: "#14b8a6", serve: "#34d399", alert: "#f59e0b", store: "#60a5fa",
                  };
                  return map[kind] ?? "#64748b";
                }}
              />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center text-fg-muted">Loading diagram…</div>
          )}
        </GlassCard>
      </Section>

      {/* Data flow sequences */}
      <Section
        eyebrow="Data flow"
        title="Three sequences that define the system"
        description="Ingestion, proactive alerting, and the confidence feedback loop."
      >
        <div className="mb-8 flex flex-wrap gap-2">
          {sequences.map((seq, i) => (
            <button
              key={seq.title}
              onClick={() => setActiveSeq(i)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                activeSeq === i
                  ? "border-primary/40 bg-primary/10 text-primary-300"
                  : "border-border bg-surface/60 text-fg-muted hover:text-fg"
              }`}
            >
              {seq.title}
            </button>
          ))}
        </div>
        <motion.div
          key={activeSeq}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6 lg:p-10">
            <h3 className="mb-6 font-mono text-sm font-semibold uppercase tracking-wider text-primary-300">
              {sequences[activeSeq].title}
            </h3>
            <SequenceDiagram actors={sequences[activeSeq].actors} steps={sequences[activeSeq].steps} />
          </GlassCard>
        </motion.div>
      </Section>

      {/* Confidence engine */}
      <Section
        eyebrow="Confidence learning"
        title="Wilson-score: skeptical until proven"
        description="Every fact carries a conservative lower bound. The system doesn't trust a fix that worked once."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary-300" />
              <h3 className="font-semibold text-fg">The math</h3>
            </div>
            <CodeBlock code={wilsonCode} language="python" className="mt-4" />
          </GlassCard>
          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-fg">Why it matters</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-fg-muted">
              <li className="flex gap-2">
                <span className="font-mono text-primary-300">n=2, 0 fail</span>
                <span>→ confidence 0.34. Not 1.0. The system won't over-rank an untested fix.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-primary-300">n=20, 2 fail</span>
                <span>→ confidence 0.72. Trustworthy enough to surface proactively.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-primary-300">n=50, 0 fail</span>
                <span>→ confidence 0.93. High confidence, still room for surprise.</span>
              </li>
            </ul>
            <div className="mt-6">
              <StatusPill status="ok" pulse>Conservative by design</StatusPill>
            </div>
          </GlassCard>
        </div>
      </Section>

      {/* Trade-off log */}
      <Section
        eyebrow="Trade-off log"
        title="Every choice has a cost"
        description="We logged the engineering decisions and what we gave up for each."
      >
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg-soft/50">
                <tr>
                  <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Decision</th>
                  <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Choice</th>
                  <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Rationale</th>
                  <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Cost</th>
                </tr>
              </thead>
              <tbody>
                {tradeoffs.map((t, i) => (
                  <motion.tr
                    key={t.decision}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-6 py-4 font-medium text-fg">{t.decision}</td>
                    <td className="px-6 py-4 font-mono text-primary-300">{t.choice}</td>
                    <td className="px-6 py-4 text-fg-muted">{t.rationale}</td>
                    <td className="px-6 py-4 text-fg-subtle">{t.cost}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </Section>
    </>
  );
}
