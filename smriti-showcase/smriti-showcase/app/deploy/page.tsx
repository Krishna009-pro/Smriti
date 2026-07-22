"use client";

import { motion } from "framer-motion";
import { Terminal, Container, Settings, Box, Cloud, Check } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Section } from "@/components/Section";
import { CodeBlock } from "@/components/CodeBlock";
import { StatusPill } from "@/components/StatusPill";
import { CTAButton } from "@/components/CTAButton";
import { EnvVarsTable } from "@/components/deploy/EnvVarsTable";

const quickstart = `# 1. Clone
git clone https://github.com/Krishna009-pro/Smriti.git
cd Smriti

# 2. Configure Environment
cp .env.example .env
# Edit .env — set GEMINI_API_KEY, DATABASE_URL, etc.

# 3. Seed Database & Launch Backend
python scripts/reset_demo.py
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Dashboard:  https://smriti-three.vercel.app
# API Docs:   http://localhost:8000/docs`;

const dockerCompose = `version: "3.9"

services:
  web:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://api:8000
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/smriti
      - GEMINI_API_KEY=\${GEMINI_API_KEY:-}
      - TELEGRAM_BOT_TOKEN=\${TELEGRAM_BOT_TOKEN:-}
    depends_on:
      - db`;
      - neo4j

  neo4j:
    image: neo4j:5.20
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/\${NEO4J_PASSWORD:-smriti}
    volumes:
      - neo4j-data:/data

volumes:
  neo4j-data:`;

const envExample = `# ── Core ──────────────────────────────
SMRITI_API_URL=http://localhost:8000
SMRITI_API_KEY=dev-key

# ── Frontend (public, exposed to browser) ──
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_ANALYTICS_DOMAIN=           # e.g. analytics.smriti-os.example.com (leave empty to disable)

# ── Neo4j ─────────────────────────────
NEO4J_URI=bolt://localhost:7687
NEO4J_PASSWORD=smriti

# ── Telegram alerts ───────────────────
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ── Auth (optional) ───────────────────
NEXTAUTH_SECRET=                       # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000`;

const helmValues = `image:
  repository: smritios/showcase
  tag: 0.4.0
  pullPolicy: IfNotPresent

replicaCount: 2

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: smriti-os.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

env:
  SMRITI_API_URL: http://api.smriti-os.svc.cluster.local:8000
  NEXT_PUBLIC_API_BASE_URL: https://api.smriti-os.example.com

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 6
  targetCPUUtilizationPercentage: 70`;

const envVars = [
  { name: "SMRITI_API_URL", required: true, desc: "Base URL of the Smriti API backend" },
  { name: "SMRITI_API_KEY", required: true, desc: "API key for backend auth" },
  { name: "NEXT_PUBLIC_API_BASE_URL", required: true, desc: "Browser-facing API URL (CORS-safe)" },
  { name: "NEXT_PUBLIC_ANALYTICS_DOMAIN", required: false, desc: "Plausible/Umami domain; empty disables analytics" },
  { name: "NEO4J_URI", required: true, desc: "Neo4j Bolt URI" },
  { name: "NEO4J_PASSWORD", required: true, desc: "Neo4j password" },
  { name: "NEXTAUTH_SECRET", required: false, desc: "Auth secret (openssl rand -base64 32)" },
  { name: "NEXTAUTH_URL", required: false, desc: "Canonical app URL for auth callbacks" },
];

const telegramEnvVars = [
  { name: "TELEGRAM_BOT_TOKEN", required: true, desc: "BotFather token (format: 123456:ABC-DEF...)" },
  { name: "TELEGRAM_CHAT_ID", required: true, desc: "Target chat/group ID (negative for groups)" },
  { name: "ALERT_CONFIDENCE_THRESHOLD", required: false, desc: "Min confidence to trigger alert (0.0–1.0)" },
  { name: "TELEMETRY_POLL_INTERVAL_SECONDS", required: false, desc: "Watcher polling interval" },
];

const deployTargets = [
  { icon: Cloud, name: "Vercel", desc: "Zero-config. Connect repo, set env vars, deploy.", recommended: true },
  { icon: Container, name: "Docker", desc: "docker compose up -d — full stack on any host." },
  { icon: Box, name: "Kubernetes", desc: "Helm chart with autoscaling and ingress." },
  { icon: Terminal, name: "Static export", desc: "next build && next export — host on any CDN." },
];

export default function DeployPage() {
  return (
    <>
      <Section
        eyebrow="Deploy"
        title="Three commands to a running plant"
        description="Smriti OS ships as a Docker Compose stack (web + API + Neo4j). Run it locally, on a VM, or in Kubernetes."
      >
        {/* Deploy targets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deployTargets.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard hover className="h-full p-5">
                <div className="flex items-center justify-between">
                  <t.icon className="h-6 w-6 text-primary-300" />
                  {t.recommended && <StatusPill status="ok">Recommended</StatusPill>}
                </div>
                <h3 className="mt-3 font-semibold text-fg">{t.name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{t.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Quickstart */}
      <Section
        eyebrow="Quickstart"
        title="3-command launch"
      >
        <CodeBlock code={quickstart} language="bash" title="terminal" />
      </Section>

      {/* Docker compose */}
      <Section
        eyebrow="Docker"
        title="docker-compose.yml"
        description="Full stack: Next.js web, FastAPI backend, Neo4j graph. Copyable."
      >
        <CodeBlock code={dockerCompose} language="yaml" title="docker-compose.yml" />
      </Section>

      {/* Env vars */}
      <Section
        eyebrow="Configuration"
        title="Environment variables"
        description="All required and optional env vars. See .env.example in the repo."
      >
        <EnvVarsTable />
        <div className="mt-6">
          <CodeBlock code={envExample} language="bash" title=".env" />
        </div>
      </Section>

      {/* Telegram env vars */}
      <Section
        eyebrow="Telegram alerts"
        title="Telegram alert configuration"
        description="Configure the Telegram bot to receive real-time alerts when anomalies are detected. All vars are optional but recommended for production alerting."
      >
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
                {telegramEnvVars.map((v, i) => (
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
                        <span className="inline-flex items-center gap-1 text-error"><span className="h-1.5 w-1.5 rounded-full bg-error" />required</span>
                      ) : (
                        <span className="text-fg-subtle">optional</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-fg-subtle">{v.name.includes("TOKEN") ? "yes" : "no"}</td>
                    <td className="px-6 py-3 font-mono text-fg-subtle">{v.name === "ALERT_CONFIDENCE_THRESHOLD" ? "0.5" : v.name === "TELEMETRY_POLL_INTERVAL_SECONDS" ? "5" : "—"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </Section>

      {/* Kubernetes */}
      <Section
        eyebrow="Kubernetes"
        title="Helm chart"
        description="For production deployments with autoscaling, ingress, and managed Neo4j."
      >
        <CodeBlock code={helmValues} language="yaml" title="values.yaml" />
        <div className="mt-6">
          <CodeBlock
            code={`# Add the Smriti chart repo
helm repo add smriti https://charts.smriti-os.example.com
helm repo update

# Install
helm install smriti-os smriti/showcase \\
  -f values.yaml \\
  --namespace smriti-os --create-namespace`}
            language="bash"
            title="helm install"
          />
        </div>
      </Section>

      {/* Vercel */}
      <Section
        eyebrow="Vercel"
        title="One-click Vercel deploy"
        description="For the frontend only (point NEXT_PUBLIC_API_BASE_URL at your managed API)."
      >
        <GlassCard className="p-6">
          <ol className="space-y-3 text-sm text-fg-muted">
            {[
              "Push the repo to GitHub.",
              "Import the project in Vercel — framework auto-detected as Next.js.",
              "Set env vars: NEXT_PUBLIC_API_BASE_URL, SMRITI_API_KEY, NEXT_PUBLIC_ANALYTICS_DOMAIN.",
              "Deploy. Vercel builds the Next.js app and serves it on the edge.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs text-primary-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </GlassCard>
      </Section>

      <Section>
        <GlassCard strong className="p-10 text-center">
          <Settings className="mx-auto h-10 w-10 text-primary-300" />
          <h2 className="mt-4 text-2xl font-semibold text-fg">Ready to deploy?</h2>
          <p className="mx-auto mt-3 max-w-md text-fg-muted">
            Full instructions in the README. Issues welcome on GitHub.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CTAButton href="/demo" variant="primary">Try the demo first</CTAButton>
            <CTAButton href="/architecture" variant="secondary">Review the architecture</CTAButton>
          </div>
        </GlassCard>
      </Section>
    </>
  );
}
