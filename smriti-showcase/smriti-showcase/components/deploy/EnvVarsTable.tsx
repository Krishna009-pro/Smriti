"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

interface EnvVar {
  name: string;
  desc: string;
  required: boolean;
  sensitive: boolean;
  default: string;
}

const envVars: EnvVar[] = [
  { name: "VITE_API_URL", desc: "Browser-facing API backend URL", required: true, sensitive: false, default: "https://smriti-tbxd.onrender.com" },
  { name: "DATABASE_URL", desc: "PostgreSQL database connection URL (Render / Supabase)", required: true, sensitive: true, default: "postgresql://..." },
  { name: "GEMINI_API_KEY", desc: "Google Gemini API key for multimodal vision & RAG", required: true, sensitive: true, default: "—" },
  { name: "OPENROUTER_API_KEY", desc: "OpenRouter API key for LLM completions", required: false, sensitive: true, default: "—" },
  { name: "TELEGRAM_BOT_TOKEN", desc: "Telegram Bot API token for field alerts (@8872136182)", required: false, sensitive: true, default: "—" },
];

export function EnvVarsTable() {
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-bg-soft/50">
            <tr>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Name</th>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Description</th>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Required</th>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Sensitive</th>
              <th className="px-6 py-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">Default</th>
            </tr>
          </thead>
          <tbody>
            {envVars.map((v, i) => (
              <motion.tr
                key={v.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0"
              >
                <td className="px-6 py-3 font-mono text-primary-300">{v.name}</td>
                <td className="px-6 py-3 text-fg-muted">{v.desc}</td>
                <td className="px-6 py-3">
                  {v.required ? (
                    <span className="inline-flex items-center gap-1 text-error">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs">Yes</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-fg-subtle">
                      <X className="h-3.5 w-3.5" />
                      <span className="text-xs">No</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {v.sensitive ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs">Yes</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-fg-subtle">
                      <X className="h-3.5 w-3.5" />
                      <span className="text-xs">No</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 font-mono text-fg-subtle">{v.default}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
