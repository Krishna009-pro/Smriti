"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/cn";

type SSEState = "connecting" | "live" | "degraded" | "offline";

const stateConfig: Record<SSEState, { color: string; label: string; pulse: boolean }> = {
  connecting: { color: "text-warning", label: "Connecting", pulse: true },
  live: { color: "text-success", label: "Live", pulse: true },
  degraded: { color: "text-warning", label: "Degraded", pulse: false },
  offline: { color: "text-error", label: "Offline", pulse: false },
};

export function SSEBadge() {
  const [state, setState] = useState<SSEState>("connecting");

  useEffect(() => {
    const t1 = setTimeout(() => setState("live"), 1200);
    // simulate occasional jitter
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev === "offline") return "connecting";
        const r = Math.random();
        if (r > 0.96) return "degraded";
        if (r > 0.92) return "connecting";
        return "live";
      });
    }, 8000);
    return () => {
      clearTimeout(t1);
      clearInterval(interval);
    };
  }, []);

  const cfg = stateConfig[state];

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        {cfg.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              cfg.color.replace("text-", "bg-")
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", cfg.color.replace("text-", "bg-"))} />
      </span>
      <span className={cn("font-mono text-xs font-medium", cfg.color)}>{cfg.label}</span>
      <Radio className={cn("h-3.5 w-3.5", cfg.color)} />
    </div>
  );
}
