"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ShieldCheck, UserCheck, Zap } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

interface TimelineStep {
  step: string;
  title: string;
  time: string;
  caption: string;
  badgeColor: string;
  chatBubble: {
    tag: string;
    header: string;
    body: string[];
    buttons?: string[];
  };
}

const steps: TimelineStep[] = [
  {
    step: "01",
    title: "Pressure Drop Detected",
    time: "14:02:18 UTC",
    caption:
      "Pressure Drop Detected — P-102 pressure dropped 18.2% → auto-matched to seal leak fix (78% confidence)",
    badgeColor: "from-amber-500 to-red-500",
    chatBubble: {
      tag: "🚨 CRITICAL TELEMETRY ALERT",
      header: "Feed Pump P-102 — Seal Vibration",
      body: [
        "Metric: Discharge Pressure (-18.2%)",
        "Sensor Value: 11.6 bar (Norm: 14.2 bar)",
        "Auto-Matched Fix: Clear upstream Valve V-101",
        "Wilson Confidence: 78.2% (Verified)",
      ],
      buttons: ["⚡ Acknowledge Alert", "📄 View Graph"],
    },
  },
  {
    step: "02",
    title: "Technician Acknowledges",
    time: "14:03:05 UTC",
    caption:
      "Technician Acknowledges — TECH-01 taps 'Acknowledge' → dashboard updates, SSE pushes to all clients",
    badgeColor: "from-blue-500 to-indigo-500",
    chatBubble: {
      tag: "⚡ ALERT ACKNOWLEDGED",
      header: "Technician Dispatched to Unit 4",
      body: [
        "Operator: TECH-01 (Rajesh Kumar)",
        "Action: Inspected upstream V-101 valve stem",
        "SSE Alert Bus: Broadcasted to control room",
        "Status: In-Progress",
      ],
      buttons: ["🛠️ Confirm Remedy", "❌ Reject"],
    },
  },
  {
    step: "03",
    title: "Fix Confirmed & Memory Updated",
    time: "14:08:42 UTC",
    caption:
      "Fix Confirmed — Gland nut tightened → pressure stabilized → TECH-01 confirms → Wilson score 0.5→0.78",
    badgeColor: "from-emerald-500 to-teal-500",
    chatBubble: {
      tag: "🎉 REMEDY CONFIRMED & INSTANTIATED",
      header: "Pressure Stabilized at 14.1 bar",
      body: [
        "Applied Action: Cleared V-101 obstruction",
        "Result: Seal leak resolved, pressure restored",
        "Wilson Score Re-evaluated: 0.50 → 0.78",
        "Institutional Memory: Permanently Indexed",
      ],
    },
  },
];

export function AlertTimeline() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {steps.map((shot, i) => (
        <motion.div
          key={shot.step}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.5 }}
          whileHover={{ y: -4 }}
        >
          <GlassCard hover className="flex h-full flex-col overflow-hidden p-0">
            {/* Telegram App Interface Mockup */}
            <div className="relative flex flex-1 flex-col bg-[#17212B] p-4 text-left font-sans">
              {/* Telegram App Header Bar */}
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-xs font-bold text-white shadow-sm">
                    S
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Smriti Alert Bot</p>
                    <p className="text-[10px] text-cyan-400">@8872136182 • bot</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-gray-400">{shot.time}</span>
              </div>

              {/* Telegram Message Bubble */}
              <div className="relative rounded-2xl rounded-tl-sm border border-white/10 bg-[#242F3D] p-3.5 shadow-lg">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-400">
                    {shot.chatBubble.tag}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white mb-2">{shot.chatBubble.header}</p>

                <ul className="mb-3 space-y-1 text-[11px] text-gray-300">
                  {shot.chatBubble.body.map((line, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-cyan-400" />
                      {line}
                    </li>
                  ))}
                </ul>

                {/* Inline Action Buttons */}
                {shot.chatBubble.buttons && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                    {shot.chatBubble.buttons.map((btn, bIdx) => (
                      <div
                        key={bIdx}
                        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-center font-mono text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/20"
                      >
                        {btn}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step badge */}
              <div
                className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${shot.badgeColor} font-mono text-xs font-bold text-white shadow-md`}
              >
                {shot.step}
              </div>
            </div>

            {/* Caption */}
            <div className="border-t border-white/10 bg-[#0E1621] p-4">
              <p className="text-xs font-semibold text-cyan-300 mb-1">{shot.title}</p>
              <p className="text-xs leading-relaxed text-fg-muted">{shot.caption}</p>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
