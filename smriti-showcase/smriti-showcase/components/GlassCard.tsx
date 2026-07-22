import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  hover?: boolean;
}

export function GlassCard({
  children,
  className,
  strong = false,
  hover = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-2xl",
        hover && "transition-transform duration-300 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
