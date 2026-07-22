"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  external?: boolean;
}

export function CTAButton({
  href,
  children,
  variant = "primary",
  className,
  external = false,
}: CTAButtonProps) {
  const styles = {
    primary:
      "bg-gradient-to-r from-primary-500 to-secondary text-bg font-semibold hover:shadow-lg hover:shadow-primary/20",
    secondary:
      "border border-border bg-surface/60 text-fg hover:border-primary/40 hover:bg-primary/5",
    ghost: "text-fg-muted hover:text-fg",
  };

  const content = (
    <>
      {children}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  const cls = cn(
    "group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm transition-all",
    styles[variant],
    className
  );

  return (
    <motion.div whileHover={{ x: 4 }} className="inline-block">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {content}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {content}
        </Link>
      )}
    </motion.div>
  );
}
