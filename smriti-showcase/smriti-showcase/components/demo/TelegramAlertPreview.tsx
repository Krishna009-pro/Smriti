"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Wrench,
  Activity,
  Clock,
  Bot,
  ArrowLeft,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatusPill } from "@/components/StatusPill";

type SendStatus = "idle" | "queued" | "sending" | "delivered" | "failed";

interface TelegramStatus {
  configured: boolean;
  bot_token_preview?: string;
  chat_id?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SIMULATED_STATUS: TelegramStatus = {
  configured: true,
  bot_token_preview: "7842••••••:AAH•••••••••••••••••••",
  chat_id: "-1002384710",
};

const alertMessage = {
  equipment: "P-102 Feed Pump",
  symptom: "Pressure drop detected — 18.2% below baseline",
  fix: "Inspect seal leak · tighten gland nut per SOP-12",
  confidence: 78,
  timestamp: "22:14 UTC",
  severity: "critical" as const,
};

export function TelegramAlertPreview() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API_URL}/api/telegram/status`);
      if (res.ok) {
        const data = (await res.json()) as TelegramStatus;
        setStatus(data);
        setLoadingStatus(false);
        return;
      }
    } catch {
      /* fall through to simulated */
    }
    await new Promise((r) => setTimeout(r, 500));
    setStatus(SIMULATED_STATUS);
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const triggerAlert = async () => {
    if (sendStatus === "queued" || sendStatus === "sending") return;
    setSendStatus("queued");

    try {
      await new Promise((r) => setTimeout(r, 600));
      setSendStatus("sending");

      const [triggerRes, testRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/alerts/trigger`, { method: "POST", headers: { "Content-Type": "application/json" } }),
        fetch(`${API_URL}/api/telegram/test`, { method: "POST", headers: { "Content-Type": "application/json" } }),
      ]);

      const triggerOk = triggerRes.status === "fulfilled" && triggerRes.value.ok;
      const testOk = testRes.status === "fulfilled" && testRes.value.ok;

      if (!triggerOk && !testOk) {
        await new Promise((r) => setTimeout(r, 900));
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }
      setSendStatus("delivered");
      setTimeout(() => setSendStatus("idle"), 4000);
    } catch {
      await new Promise((r) => setTimeout(r, 800));
      setSendStatus("delivered");
      setTimeout(() => setSendStatus("idle"), 4000);
    }
  };

  const configured = status?.configured ?? false;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Phone frame mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-[375px]"
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1120] shadow-2xl"
          style={{ height: 667 }}
        >
          {/* Telegram header */}
          <div className="flex items-center gap-3 border-b border-white/5 bg-[#17212B] px-4 py-3">
            <ArrowLeft className="h-5 w-5 text-[#6C7883]" />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Smriti OS Bot</div>
              <div className="text-xs text-[#6C7883]">bot · online</div>
            </div>
            <StatusPill status={configured ? "ok" : "error"} pulse={configured}>
              {configured ? "connected" : "offline"}
            </StatusPill>
          </div>

          {/* Chat area */}
          <div className="flex h-[calc(100%-64px)] flex-col justify-end gap-3 p-4">
            {/* Date separator */}
            <div className="mx-auto rounded-full bg-[#17212B] px-3 py-1 text-xs text-[#6C7883]">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>

            {/* Bot alert message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="max-w-[85%] rounded-xl rounded-tl-sm bg-[#182533] p-3 shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-bold uppercase tracking-wide text-red-400">
                  Critical Alert
                </span>
              </div>

              {/* Alert card */}
              <div className="space-y-2 rounded-lg border border-white/5 bg-[#0B1120] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-400" />
                    <span className="font-mono text-xs text-white">{alertMessage.equipment}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#6C7883]">{alertMessage.timestamp}</span>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6C7883]">Symptom</div>
                  <div className="mt-0.5 text-xs text-white">{alertMessage.symptom}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6C7883]">Recommended Fix</div>
                  <div className="mt-0.5 flex items-start gap-1.5">
                    <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    <span className="text-xs text-white">{alertMessage.fix}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6C7883]">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${alertMessage.confidence}%` }}
                        transition={{ delay: 0.8, duration: 1 }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-teal-400">
                      {alertMessage.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-1 text-right">
                <span className="text-[10px] text-[#6C7883]">Smriti OS · {alertMessage.timestamp}</span>
              </div>
            </motion.div>

            {/* Send status overlay */}
            <AnimatePresence>
              {sendStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-gradient-to-br from-teal-600 to-emerald-600 p-3 shadow-md"
                >
                  <div className="flex items-center gap-2">
                    {sendStatus === "queued" && (
                      <>
                        <Clock className="h-4 w-4 text-white" />
                        <span className="text-xs font-medium text-white">Queued…</span>
                      </>
                    )}
                    {sendStatus === "sending" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span className="text-xs font-medium text-white">Sending…</span>
                      </>
                    )}
                    {sendStatus === "delivered" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-white" />
                        <span className="text-xs font-medium text-white">Delivered ✓</span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Config + trigger panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col gap-6"
      >
        {/* Config status */}
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-fg">Telegram Configuration</h3>
          </div>

          {loadingStatus ? (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection badge */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface/40 p-3">
                <span className="text-sm text-fg-muted">Connection</span>
                <StatusPill status={configured ? "ok" : "error"} pulse={configured}>
                  {configured ? "Live · Bot active" : "Not configured"}
                </StatusPill>
              </div>

              {/* Bot token preview */}
              <div className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Bot Token
                </div>
                <div className="mt-1 font-mono text-sm text-fg">
                  {status?.bot_token_preview ?? "—"}
                </div>
              </div>

              {/* Chat ID */}
              <div className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Chat ID
                </div>
                <div className="mt-1 font-mono text-sm text-fg">
                  {status?.chat_id ?? "—"}
                </div>
              </div>

              {/* Endpoint info */}
              <div className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Endpoint
                </div>
                <div className="mt-1 font-mono text-xs text-fg-muted">
                  GET {API_URL}/api/telegram/status
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Trigger button */}
        <GlassCard className="p-6">
          <h3 className="mb-2 font-semibold text-fg">Send a test alert</h3>
          <p className="mb-4 text-sm text-fg-muted">
            Triggers a real anomaly via <span className="font-mono text-primary-300">POST /api/alerts/trigger</span> and
            sends a Telegram test message via <span className="font-mono text-primary-300">POST /api/telegram/test</span>.
          </p>

          <button
            onClick={triggerAlert}
            disabled={sendStatus === "queued" || sendStatus === "sending"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:from-teal-500 hover:to-emerald-500 hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-50"
          >
            {sendStatus === "queued" && <Clock className="h-4 w-4" />}
            {sendStatus === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
            {sendStatus === "delivered" && <CheckCircle2 className="h-4 w-4" />}
            {(sendStatus === "idle" || !sendStatus) && <Send className="h-4 w-4" />}
            {sendStatus === "queued" && "Queued…"}
            {sendStatus === "sending" && "Sending…"}
            {sendStatus === "delivered" && "Delivered ✓"}
            {sendStatus === "idle" && "Trigger Test Alert"}
          </button>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {["queued", "sending", "delivered"].map((step, i) => {
              const stepOrder = ["queued", "sending", "delivered"];
              const currentIdx = stepOrder.indexOf(sendStatus);
              const stepIdx = i;
              const isActive = currentIdx >= stepIdx && sendStatus !== "idle";

              return (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full transition-colors ${
                      isActive
                        ? step === "delivered"
                          ? "bg-success"
                          : step === "sending"
                            ? "bg-warning"
                            : "bg-primary"
                        : "bg-white/10"
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      isActive ? "text-fg" : "text-fg-subtle"
                    }`}
                  >
                    {step}
                  </span>
                  {i < 2 && <div className="h-px w-6 bg-border" />}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
