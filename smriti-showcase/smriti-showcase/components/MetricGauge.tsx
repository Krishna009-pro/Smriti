"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface MetricGaugeProps {
  label: string;
  value: number;
  unit?: string;
  max?: number;
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "success" | "warning" | "error";
  animate?: boolean;
}

const toneColors: Record<string, string> = {
  primary: "stroke-primary-400",
  success: "stroke-success",
  warning: "stroke-warning",
  error: "stroke-error",
};

const sizes = {
  sm: { r: 28, stroke: 4, label: "text-xs", value: "text-lg" },
  md: { r: 40, stroke: 6, label: "text-sm", value: "text-2xl" },
  lg: { r: 56, stroke: 8, label: "text-base", value: "text-4xl" },
};

export function MetricGauge({
  label,
  value,
  unit = "%",
  max = 100,
  size = "md",
  tone = "primary",
  animate = true,
}: MetricGaugeProps) {
  const s = sizes[size];
  const circumference = 2 * Math.PI * s.r;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: (s.r + s.stroke) * 2, height: (s.r + s.stroke) * 2 }}>
        <svg width={(s.r + s.stroke) * 2} height={(s.r + s.stroke) * 2} className="-rotate-90">
          <circle
            cx={s.r + s.stroke}
            cy={s.r + s.stroke}
            r={s.r}
            fill="none"
            strokeWidth={s.stroke}
            className="stroke-white/5"
          />
          <motion.circle
            cx={s.r + s.stroke}
            cy={s.r + s.stroke}
            r={s.r}
            fill="none"
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            className={cn(toneColors[tone])}
            initial={animate ? { strokeDashoffset: circumference } : false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-mono font-semibold text-fg", s.value)}>
            {value}
            <span className="text-fg-muted text-sm font-normal">{unit}</span>
          </span>
        </div>
      </div>
      <span className={cn("text-fg-muted", s.label)}>{label}</span>
    </div>
  );
}
