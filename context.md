# Smriti OS — Session Handover Context

This document summarizes the current state, modifications, and system architecture for the next LLM session.

---

## 1. Current Project State
* **Fully Operational:** The entire end-to-end golden path is running with **100% success**.
* **Test Suite:** All 19 backend unit tests (`pytest`) pass successfully.
* **Smoke Verification:** The end-to-end smoke test script (`scripts/smoke_test.py`) runs warning-free in under 3 seconds.
* **Active Port Settings:**
  - **Backend API:** Port `8000` (FastAPI + Uvicorn)
  - **Frontend UI:** Port `8080` (Vite + TanStack Router — **Lovable UI**)
  - **Database:** `database/smriti.db` (SQLite in WAL mode)

---

## 2. How to Run

### Backend
```powershell
cd "C:\Users\kkp18\OneDrive\Pictures\Documents\Smriti"
backend\.venv\Scripts\python -m uvicorn backend.main:app --port 8000 --reload
```
> **IMPORTANT:** Always run from the project root (`Smriti/`), not from inside `backend/`. The app imports use `from backend.xxx import ...` which requires the root on `sys.path`.

### Frontend (Lovable Vite UI)
```powershell
cd "C:\Users\kkp18\OneDrive\Pictures\Documents\Smriti\frontend"
npm run dev
```
Open **http://localhost:8080** in the browser.

---

## 3. Frontend Architecture (Lovable UI — NEW)

The **Next.js frontend has been replaced** with a premium Vite + TanStack Router SPA built in Lovable.

| Item | Detail |
|---|---|
| **Location** | `frontend/` (was `frontend_next_backup/`) |
| **Tech Stack** | Vite v8 + React + TanStack Router + Tailwind CSS v4 + shadcn/ui |
| **Main File** | `frontend/src/routes/index.tsx` (889 lines, single-page app) |
| **Theme** | Dark obsidian (`#070A13`), glassmorphic cards, teal/emerald accents |
| **API Base** | `http://127.0.0.1:8000` (hardcoded in `const API`) |

### UI Sections
- **Header:** Simulate Anomaly button, Re-run Ingest Pipelines button, SSE live status badge
- **Left Column:** Operational Health KPIs, Equipment Search, Document Ingestion Hub, Technician ID
- **Center Column:** Interactive SVG Topology Graph (`VLV-102a → P-102 → V-101`) with animated flow lines
- **Right Column:** Remedy Diagnostics (upvote/downvote), Active Alerts Log (SSE-driven)
- **Floating Widget:** AI Copilot chat drawer with camera upload (bottom-right)

---

## 4. Work Completed — Lovable UI Session

### 🎨 Premium Lovable UI Migrated (`COMPLETED`)
* Replaced old Next.js `frontend/` with the Lovable-built `velvet-echo-garden` Vite app.
* Old Next.js app backed up to `frontend_next_backup/`.
* Build verified: `✓ 1884 modules transformed` with 0 errors, 0 vulnerabilities.

### 🔧 Frontend Bug Fixes (`COMPLETED`)
1. **`crypto.randomUUID` polyfill** — `crypto.randomUUID()` only works on HTTPS. Added `genId()` fallback for `http://localhost`.
2. **`/api/ingest/rerun` 404** — Endpoint was missing from backend. Added it to `main.py` as an alias for vector/sync.
3. **`/api/feedback` 422 → 400** — Frontend was sending wrong field names (`technician` instead of `technician_id`) and wrong outcome values (`"up"/"down"` instead of `"confirmed"/"rejected"`). Fixed.
4. **Fake edge IDs in feedback** — Frontend used hardcoded `"e-p102-v101"` IDs that don't exist in DB. Now loads real edge IDs from `GET /api/trace/P-102` on startup.
5. **Flow lines invisible** — SVG gradient `stopOpacity` was `0.2` (nearly invisible). Raised to `0.8` and increased `strokeWidth` from `2.5` to `3.5`.

### 🛠️ Backend Additions (`COMPLETED`)
* Added `POST /api/ingest/rerun` endpoint to [main.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/main.py) — syncs edge embeddings and is called by the dashboard "Re-run Ingest Pipelines" button.

---

## 5. End-to-End Features Handover

### 1. Hybrid RAG Pipeline (Cloud-First, Local-Second)
* Calls Gemini 2.5 Flash when online.
* Graceful fallback to local vector search (384-dim `all-MiniLM-L6-v2` in SQLite-vec).

### 2. Proactive Telemetry Watcher
* Evaluates live telemetry readings against DB rules.
* Fires alerts to: SSE dashboard stream + Telegram Bot API.
* **Simulate button** calls `POST /api/telemetry/simulate` with `{ equipment_id, metric, value, delta_pct }`.

### 3. Self-Learning Knowledge Graph
* Upvote/downvote on remedies updates Wilson lower bound confidence score.
* Changes re-embedded into sqlite-vec vector table.
* Feedback uses real edge integer IDs fetched from `/api/trace/P-102` on load.

### 4. Multimodal Camera Ingestion
* Telegram: photo → Gemini Vision → equipment tag → RAG response.
* Web UI: camera icon in chat drawer → `POST /api/chat/vision`.

### 5. Real-Time Document Ingestion Hub
* Accepts `.pdf`, `.txt`, `.csv`, `.xlsx`, `.png`, `.jpg`.
* Two endpoints: `POST /api/ingest/upload/pid` and `POST /api/ingest/upload/shift-notes`.
* **Valid Demo Seeds:**
  - `datasets/sample_pid.pdf` — ReportLab vector P&ID schematic.
  - `datasets/sample_shift_notes.txt` — Pump mechanical seal repair log.
  - `datasets/sample_email_archive.txt` — Operational email discussing P-102 and V-101.
  - `datasets/sample_spreadsheet.csv` — CSV pump maintenance records.

### 6. Interactive Compliance PDF Exporter
* Built [compliance_service.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/compliance_service.py) using `reportlab`.
* Button on dashboard → `GET /api/compliance/export/{equipment_id}` → streamed PDF download.

### 7. Two-Way Telegram Mobile Copilot
* Long-polling listener in [telegram_listener.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/telegram_listener.py).
* Responds with Gemini RAG steps, confidence scores, and references.

---

## 6. Known Notes & Gotchas

* **Hydration warning in browser console** — caused by Grammarly/QuillBot browser extensions injecting attributes into `<html>`. Not a bug. Use incognito mode for demos.
* **CORS note** — Backend uses `allow_origins=["*"]`. The Lovable cloud preview (`lovable.app`) cannot call `127.0.0.1` due to browser Private Network Access policy. Always use `http://localhost:8080`.
* **SQLite-vec upsert pattern** — `vec0` tables require `DELETE` then `INSERT` (no `ON CONFLICT`).
* **Backend run path** — Must run uvicorn from project root `Smriti/`, not from inside `backend/`.

---

## 7. Suggested Next Steps
1. **Real-time KPI fetch** — Wire the retention/dependency/compliance numbers to `GET /api/dashboard/metrics` instead of hardcoded values.
2. **Trace on node click** — Clicking SVG nodes should call `/api/trace/{nodeId}` and update the remedy panel dynamically.
3. **Chat real responses** — Wire the copilot chat to `POST /api/chat/ask` and display the real Gemini answer.
4. **Voice-to-Text** — Add voice message transcription (Whisper/Gemini) to the Telegram listener.
5. **Hackathon Pitch Deck** — Create a slide structure summarizing core features for judges.
