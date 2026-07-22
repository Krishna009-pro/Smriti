# Smriti OS — Architecture

> Industrial Memory Operating System: fusing P&ID structural topology with experiential knowledge into a unified graph.

## 1. Design Goals

Smriti OS is built for plant environments where **knowledge is fragmented** across P&ID drawings, shift handover notes, CMMS work orders, and operator intuition. The system must:

1. **Ingest multimodal signals** — P&ID images (vision) and shift notes (NLP) — without forcing operators into a single format.
2. **Maintain a unified knowledge graph** that preserves both structural topology (equipment → equipment connections) and experiential links (note → equipment, fix → failure mode).
3. **Quantify confidence** per node and edge using Wilson-score intervals, so downstream consumers know how trustworthy a fact is.
4. **Push proactive alerts** over Server-Sent Events and Telegram before a fault escalates.
5. **Expose everything via FastMCP** so LLM agents can query, reason over, and act on the graph.

## 2. System Topology

```
┌─────────────┐   ┌──────────────┐   ┌────────────────┐
│  P&ID Vision │   │ Shift-Note   │   │  Telemetry     │
│  (OCR + GNN) │   │ NLP Pipeline │   │  Stream (MQTT) │
└──────┬──────┘   └──────┬───────┘   └───────┬────────┘
       │                 │                   │
       ▼                 ▼                   ▼
   ┌─────────────────────────────────────────────┐
   │           Ingestion Bus (async)             │
   └────────────────────┬────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────┐
   │  Unified Knowledge Graph (PostgreSQL CTE)   │
   │  nodes: Equipment, FailureMode, Fix, Note   │
   │  edges: CONNECTS, RESOLVED_BY, MENTIONS      │
   └────────────────────┬────────────────────────┘
                        ▼
   ┌──────────────┬──────┴───────┬──────────────┐
   │ Confidence   │ Graph Query  │ Anomaly      │
   │ Engine        │ API (FastAPI)│ Detector     │
   │ (Wilson)      │              │ (threshold + │
   │              │              │ ML)          │
   └──────────────┘ └──────┬──────┘ ──────────────┘
                          │             │
                          ▼             ▼
                   ┌──────────┐  ┌─────────────┐
                   │ FastMCP  │  │ Alert Bus   │
                   │ Server   │  │ SSE+Telegram│
                   └──────────┘  └─────────────┘
                          │             │
                          ▼             ▼
                   ┌─────────────────────────────┐
                   │  Mission Control (TanStack) │
                   └─────────────────────────────┘
```

## 3. Data Flow Sequences

### 3.1 Ingestion

1. Operator uploads a P&ID PDF → vision pipeline extracts equipment tags, lines, instruments.
2. NLP pipeline ingests shift notes, classifies entities (equipment, symptom, action, outcome).
3. Both emit normalized triples into the ingestion bus.
4. Graph writer upserts nodes/edges, stamping `source`, `ingested_at`, `confidence = 0.5` initial.

### 3.2 Confidence Learning

Every time a fact is **confirmed** (operator marks "this fix worked") or **contradicted** (anomaly recurred), the Wilson-score interval is recomputed:

```
p_hat = successes / (successes + failures)
z = 1.96 (95% CI)
n = successes + failures
denominator = 1 + z²/n
center = (p_hat + z²/(2n)) / denominator
interval = z * sqrt(p_hat(1-p_hat)/n + z²/(4n²)) / denominator
confidence = center - interval  (lower bound, conservative)
```

A fact with `n=2` successes and `0` failures scores `0.34` (not 1.0) — the system remains appropriately skeptical until it has seen enough evidence.

### 3.3 Proactive Alert

1. Telemetry stream exceeds a learned threshold for equipment E.
2. Anomaly detector emits event with `equipment_id`, `severity`, `confidence`.
3. Alert bus fans out: SSE push to subscribed dashboard sessions, Telegram message to on-call channel.
4. Dashboard node activates, graph trace highlights the path from E to its likely failure mode and known fixes.

### 3.4 Feedback Loop

1. Operator acknowledges alert, marks resolution action.
2. Confidence engine increments successes/failures for the relevant Fix node.
3. Graph re-weights edges; future alerts rank this fix higher.

## 4. Trade-off Log

| Decision | Choice | Rationale | Cost |
|---|---|---|---|
| Graph store | Neo4j | Native Cypher, GNN-friendly, ACID | Operational overhead vs. Postgres+AGE |
| Streaming | SSE (not WS) | One-way server→client, simpler retry, proxy-friendly | No client→server pushback over same channel |
| Confidence | Wilson lower bound | Conservative, well-behaved at small n | Slower convergence than Bayesian prior |
| Vision | GNN on extracted graph | Topology-aware, not just OCR | Requires labeled P&IDs for training |
| Agent surface | FastMCP | Standard tool protocol for LLM agents | Newer spec, smaller ecosystem than OpenAPI-only |
| Frontend | Next.js App Router | SSR + streaming, RSC for docs | Heavier than SPA for a pure dashboard |

## 5. Non-Functional Targets

- **Ingestion latency:** P95 < 2s for a single shift note; P95 < 30s for a 20-page P&ID.
- **Alert fan-out:** SSE push < 500ms from detector to client.
- **Graph query:** P95 < 150ms for a 3-hop trace.
- **Availability:** 99.5% for dashboard; 99.9% for alert bus (degraded mode queues to Telegram).
