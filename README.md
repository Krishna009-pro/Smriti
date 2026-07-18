# Smriti — Industrial Memory OS

Smriti is an Industrial Memory Operating System that fuses a plant's physical topology (P&IDs, equipment connections) with its experiential knowledge (shift notes, work-order comments, technician logs) into a single self-learning graph.

Unlike traditional CMMS/EAM systems that isolate operator notes in unstructured attachments, Smriti structures them into actionable **equipment → symptom → fix** relationships, ranks them with sample-size-aware confidence scoring, and exposes them through a lightweight FastMCP tool mesh and a dynamic dashboard.

---

## 🏗️ Project Architecture & Structure

The repository is structured for modularity, allowing the frontend, backend, and AI pipeline to be developed, tested, and run independently:

```
smriti/
├── frontend/               # Next.js App Router (TypeScript + Tailwind CSS)
├── backend/                # FastAPI Application (REST API + FastMCP Server)
├── ai/                     # Local Python package for LLM extraction models
├── database/               # SQL schema definitions, migrations, and seeds
├── docker/                 # Deployment configurations (Dockerfiles + Compose)
├── scripts/                # Demo reset, seeding, and smoke testing scripts
├── tests/                  # Unified test suites (Frontend, Backend, AI package)
├── assets/                 # Architecture diagrams, design tokens, logos
├── datasets/               # Sample P&IDs, shift notes, and cached extractions
└── docs/                   # Full product specifications, strategy, and roadmap
```

---

## 🛠️ Technology Stack

* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, ESLint, Prettier
* **Backend:** FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic, Python Virtual Environment
* **AI/Extraction:** Python package, Gemini/Claude Multimodal APIs (Structured Outputs)
* **Database:** SQLite (WAL mode for concurrent FastAPI + FastMCP reads/writes)
* **Orchestration:** Docker Compose

---

## 🚀 Quick Start (Local Setup)

Detailed configuration instructions are located in the `README.md` of each respective directory. Below is the high-level onboarding flow:

### 1. Backend Setup
Navigate to the `backend/` directory, create a virtual environment, install dependencies, and run the server:
```bash
cd backend
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```
The REST API will be available at `http://localhost:8000`.

### 2. Frontend Setup
Navigate to the `frontend/` directory, install dependencies, and run in dev mode:
```bash
cd frontend
npm install
npm run dev
```
The Web UI will be available at `http://localhost:3000`.

### 3. Docker Compose Setup
To run both components and the SQLite database automatically:
```bash
docker-compose up --build
```

---

## 📈 Roadmap & Development Timeline

Smriti is being initialized for the **ET AI Hackathon 2026**.
For the master plan, including tasks and timeline milestones, refer to [Smriti Master Development Plan](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/docs/Smriti_Master_Development_Plan.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///c:/Users/kkp18/OneDrive/Pictures/Documents/Smriti/LICENSE) file for details.
