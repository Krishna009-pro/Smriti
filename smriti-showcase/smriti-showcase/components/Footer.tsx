import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { Code2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-soft/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-secondary">
                <span className="font-mono text-sm font-bold text-bg">S</span>
              </div>
              <span className="font-mono text-sm font-semibold text-fg">
                Smriti<span className="text-primary-400">OS</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-fg-muted">
              {siteConfig.description}
            </p>
          </div>
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Product
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/architecture" className="text-fg-muted hover:text-fg">Architecture</Link></li>
              <li><Link href="/demo" className="text-fg-muted hover:text-fg">Live Demo</Link></li>
              <li><Link href="/api" className="text-fg-muted hover:text-fg">API Reference</Link></li>
              <li><Link href="/case-study" className="text-fg-muted hover:text-fg">Case Study</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Resources
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/deploy" className="text-fg-muted hover:text-fg">Deploy Guide</Link></li>
              <li><a href={siteConfig.github} className="text-fg-muted hover:text-fg inline-flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> GitHub</a></li>
              <li><a href={`mailto:hello@${siteConfig.url.replace("https://", "")}`} className="text-fg-muted hover:text-fg">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} Smriti OS. Built for heavy industry.
          </p>
          <p className="font-mono text-xs text-fg-subtle">
            v0.4.0 · Wilson-score confidence engine
          </p>
        </div>
      </div>
    </footer>
  );
}
