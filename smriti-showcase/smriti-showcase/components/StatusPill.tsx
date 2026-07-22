import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Status = "ok" | "warn" | "error" | "info" | "neutral";

interface StatusPillProps {
  children: ReactNode;
  status?: Status;
  pulse?: boolean;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  ok: "bg-success/10 text-success border-success/30",
  warn: "bg-warning/10 text-warning border-warning/30",
  error: "bg-error/10 text-error border-error/30",
  info: "bg-info/10 text-info border-info/30",
  neutral: "bg-white/5 text-fg-muted border-white/10",
};

const dotColor: Record<Status, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  neutral: "bg-fg-subtle",
};

export function StatusPill({
  children,
  status = "neutral",
  pulse = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColor[status]
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor[status])} />
      </span>
      {children}
    </span>
  );
}
