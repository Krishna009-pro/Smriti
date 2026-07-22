"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, eyebrow, title, description, children, className }: SectionProps) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {(eyebrow || title || description) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 max-w-2xl"
          >
            {eyebrow && (
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg leading-relaxed text-fg-muted">{description}</p>
            )}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  );
}
