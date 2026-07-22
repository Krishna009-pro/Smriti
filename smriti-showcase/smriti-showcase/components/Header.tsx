"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { navLinks, siteConfig } from "@/lib/site";
import { cn } from "@/lib/cn";
import { SSEBadge } from "./SSEBadge";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10 overflow-hidden shadow-sm">
            <img src="/favicon.svg" alt="Smriti OS Logo" className="h-7 w-7 object-contain" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-fg">
            Smriti<span className="text-primary-400">OS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary-300 bg-primary/10"
                    : "text-fg-muted hover:text-fg hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <SSEBadge />
          </div>
          <ThemeToggle />
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface/60 text-fg-muted transition-colors hover:text-fg sm:flex"
            aria-label="GitHub"
          >
            <Code2 className="h-4 w-4" />
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface/60 text-fg-muted md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-bg-soft md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
                    pathname === link.href
                      ? "bg-primary/10 text-primary-300"
                      : "text-fg-muted hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2">
                <SSEBadge />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
