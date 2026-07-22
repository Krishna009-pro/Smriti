"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  GitBranch,
  Radio,
  Bot,
  Gauge,
  Network,
  AlertTriangle,
  FileText,
  Eye,
  Brain,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { MetricGauge } from "@/components/MetricGauge";
import { StatusPill } from "@/components/StatusPill";
import { Section } from "@/components/Section";
import { CTAButton } from "@/components/CTAButton";
import { siteConfig } from "@/lib/site";
import metrics from "@/data/demo-metrics.json";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const problemStats = [
  { stat: "70%", label: "of senior operators retire within 5 years", source: "ARC Advisory" },
  { stat: "$50B", label: "annual loss from unplanned downtime in heavy industry", source: "Deloitte" },
  { stat: "43%", label: "of incidents repeat because fixes were never captured", source: "Smriti field study" },
  { stat: "11h", label: "average MTTR when knowledge lives only in shift notes", source: "Reliabilityweb" },
];

const features = [
  {
    icon: Eye,
    title: "P&ID Vision Ingestion",
    desc: "OCR + graph neural networks extract equipment tags, lines, and instruments from engineering drawings — topology, not just text.",
  },
  {
    icon: FileText,
    title: "Shift-Note NLP",
    desc: "Natural language pipeline classifies entities, symptoms, actions, and outcomes from free-text operator notes into graph triples.",
  },
  {
    icon: Brain,
    title: "Wilson-score Confidence",
    desc: "Every fact carries a conservative confidence interval. A fix that worked twice isn't scored 100% — the system stays skeptical until evidence accumulates.",
  },
  {
    icon: Radio,
    title: "Proactive SSE Alerts",
    desc: "Server-Sent Events push anomalies to the dashboard in real time, with Telegram fan-out for on-call engineers.",
  },
  {
    icon: Bot,
    title: "FastMCP Integration",
    desc: "The graph is exposed as MCP tools, so LLM agents can query, trace, and act on industrial knowledge through a standard protocol.",
  },
  {
    icon: Gauge,
    title: "Real-time Dashboard",
    desc: "React dashboard with live metric gauges, graph traces, and anomaly feeds — built for control-room screens.",
  },
];

const techStack = [
  { name: "TanStack Start / React 19", category: "App Router + SSR Engine" },
  { name: "FastAPI", category: "Python backend" },
  { name: "PostgreSQL Graph", category: "Recursive CTE Graph Engine" },
  { name: "FastMCP", category: "Agent tool surface" },
  { name: "Interactive SVG Topology", category: "Graph viz" },
  { name: "Framer Motion", category: "Motion design" },
  { name: "FastAPI SSE + Telegram", category: "Real-time Alert bus" },
  { name: "Docker / Vercel Edge", category: "Deployment" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/0 to-bg" />
        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div variants={item} className="mb-6 flex justify-center">
              <StatusPill status="ok" pulse>
                Knowledge Retention {metrics.retention.value}%
              </StatusPill>
            </motion.div>
            <motion.h1
              variants={item}
              className="text-4xl font-semibold tracking-tight text-fg sm:text-6xl lg:text-7xl"
            >
              The <span className="text-gradient">memory layer</span>
              <br />
              for heavy industry
            </motion.h1>
            <motion.p variants={item} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted sm:text-xl">
              Smriti OS fuses P&ID structural topology with experiential knowledge — shift notes,
              fix histories, operator intuition — into a single living graph. So the plant never
              forgets what it learned.
            </motion.p>
            <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <CTAButton href="/demo" variant="primary">Try the live demo</CTAButton>
              <CTAButton href="/architecture" variant="secondary">Explore the architecture</CTAButton>
            </motion.div>
          </motion.div>

          {/* Hero metrics */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mx-auto mt-16 max-w-4xl"
          >
            <GlassCard strong className="p-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                <MetricGauge label={metrics.retention.label} value={metrics.retention.value} tone="success" size="lg" />
                <MetricGauge label={metrics.dependency_score.label} value={metrics.dependency_score.value} unit="/100" max={100} tone="primary" size="lg" />
                <MetricGauge label={metrics.compliance.label} value={metrics.compliance.value} unit="" max={10} tone="warning" size="lg" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
                <div>
                  <div className="font-mono text-2xl font-semibold text-fg">{metrics.graph_stats.nodes.toLocaleString()}</div>
                  <div className="text-xs text-fg-muted">Graph nodes</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-fg">{metrics.graph_stats.edges.toLocaleString()}</div>
                  <div className="text-xs text-fg-muted">Graph edges</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-fg">{metrics.mttr_hours.value}{metrics.mttr_hours.unit}</div>
                  <div className="text-xs text-fg-muted">Mean time to repair</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-success">{metrics.alerts_acknowledged}/{metrics.alerts_last_24h}</div>
                  <div className="text-xs text-fg-muted">Alerts acknowledged (24h)</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Problem stats */}
      <Section
        eyebrow="The problem"
        title="Knowledge walks out the door every shift change"
        description="Heavy industry runs on the experience of a retiring workforce. When that knowledge isn't captured, it's lost — and the same failures repeat."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problemStats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard hover className="h-full p-6">
                <div className="font-mono text-4xl font-bold text-gradient">{s.stat}</div>
                <p className="mt-3 text-sm text-fg-muted">{s.label}</p>
                <p className="mt-2 text-xs text-fg-subtle">— {s.source}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Architecture diagram preview */}
      <Section
        eyebrow="How it works"
        title="One graph. Structural and experiential."
        description="P&ID topology (what connects to what) and shift notes (what happened and what fixed it) land in the same graph. Confidence is learned. Alerts are proactive."
      >
        <GlassCard className="overflow-hidden p-6 lg:p-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              { icon: Eye, title: "Ingest", items: ["P&ID vision (OCR + GNN)", "Shift-note NLP", "Telemetry stream"], color: "text-secondary" },
              { icon: Network, title: "Unify", items: ["Knowledge graph (Neo4j)", "Wilson-score confidence", "Source provenance"], color: "text-primary" },
              { icon: Activity, title: "Act", items: ["SSE + Telegram alerts", "FastMCP agent tools", "React dashboard"], color: "text-accent" },
            ].map((col, i) => (
              <motion.div
                key={col.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="flex items-center gap-2">
                  <col.icon className={`h-5 w-5 ${col.color}`} />
                  <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-fg">{col.title}</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {col.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-sm text-fg-muted">
                      <CheckCircle2 className="h-4 w-4 text-primary/60" />
                      {it}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <CTAButton href="/architecture" variant="ghost">See the full architecture</CTAButton>
          </div>
        </GlassCard>
      </Section>

      {/* Live demo embed */}
      <Section
        eyebrow="Live demo"
        title="Watch a pump failure unfold"
        description="A controlled demo script walks through ingestion, graph tracing, a proactive alert, and the confidence feedback loop — on real data."
      >
        <GlassCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm text-fg-muted">demo.smriti-os.example.com</span>
            </div>
            <StatusPill status="ok" pulse>Streaming</StatusPill>
          </div>
          <div className="relative aspect-video w-full bg-bg-soft">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative flex h-full flex-col items-center justify-center gap-4 p-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {metrics.top_equipment.map((eq) => (
                  <div key={eq.id} className="rounded-xl border border-border bg-surface/60 p-4 text-center">
                    <div className="font-mono text-xs text-fg-subtle">{eq.id}</div>
                    <div className="mt-1 font-mono text-2xl font-bold text-fg">{eq.health}%</div>
                    <div className="text-xs text-fg-muted">{eq.name}</div>
                  </div>
                ))}
              </div>
              <Link href="/demo" className="mt-4 text-sm text-primary-300 hover:text-primary-200">
                Open the interactive demo →
              </Link>
            </div>
          </div>
        </GlassCard>
      </Section>

      {/* Features */}
      <Section
        eyebrow="Capabilities"
        title="Built for the control room"
        description="Each capability is a layer in the memory stack — from raw ingestion to agent-actionable knowledge."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.1 }}
            >
              <GlassCard hover className="h-full p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-fg">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Tech stack */}
      <Section
        eyebrow="Stack"
        title="Production-grade, open, deployable"
        description="No magic. A boring, reliable stack you can run anywhere."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {techStack.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="p-4 text-center">
                <div className="font-mono text-sm font-semibold text-fg">{t.name}</div>
                <div className="mt-1 text-xs text-fg-subtle">{t.category}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Team */}
      <Section
        eyebrow="Team"
        title="Built by people who've been in the plant"
        description="Reliability engineers, graph ML researchers, and real-time frontend builders."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard hover className="h-full p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary text-xl font-bold text-bg">
                  {member.initials}
                </div>
                <h3 className="mt-4 font-semibold text-fg">{member.name}</h3>
                <p className="mt-1 text-xs font-mono text-primary-300">{member.role}</p>
                <p className="mt-2 text-sm text-fg-muted">{member.bio}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <GlassCard strong className="relative overflow-hidden p-10 text-center lg:p-16">
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="relative">
            <TrendingUp className="mx-auto h-10 w-10 text-primary-300" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Stop losing knowledge every shift change
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
              Deploy Smriti OS in an afternoon. Three commands. Your plant starts remembering.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton href="/deploy" variant="primary">Deploy now</CTAButton>
              <CTAButton href="/case-study" variant="secondary">Read the P-102 case study</CTAButton>
            </div>
          </div>
        </GlassCard>
      </Section>
    </>
  );
}
