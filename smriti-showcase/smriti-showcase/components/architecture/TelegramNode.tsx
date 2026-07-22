"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TelegramNodeData {
  label: string;
  icon: LucideIcon;
  status?: "live" | "warning" | "critical" | "ai";
  color?: string;
  bg?: string;
  border?: string;
  active?: boolean;
}

const statusDot: Record<string, string> = {
  live: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
  ai: "bg-purple-400",
};

export function TelegramNode({ data }: NodeProps<TelegramNodeData>) {
  const Icon = data.icon;
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className={cn(
        "relative rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md",
        data.border ?? "border-blue-500/30",
        data.bg ?? "bg-blue-500/10",
        data.active && "ring-2 ring-primary"
      )}
      style={{ minWidth: 160 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-500 !border-none" />
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn("h-4 w-4", data.color ?? "text-blue-400")} />}
        <span className="font-mono text-sm font-semibold text-fg">{data.label}</span>
      </div>
      {data.status && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", statusDot[data.status])} />
          <span className="text-xs text-fg-muted">{data.status}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !border-none" />
    </motion.div>
  );
}
