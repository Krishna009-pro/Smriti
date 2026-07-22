"use client";

import { motion } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Activity,
  Droplet,
  Thermometer,
  Vibrate,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { MetricGauge } from "@/components/MetricGauge";
import { StatusPill } from "@/components/StatusPill";
import { Section } from "@/components/Section";
import { CTAButton } from "@/components/CTAButton";
import { AlertTimeline } from "@/components/case-study/AlertTimeline";

const timeline = [
  {
    time: "T-72h",
    title: "First whisper",
    desc: "Shift note: 'P-102 sounding rough on startup.' NLP tags P-102 + symptom 'rough startup'. Confidence 0.34 (n=1).",
    tone: "info" as const,
    icon: Activity,
  },
  {
    time: "T-48h",
    title: "Pattern recognition",
    desc: "Graph trace links P-102 → FM-014 (bearing wear) → FX-088 (bleed load + vib analysis). Same pattern matched 3 historical incidents.",
    tone: "info" as const,
    icon: Brain,
  },
  {
    time: "T-6h",
    title: "Telemetry threshold crossed",
    desc: "Vibration 3.2 mm/s (threshold 2.5). Bearing temp 81°C. Anomaly detector emits high-severity event, confidence 0.81.",
    tone: "warn" as const,
    icon: AlertTriangle,
  },
  {
    time: "T-6h",
    title: "Proactive alert",
    desc: "SSE pushes to dashboard. Telegram notifies on-call. Dashboard highlights P-102 → bearing wear → known fix.",
    tone: "warn" as const,
    icon: Activity,
  },
  {
    time: "T-5h",
    title: "Operator acts",
    desc: "On-call bleeds load to 60%. Bearing temp drops to 74°C. Vibration stabilizes. Schedules vib analysis for next outage.",
    tone: "ok" as const,
    icon: Wrench,
  },
  {
    time: "T+24h",
    title: "Confidence reinforced",
    desc: "Operator marks fix successful. FX-088 confidence: 0.34 → 0.45 (n=3, 0 failures). Future alerts rank this fix higher.",
    tone: "ok" as const,
    icon: CheckCircle2,
  },
];

const beforeAfter = [
  { metric: "MTTR", before: "11.2h", after: "4.7h", delta: "-58%", icon: Clock, trend: "down" },
  { metric: "Repeat incidents", before: "4 / year", after: "1 / year", delta: "-75%", icon: TrendingDown, trend: "down" },
  { metric: "Fix confidence (FX-088)", before: "0.34", after: "0.93", delta: "+173%", icon: Brain, trend: "up" },
  { metric: "Operator onboarding", before: "6 weeks", after: "9 days", delta: "-79%", icon: Activity, trend: "down" },
];

const telemetry = [
  { label: "Vibration", value: 3.2, unit: "mm/s", threshold: 2.5, icon: Vibrate, tone: "error" as const },
  { label: "Bearing temp", value: 81, unit: "°C", threshold: 75, icon: Thermometer, tone: "error" as const },
  { label: "Discharge pressure", value: 14.2, unit: "bar", threshold: 16, icon: Droplet, tone: "ok" as const },
];

export default function CaseStudyPage() {
  return (
    <>
      <Section
        eyebrow="Case study"
        title="P-102 Feed Pump: a failure caught early"
        description="Northgate Refinery, Feed Unit A. A bearing-wear failure that would have cost $340K in unplanned downtime was caught 6 hours before escalation — because a shift note from 3 days earlier was already in the graph."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GlassCard className="p-6">
            <div className="font-mono text-3xl font-bold text-gradient">$340K</div>
            <p className="mt-2 text-sm text-fg-muted">Estimated downtime cost avoided</p>
          </GlassCard>
          <GlassCard className="p-6">
            <div className="font-mono text-3xl font-bold text-gradient">6h</div>
            <p className="mt-2 text-sm text-fg-muted">Lead time before failure escalated</p>
          </GlassCard>
          <GlassCard className="p-6">
            <div className="font-mono text-3xl font-bold text-gradient">3</div>
            <p className="mt-2 text-sm text-fg-muted">Historical incidents matched in the graph</p>
          </GlassCard>
        </div>
      </Section>

      {/* Telemetry snapshot */}
      <Section
        eyebrow="T-6h snapshot"
        title="Telemetry at the moment of alert"
        description="Three signals crossed thresholds simultaneously. The anomaly detector fused them into a single high-confidence event."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {telemetry.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <t.icon className="h-5 w-5 text-fg-muted" />
                    <span className="font-mono text-sm text-fg">{t.label}</span>
                  </div>
                  <StatusPill status={t.tone} pulse={t.tone === "error"}>
                    {t.value > t.threshold ? "over" : "ok"}
                  </StatusPill>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="font-mono text-4xl font-bold text-fg">{t.value}</span>
                  <span className="mb-1 font-mono text-sm text-fg-muted">{t.unit}</span>
                </div>
                <div className="mt-2 text-xs text-fg-subtle">threshold: {t.threshold} {t.unit}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className={`h-full rounded-full ${t.tone === "error" ? "bg-error" : "bg-success"}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min((t.value / t.threshold) * 100, 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section
        eyebrow="Timeline"
        title="72 hours from whisper to fix"
        description="The graph connected a vague shift note to a concrete failure mode and a known fix — days before telemetry crossed the threshold."
      >
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-border sm:left-6" />
          <div className="space-y-6">
            {timeline.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative flex gap-4 sm:gap-6"
              >
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-bg bg-surface sm:h-12 sm:w-12">
                  <event.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                    event.tone === "ok" ? "text-success" : event.tone === "warn" ? "text-warning" : "text-info"
                  }`} />
                </div>
                <GlassCard className="flex-1 p-5">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-bold ${
                      event.tone === "ok" ? "text-success" : event.tone === "warn" ? "text-warning" : "text-info"
                    }`}>{event.time}</span>
                    <h3 className="font-semibold text-fg">{event.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{event.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Telegram alert screenshots */}
      <Section
        eyebrow="Real alerts in action"
        title="Telegram alert timeline"
        description="Actual screenshots from the Northgate Refinery deployment. From detection to technician acknowledgement to fix confirmation — the full alert lifecycle on a real phone."
      >
        <AlertTimeline />
      </Section>

      {/* Before / after */}
      <Section
        eyebrow="Impact"
        title="Before vs. after Smriti OS"
        description="Measured over the 6 months following deployment on Feed Unit A. Numbers from the plant's CMMS and Smriti's own graph."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {beforeAfter.map((m, i) => (
            <motion.div
              key={m.metric}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard hover className="h-full p-6">
                <div className="flex items-center justify-between">
                  <m.icon className="h-5 w-5 text-fg-muted" />
                  {m.trend === "down" ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-success" />
                  )}
                </div>
                <h3 className="mt-3 text-sm font-medium text-fg-muted">{m.metric}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-lg text-fg-subtle line-through">{m.before}</span>
                  <span className="text-fg-subtle">→</span>
                  <span className="font-mono text-2xl font-bold text-fg">{m.after}</span>
                </div>
                <div className="mt-2">
                  <StatusPill status="ok">{m.delta}</StatusPill>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Confidence growth */}
      <Section
        eyebrow="Confidence journey"
        title="How trust in fix FX-088 grew"
        description="Each operator confirmation nudged the Wilson-score lower bound upward. The system earned its confidence — it wasn't given it."
      >
        <GlassCard className="p-6 lg:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="grid grid-cols-3 gap-4">
                <MetricGauge label="n=2 · 0 fail" value={34} unit="%" tone="warning" size="sm" />
                <MetricGauge label="n=10 · 1 fail" value={72} unit="%" tone="primary" size="sm" />
                <MetricGauge label="n=50 · 0 fail" value={93} unit="%" tone="success" size="sm" />
              </div>
              <p className="mt-6 text-sm text-fg-muted">
                The fix that saved P-102 was first recorded with only 2 confirmations — confidence 0.34.
                Six months later, after 50 successful applications, it's the highest-ranked fix in the unit.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { stage: "Initial capture", n: "n=2, 0 fail", conf: 0.34, note: "From a single shift note" },
                { stage: "3rd confirmation", n: "n=3, 0 fail", conf: 0.45, note: "Operator marked success" },
                { stage: "10th application", n: "n=10, 1 fail", conf: 0.72, note: "One recurrence — system stayed honest" },
                { stage: "50th application", n: "n=50, 0 fail", conf: 0.93, note: "Now the default recommendation" },
              ].map((row, i) => (
                <motion.div
                  key={row.stage}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 rounded-lg border border-border bg-surface/40 p-3"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs text-fg-subtle">{row.n}</div>
                    <div className="text-sm font-medium text-fg">{row.stage}</div>
                    <div className="text-xs text-fg-muted">{row.note}</div>
                  </div>
                  <div className="font-mono text-2xl font-bold text-primary-300">{row.conf.toFixed(2)}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>
      </Section>

      <Section>
        <GlassCard strong className="p-10 text-center lg:p-16">
          <h2 className="text-3xl font-semibold tracking-tight text-fg">
            This is what a plant that remembers looks like
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
            Every shift note, every fix, every near-miss compounds into institutional knowledge.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CTAButton href="/demo" variant="primary">Run the live demo</CTAButton>
            <CTAButton href="/deploy" variant="secondary">Deploy in your plant</CTAButton>
          </div>
        </GlassCard>
      </Section>
    </>
  );
}
