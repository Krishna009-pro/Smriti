"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface ArchitectureNodeData {
  label: string;
  subtitle?: string;
  kind: "ingest" | "core" | "serve" | "alert" | "store";
  active?: boolean;
}

const kindStyles: Record<ArchitectureNodeData["kind"], { border: string; bg: string; dot: string }> = {
  ingest: { border: "border-secondary/40", bg: "bg-secondary/5", dot: "bg-secondary" },
  core: { border: "border-primary/40", bg: "bg-primary/5", dot: "bg-primary" },
  serve: { border: "border-accent/40", bg: "bg-accent/5", dot: "bg-accent" },
  alert: { border: "border-warning/40", bg: "bg-warning/5", dot: "bg-warning" },
  store: { border: "border-info/40", bg: "bg-info/5", dot: "bg-info" },
};

export function ArchitectureNode({ data }: NodeProps<ArchitectureNodeData>) {
  const style = kindStyles[data.kind];
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className={cn(
        "relative rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md",
        style.border,
        style.bg,
        data.active && "ring-2 ring-primary"
      )}
      style={{ minWidth: 160 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !border-none" />
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", style.dot)} />
        <span className="font-mono text-sm font-semibold text-fg">{data.label}</span>
      </div>
      {data.subtitle && (
        <span className="mt-1 block text-xs text-fg-muted">{data.subtitle}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary !border-none" />
    </motion.div>
  );
}
