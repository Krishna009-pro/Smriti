# Smriti OS — System Overview & Handover Document

This document provides a comprehensive overview of the Smriti OS project context, architecture, tech stack, and key implementation details for incoming agents to review, suggest improvements, and extend.

---

## 1. Problem Statement
In heavy, asset-intensive industries (manufacturing, energy, chemicals):
* **Information Waste:** Plant professionals spend approximately **20% of their working hours** searching for scattered files and historical maintenance logs (McKinsey & Company).
* **System Fragmentation:** Facilities operate across multiple disconnected silos—ranging from PDF piping schematics and manual shift handover logs to compliance spreadsheets and email chains.
* **Downtime and Safety Risk:** Information silos contribute significantly to unplanned plant downtime and maintenance delays, as technicians lack instant access to past failure symptoms and their verified solutions.
* **Knowledge Loss:** Plant operations face critical institutional memory loss as senior engineers retire, taking decades of undocumented troubleshooting expertise with them.

---

## 2. What We Built (Smriti OS)
**Smriti** (*"Memory"* in Sanskrit) is an **Industrial Memory Operating System**. It fuses a plant's **structural layout** (what equipment connects to what, parsed from P&ID diagrams) with its **experiential knowledge** (how to fix it, parsed from shift notes and logs) into a single, unified graph.

### Core Completed Modules:
1. **Multimodal Ingestion Pipeline:** Uses hosted LLM/Vision models to extract structured layout connections (`connects_to`) and troubleshooting remedy associations (`has_known_fix`). Includes offline cached fallbacks to guarantee live demo resilience.
2. **Self-Learning Feedback Loop:** Recalculates recommended fix confidence scores using the **Wilson Lower Bound** interval (Reddit ranking formula) when technicians upvote or downvote suggestions.
3. **Proactive Anomaly Alerts:** An autonomous background loop monitors live telemetry, matches it against JSON failure signatures, and fires real-time Telegram and Server-Sent Events (SSE) alerts.
4. **FastMCP Integration Mesh:** A native Model Context Protocol (MCP) server exposing tools directly to LLM clients (like Claude Desktop) with zero custom UI.
5. **Dashboard & Metrics:** A Next.js Web UI showing real-time metrics for *Institutional Context Retained %* and the *Expert Dependency Score* (bus-factor), search lookup panels, dynamic feedback upvoting, and live SSE tickers.

---

## 3. Tech Stack & Architecture

### Technologies Used:
* **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend:** FastAPI, Uvicorn, Python 3.11, Pydantic (data models), HTTPX (Telegram notifications).
* **Database:** SQLite (in WAL mode for concurrent FastAPI + FastMCP server reads/writes), SQLAlchemy (ORM), Alembic (migrations).
* **AI & Integration:** Model Context Protocol (`fastmcp` SDK), hosted vision/extraction prompts.

### Directory Structure:
```
smriti/
├── frontend/               # Next.js App Router (TypeScript + Tailwind)
├── backend/                # FastAPI Application + FastMCP Server
│   ├── main.py             # REST API endpoints + SSE stream setup
│   ├── mcp_server.py       # FastMCP tool declarations
│   ├── services/
│   │   ├── graph_service.py # Bounded CTE queries, Wilson updates, metrics
│   │   ├── ingestion_service.py # Ingestion prompts & cache fallbacks
│   │   ├── confidence.py    # Wilson Lower Bound pure function
│   │   ├── watcher.py       # Async background telemetry loop
│   │   └── alerts.py        # Telegram Bot API client
│   ├── db/
│   │   ├── models.py       # SQLAlchemy database models
│   │   ├── session.py      # SQLite WAL hook setup & session factory
│   │   └── migrations/     # Alembic version files
│   ├── models.py           # Pydantic schema validation models
│   └── requirements.txt
├── scripts/
│   ├── reset_demo.py       # Database schema drop/create & ORM seed script
│   └── smoke_test.py       # End-to-end API golden-path validator script
├── tests/                  # Backend unit test suites
└── docs/                   # Engineering specs, progress tracker, and strategies
```

---

## 4. Key DB Schema & SQL Queries

### SQLAlchemy Models (Fusing Structure + Experience):
* **Nodes:** `id` (PK), `type` ('equipment', 'fix', 'procedure'), `name`, `properties` (JSON).
* **Edges:** Fuses both `connects_to` (structural flow direction) and `has_known_fix` (experiential metrics: positive/negative feedback counters, telemetry matching signature JSON, Wilson confidence weight, and OISD/PESO compliance flags).
* **Feedback Log:** Audit trail of confirmations/rejections by technician ID.
* **Users:** Basic account mapping (technician / engineer role limits).

### Bounded-Depth Structural Traversal (3 Hops Connects-To):
```sql
WITH RECURSIVE topology(id, depth) AS (
    SELECT :equipment_id, 0
    UNION ALL
    SELECT e.target_id, t.depth + 1
    FROM edges e
    JOIN topology t ON e.source_id = t.id
    WHERE e.relation_type = 'connects_to' AND t.depth < 3
)
SELECT DISTINCT n.id, n.name, n.type, topology.depth
FROM topology
JOIN nodes n ON n.id = topology.id
ORDER BY topology.depth;
```

---

## 5. Main APIs & MCP Tools

### REST Endpoint Contract:
* `POST /api/ingest/pid?file_path=...` - vision extraction loader.
* `POST /api/ingest/shift-notes?file_path=...` - shift notes extractor.
* `GET /api/trace/{equipment_id}` - returns combined physical + remedy graph.
* `POST /api/feedback` - records confirmed/rejected technicians' votes.
* `GET /api/dashboard/metrics` - calculates context retention % and dependency score.
* `GET /api/alerts/stream` - SSE stream listener.
* `POST /api/telemetry/simulate` - triggers simulated anomaly.

### Model Context Protocol (MCP) Tools (`backend/mcp_server.py`):
1. `trace_topology_and_history(equipment_id: str)`
2. `capture_feedback(edge_id: str, technician_id: str, outcome: str, note: str)`
3. `check_compliance_status()`

---

## 6. How to Run & Verify

1. **Reset & Seed Database:**
   ```bash
   backend\.venv\Scripts\python scripts\reset_demo.py
   ```
2. **Start FastAPI Backend:**
   ```bash
   backend\.venv\Scripts\python -m uvicorn backend.main:app --port 8000
   ```
3. **Start Next.js Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
4. **Execute End-to-End Smoke Test:**
   ```bash
   backend\.venv\Scripts\python scripts\smoke_test.py
   ```
5. **Run PyTest Suites:**
   ```bash
   backend\.venv\Scripts\python -m pytest
   ```

---

## 7. Prompts for Hermes Agent (Instructions to Copy-Paste)

You can copy and paste any of the following prompts into your conversation with the Hermes Agent to initiate analysis and enhancements:

### Option A: System Optimization & Code Audit
> **Prompt:**
> "I have built the core Smriti OS codebase. Read the `docs/project_summary_for_agent.md` file first to understand the context. Inspect the Python files in `backend/` and `scripts/` and the TypeScript files in `frontend/src/`. Conduct a comprehensive code audit. Focus on identifying concurrency bugs, performance locks in SQLite, error handling gaps, or potential TypeScript compilation warnings. Provide specific recommendations and write code improvements."

### Option B: Propose Feature Enhancements
> **Prompt:**
> "Read `docs/project_summary_for_agent.md` for project background. Based on the system's architecture and problem statement, propose 3 advanced features we can build next to increase the product value (e.g., adding local vector retrieval fallback, advanced compliance rules mapping for OISD safety requirements, or automated shift notes summarization tools). For each, lay out a technical design plan and the required code changes."

### Option C: UI/UX Refinement
> **Prompt:**
> "Read `docs/project_summary_for_agent.md` to understand our industrial dashboard dashboard pages. Inspect `frontend/src/app/page.tsx`. I want to make the dashboard look like a premium, dark-mode, high-fidelity command console. Suggest specific improvements to the layout (such as interactive D3 force drag states, responsive metrics gauges, alert banners animations) and implement the CSS/ Tailwind changes."

