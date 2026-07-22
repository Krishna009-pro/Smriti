"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Network,
  Radio,
  Send,
  Loader2,
  Zap,
  Brain,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { MetricGauge } from "@/components/MetricGauge";
import { StatusPill } from "@/components/StatusPill";
import { Section } from "@/components/Section";
import { CTAButton } from "@/components/CTAButton";
import { CodeBlock } from "@/components/CodeBlock";
import { TelegramAlertPreview } from "@/components/demo/TelegramAlertPreview";
import metrics from "@/data/demo-metrics.json";

type StepStatus = "pending" | "active" | "done";

interface DemoStep {
  id: string;
  icon: typeof Eye;
  title: string;
  desc: string;
}

const demoSteps: DemoStep[] = [
  { id: "ingest", icon: FileText, title: "Ingest shift note", desc: "NLP extracts triples from an operator note about P-102 vibration." },
  { id: "trace", icon: Network, title: "Trace the graph", desc: "3-hop path from P-102 to its likely failure mode and known fixes." },
  { id: "alert", icon: AlertTriangle, title: "Proactive alert", desc: "Telemetry threshold crossed — SSE pushes an anomaly to the dashboard." },
  { id: "feedback", icon: Brain, title: "Confidence feedback", desc: "Operator confirms the fix; Wilson-score recomputes and re-weights." },
];

const ingestNote = `P-102 vibrating at 3.2 mm/s, bearing housing hot to touch.
Bled off load to 60%, bearing temp dropped from 81°C to 74°C.
Likely bearing wear — schedule vibration analysis. — shift-A-lead`;

const traceResult = `{
  "root": "P-102",
  "depth": 3,
  "nodes": [
    { "id": "P-102", "label": "Feed Pump", "type": "Equipment" },
    { "id": "FM-014", "label": "Bearing Wear", "type": "FailureMode" },
    { "id": "FX-088", "label": "Bleed load + vib analysis", "type": "Fix" },
    { "id": "N-3391", "label": "Shift note 2026-07-19", "type": "Note" }
  ],
  "edges": [
    { "from": "P-102", "rel": "HAS_FAILURE_MODE", "to": "FM-014" },
    { "from": "FM-014", "rel": "RESOLVED_BY", "to": "FX-088" },
    { "from": "N-3391", "rel": "MENTIONS", "to": "P-102" }
  ]
}`;

const alertEvent = `event: anomaly
data: {"anomaly_id":"a-7f3c","equipment_id":"P-102","severity":"high","confidence":0.81,"detected_at":"2026-07-19T22:14:02Z"}`;

const feedbackResult = `{
  "node_id": "FX-088",
  "successes": 3,
  "failures": 0,
  "wilson_lower": 0.45,
  "wilson_center": 0.60,
  "delta": "+0.11"
}`;

export default function DemoPage() {
  const [stepStatus, setStepStatus] = useState<Record<string, StepStatus>>({
    ingest: "pending",
    trace: "pending",
    alert: "pending",
    feedback: "pending",
  });
  const [currentStep, setCurrentStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [simulateResult, setSimulateResult] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const eventLogRef = useRef<HTMLDivElement>(null);

  // Simulated SSE listener
  useEffect(() => {
    if (events.length === 0) return;
    const t = setTimeout(() => {
      if (eventLogRef.current) {
        eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(t);
  }, [events]);

  const runStep = async (stepId: string, idx: number) => {
    setStepStatus((s) => ({ ...s, [stepId]: "active" }));
    await new Promise((r) => setTimeout(r, 1400));
    setStepStatus((s) => ({ ...s, [stepId]: "done" }));
    if (stepId === "alert") {
      setEvents((e) => [...e, alertEvent]);
    }
  };

  const runFullDemo = async () => {
    if (running) return;
    setRunning(true);
    setStepStatus({ ingest: "pending", trace: "pending", alert: "pending", feedback: "pending" });
    setEvents([]);
    for (let i = 0; i < demoSteps.length; i++) {
      setCurrentStep(i);
      await runStep(demoSteps[i].id, i);
    }
    setCurrentStep(-1);
    setRunning(false);
  };

  const runSingleStep = async (stepId: string) => {
    if (running) return;
    setRunning(true);
    const idx = demoSteps.findIndex((s) => s.id === stepId);
    setCurrentStep(idx);
    setStepStatus((s) => ({ ...s, [stepId]: "pending" }));
    await runStep(stepId, idx);
    setCurrentStep(-1);
    setRunning(false);
  };

  const simulateAnomaly = async () => {
    setSimulating(true);
    setSimulateResult(null);
    try {
      // In production this hits the real backend. We simulate the response shape.
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.smriti-os.example.com";
      try {
        const res = await fetch(`${baseUrl}/api/telemetry/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ equipment_id: "P-102", severity: "high" }),
        });
        if (res.ok) {
          const data = await res.json();
          setSimulateResult(JSON.stringify(data, null, 2));
          setEvents((e) => [...e, `event: anomaly\ndata: ${JSON.stringify(data)}`]);
          return;
        }
      } catch {
        /* fall through to simulated */
      }
      // Simulated response (no backend wired in this showcase)
      await new Promise((r) => setTimeout(r, 900));
      const simulated = {
        anomaly_id: "a-" + Math.random().toString(16).slice(2, 6),
        equipment_id: "P-102",
        severity: "high",
        confidence: 0.81,
        detected_at: new Date().toISOString(),
      };
      setSimulateResult(JSON.stringify(simulated, null, 2));
      setEvents((e) => [...e, `event: anomaly\ndata: ${JSON.stringify(simulated)}`]);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <Section
        eyebrow="Live demo"
        title="Ingest → Trace → Alert → Feedback"
        description="A controlled walkthrough of the full Smriti OS loop. Run all steps, or trigger each individually. The 'Simulate Anomaly' button hits the real backend when configured."
      >
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={runFullDemo}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary px-5 py-3 text-sm font-semibold text-bg transition-all hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {running ? "Running…" : "Run full demo"}
          </button>
          <button
            onClick={simulateAnomaly}
            disabled={simulating}
            className="inline-flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-5 py-3 text-sm font-semibold text-warning transition-all hover:bg-warning/20 disabled:opacity-50"
          >
            {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            {simulating ? "Injecting…" : "Simulate Anomaly"}
          </button>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {demoSteps.map((step, i) => {
            const status = stepStatus[step.id];
            const isActive = currentStep === i;
            return (
              <motion.button
                key={step.id}
                onClick={() => runSingleStep(step.id)}
                disabled={running}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="text-left disabled:cursor-not-allowed"
              >
                <GlassCard
                  className={`h-full p-5 transition-all ${
                    isActive ? "ring-2 ring-primary" : ""
                  } ${status === "done" ? "border-success/30" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <step.icon className="h-5 w-5 text-primary-300" />
                    </div>
                    {status === "done" && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {isActive && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                  <h3 className="mt-3 font-mono text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Step {i + 1}
                  </h3>
                  <p className="mt-1 font-semibold text-fg">{step.title}</p>
                  <p className="mt-1 text-xs text-fg-muted">{step.desc}</p>
                </GlassCard>
              </motion.button>
            );
          })}
        </div>
      </Section>

      {/* Embedded dashboard */}
      <Section
        eyebrow="Dashboard"
        title="Real-time React dashboard"
        description="Live metrics, graph traces, and anomaly feeds. In production this is an iframe to the deployed dashboard."
      >
        <GlassCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm text-fg-muted">Northgate Refinery · Feed Unit A</span>
            </div>
            <StatusPill status="ok" pulse>Streaming · SSE</StatusPill>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            {/* Metrics */}
            <div className="lg:col-span-1">
              <h4 className="mb-4 font-mono text-xs uppercase tracking-wider text-fg-subtle">Live Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <MetricGauge label={metrics.retention.label} value={metrics.retention.value} tone="success" size="sm" />
                <MetricGauge label={metrics.dependency_score.label} value={metrics.dependency_score.value} unit="/100" max={100} tone="primary" size="sm" />
                <MetricGauge label="MTTR" value={metrics.mttr_hours.value} unit="h" max={10} tone="primary" size="sm" />
                <MetricGauge label="Compliance" value={metrics.compliance.value} unit="" max={10} tone="warning" size="sm" />
              </div>
            </div>

            {/* Equipment health */}
            <div className="lg:col-span-1">
              <h4 className="mb-4 font-mono text-xs uppercase tracking-wider text-fg-subtle">Equipment Health</h4>
              <div className="space-y-3">
                {metrics.top_equipment.map((eq) => (
                  <div key={eq.id} className="rounded-lg border border-border bg-surface/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-fg">{eq.id} · {eq.name}</span>
                      <StatusPill status={eq.health > 80 ? "ok" : eq.health > 65 ? "warn" : "error"}>
                        {eq.health}%
                      </StatusPill>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className={`h-full rounded-full ${eq.health > 80 ? "bg-success" : eq.health > 65 ? "bg-warning" : "bg-error"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${eq.health}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event log */}
            <div className="lg:col-span-1">
              <h4 className="mb-4 font-mono text-xs uppercase tracking-wider text-fg-subtle">Anomaly Feed</h4>
              <div ref={eventLogRef} className="h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-bg-soft/50 p-3">
                <AnimatePresence>
                  {metrics.recent_events.map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 rounded-md border border-border bg-surface/40 p-2"
                    >
                      <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 ${ev.severity === "high" ? "text-error" : ev.severity === "medium" ? "text-warning" : "text-info"}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-fg">{ev.equipment}</span>
                          <span className="font-mono text-[10px] text-fg-subtle">{ev.ts}</span>
                        </div>
                        <p className="text-xs text-fg-muted">{ev.event}</p>
                      </div>
                    </motion.div>
                  ))}
                  {events.map((ev, i) => (
                    <motion.div
                      key={`live-${i}`}
                      initial={{ opacity: 0, x: -10, backgroundColor: "rgba(20,184,166,0.2)" }}
                      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(20,184,166,0.05)" }}
                      className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2"
                    >
                      <Radio className="mt-0.5 h-3.5 w-3.5 text-primary animate-pulse" />
                      <div className="flex-1">
                        <span className="font-mono text-[10px] text-primary-300">SSE · live</span>
                        <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-fg-muted">{ev}</pre>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </GlassCard>
      </Section>

      {/* Telegram alert preview */}
      <Section
        eyebrow="Telegram alerts"
        title="Real-time alert delivery"
        description="When an anomaly is detected, Smriti OS sends a Telegram alert to on-call technicians. Trigger a test alert to see the full flow — from anomaly detection to Telegram delivery."
      >
        <TelegramAlertPreview />
      </Section>

      {/* Step detail panels */}
      <Section
        eyebrow="Step detail"
        title="What each step produces"
        description="The raw payloads that flow through the system at each stage."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary" />
              <h3 className="font-semibold text-fg">1. Ingest — shift note input</h3>
            </div>
            <CodeBlock code={ingestNote} language="text" title="operator-note.txt" className="mt-4" />
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary-300" />
              <h3 className="font-semibold text-fg">2. Trace — graph result</h3>
            </div>
            <CodeBlock code={traceResult} language="json" title="GET /api/graph/trace?equipment_id=P-102" className="mt-4" />
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-fg">3. Alert — SSE event</h3>
            </div>
            <CodeBlock code={alertEvent} language="text" title="GET /api/telemetry/stream" className="mt-4" />
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-fg">4. Feedback — confidence update</h3>
            </div>
            <CodeBlock code={feedbackResult} language="json" title="POST /api/confidence/FX-088" className="mt-4" />
          </GlassCard>
        </div>

        {simulateResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-warning" />
                  <h3 className="font-semibold text-fg">Simulate Anomaly — response</h3>
                </div>
                <button onClick={() => setSimulateResult(null)} className="text-fg-muted hover:text-fg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CodeBlock code={simulateResult} language="json" title="POST /api/telemetry/simulate" className="mt-4" />
            </GlassCard>
          </motion.div>
        )}
      </Section>

      <Section>
        <div className="flex flex-wrap justify-center gap-4">
          <CTAButton href="/api" variant="primary">Read the API reference</CTAButton>
          <CTAButton href="/case-study" variant="secondary">See the P-102 case study</CTAButton>
        </div>
      </Section>
    </>
  );
}
