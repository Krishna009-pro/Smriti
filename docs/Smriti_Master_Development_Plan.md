# Master Development Plan (MDP)
## Smriti — The Industrial Memory OS
**ET AI Hackathon 2026 · Build Window: 48 Hours · Version 1.0 · Status: Execution-Ready**

*Source of truth: `01_Smriti_Product_Strategy.md`, `02_Smriti_PRD.md`, `03_Smriti_Engineering_Spec.md`. This MDP does not change product scope, architecture, or feature set — it converts the already-approved plan into task-level, assignable, sequenced work.*

---

## Table of Contents

1. Executive Summary
2. Development Timeline
3. Sprint Plan
4. Task Breakdown
5. Parallel Development Strategy
6. Team Allocation
7. GitHub Workflow
8. Daily Checklist
9. Integration Plan
10. Testing Plan
11. Deployment Plan
12. Risk Register
13. Demo Readiness Checklist
14. Presentation Preparation
15. Judge Q&A Preparation (50 Questions)
16. Final Build Order

---

## 1. Executive Summary

**Product.** Smriti is an Industrial Memory OS: a lightweight, self-learning graph that fuses a plant's *structural* knowledge (P&ID topology — what's connected to what) with its *experiential* knowledge (shift notes, work-order comments — what an experienced technician actually does about it). Where incumbent EAM/CMMS platforms (Maximo, SAP PM) store free text as an unstructured attachment, Smriti extracts it into structured `equipment → fix` relationships, ranks them by a statistically defensible confidence score, and exposes the whole thing through a native FastMCP tool mesh as well as a purpose-built dashboard.

**MVP — 5 must-have features, all "Must" priority, none negotiable during the build:**
1. **Industrial Memory Graph** — multimodal ingestion (P&ID vision extraction + shift-note text extraction) fused into one SQLite graph.
2. **Self-Learning Feedback Loop** — technician confirm/reject updates a Wilson-score-based confidence value live.
3. **Proactive Alert Copilot** — simulated telemetry watcher matches historical failure signatures and fires a live Telegram + in-app alert.
4. **FastMCP Universal Integration Mesh** — exactly 3 tools (`trace_topology_and_history`, `capture_feedback`, `check_compliance_status`), callable from Claude Desktop or any MCP client with zero custom UI.
5. **Executive Knowledge Health Dashboard** — three real, computed metrics: Institutional Context Retained %, Expert Dependency Score, Compliance Flags.

**Team objective.** Ship all five features end-to-end, on real (not hardcoded) data, with zero unhandled exceptions visible on stage, inside a 48-hour build window — and stop there. Every hour spent beyond the five features is an hour not spent rehearsing.

**Demo objective.** A single unbroken golden-path walkthrough (defined exactly in Engineering Spec §14 and reproduced as this MDP's Section 13): ingest → query → feedback (confidence updates live) → manual telemetry trigger (dashboard alert + Telegram phone buzz on stage) → Executive Dashboard → (stretch) live MCP call from Claude Desktop. This single path is rehearsed, not improvised.

**What this MDP adds that the source docs don't.** The PRD and Engineering Spec define *what* to build and *how* it works. This document defines *who builds what, in what order, by which hour, using which branch, verified by which test, and defended against which judge question* — the operational layer needed to start typing within the next hour with zero further planning meetings.

---

## 2. Development Timeline

> **Read this before the phase table.** The Engineering Spec's 48-hour build plan (§17) is the literal source of the hour blocks used everywhere in this MDP. The instruction template for this MDP asks for phases in the order Setup → Infrastructure → Backend → Frontend → AI → Integration → Testing → Deployment → Presentation. In reality, **Frontend and AI are not sequential — they run concurrently with Backend**, built by different people on the same team at the same time. The phase numbers below are *category* labels, not a strict chronological queue. Section 5 (Parallel Development Strategy) shows the real concurrency; this table shows total effort and nominal hour windows per category.

| Phase | Name | Nominal Hour Window | Effort (person-hours) | Maps to Sprints | Real-world concurrency note |
|---|---|---|---|---|---|
| 0 | Project Setup | H0–2 | 2–4 (whole team) | Sprint 0 | Strictly first — nothing else can start without the repo and schema |
| 1 | Core Infrastructure | H2–6 | 4–8 (split: DB/AI/Frontend) | Sprint 1 | Sample data, prompts, and schema finalize in parallel across 3 people |
| 2 | Backend | H6–22 | 32 (2 backend-focused people × 16h) | Sprints 2–4 | Runs concurrently with Phase 4 (same people, interleaved) |
| 3 | Frontend | H18/22–40 | 18–22 (1–2 people) | Sprint 6 (+ early scaffold in Sprint 4) | Starts scaffolding the moment the REST contract (§9 of Spec) is frozen (~H18), full build from H30 |
| 4 | AI / Extraction & Intelligence | H2–30 | 22–26 (1 AI-focused person, overlapping Phase 2) | Sprints 1, 2, 5 | Prompts (H2–6) → extraction wiring (H6–14, inside Phase 2) → watcher/alerts (H22–30) |
| 5 | Integration | H40–44 | 4 (whole team) | Sprint 8 | Hard stop for new code — see cut-line rule, Section 12 |
| 6 | Testing | H40–44 (parallel with 5) | 4–6 (1–2 people) | Sprint 7 | Smoke test + unit tests run continuously from H14 onward, not only here |
| 7 | Deployment | H44–46 | 2 (whole team) | Sprint 8–9 | Local-machine "deployment" only — no cloud infra, per Engineering Spec §17 constraint |
| 8 | Presentation | H30–48 (prep) / H46–48 (rehearsal) | 4–6 (Team Lead + 1) | Sprint 9 | Storyline/slides/Q&A drilling happens in parallel with all coding phases, not after |

**Total effort:** ~48 elapsed hours, ~90–110 person-hours across a 2–4 person team (consistent with Product Strategy §9's assumption; Section 6 of this MDP shows how a 6-role ideal split compresses onto a smaller real team).

---

## 3. Sprint Plan

These 10 sprints are the literal hour blocks from Engineering Spec §17, expanded with goal/tasks/deliverables/dependencies/exit criteria. **Sprint boundaries are commit checkpoints, not permission to context-switch** — if a sprint's exit criteria aren't met, the next sprint does not start until they are, or the team invokes the cut-line rule (Section 12).

### Sprint 0 — Foundation (H0–2)
- **Goal:** A cloneable, runnable skeleton exists that every subsequent task builds on top of.
- **Tasks:** Create repo per the structure in Section 7; write `db/schema.sql` verbatim from Engineering Spec §4; write `.env.example`; install base dependencies (`fastapi`, `fastmcp`, `httpx`, `pydantic`, `pytest`, Vite+React scaffold).
- **Deliverables:** Empty-but-structured repo, `schema.sql` applied to a local `smriti.db`, `.env.example` committed.
- **Dependencies:** None — this is hour zero.
- **Exit criteria:** `sqlite3 data/smriti.db < backend/db/schema.sql` runs with no errors; `git clone` + `pip install -r requirements.txt` works for every team member on their own machine.

### Sprint 1 — Sample Data & Prompt Engineering (H2–6)
- **Goal:** The two LLM extraction prompts are proven to work *in isolation*, against real sample data, before they're wired into any service.
- **Tasks:** Select/prepare 1–2 P&IDs that parse cleanly (per Strategy §9's explicit instruction to pre-select, not improvise); write `data/sample_shift_notes.txt` with realistic decision-symptom-fix language; hand-test both prompts from Engineering Spec §6.1/§6.2 directly against the chosen LLM API in a scratch script; hand-produce the two files in `data/cached_extractions/` as the offline fallback.
- **Deliverables:** `data/sample_pid.pdf`, `data/sample_shift_notes.txt`, `data/cached_extractions/pid_extraction.json`, `data/cached_extractions/shift_notes_extraction.json`, a scratch script proving both prompts return schema-valid JSON on the real sample data.
- **Dependencies:** Sprint 0 (repo exists so files have somewhere to live).
- **Exit criteria:** Both prompts return valid JSON matching Engineering Spec §6's schemas on the actual chosen sample files, at least 3 times in a row with no malformed output.

### Sprint 2 — Core Service Layer (H6–14)
- **Goal:** All business logic exists and is tested against sample data via a script — before any REST route or MCP tool touches it.
- **Tasks:** Implement `services/graph_service.py` (`trace()`, `record_feedback()`, `compliance_check()`); implement `services/confidence.py` (`wilson_lower_bound()`); implement `services/ingestion_service.py` with the cached-fallback pattern from Engineering Spec §14; write the structural CTE (§5.2) and experiential flat query (§5.3).
- **Deliverables:** `services/graph_service.py`, `services/confidence.py`, `services/ingestion_service.py`, all callable and manually verified from a Python REPL or scratch script against the Sprint 1 sample data.
- **Dependencies:** Sprint 0 (schema), Sprint 1 (sample data + proven prompts).
- **Exit criteria:** Calling `ingestion_service.ingest_pid(...)` and `ingestion_service.ingest_shift_notes(...)` on the sample files populates `smriti.db` with both `connects_to` and `has_known_fix` edges; `graph_service.trace(equipment_id)` returns both edge types for at least one real equipment ID from the sample P&ID.

### Sprint 3 — REST API Layer (H14–18)
- **Goal:** Every endpoint in Engineering Spec §9 is live and callable via `curl`/Postman.
- **Tasks:** Implement `main.py` as a thin FastAPI wrapper around `graph_service`; wire all 8 REST routes; wire `GET /api/alerts/stream` as an SSE endpoint (initially with no publisher — that's Sprint 5); add basic auth middleware per PRD §18.
- **Deliverables:** Running FastAPI app; a Postman/curl script exercising all 8 routes against real data.
- **Dependencies:** Sprint 2 (service layer must exist first — `main.py` must stay thin).
- **Exit criteria:** All 8 endpoints in Engineering Spec §9 return correct, schema-valid JSON against the seeded sample data; no business logic lives in `main.py` itself.

### Sprint 4 — FastMCP Tool Mesh (H18–22)
- **Goal:** The differentiator feature — a native MCP tool server, not a bolted-on chatbot — is live and verified inside a real MCP client.
- **Tasks:** Implement `mcp_server.py` per Engineering Spec §8, exactly 3 tools, each a thin call into `graph_service`; write the Claude Desktop config from §15; verify all 3 tools inside Claude Desktop itself.
- **Deliverables:** `mcp_server.py`; a working `claude_desktop_config.json` snippet; a screen-recording or live-verified session of all 3 tools returning correct data inside Claude Desktop.
- **Dependencies:** Sprint 2 (service layer). Runs in parallel with Sprint 3 if two backend people are available (see Section 5).
- **Exit criteria:** All 3 tools (`trace_topology_and_history`, `capture_feedback`, `check_compliance_status`) are callable from Claude Desktop with zero custom UI and return the same data as their REST equivalents.

### Sprint 5 — Watcher & Proactive Alerts (H22–30)
- **Goal:** The single highest-impact demo beat — an unprompted system action — is real and fires on cue.
- **Tasks:** Implement `services/watcher.py` (autonomous `asyncio` loop) and `find_edges_matching_signature()` per Engineering Spec §5.4; implement `services/alerts.py` (Telegram sender); wire `POST /api/telemetry/simulate` as the manual presenter trigger (Engineering Spec §7's trade-off #7); seed at least 2 known telemetry signatures into sample data so both the autonomous loop and the manual trigger have something real to match against.
- **Deliverables:** `watcher.py`, `alerts.py`, a working Telegram bot (created via BotFather — 2-minute setup, no approval wait), `POST /api/telemetry/simulate` firing both a dashboard SSE push and a real Telegram message.
- **Dependencies:** Sprint 3 (REST layer, for the SSE endpoint and the manual trigger route), Sprint 2 (graph service).
- **Exit criteria:** Hitting `POST /api/telemetry/simulate` with a seeded signature produces both an SSE event and a phone-visible Telegram message within 10 seconds (matches PRD's acceptance criterion in §15).

### Sprint 6 — Frontend Build (H30–40)
- **Goal:** All 4 components are wired to the real backend, not mocked data.
- **Tasks:** Build `QueryPanel.jsx` (equipment lookup), `GraphView.jsx` (D3 force-directed layout, edge color/thickness driven by `confidence`), `Dashboard.jsx` (port the arc-gauge pattern from RAPHAEL per Engineering Spec §2), `AlertBanner.jsx` (EventSource subscriber to `/api/alerts/stream`).
- **Deliverables:** A running `frontend/` app, `npm run dev`, all 4 components rendering real data from the live backend.
- **Dependencies:** Sprint 3 (REST contract must be frozen), Sprint 5 (for `AlertBanner.jsx` to have a real stream to subscribe to) — though scaffolding and static layout can start as early as Sprint 3/4 against mocked JSON (see Section 5).
- **Exit criteria:** Uploading the sample P&ID through the UI renders a force-directed graph live; submitting feedback in the UI visibly changes edge color/width within 3 seconds (PRD §15 acceptance criterion); the Dashboard shows real computed numbers, not placeholders.

### Sprint 7 — Reliability Layer (H40–44)
- **Goal:** The demo cannot visibly fail, no matter what the venue Wi-Fi or the LLM API does.
- **Tasks:** Write `scripts/reset_demo.py` (wipe + reseed on every run); confirm the cached-fallback path in `ingestion_service.py` actually triggers on a forced timeout/error; write `scripts/smoke_test.py` as one end-to-end pytest (ingest → query → feedback → assert confidence changed → trigger telemetry → assert alert fired); add unit tests for `wilson_lower_bound()` and the JSON-schema validators.
- **Deliverables:** `scripts/reset_demo.py`, `scripts/smoke_test.py`, passing unit tests for confidence scoring and extraction validation.
- **Dependencies:** Sprints 2–6 all substantially complete — this sprint tests the whole system, not a piece of it.
- **Exit criteria:** `python scripts/smoke_test.py` passes end-to-end on a freshly reset DB; forcing an LLM timeout still produces a populated graph via the cached fallback with no exception surfacing to the UI.

### Sprint 8 — Feature Freeze & Integration (H44–46)
- **Goal:** Zero new code. Only bugs found while rehearsing the golden path get fixed.
- **Tasks:** Run the golden-path rehearsal checklist (Section 13) on the actual demo machine and network; log every rough edge; fix only what breaks the golden path, defer everything else.
- **Deliverables:** A demo machine that runs the full golden path start to finish without manual intervention beyond the scripted presenter actions.
- **Dependencies:** Sprint 7.
- **Exit criteria:** Two consecutive clean runs of `reset_demo.py` → golden path → success, with no code changes between them.

### Sprint 9 — Rehearsal & Presentation (H46–48)
- **Goal:** The team can deliver the 5-minute pitch, live, twice, without the deck or the demo machine failing.
- **Tasks:** Two full run-throughs of the demo script (Section 14) on the actual presentation hardware; final pass on slides; final pass on the Judge Q&A drill (Section 15) with whoever is fielding questions.
- **Deliverables:** A rehearsed presenter, a rehearsed backup presenter, a demo machine in a known-good, freshly-reset state.
- **Dependencies:** Sprint 8.
- **Exit criteria:** The whole 5-minute script runs twice, back to back, with no presenter hesitation on any beat and no visible technical failure.

---

## 4. Task Breakdown

> **Note on category mapping.** The standard task-breakdown template includes categories like "Authentication," "OCR," "Embedding," "RAG," and "Chat." Smriti's actual architecture (Engineering Spec §0, §2) deliberately does not use vector embeddings, retrieval-augmented generation, OCR, or a conversational chat UI — it uses direct LLM structured extraction into a graph, and exposes that graph via MCP tools and a dashboard, not a chatbot. Building any of those generic categories would violate the brief's own rule ("do not introduce unnecessary features"). The table below maps the template's intent onto Smriti's real feature set. Effort is in person-hours. Priority uses MoSCoW, matching PRD §14.

### 4.1 Project Setup

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| Repo scaffold | Create the folder structure from Section 7 exactly as specified | Must | 0.5h | — |
| `db/schema.sql` | Transcribe schema from Engineering Spec §4: `nodes`, `edges`, `feedback_log`, all indexes, `PRAGMA journal_mode=WAL` | Must | 0.5h | Repo scaffold |
| `.env.example` + `config.py` | Env var loading for `LLM_PROVIDER`, `LLM_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DATABASE_PATH`, `ALERT_CONFIDENCE_THRESHOLD`, `LLM_TIMEOUT_SECONDS` | Must | 0.5h | Repo scaffold |
| Dependency install (backend + frontend) | `requirements.txt` (fastapi, fastmcp, httpx, pydantic, pytest, uvicorn); `package.json` (React, Vite, D3, Tailwind) | Must | 0.5h | Repo scaffold |
| `README.md` — run instructions | One-page "clone → install → run" so any teammate can get a working local copy in under 5 minutes | Should | 0.5h | Above tasks |

### 4.2 Database & Schema

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `nodes` table | `id, type (equipment/fix/procedure), name, properties (JSON), created_at` | Must | included above | `schema.sql` |
| `edges` table | Single two-node edge type carrying both structural (`connects_to`) and experiential (`has_known_fix`) relations, per Engineering Spec §0.2 trade-off | Must | included above | `schema.sql` |
| `feedback_log` table | Append-only audit trail: `edge_id, technician_id, outcome, note, timestamp` — required by PRD §18/§19 for auditability | Must | included above | `schema.sql` |
| Indexes | `idx_edges_source`, `idx_edges_target`, `idx_edges_relation`, `idx_feedback_edge` | Must | included above | Tables created |
| WAL mode verification | Confirm two processes (FastAPI + FastMCP) can read/write `smriti.db` concurrently without lock errors | Must | 0.5h | Schema applied |
| Seed/reset script | `scripts/reset_demo.py` — wipes and reseeds from `data/` on every run | Must | 1.5h | Ingestion pipeline (4.4) working |

### 4.3 Auth (lightweight, per PRD §18)

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| Basic API auth | Simple shared-secret or API-key header check on REST routes — "should not need to be production-grade for the hackathon, but should not be fully open" (PRD §18) | Should | 1h | REST layer skeleton (4.7) |
| MCP endpoint auth pattern | Establish the same pattern on the MCP server, even if minimal, so the production auth story is credible under judge questioning | Should | 0.5h | MCP tool mesh (4.6) |
| Feedback attribution | `technician_id` captured on every `capture_feedback` call — doubles as lightweight identity and as the audit trail PRD §18 requires | Must | included in 4.5 | `feedback_log` table |

### 4.4 Ingestion Pipeline (replaces generic "Upload / OCR / Embedding")

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| P&ID vision extraction prompt | Finalize and hand-test the system prompt from Engineering Spec §6.2 against the real sample P&ID | Must | 1.5h | Sample P&ID selected |
| Shift-note text extraction prompt | Finalize and hand-test the system prompt + few-shot example from §6.1 against real sample shift notes | Must | 1.5h | Sample shift notes written |
| `ingestion_service.py` — P&ID path | Calls hosted vision API, validates JSON against schema, retries once on failure, upserts `nodes`/`connects_to` edges | Must | 3h | Prompt finalized, schema live |
| `ingestion_service.py` — shift-note path | Calls hosted LLM, validates JSON, retries once, upserts `nodes`/`has_known_fix` edges with `source_excerpt` for auditability | Must | 3h | Prompt finalized, schema live |
| Cached-fallback wiring | On timeout/malformed response (after one retry), transparently load the matching file from `data/cached_extractions/` — must be visually indistinguishable from a live result | Must | 2h | Both extraction paths built |
| `POST /api/ingest/pid` route | Multipart upload → `ingestion_service` → `{nodes_created, edges_created}` | Must | 1h | Ingestion service, REST skeleton |
| `POST /api/ingest/shift-notes` route | `{text}` → `ingestion_service` → `{extractions[], edges_created}` | Must | 1h | Ingestion service, REST skeleton |

### 4.5 Knowledge Graph & Traversal (Core IP)

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `query_structural_topology()` | Bounded-depth (`3` hops) `WITH RECURSIVE` CTE per Engineering Spec §5.2 | Must | 1.5h | Schema live, some `connects_to` edges seeded |
| `query_experiential_history()` | Flat, indexed, single-hop query ranked by `confidence DESC`, per §5.3 | Must | 1h | Schema live, some `has_known_fix` edges seeded |
| `graph_service.trace(equipment_id)` | Combines both queries into one dict — the single shared function powering both the REST route and the MCP tool | Must | 1h | Both queries above |
| GraphView data contract | Define the exact JSON shape the frontend needs (nodes + edges + confidence) so frontend and backend can build in parallel against an agreed contract | Must | 0.5h | `trace()` defined |

### 4.6 Feedback Loop & Confidence Scoring (Self-Learning Differentiator)

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `wilson_lower_bound()` | Pure function, Engineering Spec §5.1 — the number most likely to be judge-questioned, so it gets its own unit test | Must | 1h (+0.5h test) | None — pure function, buildable standalone |
| `record_feedback()` | Confirm increments `positive_feedback`; reject increments `negative_feedback` and optionally creates a new alternative-fix edge; recomputes confidence on every write | Must | 2h | `wilson_lower_bound()`, schema |
| `POST /api/feedback` route | `{edge_id, technician_id, outcome, alternative_fix?, note?}` → `record_feedback()` → `{edge_id, new_confidence, new_edge_created?}` | Must | 1h | `record_feedback()`, REST skeleton |
| `capture_feedback` MCP tool | Thin wrapper calling the same `record_feedback()` — must not duplicate logic (Engineering Spec §7's explicit warning) | Must | 0.5h | `record_feedback()`, MCP skeleton |
| Live UI confidence update | Edge color/width in `GraphView.jsx` updates within 3 seconds of a feedback submission (PRD §15 acceptance criterion) | Must | 2h | Feedback route live, GraphView built |

### 4.7 REST API Layer

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `main.py` skeleton | FastAPI app instance, router registration, CORS for local frontend dev | Must | 1h | Repo scaffold |
| 8 routes per Engineering Spec §9 | `/api/ingest/pid`, `/api/ingest/shift-notes`, `/api/equipment/{id}/history`, `/api/feedback`, `/api/compliance/{id}`, `/api/dashboard/metrics`, `/api/alerts/stream` (SSE), `/api/telemetry/simulate` | Must | included per-feature above + 1h wiring | Service layer functions each route wraps |
| OpenAPI docs verification | FastAPI's auto-generated docs at `/docs` — genuinely useful as a live artifact if a judge asks "show me the API" | Should | 0h (automatic) | Routes registered |
| Error handling | Every route returns a structured error, never an unhandled 500 visible on stage (NFR in PRD §13) | Must | 1h | All routes built |

### 4.8 FastMCP Tool Mesh (Explicit Hackathon Differentiator)

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `mcp_server.py` skeleton | `FastMCP("smriti")` instance, stdio transport | Must | 0.5h | Repo scaffold |
| `trace_topology_and_history` tool | Thin wrapper on `graph_service.trace()` | Must | 0.5h | 4.5 |
| `capture_feedback` tool | Thin wrapper on `graph_service.record_feedback()` | Must | 0.5h | 4.6 |
| `check_compliance_status` tool | Thin wrapper on `graph_service.compliance_check()` | Must | 0.5h | 4.10 |
| Claude Desktop config verification | Add the JSON snippet from Engineering Spec §15 to a real Claude Desktop install; confirm all 3 tools appear and return correct data | Must | 1h | All 3 tools built |
| Live-demo dry run | Practice invoking all 3 tools live from Claude Desktop at least twice before the actual demo | Should | 0.5h | Config verified |

### 4.9 Proactive Alert Watcher

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| Telemetry simulator | `telemetry_simulator.next_reading()` — generates plausible readings, some matching seeded failure signatures | Must | 1.5h | Sample data has seeded `telemetry_signature` values on relevant edges |
| `find_edges_matching_signature()` | Rule-based comparison of a reading against each `has_known_fix` edge's `telemetry_signature` JSON, per §5.4 | Must | 1.5h | Telemetry simulator, schema |
| `watch_telemetry()` autonomous loop | `asyncio` loop polling every `poll_interval_seconds`, firing alerts on match ≥ `ALERT_CONFIDENCE_THRESHOLD` | Must | 1.5h | `find_edges_matching_signature()` |
| `POST /api/telemetry/simulate` manual trigger | Presenter-controlled cue — the guaranteed half of the "autonomous *and* manual" design decision (Engineering Spec §0.7) | Must | 1h | Watcher logic exists as a callable function, not just a loop |
| `services/alerts.py` — Telegram sender | `send_telegram_alert()` via Bot API, created through BotFather (no approval wait) | Must | 1h | Telegram bot created, `.env` configured |
| SSE push to dashboard | `push_to_dashboard()` publishes to the same stream `AlertBanner.jsx` subscribes to | Must | 1h | `/api/alerts/stream` route exists |

### 4.10 Compliance Flagging

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `is_compliance_relevant` extraction flag | LLM extraction schema already includes this boolean (§6.1) — verify it's actually populated correctly on realistic PESO/OISD-flavored sample text | Must | 1h | Shift-note extraction working |
| `compliance_check()` service function | Queries edges where `is_compliance_relevant = 1` for a given equipment ID | Must | 0.5h | Schema, some flagged edges seeded |
| `GET /api/compliance/{equipment_id}` route | Thin wrapper | Must | 0.5h | `compliance_check()` |
| `check_compliance_status` MCP tool | Thin wrapper, same function | Must | included in 4.8 | `compliance_check()` |
| Framing discipline | Ensure every UI/deck mention frames this as "demo-level flagging," never as certified regulatory compliance (PRD §19's explicit warning) | Must | 0h (a review/wording task, not code) | — |

### 4.11 Frontend

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `App.jsx` shell + routing/layout | Top-level layout hosting all 4 components | Must | 1h | Repo scaffold |
| `QueryPanel.jsx` | Equipment ID lookup, calls `GET /api/equipment/{id}/history` | Must | 2h | REST route live |
| `GraphView.jsx` | D3 force-directed layout; structural + experiential edges; edge color/thickness driven by `confidence` — budget real time, this is the visual centerpiece (Engineering Spec §12) | Must | 6h | GraphView data contract (4.5), REST route live |
| `Dashboard.jsx` | 3 arc gauges, ported from the RAPHAEL codebase rather than built new | Must | 3h | `/api/dashboard/metrics` route live |
| `AlertBanner.jsx` | `EventSource` subscriber to `/api/alerts/stream`, animates in on new alert | Must | 2h | SSE route + publisher live |
| `api.js` | Single fetch/axios wrapper for all backend calls | Must | 1h | REST contract frozen |
| Frontend polish pass | Dark, sci-fi, data-dense theme consistent with the RAPHAEL visual language (Engineering Spec §0.8) — not a generic dashboard template | Should | 2h | All components functionally complete |

### 4.12 Executive Dashboard & Analytics (Metrics)

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| Institutional Context Retained % | Exact SQL from Engineering Spec §10 — % of equipment nodes with ≥1 fix trace at confidence ≥ 0.5 | Must | 1h | Schema, some equipment + fix edges seeded |
| Expert Dependency Score | Bus-factor metric: `100 × (top technician's confirmations / total confirmations)`, computed from `feedback_log` | Must | 1h | `feedback_log` populated with several technician IDs |
| Compliance Flags count | `COUNT(*)` on `is_compliance_relevant = 1` | Must | 0.25h | 4.10 |
| `GET /api/dashboard/metrics` route | Aggregates all three into one response | Must | 0.5h | All three formulas |
| Real-data verification | Confirm all three numbers change believably as more feedback/data is added — a static or hardcoded number here is a demo-credibility risk PRD §15 explicitly guards against | Must | 0.5h | Route live |

### 4.13 Settings / Config

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `.env` real values | Actual `LLM_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` populated in each teammate's local (git-ignored) `.env` | Must | 0.5h | `.env.example` exists |
| `ALERT_CONFIDENCE_THRESHOLD` tuning | Confirm `0.5` produces a believable alert rate against seeded demo data — adjust if the demo fires too often or not at all | Should | 0.5h | Watcher built, sample data seeded |
| `LLM_TIMEOUT_SECONDS` tuning | Short enough that a stalled API call falls back to cache fast, long enough that a normal call isn't falsely killed | Should | 0.5h | Ingestion pipeline built |

### 4.14 Demo Reliability & Deployment

| Task | Description | Priority | Effort | Dependencies |
|---|---|---|---|---|
| `scripts/reset_demo.py` | Wipe + reseed DB from `data/` on every run — full demo repeatability | Must | 1.5h | Ingestion pipeline working |
| `scripts/smoke_test.py` | One end-to-end pytest: ingest → query → feedback → assert confidence changed → trigger telemetry → assert alert fired | Must | 2h | All Must features functionally complete |
| Unit test: `wilson_lower_bound()` | Pure-function test, cheap and high-value given it's the most judge-questioned number | Should | 0.5h | `wilson_lower_bound()` exists |
| Unit test: extraction JSON-schema validators | Cheap insurance against a malformed LLM response ever reaching the UI | Should | 0.5h | Validators exist |
| Local run validation on demo hardware | Full stack (`main.py`, `mcp_server.py`, `watcher.py`, frontend dev server) running simultaneously on the actual presentation laptop | Must | 1h | Everything else complete |
| Offline/degraded-network fallback check | Confirm cached-fallback ingestion and the in-app alert banner both still work if venue Wi-Fi drops the LLM/Telegram calls | Must | 1h | Cached fallback (4.4), alerts (4.9) |

---

## 5. Parallel Development Strategy

### Critical path (the one sequence that, if delayed, delays everything)

```
Repo/Schema (S0)
  -> Sample data + proven prompts (S1)
    -> Core service layer: graph_service, confidence, ingestion (S2)
      -> REST layer (S3)  ---------\
      -> MCP tool mesh (S4)         \--> Integration (S8) -> Reliability rehearsal (S9)
      -> Watcher + Alerts (S5)      /
        -> Frontend (S6) ----------/
          -> Reliability layer (S7)
```

`graph_service.py` (Sprint 2) is the true bottleneck of the entire build: REST, MCP, and eventually the frontend's data contract all depend on it, and it depends on nothing except the schema and proven prompts. **Whoever builds `graph_service.py` should touch nothing else until it's done** — this is the one task where "help unblock this first" beats any other task on the board.

### What can run simultaneously

| Track | Can start | Owner-type | Notes |
|---|---|---|---|
| Schema + repo scaffold | H0 | Whole team, briefly | Everyone needs this before splitting off |
| P&ID prompt tuning | H2 | AI Engineer | Fully independent of shift-note prompt work — different sample file, different schema |
| Shift-note prompt tuning | H2 | AI Engineer or Backend Dev | Can run in parallel with P&ID prompt tuning if two people are free |
| Frontend static scaffolding (layout, routing, dummy data) | H2–H6 | Frontend Developer | Does not need a real API yet — build against a hand-written mock JSON matching the eventual contract (Section 4.5) |
| `wilson_lower_bound()` + its unit test | H6 | Any backend-capable person | Pure function, zero dependencies beyond the spec's formula — a good "fill an idle slot" task |
| Telegram bot creation (BotFather) | H6 | Anyone | 2-minute external setup, totally decoupled from code — do this the moment it's remembered, not when it's blocking |
| REST layer (S3) vs MCP tool mesh (S4) | H14/H18 | Two different backend-capable people | Both are thin wrappers on the *same* `graph_service.py` — once that exists, these two tracks do not depend on each other at all |
| Watcher + Alerts (S5) | H14 (logic) / H22 (wiring) | AI Engineer | The matching *logic* (`find_edges_matching_signature`) can be written and unit-tested as soon as the schema exists, independent of the REST/MCP tracks; only the manual-trigger *route* depends on REST being live |
| Frontend real build (S6) | H18–22 (once REST contract frozen) | Frontend Developer | Swap the mock JSON from H2–6 for real fetch calls — the earlier scaffolding work is not wasted, it's exactly what makes this fast |
| Presentation prep (storyline, slides, Q&A drilling) | H6 onward | Team Lead (+ anyone not currently blocked) | Entirely decoupled from code — should never be a "last two hours" scramble |

### What blocks what (do not start early)

- **Frontend's real data wiring** blocks on the REST contract (Section 4.7) being frozen — changing a response shape after the frontend is wired means rework on both sides. Freeze the contract by end of Sprint 3, not "whenever it feels done."
- **`AlertBanner.jsx`** blocks on the SSE publisher existing (Sprint 5), not just the route (Sprint 3) — an empty stream with no publisher looks like a bug, not a feature-in-progress, if someone tests it early.
- **`scripts/smoke_test.py`** blocks on every Must-have feature being functionally complete — writing it earlier just means rewriting it repeatedly as the API surface changes. Start it in Sprint 7, not before.
- **Dashboard metrics** block on there being enough seeded feedback/edges for the numbers to look real and non-trivial — verify with a realistic data volume, not a 2-row demo table.

### Explicit non-parallelism warning

Do **not** have two people editing `services/graph_service.py` at the same time, even to "go faster." Per Engineering Spec §7, this file is the single source of truth for business logic — if REST and MCP each grow their own copy of `record_feedback()` logic, that duplication is exactly the bug the spec calls out as the first thing to fix. One owner per shared-logic file, always.

---

## 6. Team Allocation

The instruction template asks for 6 distinct roles. Product Strategy §9 assumes a 2–4 person team. Both are honored below: the **ideal 6-role split** is defined first (use it as-is if 5–6 people are available), followed by an explicit **compression table** showing which roles merge for a 2–4 person team.

### Ideal 6-role split

| Role | Primary ownership (files/services) | Why this role owns this |
|---|---|---|
| **Team Lead** | Sprint sequencing, cut-line calls (Section 12), presentation prep (Section 14), Judge Q&A drilling (Section 15), final go/no-go on scope | Needs to see the whole board, not one file — the only role explicitly *not* buried in one codebase area, so they're the one who can make a "cut this now" call without a blind spot |
| **Database Engineer** | `db/schema.sql`, indexes, WAL-mode verification, `scripts/reset_demo.py`, seed data structure | Schema changes ripple into every other file — one dedicated owner prevents accidental drift once ingestion, service layer, and dashboard queries are all live |
| **AI Engineer** | `services/ingestion_service.py`, both extraction prompts (§6.1/§6.2), `services/confidence.py`, `services/watcher.py` | Everything that touches an LLM call or the confidence math — the parts most likely to be probed hardest by judges (Section 15), so the same person who built it should be the one defending it |
| **Backend Developer** | `services/graph_service.py`, `main.py` (REST), `mcp_server.py` (MCP mesh) | Owns the shared source-of-truth service layer and both of its thin wrappers — keeping REST and MCP with the same owner is what prevents logic duplication (Section 5) |
| **Frontend Developer** | `frontend/` in full: `GraphView.jsx`, `Dashboard.jsx`, `QueryPanel.jsx`, `AlertBanner.jsx`, `api.js` | Single owner across all 4 components keeps the visual language (dark, RAPHAEL-derived, sci-fi) consistent instead of four components built in four different styles |
| **Integration Engineer** | `services/alerts.py`, Telegram bot setup, `.env`/`config.py` correctness across machines, `scripts/smoke_test.py`, demo-machine setup | The role explicitly responsible for "does this work end-to-end, on this machine, on this Wi-Fi" — distinct from any single feature owner, because integration bugs live *between* files, not inside one |

### Compression for a 2–4 person team (the realistic case per Product Strategy §9)

| Team size | Merge pattern |
|---|---|
| **4 people** | (1) Backend Dev + Database Engineer, (2) AI Engineer (standalone — extraction/confidence/watcher is genuinely a full-time track), (3) Frontend Dev + Integration Engineer, (4) Team Lead (can also pick up REST or MCP work once Sprint 8 stabilizes) |
| **3 people** | (1) Backend Dev + Database Engineer + MCP mesh, (2) AI Engineer + Integration Engineer (Telegram/alerts is a natural extension of the watcher work they already own), (3) Frontend Dev + Team Lead duties (presentation prep happens in the gaps between component builds) |
| **2 people** | (1) "Backend+AI" — schema, service layer, ingestion, confidence, watcher, MCP, REST, (2) "Frontend+Integration+Lead" — all UI, Telegram wiring, demo-machine setup, presentation prep. This split is tight but works precisely because Engineering Spec §0.6 removed the message-bus/queue complexity that would otherwise need a third full-time owner |

**Rule that holds at every team size:** whoever writes `services/graph_service.py` should not simultaneously be responsible for the frontend's visual polish — those two skill/attention modes don't compress well onto one person in the same sprint, even on a 2-person team. If only 2 people are available, put the graph/service logic and the frontend visual work in different *sprints* for the same person rather than interleaving them hour-by-hour.

---

## 7. GitHub Workflow

### Repository structure

Use the exact structure from Engineering Spec §3 — do not reorganize it, since every path referenced elsewhere in this MDP (and in the spec itself) assumes it:

```
smriti/
├── backend/
│   ├── main.py
│   ├── mcp_server.py
│   ├── services/
│   │   ├── graph_service.py
│   │   ├── ingestion_service.py
│   │   ├── confidence.py
│   │   ├── watcher.py
│   │   └── alerts.py
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed_check_compliance.sql
│   ├── models.py
│   ├── config.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GraphView.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AlertBanner.jsx
│   │   │   └── QueryPanel.jsx
│   │   ├── api.js
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── data/
│   ├── sample_pid.pdf
│   ├── sample_shift_notes.txt
│   └── cached_extractions/
│       ├── pid_extraction.json
│       └── shift_notes_extraction.json
├── scripts/
│   ├── reset_demo.py
│   └── smoke_test.py
├── .env.example
└── README.md
```

### Branch strategy

- `main` — always demo-able. Nothing merges here that hasn't passed `scripts/smoke_test.py`.
- `dev` — integration branch. All feature branches merge here first; `main` is fast-forwarded from `dev` only at sprint boundaries (Sprints 3, 4, 5, 6, 8).
- Feature branches: `feature/<sprint-number>-<short-name>`, e.g. `feature/s2-graph-service`, `feature/s6-graphview`, `feature/s5-telegram-alerts`. Branch names carry the sprint number so anyone can see build order at a glance in `git branch -a`.
- **No long-lived personal branches.** In a 48-hour window, a branch alive for more than one sprint is a merge conflict waiting to happen.

### Pull request process

1. Open the PR the moment the branch is pushed, even if incomplete — mark it `[WIP]` in the title. This gives the team live visibility into what's in flight, which matters more than a clean PR history at this timescale.
2. PR description must state: which task(s) from Section 4 it closes, and which sprint exit criterion it contributes to.
3. Minimum 1 reviewer for anything touching `services/graph_service.py`, `db/schema.sql`, or the REST/MCP contract (these are the shared-truth files everyone else depends on). Everything else (isolated component files, e.g. a single `.jsx` component) can self-merge after CI/smoke checks pass, to keep velocity up.

### Code review process

- Review for **correctness against the spec**, not style — Engineering Spec and PRD are the source of truth; a reviewer's job is "does this match §X," not "I'd have written it differently."
- Anyone reviewing `confidence.py` or the extraction validators should specifically check them against Engineering Spec §5.1 and §6's exact schemas — these are the two places a subtle deviation is hardest to spot by eye later.
- 15-minute review SLA during Sprints 2–6 — a PR sitting unreviewed for an hour blocks a teammate's next task more often than it looks like it will.

### Merge policy

- Squash-merge feature branches into `dev` (keeps history readable for the eventual "show me your commits" judge question).
- `dev` → `main` is a regular merge (not squash) at sprint boundaries, so the sprint-level checkpoints stay visible in `main`'s history.
- **After Sprint 8 (feature freeze, H44), `main` accepts bugfix commits only** — no new features, per the cut-line rule in Section 12.

### Commit message convention

`<type>(<scope>): <short description>`, where `type` ∈ `{feat, fix, test, docs, chore}` and `scope` matches a Section 4 category (e.g. `ingestion`, `graph`, `mcp`, `frontend`, `alerts`, `dashboard`).

Examples:
- `feat(graph): implement bounded-depth CTE for structural traversal`
- `feat(mcp): add capture_feedback tool wrapping record_feedback()`
- `fix(ingestion): correct cached-fallback trigger on malformed JSON`
- `test(confidence): add wilson_lower_bound edge cases`

---

## 8. Daily Checklist

Mapped onto the 48-hour build as two 24-hour days, each split into four 6-hour blocks, aligned to the Sprint Plan (Section 3).

### Day 1

**Morning (H0–6) — Setup + Foundation**
- [ ] Repo created, all teammates cloned and able to run `pip install` / `npm install` locally
- [ ] `db/schema.sql` written and applied to a local `smriti.db`
- [ ] `.env.example` committed; each teammate has their own working `.env`
- [ ] Sample P&ID selected and confirmed to parse cleanly (not an arbitrary/complex diagram)
- [ ] `data/sample_shift_notes.txt` written with realistic decision-symptom-fix language
- [ ] Both extraction prompts (§6.1, §6.2) hand-tested against real sample data, 3 consecutive clean JSON outputs
- [ ] `data/cached_extractions/` fallback files hand-produced
- [ ] Telegram bot created via BotFather (2-minute task — do it now, not later)
- [ ] Team roles confirmed for the day (Section 6)

**Afternoon (H6–12) — Core Services Begin**
- [ ] `services/confidence.py` (`wilson_lower_bound`) implemented and unit-tested
- [ ] `services/ingestion_service.py` — P&ID path implemented, tested against real sample file
- [ ] `services/ingestion_service.py` — shift-note path implemented, tested against real sample file
- [ ] Cached-fallback triggers correctly on a forced timeout (test this deliberately, don't assume it works)
- [ ] `services/graph_service.py` — `trace()` skeleton in progress
- [ ] Frontend: static layout/routing scaffolded against mock JSON (no real API dependency yet)

**Evening (H12–18) — Core Services Complete + REST Layer**
- [ ] `graph_service.trace()`, `record_feedback()`, `compliance_check()` complete and manually verified
- [ ] Structural CTE and experiential flat query both return correct results on seeded sample data
- [ ] `main.py` skeleton created; all 8 REST routes stubbed
- [ ] Routes wired to real service-layer functions (no more stubs) for at least ingestion, history, and feedback
- [ ] REST contract shared with Frontend Developer — this is the freeze point Section 5 refers to
- [ ] Postman/curl smoke-check of each completed route

**Night (H18–24) — REST Complete + MCP Mesh Begins**
- [ ] All 8 REST routes live and returning correct data against seeded data
- [ ] Basic API auth in place (PRD §18)
- [ ] `mcp_server.py` skeleton created; all 3 tools stubbed as thin wrappers
- [ ] All 3 MCP tools verified inside a real Claude Desktop install
- [ ] Frontend: real fetch calls replacing mock JSON for `QueryPanel.jsx`
- [ ] End-of-Day-1 stand-up: confirm Sprint 4 exit criteria met before sleeping

### Day 2

**Morning (H24–30) — Watcher + Proactive Alerts**
- [ ] Telemetry simulator producing plausible readings, some matching seeded failure signatures
- [ ] `find_edges_matching_signature()` implemented and correctly matching seeded signatures
- [ ] Autonomous `watch_telemetry()` loop running and firing on a real match
- [ ] `POST /api/telemetry/simulate` manual trigger wired and tested
- [ ] `services/alerts.py` sending real Telegram messages to a real chat
- [ ] SSE push to dashboard confirmed working end-to-end (route → publisher → live event)
- [ ] Acceptance check: manual trigger → alert visible + Telegram message within 10 seconds

**Afternoon (H30–36) — Frontend Build (core)**
- [ ] `GraphView.jsx` rendering a real force-directed graph from live `trace()` data
- [ ] Edge color/thickness visibly driven by `confidence`
- [ ] `Dashboard.jsx` arc gauges ported from RAPHAEL and wired to `/api/dashboard/metrics`
- [ ] `AlertBanner.jsx` subscribed to the live SSE stream, animating in on a real alert
- [ ] `QueryPanel.jsx` fully wired to `/api/equipment/{id}/history`
- [ ] Feedback submission from the UI visibly changes edge confidence within 3 seconds

**Evening (H36–42) — Frontend Polish + Reliability Layer Begins**
- [ ] Visual polish pass: dark/sci-fi theme consistent across all 4 components
- [ ] `scripts/reset_demo.py` written and verified to fully reseed the DB
- [ ] `scripts/smoke_test.py` first draft written, exercising the full golden path
- [ ] Unit tests for `wilson_lower_bound()` and extraction JSON validators passing
- [ ] Full-stack local run: `main.py` + `mcp_server.py` + watcher loop + frontend dev server, all running simultaneously with no port/env conflicts

**Night (H42–48) — Freeze, Integration, Rehearsal**
- [ ] **H44 hard stop for new features** — cut-line rule (Section 12) in effect from this point
- [ ] `scripts/smoke_test.py` passing end-to-end on a freshly reset DB
- [ ] Offline/degraded-network fallback deliberately tested (kill Wi-Fi, confirm cached fallback + in-app alert still work)
- [ ] Golden-path rehearsal run #1 on the actual demo machine and network
- [ ] Bugs found in rehearsal #1 fixed (bugfixes only, no new scope)
- [ ] Golden-path rehearsal run #2 — clean, back-to-back with run #1, no code changes in between
- [ ] Slides finalized; Judge Q&A drill (Section 15) run at least once with the presenter
- [ ] Presenter and backup presenter both confirmed and rehearsed

---

## 9. Integration Plan

**Integration order** (why this order, not another): components integrate in dependency order, matching the critical path in Section 5 — service layer first (nothing else works without it), then its two thin wrappers (REST, MCP) in either order since they don't depend on each other, then the watcher (depends on REST for its manual trigger and SSE push), then the frontend (depends on REST + the watcher's SSE stream), then the reliability layer (depends on everything else existing).

1. `graph_service.py` integrated with `db/schema.sql` — verify with a scratch script, not yet through any API.
2. `main.py` (REST) integrated with `graph_service.py` — verify every route via `curl`.
3. `mcp_server.py` integrated with `graph_service.py` — verify every tool via Claude Desktop.
4. `watcher.py` + `alerts.py` integrated with the REST layer's SSE endpoint and the manual-trigger route.
5. `frontend/` integrated with the live REST + SSE endpoints, replacing all mock JSON.
6. `scripts/reset_demo.py` and `scripts/smoke_test.py` integrated last, because they test the whole assembled system.

**API testing.** Every REST route gets a `curl` or Postman check the moment it's wired to real logic (not after the whole layer is "done") — catching a broken response shape immediately is cheaper than catching it after the frontend has already built around a wrong assumption. Every MCP tool gets the same discipline via a live Claude Desktop call, not just a unit test of the underlying function.

**Merge strategy.** Feature branches merge into `dev` as soon as their sprint's exit criteria are met — do not batch multiple sprints' work into one large merge, since large merges are exactly where integration bugs hide until it's expensive to isolate them. `dev` → `main` happens at the four checkpoints already defined in Section 7 (Sprints 3, 4, 5, 6, 8).

**Conflict resolution.** Because `services/graph_service.py`, `db/schema.sql`, and the REST/MCP response contracts are single-owner files (Section 6), most merge conflicts should be mechanical (whitespace, import order) rather than logical. If a logical conflict does occur in a shared file, the single named owner of that file (Section 6) makes the final call — this is decided in advance specifically so it's not re-litigated under time pressure at hour 40.

**Smoke testing.** `scripts/smoke_test.py` (Sprint 7) is the single authoritative integration check: ingest → query → submit feedback → assert confidence changed → trigger telemetry → assert alert fired. It is run (a) immediately after every merge to `main` from Sprint 7 onward, and (b) immediately before walking on stage, per Engineering Spec §14's explicit instruction.

---

## 10. Testing Plan

Per Engineering Spec §16: **not full TDD.** One real end-to-end smoke test plus two narrowly targeted unit tests is the correct level of investment for a 48-hour window — anything more elaborate trades rehearsal time for coverage the demo doesn't need.

| Test type | What's covered | Tooling | When it runs |
|---|---|---|---|
| **Unit tests** | `wilson_lower_bound()` (pure function, the most judge-questioned number in the system); JSON-schema validators for both extraction responses | `pytest` | Written in Sprint 2/4; run on every commit touching `confidence.py` or the validators |
| **Integration tests** | Every REST route against the live service layer; every MCP tool against a live Claude Desktop session | `curl`/Postman scripts; manual Claude Desktop verification | Immediately after each route/tool is wired (Section 9), not batched to the end |
| **AI tests** | Extraction prompts return schema-valid JSON on real sample data, at least 3 consecutive clean runs; cached-fallback path deliberately triggered (forced timeout) and confirmed to produce an equivalent result | Scratch scripts + manual fault injection | Sprint 1 (prompt proving) and Sprint 7 (fallback verification) |
| **UI tests** | Manual click-through of all 4 frontend components against live (not mocked) data; feedback-to-confidence-update latency measured against the 3-second PRD acceptance criterion | Manual, by the Frontend Developer | Throughout Sprint 6, repeated in Sprint 8 |
| **Demo tests** | The full golden path (Section 13), run start-to-finish on the actual demo machine and network | `scripts/reset_demo.py` + manual walkthrough | Sprint 8 (at least twice, back-to-back, clean) |
| **Regression tests** | `scripts/smoke_test.py` re-run after every merge to `main` from Sprint 7 onward, to catch a later change silently breaking an earlier feature | `pytest` | Every merge to `main`, Sprints 7–9 |

**What's deliberately not tested**, and why that's the correct call, not a gap: exhaustive unit coverage of every service function, cross-browser frontend testing, load/performance testing beyond the NFR's stated demo-scale target (PRD §13), and any test of the federated/cross-plant claim — because that feature is explicitly out of MVP scope (PRD §16).

---

## 11. Deployment Plan

Per Engineering Spec §17/PRD §17: **"deployment" for this build means one machine, reliably, not a cloud rollout.** Do not spend hackathon hours on infrastructure the demo doesn't need.

### Local setup

- Single laptop runs all three local processes simultaneously: `main.py` (FastAPI, e.g. `uvicorn main:app --reload`), `mcp_server.py` (stdio, launched by Claude Desktop's config), and the `watcher.py` `asyncio` loop (either as a background task inside `main.py`'s process or a second terminal — team's choice, document whichever is chosen in `README.md`).
- Frontend runs via `npm run dev` (Vite dev server) pointed at the local FastAPI instance — no production frontend build needed for a live demo.
- `smriti.db` is a single file at `DATABASE_PATH` — back it up (copy the file) before every rehearsal so a bad rehearsal never costs the seeded dataset.

### Docker setup (optional hardening, not required by the spec)

Not called for in the Engineering Spec — SQLite + two local Python processes has no infrastructure dependency that Docker would meaningfully simplify at this scale, and containerizing under a 48-hour clock is exactly the kind of infra investment Engineering Spec §0.6 warns against. If the team wants a Docker Compose file purely as a "we thought about production packaging" credibility artifact for judges, treat it as a **Could**-priority nice-to-have built only after Sprint 8's freeze, never before.

### Production deployment (roadmap only — do not build this during the hackathon)

Per PRD §16/§17 and Product Strategy §10: production deployment (Neo4j/PostgreSQL graph migration, real EAM/SCADA integration, hosted multi-tenant infra) is explicitly a post-hackathon, Seed-stage-and-beyond concern. It belongs on the roadmap slide (Section 14), not in the repo.

### Environment variables

All secrets and config load through `.env` (git-ignored) via `config.py`, per Engineering Spec §13:
```
LLM_PROVIDER=gemini              # or claude
LLM_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DATABASE_PATH=./data/smriti.db
ALERT_CONFIDENCE_THRESHOLD=0.5
LLM_TIMEOUT_SECONDS=4
```

### Secrets management

- `.env` is git-ignored from the first commit (verify this in Sprint 0 — a leaked API key in commit history is a real, avoidable risk).
- Each teammate holds their own `.env` locally; the demo machine's `.env` is set up once during Sprint 8 and not touched again except to fix an actual bug.
- Telegram bot token and chat ID are treated the same as the LLM API key — never hardcoded, never committed, never shown on a shared screen during the demo (a judge screenshotting a visible token is an avoidable, silly risk).

### Backup plan

- **Cached extractions** (`data/cached_extractions/`) are the backup for the LLM API itself — if the API is down or slow at demo time, the ingestion step still visibly works (Engineering Spec §14).
- **In-app dashboard alert banner** is the backup for the Telegram webhook — if venue Wi-Fi blocks outbound calls to the Telegram API, the alert still fires and is still visible on screen, just without the phone-buzz beat (PRD §20).
- **A second laptop, pre-configured identically**, ready to present from if the primary demo machine fails — this is not in the source docs explicitly, but is a low-cost addition any hackathon team should have; if only one machine is available, at minimum keep a screen-recording of a full successful golden-path run as an absolute last-resort fallback.
- **`scripts/reset_demo.py` run immediately before walking on stage** — the single most important backup action, since it guarantees a known-good starting state regardless of what happened during rehearsal.

---

## 12. Risk Register

Consolidated from Product Strategy §12, PRD §20, and Engineering Spec §14, plus execution/team risks specific to this MDP's build plan.

| Risk | Type | Probability | Impact | Mitigation |
|---|---|---|---|---|
| A judge fact-checks a cited statistic live | Credibility | Medium | High | Cite only the verified figures in Product Strategy §3 ($1.4T Siemens downtime figure, $2.3M/hr automotive, ~20% McKinsey knowledge-search figure); never cite the unverifiable NASSCOM-EY or MTTR figures |
| P&ID parsing fails live on an unfamiliar diagram | Technical | Low (if mitigated) | High | Pre-select and pre-test the exact P&ID(s) used in the demo (Sprint 1); never invite the audience to upload their own live |
| Vision/LLM API rate limits or latency during the live demo | Technical | Medium | Medium | Cached-fallback extraction (Engineering Spec §14) with a short `LLM_TIMEOUT_SECONDS`; the demo never visibly fails |
| Telegram webhook delivery delay on venue Wi-Fi | Technical | Medium | Low | Test on venue Wi-Fi beforehand if possible; in-app dashboard alert is the non-negotiable fallback (PRD §20) |
| Telemetry "anomaly" feels obviously scripted | Demo credibility | Low | Medium | Frame it honestly as simulated telemetry against real historical failure patterns — judges respect a disclosed simulation far more than a discovered fake (Product Strategy §12) |
| Overclaiming the federated cross-plant network effect under judge questioning | Business credibility | Medium | High | Keep it strictly on the roadmap slide (Section 14); never present it as part of the live MVP; if asked directly, say plainly that it requires ≥2 real plants and data-sharing agreements not yet in place |
| Overclaiming PESO/OISD compliance certification | Business/legal credibility | Low | High | Always frame as "demo-level flagging of relevant decision traces," never as a certified compliance product (PRD §19) |
| Judges probe the confidence-score math as a "black box" | Technical credibility | Medium | Medium | Be ready to explain Wilson lower bound simply and honestly as a bounded reinforcement update — the AI Engineer who built it should field this question (Section 6) |
| "Just another AI-for-maintenance chatbot" first impression | Positioning | Medium | Medium | Lead every explanation with the fusion of structural + experiential data in one sentence (PRD §22), before mentioning any tech stack |
| SQLite scalability questioned as "not enterprise-grade" | Technical credibility | Medium | Low | Concede it openly — SQLite is an explicit demo-scale choice, not a production claim (PRD §13, §17); pivot immediately to the real moat (extraction schema + confidence loop + compounding dataset, Product Strategy §7) |
| `services/graph_service.py` becomes a bottleneck, delaying REST/MCP/frontend | Execution | Medium | High | Single dedicated owner (Section 6), started first (Sprint 2), nothing else in the codebase touches it until it's done (Section 5) |
| Small-team burnout / scope creep mid-build | Execution | Medium | High | Hold the 5-feature MVP line hard (PRD §14); use the cut-line rule below; no new features after Sprint 8 (H44) |
| Merge conflicts in shared files under time pressure | Execution | Low (if owners are respected) | Medium | Single named owner per shared-truth file (Section 6); conflict-resolution authority pre-assigned (Section 9) |
| Presenter goes off-script and the demo drifts past its time box | Presentation | Medium | Medium | Rehearse the exact golden path (Section 13) at least twice back-to-back before the real presentation; designate and rehearse a backup presenter |
| Demo machine fails at presentation time | Deployment | Low | High | Second pre-configured laptop as backup, or at minimum a screen-recording of a successful run (Section 11) |
| Team runs out of time before the reliability layer (Sprint 7) is built | Execution | Medium | High | Reliability work is scheduled at H40–44, before feature freeze, specifically so it isn't the thing cut when time runs short — if it must be cut, cut a **Could**-priority feature (Section 4) instead, never the reliability layer |

### The cut-line rule (from Product Strategy §9, adopted as this MDP's official scope-control mechanism)

If the team is meaningfully behind schedule at **H34**, drop the Telegram webhook alert first and fall back to the in-app dashboard banner only — it is explicitly the highest-effort, lowest-differentiating-IP feature on the Must-have list. No other Must-have feature is a candidate for cutting; if more than one feature is at risk, that is a signal to simplify scope within a feature (e.g., fewer seeded telemetry signatures, a simpler dashboard visual) rather than drop a whole feature category.

---

## 13. Demo Readiness Checklist

This is the golden-path rehearsal checklist from Engineering Spec §14, expanded into the categories the instruction template requests.

### Backend
- [ ] `main.py`, `mcp_server.py`, and the watcher loop all start cleanly with no errors on the actual demo machine
- [ ] All 8 REST routes return correct data against the freshly reset demo dataset
- [ ] `scripts/smoke_test.py` passes immediately before walking on stage

### Frontend
- [ ] `GraphView.jsx` renders the real force-directed graph from the reset demo data, not a cached screenshot
- [ ] `Dashboard.jsx` shows real, non-trivial computed numbers
- [ ] `AlertBanner.jsx` is confirmed subscribed and ready to animate in on the manual trigger

### AI
- [ ] Both extraction prompts confirmed working live against the exact demo P&ID and shift-notes file
- [ ] Cached fallback deliberately tested one more time (forced timeout) and confirmed silent/seamless
- [ ] Confidence-score update confirmed to complete within the 3-second acceptance window

### Deployment
- [ ] `.env` on the demo machine populated with real, working credentials (LLM key, Telegram token/chat ID)
- [ ] `scripts/reset_demo.py` run immediately before the presentation slot
- [ ] Demo machine's Wi-Fi/network connectivity verified at the actual venue, not just at home

### Presentation
- [ ] Slides finalized and loading correctly on the presentation machine/projector
- [ ] Presenter and backup presenter both rehearsed the full 5-minute script twice, back-to-back, with no hesitation
- [ ] Judge Q&A drill (Section 15) run at least once with whoever is expected to field technical questions

### Backup
- [ ] Second pre-configured laptop ready, or a screen-recording of a fully successful run saved locally
- [ ] `smriti.db` backed up (file copy) in its known-good, freshly-seeded state
- [ ] Printed or offline copies of the 3 source documents and this MDP available in case a judge asks to see the underlying planning artifacts

### Offline mode
- [ ] Venue Wi-Fi deliberately disabled once, mid-rehearsal, to confirm: ingestion falls back to cached extraction silently, the in-app alert still fires without Telegram, and no unhandled exception reaches the screen
- [ ] Team has agreed in advance on what to say if asked "is this live or cached" — the honest answer (per PRD §17) is that the demo dataset is simulated/pre-selected, and that's stated openly, not hidden

---

## 14. Presentation Preparation

This section operationalizes the demo script structure from Product Strategy §0 ("hook → magic → proactive moment → learning loop → executive view") against the official 5-criteria judging rubric (Relevance, Technical Implementation, Business Viability, Innovation, Presentation — Product Strategy §0.4).

### Storyline

Open on Rajesh, the retiring senior engineer (PRD §7.3) — 32 years at the same facility, whose judgment the plant is about to lose. Close on the same image, inverted: that judgment, captured, queryable, and outliving his tenure. Everything in between is proof that the inversion is real, not aspirational.

### Problem

Heavy industry doesn't have a documents problem, it has a judgment problem: P&IDs and EAM systems capture *what* a plant is; nobody captures *why* an experienced operator does X instead of Y under specific conditions. State the verified $1.4T/year global downtime figure and the ~20%-of-the-workweek knowledge-search figure once, cleanly, and move on — don't over-cite.

### Solution

One sentence first, always: *"We fuse what a plant is with what a plant knows, in one graph that gets smarter every shift."* Then the five MVP features, in this order, because it's also the demo order: Industrial Memory Graph → Feedback Loop → Proactive Alert → FastMCP Mesh → Executive Dashboard.

### Demo flow (the golden path — identical to Section 13, do not deviate live)

1. `python scripts/reset_demo.py` — known-good starting state.
2. Upload the pre-tested P&ID → graph renders live (the "graph blooms" moment — highest visual wow-factor in the deck).
3. Ingest the pre-tested shift-notes file → experiential edges appear alongside the structural ones.
4. Query a specific equipment ID → show structural + experiential results together, the single sentence that separates Smriti from a manual-retrieval chatbot.
5. Hit `POST /api/telemetry/simulate` on cue → alert banner animates in **and** a judge's own phone (or a visible presenter phone) buzzes via Telegram — the single best "Innovation" signal in the whole demo, because it's unprompted.
6. Submit a "rejected" feedback with an alternative fix → confidence visibly updates within 3 seconds — the self-learning claim, made concrete on screen, not asserted in a slide.
7. Switch to the Executive Dashboard → real, computed numbers a plant manager in the room would recognize as an actual KPI.
8. (Stretch, only if time and stability allow) Open Claude Desktop, call one MCP tool live — the literal proof of the "zero-custom-UI" integration claim.

### Innovation

The two things almost no other team at this hackathon will have built: a native FastMCP tool mesh instead of a bolted-on chatbot UI, and a visibly self-learning confidence loop the judges can watch update in real time rather than take on faith.

### Business value

Lead the business section with the Executive Dashboard's Expert Dependency Score — it converts an abstract fear ("we might lose expertise when someone retires") into a number a plant manager would put in a quarterly review. Then the business model (pilot → per-facility SaaS → tiered/federated at scale) and the GTM sequencing (mid-sized private plants first, expand within one operator group before crossing companies).

### Future roadmap (state honestly, per horizon — Product Strategy §10)

| Horizon | What's honest to say |
|---|---|
| 3 months | A working pilot with one friendly design-partner plant — not a paying customer yet |
| 6 months | First real usage data; one real EAM integration; the compounding dataset starts to actually exist |
| 1 year | Graph-store migration to Neo4j/PostgreSQL as a deliberate engineering upgrade; first real, legally structured, opt-in cross-plant pilot with 2–3 plants under one operator group |
| 3 years | Multi-tenant Industrial Memory OS across industrial groups; the accumulated decision-trace dataset becomes the actual product moat |

**Closing line, verbatim, per Product Strategy §13:** *"We didn't build a chatbot for your documents. We built the memory your best engineer would leave behind — if memory were something you could actually keep."*

---

## 15. Judge Q&A Preparation

50 questions a technically sophisticated, founder/industry-leader panel is likely to ask, grouped by theme, each with a concise, accurate, defensible answer grounded in the three source documents. **Assign a primary responder per group during rehearsal** (suggested owner in brackets, per Section 6's roles) so no single person is expected to field all 50 alone.

### A. Product & Problem *(suggested owner: Team Lead)*

1. **What exactly is the "judgment problem," and how is it different from a documentation problem?**
   Plants document structure well (P&IDs, manuals, work orders) but not *why* an experienced operator makes a specific call under specific conditions. That decision layer lives in people's heads and unstructured shift notes, never in a system of record — that's the gap Smriti targets.
2. **Isn't this just a chatbot for maintenance manuals?**
   No — a RAG chatbot on manuals can only retrieve what's already written, so it fails exactly where tribal knowledge diverges from official procedure. Smriti fuses structural (P&ID) and experiential (verified fix) data in one graph, which manual-retrieval has no mechanism to do.
3. **Who are your primary users, and which one matters most for adoption?**
   Seven personas (PRD §7): Field Technician, Maintenance Engineer, Plant Manager, Safety Officer, Reliability Engineer, Operations Head, Compliance Officer. The Field Technician drives daily use; the Plant Manager, via the dashboard, drives the pilot decision.
4. **What happens when Smriti suggests a fix that doesn't apply to the actual situation?**
   The technician marks it rejected via `capture_feedback`; the edge's confidence drops via the Wilson update, and a working alternative becomes a new fix edge. That's the self-learning loop in action, not a static answer.
5. **How is this different from just training the next technician better?**
   Training transfers what one senior person remembers to teach; Smriti captures what actually happened, verified by outcome, queryable by exact equipment/symptom — independent of who's training or remembering that day.
6. **What's your quantified impact number, and where's it from?**
   Global 500 companies lose an estimated $1.4T/year to unplanned downtime (11% of revenue), and knowledge workers lose ~20% of the workweek searching for information — both verified against Siemens' *True Cost of Downtime* (2024) and McKinsey Global Institute, not secondary/unverifiable sources.
7. **Why did you drop some stats from an earlier draft?**
   A specific named-study citation and a couple of derived percentages (an 18–22% downtime-attribution figure, an MTTR-inflation number) couldn't be traced to a real, citable source, so we removed or reframed them qualitatively rather than risk citing something we can't produce on request.

### B. Business Viability *(suggested owner: Team Lead)*

8. **What's your actual moat — isn't SQLite-over-Neo4j just an engineering choice a competitor could copy?**
   Correct, and we say so openly — SQLite is a demo-speed choice, not defensibility. The real moat is upstream: the extraction ontology, the confidence-reinforcement mechanism, and the compounding dataset of verified fixes that only accumulates through real usage.
9. **What's your business model?**
   Free/low-cost design-partner pilots (months 0–6), per-facility SaaS licensing priced on facility size/asset count (months 6–12), and tiered SaaS at scale (single-plant vs. multi-plant/federated), with the federated tier priced at a premium once real cross-plant data-sharing agreements exist.
10. **Who's your first customer and how do you get them?**
    Mid-sized private-sector plants (textile, process manufacturing) over large PSUs — faster procurement, lower integration complexity. The hackathon placement itself becomes the opening credibility signal for outbound conversations.
11. **How big is this market, really?**
    We don't cite a specific TAM we can't defend — we anchor on the verified $1.4T/year global downtime cost as the size of the pain, and let the pilot-to-Seed roadmap prove willingness to pay incrementally.
12. **What do incumbents like Maximo or SAP PM do better than you today?**
    They're deep, mature systems of record for physical assets — genuinely good at that. Their weakness is organizational, not technical: a centralized knowledge-graph project inside them is a master-data effort measured in quarters, which is the speed gap we exploit.
13. **How do you monetize the federated cross-plant feature you're not demoing?**
    We're explicit it isn't honestly demoable with one simulated dataset, so it's priced only once it's technically real — an opt-in, anonymized pilot across 2–3 plants under one operator group at the 1-year horizon, not claimed today.
14. **What's your concrete path to a paying customer?**
    3 months: a working pilot with one friendly design-partner plant, not paying yet. 6 months: first real licensing conversation once the pilot logs ≥50 real technician feedback events, proving the self-learning claim with real data.

### C. Technical Architecture *(suggested owner: Backend Developer)*

15. **Walk me through your system architecture in one breath.**
    Two local processes — FastAPI (REST) and FastMCP (tool server) — both reading/writing one shared SQLite file in WAL mode, with no service-to-service API between them; the database is the contract. A background asyncio watcher compares simulated telemetry against the graph and fires alerts.
16. **Why no message queue or Redis between your processes?**
    Two local processes and a demo-duration dataset don't need queue infrastructure — WAL-mode SQLite handles concurrent access directly. That infra exists on our other stack for a reason that doesn't apply at this scale.
17. **Why equipment→fix instead of equipment→symptom→fix?**
    A symptom has no identity worth reusing across equipment — it's context for one incident, not a reusable entity. Storing it as a rich edge property removes a join from every query for zero information loss.
18. **Why recursive CTEs only for topology, not for fix lookups?**
    Topology tracing is genuinely multi-hop, so it earns a bounded (3-hop) recursive traversal. Fix lookups are naturally one hop; routing them through recursion adds complexity with no retrieval benefit.
19. **Does this still work at tens of thousands of nodes?**
    Not without a planned migration — SQLite + CTE traversal is validated at demo scale only. The 1-year roadmap explicitly plans a move to Neo4j or PostgreSQL-with-graph-extension as a deliberate upgrade, not a hidden gap.
20. **How does FastMCP work here, and why does it matter?**
    Three tools (`trace_topology_and_history`, `capture_feedback`, `check_compliance_status`) as thin wrappers around one shared service layer. Any MCP-compliant client — Claude Desktop or a future enterprise client — calls them directly with zero additional UI work per client.
21. **What's your test coverage?**
    Deliberately not full TDD in 48 hours — one true end-to-end smoke test covering the whole golden path, plus unit tests for the Wilson score function and the extraction validators, since those are the highest-value, hardest-to-eyeball spots.
22. **What happens if the LLM API is down during your live demo?**
    Ingestion always attempts the live call first with a short timeout, then transparently falls back to a pre-baked, hand-verified extraction. The demo doesn't visibly fail; we disclose the fallback if asked directly.
23. **Is your telemetry data real?**
    No, and we say so upfront — simulated telemetry matched against real historical failure patterns, not connected to live SCADA. Real SCADA/EAM integration is an explicit 6-month-horizon item, not a hackathon deliverable.
24. **Why Telegram instead of WhatsApp?**
    WhatsApp Business Cloud API needs Meta business verification with unpredictable turnaround; a Telegram bot is live in under two minutes via BotFather, no approval process. Same demo moment, far less setup risk.

### D. AI / LLM Specifics *(suggested owner: AI Engineer)*

25. **Why a hosted LLM instead of a custom NLP/CV pipeline?**
    A custom NER/CV stack would consume more of 48 hours than the rest of the app combined, for a worse result on messy industrial text than a well-prompted frontier model already gives — this is current best practice, not a shortcut.
26. **How do you validate the LLM's extraction is correct?**
    Responses are constrained to a strict JSON schema and validated on receipt; a failed/malformed response retries once, then falls back to a cached, hand-verified extraction. Every experiential edge stores its `source_excerpt` for full traceability.
27. **Explain your confidence score — why Wilson lower bound, not a simple average?**
    A naive average can't tell "1 confirmation out of 1" from "18 out of 20" — it scores them identically. Wilson's lower bound is sample-size-aware: it only trusts a high score once there's enough evidence to earn it. It's the same method Reddit uses to rank comments, and about ten lines of code.
28. **What's your extraction accuracy rate?**
    We don't cite a specific percentage — we haven't run a formal labeled evaluation at hackathon scale. We validate via schema compliance plus manual spot-checks, and a labeled validation set is explicitly part of the post-hackathon hardening plan.
29. **Could the LLM hallucinate a fix that was never actually applied?**
    The prompt explicitly instructs it not to infer a fix that isn't stated as applied or recommended, and every extracted edge carries its original `source_excerpt` so any claim can be checked against the exact source text.
30. **Is your telemetry-pattern matching machine learning?**
    No, deliberately — it's a rule-based comparison of a reading against each fix edge's stored signature. At demo scale that's both correct and instantly explainable; an ML detector here would be unverifiable theater with no retrieval benefit.
31. **Which LLM provider are you using and why?**
    A hosted multimodal API (Gemini or Claude vision) rather than self-hosting a model like Qwen2.5-VL — this removes GPU/hosting risk during the build window and reuses vision-API experience the team already has.
32. **How do you keep extraction consistent across runs?**
    A strict JSON schema plus a worked few-shot example, validated on every response — consistency at demo scale comes from a short, fixed, well-tested prompt and validation/retry logic, not fine-tuning.

### E. Data, Scale & Security *(suggested owner: Database Engineer / Integration Engineer)*

33. **Is any of this real plant data?**
    No — the demo dataset is simulated and pre-selected, and we disclose that plainly rather than presenting it as live production data.
34. **How do you handle PII in shift notes, which often mention names?**
    All ingested free text is treated as containing PII by default; raw source text isn't displayed in the public demo without review, though `source_excerpt` is retained internally for audit purposes.
35. **Are your MCP and REST endpoints secured?**
    Basic authentication is required even in the demo build — not production-grade, but present, to establish the security pattern from day one rather than bolt it on later.
36. **What's your audit trail for a compliance officer?**
    Every feedback event (who, what outcome, when) is logged in `feedback_log`, and every safety-relevant trace retains its source, timestamp, and confidence history — the literal foundation of proving "why," not just "what."
37. **What are your performance characteristics?**
    Graph traversal returns in under 500ms at demo scale (hundreds to low thousands of nodes) — explicitly not benchmarked at enterprise scale, which is why the graph-store migration sits on the 1-year roadmap.
38. **What happens to a technician's feedback data if they leave the company?**
    `feedback_log` retains their tagged contributions as part of the plant's institutional record — the whole point is that this knowledge doesn't leave with the individual.

### F. Compliance & Ethics *(suggested owner: Team Lead)*

39. **Are you actually PESO/OISD certified or compliant?**
    No, and we don't claim to be — compliance flagging is explicitly demo-level flagging of relevant decision traces, a step toward auditability, not a certified compliance product.
40. **What happens if Smriti surfaces a fix that turns out to be unsafe?**
    The reinforcement loop downweights a fix as soon as technicians reject it, and every compliance-relevant trace carries a full audit trail so a safety review can trace exactly where a bad suggestion came from.
41. **Isn't there a risk of over-relying on an AI-suggested fix instead of engineering judgment?**
    Smriti surfaces ranked, confidence-scored history as decision support, not autonomous action — a technician still applies judgment and explicitly confirms or rejects the outcome, which is what keeps the system's trust calibrated.
42. **How do you avoid overclaiming in front of judges?**
    By design — every place we identified an unverifiable claim (statistics, compliance certification, the federated network effect), we cut it, reframed it qualitatively, or moved it explicitly to the roadmap rather than the live MVP claim.

### G. Team & Execution *(suggested owner: Team Lead)*

43. **How did you divide work across a small team in 48 hours?**
    Around single ownership of shared-truth files (the graph service, the schema) to avoid duplicated logic, with REST and MCP built as independent thin wrappers around one service layer so they could progress in parallel without blocking each other.
44. **What would you have done differently with more time?**
    Real EAM/SCADA integration instead of simulated telemetry, and a formally labeled extraction-accuracy validation set — both explicitly deferred to the roadmap rather than rushed into 48 hours.
45. **What was the biggest technical risk you had to manage?**
    The live LLM call during ingestion — latency or a malformed response could visibly break the demo, mitigated with a short timeout and a cached, hand-verified fallback indistinguishable from a live result.
46. **Do you actually practice the engineering discipline you're describing?**
    Yes — sprint-scoped feature branches, required review on shared-truth files, squash-merges into an integration branch, and a hard feature freeze several hours before presenting so the last stretch is rehearsal, not new code.

### H. Competitive & Moat *(suggested owner: Team Lead / AI Engineer)*

47. **What stops IBM or SAP from adding this to Maximo/SAP PM next quarter?**
    Nothing stops them from trying, but their organizational structure is the real barrier — the extraction ontology and reinforcement mechanism are specific product decisions, and the compounding verified-fix dataset only exists after real deployment, which a slower internal process doesn't shortcut.
48. **What stops another team from copying your exact architecture?**
    Nothing about the architecture itself — SQLite-over-Neo4j is a speed decision, not a moat, and we say so. What's harder to copy is the accumulated, technician-verified dataset once real usage starts.
49. **How is this different from a CMMS tool like MaintainX or Fiix?**
    Those tools handle work-order workflow and mobile UX well but aren't built to extract structured decision-symptom-fix relationships from free text, and have no continuous confidence-reinforcement loop — they store the comment, they don't learn from its outcome.
50. **In one sentence, why you over every other "AI for maintenance" team this cycle?**
    We're the only system fusing what a plant *is* with what a plant *knows* in one graph that gets measurably smarter every shift — everything else in the stack is supporting evidence for that one claim, not the claim itself.

---

## 16. Final Build Order

The exact implementation sequence, file by file, matching Engineering Spec §17 and every task defined in Section 4. Each step names why it's positioned there, what it depends on, and what "done" looks like.

**1. Repository setup**
- *Why now:* Nothing else can be written until there's somewhere for it to live.
- *Dependencies:* None.
- *Expected output:* Cloneable repo matching the Section 7 structure; every teammate can install dependencies locally.

**2. Database schema (`db/schema.sql`)**
- *Why now:* Every other component — ingestion, service layer, dashboard — reads or writes against this schema; it must be stable before anything is built on top of it.
- *Dependencies:* Repo setup.
- *Expected output:* `nodes`, `edges`, `feedback_log` tables and all four indexes created; `PRAGMA journal_mode=WAL` confirmed active.

**3. Sample data & prompt proving**
- *Why now:* Extraction prompts must be proven correct against real sample data *before* they're wired into a service — debugging a prompt through a full service+API+UI stack is far slower than debugging it in isolation.
- *Dependencies:* Repo setup (files need somewhere to live).
- *Expected output:* Pre-selected P&ID, written shift-notes file, both prompts returning schema-valid JSON 3+ times in a row, and hand-verified cached-fallback files.

**4. Core service layer (`services/graph_service.py`, `confidence.py`, `ingestion_service.py`)**
- *Why now:* This is the single shared source of truth every later layer (REST, MCP, frontend data contract) wraps — building it first means REST and MCP can be built in parallel afterward with no shared-logic duplication risk.
- *Dependencies:* Schema (2), proven prompts (3).
- *Expected output:* `trace()`, `record_feedback()`, `compliance_check()`, and `wilson_lower_bound()` all callable and manually verified against seeded sample data; both ingestion paths populate real nodes/edges.

**5. REST API layer (`main.py`)**
- *Why now:* The service layer exists and is stable, so this is now a thin wrapping exercise, not design work; it also unblocks the frontend, which needs a frozen contract to build against.
- *Dependencies:* Core service layer (4).
- *Expected output:* All 8 routes from Engineering Spec §9 live and verified via curl/Postman against real data.

**6. FastMCP tool mesh (`mcp_server.py`)**
- *Why now:* Depends on the same service layer as REST, not on REST itself — can run in parallel with step 5 if a second backend-capable person is free; positioned here because it's the explicit hackathon differentiator and deserves early, unhurried verification inside a real MCP client rather than a rushed check near the deadline.
- *Dependencies:* Core service layer (4).
- *Expected output:* All 3 tools verified callable from Claude Desktop, returning data identical to their REST equivalents.

**7. Proactive alert watcher (`watcher.py`, `alerts.py`)**
- *Why now:* Depends on the REST layer's SSE endpoint and manual-trigger route existing; positioned before frontend build so `AlertBanner.jsx` has a real, live stream to integrate against instead of a stub.
- *Dependencies:* REST layer (5), core service layer (4).
- *Expected output:* Manual trigger produces a dashboard alert and a real Telegram message within 10 seconds; the autonomous loop independently fires on a seeded match.

**8. Frontend (`GraphView.jsx`, `Dashboard.jsx`, `QueryPanel.jsx`, `AlertBanner.jsx`)**
- *Why now:* The REST contract (5) and the alert stream (7) are both stable, so the frontend is now wiring against a fixed target instead of a moving one — minimizing rework. Static scaffolding against mock data can and should have started earlier (Section 5), but the *real* wiring belongs here.
- *Dependencies:* REST layer (5), watcher/alerts (7) for `AlertBanner.jsx` specifically.
- *Expected output:* All 4 components rendering and updating from live backend data; feedback-to-confidence-update latency under 3 seconds.

**9. Executive Dashboard metrics wiring**
- *Why now:* Requires enough seeded feedback/edges to produce non-trivial numbers, so it's validated once real usage data (from steps 3–7's seeded activity) exists, not against an empty database.
- *Dependencies:* Core service layer (4), feedback loop (part of 4/6), some volume of seeded data.
- *Expected output:* Institutional Context Retained %, Expert Dependency Score, and Compliance Flags all computed from live, non-hardcoded data.

**10. Compliance flagging verification**
- *Why now:* The extraction pipeline (4) already produces the `is_compliance_relevant` flag; this step is a targeted verification pass, not new construction, so it belongs after the pipeline is stable, not before.
- *Dependencies:* Ingestion pipeline (4), `check_compliance_status` (6).
- *Expected output:* Realistic PESO/OISD-flavored sample text correctly flagged; `check_compliance_status` returns it via both REST and MCP.

**11. Testing & reliability layer (`scripts/reset_demo.py`, `scripts/smoke_test.py`, unit tests)**
- *Why now:* Can only meaningfully test the *whole* assembled system once every Must-have feature (steps 4–10) is functionally complete — writing it earlier means rewriting it repeatedly as the API surface changes underneath it.
- *Dependencies:* Steps 4–10 substantially complete.
- *Expected output:* `smoke_test.py` passing end-to-end on a freshly reset database; cached-fallback and offline-mode behavior deliberately verified, not assumed.

**12. Integration & feature freeze**
- *Why now:* This is the point where the team stops building features and starts hardening the one path that matters — the golden-path demo — per the cut-line rule in Section 12.
- *Dependencies:* Reliability layer (11).
- *Expected output:* Two consecutive clean, unassisted runs of the full golden path with zero code changes between them.

**13. Deployment (local demo-machine validation)**
- *Why now:* Everything must run simultaneously on the actual presentation hardware and network before it's trusted to run there live — a setup that works on a developer's laptop is not yet proven on the demo machine.
- *Dependencies:* Feature freeze (12).
- *Expected output:* All processes (`main.py`, `mcp_server.py`, watcher, frontend dev server) running together on the demo machine, on the venue's actual network, with the offline fallback deliberately exercised once.

**14. Presentation rehearsal**
- *Why now:* Only makes sense once the system it's rehearsing against is frozen and stable — rehearsing against a system that's still changing wastes the rehearsal.
- *Dependencies:* Deployment validation (13).
- *Expected output:* Presenter and backup presenter each deliver the full 5-minute script twice, back to back, with no hesitation and no visible failure; Judge Q&A drill completed at least once.

**15. Demo**
- *Why now:* The end state everything else exists to produce.
- *Dependencies:* All prior steps.
- *Expected output:* A live, unmocked, end-to-end demonstration of all 5 MVP features, an unprompted proactive alert, and a confident, accurate response to whatever the judging panel asks.

---

*This MDP is a conversion layer, not a new plan. Every architectural decision, cut feature, and risk called out above traces back to a specific section of `01_Smriti_Product_Strategy.md`, `02_Smriti_PRD.md`, or `03_Smriti_Engineering_Spec.md` — cited inline throughout. If a task in this document ever appears to contradict one of those three files, the source document wins; flag the discrepancy and resolve it before writing code, not after.*
