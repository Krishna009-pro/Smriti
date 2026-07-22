"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, ChevronDown, ChevronRight, Copy, Check, Server, Radio, Brain, Network, FileText } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Section } from "@/components/Section";
import { CodeBlock } from "@/components/CodeBlock";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/cn";
import openapi from "@/docs/api/openapi.json";
import mcpConfig from "@/data/mcp-config.json";

type PathItem = {
  method: string;
  path: string;
  summary: string;
  tag: string;
  operationId?: string;
};

const methodColors: Record<string, string> = {
  GET: "text-success border-success/30 bg-success/5",
  POST: "text-primary-300 border-primary/30 bg-primary/5",
  PUT: "text-warning border-warning/30 bg-warning/5",
  DELETE: "text-error border-error/30 bg-error/5",
};

const tagIcons: Record<string, typeof Server> = {
  ingest: FileText,
  graph: Network,
  confidence: Brain,
  telemetry: Radio,
  mcp: Bot,
};

function buildEndpoints(): PathItem[] {
  const items: PathItem[] = [];
  const paths = (openapi as any).paths;
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods as any)) {
      items.push({
        method: method.toUpperCase(),
        path,
        summary: (op as any).summary ?? "",
        tag: ((op as any).tags?.[0]) ?? "other",
      });
    }
  }
  return items;
}

const mcpTools = [
  {
    name: "trace_equipment",
    description: "Trace a 3-hop path from an equipment node through the knowledge graph.",
    input: { equipment_id: "string", depth: "number (default 3)" },
    returns: "GraphTrace { root, nodes[], edges[] }",
  },
  {
    name: "get_confidence",
    description: "Get the Wilson-score confidence interval for a graph node.",
    input: { node_id: "string" },
    returns: "Confidence { node_id, successes, failures, wilson_lower, wilson_center }",
  },
  {
    name: "record_feedback",
    description: "Record operator feedback (success/failure) to update a node's confidence.",
    input: { node_id: "string", outcome: "'success' | 'failure'", operator: "string" },
    returns: "Confidence (updated)",
  },
  {
    name: "ingest_note",
    description: "Ingest a free-text shift note; NLP extracts triples and writes to the graph.",
    input: { text: "string", operator: "string", shift: "string" },
    returns: "IngestResult { triples_written, nodes_upserted, edges_upserted }",
  },
  {
    name: "list_anomalies",
    description: "List recent telemetry anomalies with severity and confidence.",
    input: { since: "ISO8601 (optional)", limit: "number (default 20)" },
    returns: "Anomaly[]",
  },
];

const curlExamples: Record<string, string> = {
  "POST /api/ingest/note": `curl -X POST https://api.smriti-os.example.com/api/ingest/note \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "P-102 vibrating at 3.2 mm/s, bearing hot. Bled off load.",
    "operator": "shift-A-lead",
    "shift": "2026-07-19-night"
  }'`,
  "GET /api/graph/trace": `curl "https://api.smriti-os.example.com/api/graph/trace?equipment_id=P-102&depth=3" \\
  -H "Authorization: Bearer $SMRITI_API_KEY"`,
  "GET /api/telemetry/stream": `curl -N "https://api.smriti-os.example.com/api/telemetry/stream" \\
  -H "Authorization: Bearer $SMRITI_API_KEY"

# SSE stream — each event:
# event: anomaly
# data: {"anomaly_id":"a-7f3c","equipment_id":"P-102",...}`,
  "POST /api/telemetry/simulate": `curl -X POST https://api.smriti-os.example.com/api/telemetry/simulate \\
  -H "Content-Type: application/json" \\
  -d '{"equipment_id":"P-102","severity":"high"}'`,
};

export default function ApiPage() {
  const endpoints = buildEndpoints();
  const [expanded, setExpanded] = useState<string | null>("POST /api/ingest/note");
  const [copiedMcp, setCopiedMcp] = useState(false);

  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  const copyMcp = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <Section
        eyebrow="API Reference"
        title="REST + SSE + MCP"
        description="Smriti OS exposes a FastAPI REST surface, an SSE telemetry stream, and a FastMCP tool manifest for LLM agents. Full OpenAPI 3.1 spec available at /docs/api/openapi.json."
      >
        <div className="mb-6 flex flex-wrap gap-3">
          <StatusPill status="ok">OpenAPI 3.1</StatusPill>
          <StatusPill status="info">8 endpoints</StatusPill>
          <StatusPill status="ok">5 MCP tools</StatusPill>
          <StatusPill status="warn">SSE streaming</StatusPill>
        </div>
      </Section>

      {/* REST endpoints */}
      <Section eyebrow="REST" title="Endpoints">
        <div className="space-y-3">
          {endpoints.map((ep, i) => {
            const key = `${ep.method} ${ep.path}`;
            const isOpen = expanded === key;
            const Icon = tagIcons[ep.tag] ?? Server;
            const curl = curlExamples[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard className="overflow-hidden p-0">
                  <button
                    onClick={() => toggle(key)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                  >
                    <span className={cn("rounded-md border px-2 py-1 font-mono text-xs font-bold", methodColors[ep.method])}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-sm text-fg">{ep.path}</span>
                    <span className="ml-auto hidden text-sm text-fg-muted sm:block">{ep.summary}</span>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-fg-muted" /> : <ChevronRight className="h-4 w-4 text-fg-muted" />}
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="border-t border-border px-5 py-4"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary-300" />
                        <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle">tag: {ep.tag}</span>
                      </div>
                      {curl ? (
                        <div className="mt-4">
                          <CodeBlock code={curl} language="bash" title="curl" />
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-fg-muted">See the OpenAPI spec for request/response schemas.</p>
                      )}
                    </motion.div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* MCP tools */}
      <Section
        eyebrow="FastMCP"
        title="Agent tool surface"
        description="Smriti OS is exposed as MCP tools so LLM agents (Claude, etc.) can query the graph, record feedback, and ingest notes through a standard protocol."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {mcpTools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard hover className="h-full p-5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary-300" />
                  <code className="font-mono text-sm font-semibold text-fg">{tool.name}</code>
                </div>
                <p className="mt-2 text-sm text-fg-muted">{tool.description}</p>
                <div className="mt-4 space-y-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle">Input</span>
                  {Object.entries(tool.input).map(([k, v]) => (
                    <div key={k} className="flex justify-between font-mono text-xs">
                      <span className="text-secondary">{k}</span>
                      <span className="text-fg-muted">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle">Returns</span>
                  <p className="mt-1 font-mono text-xs text-success">{tool.returns}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* MCP config */}
      <Section
        eyebrow="Setup"
        title="Claude Desktop config"
        description="Drop this into your Claude Desktop MCP config to give Claude access to your Smriti OS graph. One click to copy."
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary-300" />
              <h3 className="font-semibold text-fg">claude_desktop_config.json</h3>
            </div>
            <button
              onClick={copyMcp}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
            >
              {copiedMcp ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedMcp ? "Copied" : "Copy"}
            </button>
          </div>
          <CodeBlock
            code={JSON.stringify(mcpConfig, null, 2)}
            language="json"
            copyable={false}
            className="mt-4"
          />
          <div className="mt-4 rounded-lg border border-info/20 bg-info/5 p-4 text-sm text-fg-muted">
            <strong className="text-info">Path:</strong> macOS — <code className="font-mono text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</code>
            <br />
            <strong className="text-info">Path:</strong> Windows — <code className="font-mono text-xs">%APPDATA%\Claude\claude_desktop_config.json</code>
          </div>
        </GlassCard>
      </Section>
    </>
  );
}
