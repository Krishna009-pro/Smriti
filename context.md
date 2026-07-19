# Smriti OS — Session Handover Context

This document summarizes the current state, modifications, and system architecture for the next LLM session (Claude 3.5 Sonnet).

---

## 1. Current Project State
* **Fully Operational:** The entire end-to-end golden path is running with **100% success**.
* **Test Suite:** All 19 backend unit tests (`pytest`) pass successfully.
* **Smoke Verification:** The end-to-end smoke test script (`scripts/smoke_test.py`) runs warning-free in under 3 seconds.
* **Active Port Settings:**
  - **Backend API:** Port `8000` (FastAPI + Uvicorn)
  - **Frontend UI:** Port `3000` (Next.js + Turbopack)
  - **Database:** `database/smriti.db` (SQLite in WAL mode)

---

## 2. Work Completed in this Session

### 🔧 sqlite-vec Virtual Table Upsert Fix
* **The Issue:** SQLite-vec `vec0` virtual tables do not support standard SQLite `INSERT OR REPLACE` or `ON CONFLICT` constraints. Re-indexing or upvoting threw a `UNIQUE constraint failed on edge_embeddings primary key` exception.
* **The Fix:** Modified `upsert_edge_embedding` in [vector_store.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/vector_store.py) to follow an idempotent `DELETE` then `INSERT` pattern. Re-indexing is now completely clean and warning-free.

### 🚀 Gemini API Upgrade (`gemini-1.5` ➔ `gemini-2.5`)
* **The Issue:** The API key returned `404 NOT_FOUND` for `gemini-1.5-flash` because the 1.5 namespace is deprecated on the user's key (since the local runtime is in **July 2026**).
* **The Fix:** Upgraded model paths across [rag_service.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/rag_service.py), [extraction_client.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/extraction_client.py), and [chat_service.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/chat_service.py) to **`gemini-2.5-flash`**. Requests are now fully functional (200 OK).

### 📱 Two-Way Interactive Telegram Mobile Copilot
* **The Issue:** The Telegram bot was initially designed as a one-way alert broadcaster only.
* **The Fix:** Created a background long-polling listener in [telegram_listener.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/services/telegram_listener.py) that starts automatically on app startup. Technicians can now text `@smriti_alerts_bot` on their phone, and the bot responds with conversational Gemini RAG troubleshooting steps, references, and confidence scores!

### ⚡ Eager Model Warmup on Startup
* **The Issue:** Lazy-loading the `sentence-transformers` model on the first RAG or feedback API request caused a 5–10 second latency spike, resulting in `httpx.ReadTimeout` errors in the smoke test.
* **The Fix:** Eagerly warm up the sentence embedder cache in `startup_event` in [main.py](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/backend/main.py). All subsequent requests now execute instantly.

### 🧪 Fallback Unit Test Mocking
* **The Fix:** Patched `tests/test_backend/test_chat.py` to temporarily override `settings.gemini_api_key` to `None` during offline fallback tests. This guarantees fallback assertions pass cleanly regardless of the API key state in the local `.env`.

---

## 3. End-to-End Features Handover

### 1. Hybrid RAG Pipeline (Cloud-First, Local-Second)
* Calls Gemini 2.5 Flash when online.
* If the API fails, times out, or has no internet/key, it gracefully falls back to local vector search (384-dim `all-MiniLM-L6-v2` embeddings in SQLite-vec) to synthesize a remedy response.

### 2. Proactive Telemetry Watcher
* Evaluates live telemetry readings against rules in the SQLite DB.
* If a signature matches, it fires an alert payload to:
  - The dashboard UI using **Server-Sent Events (SSE)**.
  - The technician's phone via the Telegram Bot API.

### 3. Self-Learning Knowledge Graph
* When a technician upvotes or downvotes a remedy on the dashboard, the system updates positive/negative feedback tallies and recalculates the Wilson lower bound confidence score.
* Changes are re-embedded and synchronized with the sqlite-vec virtual table.

---

## 4. Suggested Next Steps for Claude 3.5 Sonnet
1. **Frontend Styling Polish:** Upgrade `frontend/src/app/page.tsx` with premium dark-mode styling, smooth animations, and glassmorphic UI components.
2. **Interactive SVG Topology Graph:** Add hover-states, animations, and node detail flyouts for P&ID equipment tags and connection lines.
3. **Hackathon Pitch & Slide Deck:** Create a slide structure or pitch script summarizing the core features (Ingestion, Mobile RAG, Local-second resilience, Watcher, Self-learning loop).
