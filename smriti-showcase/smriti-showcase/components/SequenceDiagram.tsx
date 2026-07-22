"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SequenceStep {
  from: string;
  to: string;
  label: string;
  detail?: string;
}

interface SequenceDiagramProps {
  actors: string[];
  steps: SequenceStep[];
  className?: string;
}

export function SequenceDiagram({ actors, steps, className }: SequenceDiagramProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[640px]">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${actors.length}, 1fr)` }}>
          {actors.map((actor) => (
            <div key={actor} className="flex flex-col items-center">
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
                <span className="font-mono text-xs font-semibold text-fg">{actor}</span>
              </div>
              <div className="mt-2 w-px flex-1 bg-border" style={{ minHeight: steps.length * 56 + 16 }} />
            </div>
          ))}
        </div>
        <div className="relative mt-2 space-y-2">
          {steps.map((step, i) => {
            const fromIdx = actors.indexOf(step.from);
            const toIdx = actors.indexOf(step.to);
            const reverse = toIdx < fromIdx;
            const left = (Math.min(fromIdx, toIdx) / actors.length) * 100;
            const width = (Math.abs(toIdx - fromIdx) / actors.length) * 100;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: reverse ? -10 : 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative h-12"
                style={{ marginLeft: `${left}%`, width: `${width}%` }}
              >
                <div className="absolute inset-0 flex items-center">
                  <div
                    className={cn(
                      "flex-1 border-t border-dashed border-primary/40",
                      reverse && "border-l border-t-0 border-primary/40"
                    )}
                  />
                  <ArrowRight
                    className={cn("h-4 w-4 text-primary", reverse && "rotate-180")}
                  />
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-bg-soft px-2 py-0.5 text-xs text-fg-muted">
                  {step.label}
                </div>
                {step.detail && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-fg-subtle">
                    {step.detail}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
