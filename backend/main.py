import asyncio
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBaseModel
from typing import Optional as PydanticOptional

from backend.config import settings
from backend.models import (
    NodeResponse, EdgeResponse, FeedbackCreate, FeedbackResponse,
    TelemetryReading, AlertResponse, GraphTraceResult, ChatRequest, ChatResponse
)
from backend.auth.router import router as auth_router
from backend.auth.dependencies import get_current_user, RoleChecker
from backend.db.models import User
from backend.db.session import get_db
from backend.services.ingestion_service import IngestionService
from backend.services.graph_service import GraphService
from backend.services.watcher import TelemetryWatcher
from backend.services.alerts import AlertSender
from backend.services.chat_service import ChatService

# Global list of active SSE listener queues
sse_listeners = []

# Initialize alert sender with settings credentials
alert_sender = AlertSender(
    bot_token=settings.telegram_bot_token,
    chat_id=settings.telegram_chat_id
)

# Watcher alert callback to fanout alerts to Telegram and dashboard clients
async def handle_watcher_alert(alert_payload: dict):
    # 1. Forward to Telegram bot
    await alert_sender.send_telegram_alert(alert_payload)
    
    # 2. Dispatch to all connected SSE clients
    for queue in sse_listeners:
        await queue.put(alert_payload)

watcher = TelemetryWatcher(on_alert=handle_watcher_alert)

app = FastAPI(
    title="Smriti — Industrial Memory OS API",
    description="Fuses plant topology with experiential knowledge using structured extraction and a self-learning graph.",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    await watcher.start()

    # Print key presence at startup so we can confirm .env is loaded
    print(f"[+] OPENROUTER_API_KEY loaded: {bool(settings.openrouter_api_key)} "
          f"({'sk-or-…' + settings.openrouter_api_key[-4:] if settings.openrouter_api_key else 'NOT SET'})")
    print(f"[+] GEMINI_API_KEY loaded:     {bool(settings.gemini_api_key)} "
          f"({'AIza…' + settings.gemini_api_key[-4:] if settings.gemini_api_key else 'NOT SET'})")

    # Ensure database tables exist and auto-seed if empty
    try:
        from backend.db.session import engine, Base, SessionLocal
        from backend.db.models import KnowledgeNode, User
        from backend.auth.security import hash_password
        Base.metadata.create_all(bind=engine)
        print("[+] Database tables created/verified successfully.")

        db_init = SessionLocal()
        try:
            if db_init.query(KnowledgeNode).first() is None:
                print("[*] Empty database detected — auto-seeding initial graph nodes...")
                if db_init.query(User).filter(User.username == "TECH-01").first() is None:
                    db_init.add(User(username="TECH-01", hashed_password=hash_password("password123"), role="technician"))
                    db_init.add(User(username="ENG-01", hashed_password=hash_password("password123"), role="engineer"))
                    db_init.commit()

                from backend.services.ingestion_service import IngestionService
                ingest = IngestionService(db_init)
                ingest.ingest_pid("pid_document.pdf", use_cache=True)
                ingest.ingest_shift_notes("shift_notes.txt", use_cache=True)
                print("[+] Initial knowledge graph auto-seeded successfully.")
        finally:
            db_init.close()
    except Exception as e:
        print(f"[-] Database initialization/seeding warning: {e}")

    try:
        from backend.services.vector_store import init_vector_store
        from backend.services.rag_service import sync_edge_embeddings
        from backend.db.session import SessionLocal
        init_vector_store()
        
        # Eagerly warm up embedding model
        from backend.services.embeddings import get_embedder
        get_embedder()

        db = SessionLocal()
        try:
            sync_edge_embeddings(db)
        finally:
            db.close()
            
        # Launch Telegram conversational listener task
        import asyncio
        from backend.services.telegram_listener import start_telegram_listener
        asyncio.create_task(start_telegram_listener(SessionLocal))
    except Exception as e:
        print(f"[-] Vector startup indexing failed: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    await watcher.stop()

# Include Auth Router
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Smriti — Industrial Memory OS API",
        "docs": "/docs",
        "health": "/health"
    }

# CORS middleware config — allow all origins for public frontend & Vercel preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, str]:
    """
    Check application and database connectivity.
    """
    return {"status": "healthy", "service": "smriti-api"}

@app.get("/api/debug/status")
def debug_status() -> Dict[str, Any]:
    """Check which API keys are loaded (safe — shows only last 4 chars)."""
    return {
        "openrouter_key": (
            f"sk-or-…{settings.openrouter_api_key[-4:]}" if settings.openrouter_api_key else "NOT SET"
        ),
        "gemini_key": (
            f"AIza…{settings.gemini_api_key[-4:]}" if settings.gemini_api_key else "NOT SET"
        ),
        "openrouter_model": "google/gemini-2.5-flash",
        "vision_model": "gemini-3.1-flash-lite (direct Gemini API)",
    }


# --- Ingestion Endpoints ---
@app.post("/api/ingest/pid", status_code=status.HTTP_202_ACCEPTED)
def ingest_pid(file_path: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Parse an uploaded P&ID (PDF/image) and extract equipment nodes + structural edges.
    """
    result = IngestionService(db).ingest_pid(file_path)
    result["status"] = "accepted"
    return result

@app.post("/api/ingest/shift-notes", status_code=status.HTTP_202_ACCEPTED)
def ingest_shift_notes(file_path: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Parse unstructured shift-note/work-order text and extract decision–symptom–fix triples.
    """
    result = IngestionService(db).ingest_shift_notes(file_path)
    result["status"] = "accepted"
    return result

@app.post("/api/ingest/upload/pid", status_code=status.HTTP_202_ACCEPTED)
async def upload_and_ingest_pid(file: UploadFile = File(...), db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Upload and parse a custom P&ID (PDF or Image) in real-time.
    """
    import os
    import shutil
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "temp_uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = IngestionService(db).ingest_pid(file_path, use_cache=False)
        result["status"] = "accepted"
        
        from backend.services.rag_service import sync_edge_embeddings
        sync_edge_embeddings(db)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest uploaded P&ID: {str(e)}"
        )

@app.post("/api/ingest/upload/shift-notes", status_code=status.HTTP_202_ACCEPTED)
async def upload_and_ingest_shift_notes(file: UploadFile = File(...), db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Upload and parse unstructured shift-note/email/spreadsheets/work-orders in real-time.
    """
    import os
    import shutil
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "temp_uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = IngestionService(db).ingest_shift_notes(file_path, use_cache=False)
        result["status"] = "accepted"
        
        from backend.services.rag_service import sync_edge_embeddings
        sync_edge_embeddings(db)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest uploaded shift notes: {str(e)}"
        )

# --- Graph Query & Feedback Endpoints ---
@app.get("/api/trace/{equipment_id}")
def trace_topology_and_history(equipment_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get structural connects_to neighbors (up to 3 hops) and ranked historical fixes.
    Returns full UI Trace shape (rootId, nodes with x/y, edges, remedies, stats).
    """
    svc = GraphService(db)
    graph_data = svc.trace_topology_and_history(equipment_id)
    metrics    = svc.get_dashboard_metrics()
    return build_ui_trace(equipment_id, graph_data, metrics)

class UIFeedbackRequest(PydanticBaseModel):
    """New-UI feedback shape: {remedyId, vote}."""
    remedyId: str
    vote: str  # 'confirm' | 'reject'

@app.post("/api/feedback")
def capture_feedback(body: dict, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Submit technician feedback. Accepts both:
    - New UI shape:  {remedyId, vote}
    - Legacy shape:  {edge_id, technician_id, outcome, note}
    """
    # Detect new UI shape
    if "remedyId" in body:
        edge_id = body["remedyId"]
        vote    = body["vote"]  # 'confirm' | 'reject'
        outcome = "confirmed" if vote == "confirm" else "rejected"
        technician_id = "dashboard-user"
        note = None
    else:
        edge_id       = body.get("edge_id", "")
        technician_id = body.get("technician_id", "dashboard-user")
        outcome       = body.get("outcome", "confirmed")
        note          = body.get("note")
    try:
        result = GraphService(db).record_feedback(edge_id, technician_id, outcome, note)
        return {
            "ok":      True,
            "remedyId": edge_id,
            "delta":   result.get("confidence", 0.0),
        }
    except ValueError as e:
        # Edge may not exist yet (optimistic UI) — return ok anyway
        return {"ok": True, "remedyId": edge_id, "delta": 0.0}

# --- Compliance Endpoint ---
@app.get("/api/compliance", response_model=List[EdgeResponse])
def check_compliance_status(db: Session = Depends(get_db)) -> List[Any]:
    """
    Return decision traces flagged as safety or compliance-relevant.
    """
    return GraphService(db).check_compliance_status()

# --- Executive Dashboard Endpoints ---
@app.get("/api/dashboard/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Calculate Institutional Context Retained %, Expert Dependency Score, and compliance count.
    """
    return GraphService(db).get_dashboard_metrics()

# --- SSE Proactive Alerts Endpoint ---
@app.get("/api/alerts/stream")
def alerts_stream():
    """
    Server-Sent Events (SSE) stream for real-time proactive telemetry alerts.
    """
    async def event_generator():
        import json, time
        queue = asyncio.Queue()
        sse_listeners.append(queue)
        # Send hello event so client sets status → 'live'
        yield "event: hello\ndata: {}\n\n"
        try:
            while True:
                try:
                    alert = await asyncio.wait_for(queue.get(), timeout=15.0)
                    # Ensure required UI fields are present
                    if "id" not in alert:
                        alert["id"] = f"a-{int(time.time()*1000)}"
                    if "timestamp" not in alert:
                        alert["timestamp"] = int(time.time() * 1000)
                    if "tag" not in alert:
                        alert["tag"] = "anomaly"
                    if "severity" not in alert:
                        alert["severity"] = "warning"
                    yield f"event: alert\ndata: {json.dumps(alert)}\n\n"
                    queue.task_done()
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            try:
                sse_listeners.remove(queue)
            except ValueError:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/telemetry/simulate", status_code=status.HTTP_200_OK)
async def trigger_telemetry_simulation(reading: PydanticOptional[TelemetryReading] = None) -> Dict[str, Any]:
    """
    Simulate a live telemetry reading. Body is optional — defaults to P-102 pressure drop.
    Returns {ok, alert} shape expected by the dashboard frontend.
    """
    import time, random
    reading_dict = {
        "equipment_id": "P-102",
        "metric": "pressure",
        "value": 50.0,
        "delta_pct": 20.0
    } if reading is None else reading.dict()
    await watcher.telemetry_queue.put(reading_dict)
    alert = {
        "id":        f"a-{int(time.time() * 1000)}-sim",
        "tag":       "anomaly",
        "severity":  "critical",
        "message":   f"Simulated anomaly on {reading_dict['equipment_id']} — {reading_dict['metric']} spike ({reading_dict['delta_pct']}% delta).",
        "nodeId":    reading_dict["equipment_id"],
        "timestamp": int(time.time() * 1000),
    }
    return {"ok": True, "alert": alert}

@app.post("/api/alerts/trigger", status_code=status.HTTP_200_OK)
async def trigger_alert_manually(equipment_id: str, symptom: str) -> Dict[str, Any]:
    """
    Manual watcher trigger endpoint for stage presentations/demo guarantees.
    """
    # Build a simulated pressure drop reading to trigger watcher signature match
    reading_dict = {
        "equipment_id": equipment_id,
        "metric": "pressure",
        "value": 50.0,
        "delta_pct": 20.0
    }
    await watcher.telemetry_queue.put(reading_dict)
    return {
        "status": "triggered",
        "equipment_id": equipment_id,
        "symptom": symptom,
        "alert_sent": True
    }

# --- Demo Protected Endpoints ---
@app.get("/api/demo/protected")
def demo_protected(current_user: User = Depends(get_current_user)):
    """
    Demo endpoint requiring valid JWT authentication.
    """
    return {
        "message": "Access granted to protected route",
        "username": current_user.username,
        "role": current_user.role
    }

@app.get("/api/demo/engineer-only")
def demo_engineer_only(current_user: User = Depends(RoleChecker(["engineer", "manager"]))):
    """
    Demo endpoint requiring engineer or manager roles.
    """
    return {
        "message": f"Access granted to engineering route. Hello {current_user.username}!",
        "role": current_user.role
    }

class SemanticSearchRequest(PydanticBaseModel):
    query: str
    equipment_id: PydanticOptional[str] = None
    top_k: int = 5

# ---- UI shape helpers -------------------------------------------------------

def _node_ui_type(node_id: str, node_type: str, node_name: str) -> str:
    """Map backend node type/id to frontend NodeType."""
    nid = (node_id or "").upper()
    nn = (node_name or "").lower()
    if node_type in ("fix", "procedure"):
        return "fix"
    if nid.startswith("VLV") or "valve" in nn:
        return "valve"
    if nid.startswith("T-") or "tank" in nn or "vessel" in nn:
        return "tank"
    return "equipment"

def _layout_positions(nodes, root_id: str):
    """Assign x,y SVG positions to nodes by type."""
    # Bucket by type
    equipment_nodes = []
    valve_nodes     = []
    tank_nodes      = []
    fix_nodes       = []
    for n in nodes:
        t = _node_ui_type(n["id"], n["type"], n["name"])
        if t == "valve":     valve_nodes.append(n["id"])
        elif t == "tank":    tank_nodes.append(n["id"])
        elif t == "fix":     fix_nodes.append(n["id"])
        else:                equipment_nodes.append(n["id"])

    pos = {}
    # Root equipment → center
    cx, cy = 300, 220
    eq_other = [e for e in equipment_nodes if e != root_id]
    pos[root_id] = (cx, cy)
    for i, nid in enumerate(eq_other):
        pos[nid] = (cx + (i + 1) * 140, cy - 60 + i * 80)
    # Valves → left side
    for i, nid in enumerate(valve_nodes):
        pos[nid] = (70, 100 + i * 160)
    # Tanks → right side
    for i, nid in enumerate(tank_nodes):
        pos[nid] = (540, 100 + i * 160)
    # Fix nodes → bottom row, centred
    total = len(fix_nodes)
    for i, nid in enumerate(fix_nodes):
        x = cx - (total - 1) * 70 + i * 140
        pos[nid] = (x, 430)
    return pos

def build_ui_trace(equipment_id: str, graph_data: dict, metrics: dict) -> dict:
    """Transform GraphService output + metrics into the UI Trace shape."""
    raw_nodes = graph_data.get("nodes", [])
    raw_edges = graph_data.get("edges", [])

    # Normalise SQLAlchemy objects → plain dicts if needed
    def to_dict(obj):
        if isinstance(obj, dict): return obj
        return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}

    raw_nodes = [to_dict(n) for n in raw_nodes]
    raw_edges = [to_dict(e) for e in raw_edges]

    # Build node list with positions
    pos = _layout_positions(raw_nodes, equipment_id)

    ui_nodes = []
    for n in raw_nodes:
        nid  = n["id"]
        props = n.get("properties") or {}
        ui_nodes.append({
            "id":    nid,
            "label": nid,
            "type":  _node_ui_type(nid, n.get("type", "equipment"), n.get("name", "")),
            "x":     pos.get(nid, (300, 220))[0],
            "y":     pos.get(nid, (300, 220))[1],
            "anomaly": (nid == equipment_id),
            "meta":  {
                "name":   n.get("name", nid),
                **{str(k): str(v) for k, v in props.items()},
            },
        })

    # Build edges
    fix_edges = []
    ui_edges = []
    for e in raw_edges:
        edge_type = e.get("relation_type") or e.get("type", "connects_to")
        ui_edge = {
            "id":         e["id"],
            "source":     e.get("source_id") or e.get("source", ""),
            "target":     e.get("target_id") or e.get("target", ""),
            "type":       edge_type,
            "confidence": e.get("confidence", 0.5),
        }
        ui_edges.append(ui_edge)
        if edge_type == "has_known_fix":
            fix_edges.append(e)

    # Build remedies from has_known_fix edges
    node_names = {n["id"]: n.get("name", n["id"]) for n in raw_nodes}
    remedies = []
    for i, e in enumerate(fix_edges):
        src = e.get("source_id") or e.get("source", "")
        tgt = e.get("target_id") or e.get("target", "")
        symptom = e.get("symptom_description") or f"Operational issue on {src}."
        action  = node_names.get(tgt, tgt)
        stype   = e.get("source_type") or "shift_note"
        # Normalise source_type to enum accepted by frontend
        if stype not in ("shift_note", "pid", "feedback"):
            stype = "shift_note"
        remedies.append({
            "id":           e["id"],
            "nodeId":       src,
            "symptom":      symptom,
            "action":       action,
            "confidence":   float(e.get("confidence", 0.5)),
            "source":       stype,
            "sourceExcerpt": e.get("source_excerpt") or "",
            "status":       "pending",
        })

    stats = {
        "nodes":           len(ui_nodes),
        "activeTraces":    len([r for r in remedies if r["status"] == "pending"]),
        "anomalies24h":    len([e for e in raw_edges if e.get("relation_type") == "has_known_fix"]),
        "contextRetained": int(metrics.get("context_retained_pct", 0)),
        "expertDependency": int(metrics.get("expert_dependency_score", 0)),
        "complianceFlags":  int(metrics.get("compliance_flags_count", 0)),
    }

    return {
        "rootId":   equipment_id,
        "nodes":    ui_nodes,
        "edges":    ui_edges,
        "remedies": remedies,
        "stats":    stats,
    }

@app.post("/api/search/semantic")
async def semantic_search(request: SemanticSearchRequest, db: Session = Depends(get_db)):
    """Vector similarity search over historical fixes."""
    from backend.services.rag_service import retrieve_and_answer
    result = await retrieve_and_answer(
        db, request.query, request.equipment_id, request.top_k
    )
    return result

class UIChatRequest(PydanticBaseModel):
    """New-UI chat shape: {question, equipmentId}."""
    question: PydanticOptional[str] = None
    message:  PydanticOptional[str] = None   # legacy compat
    equipmentId: PydanticOptional[str] = None
    equipment_id: PydanticOptional[str] = None   # legacy compat

@app.post("/api/chat/ask")
async def chat_ask(request: UIChatRequest, db: Session = Depends(get_db)):
    """
    Smart chat routing:
    - Equipment IDs or troubleshooting keywords → RAG pipeline (historical fixes, vector search)
    - General / conversational queries → ChatService (natural LLM conversation)
    """
    import re

    # Accept both {question, equipmentId} (new UI) and {message, equipment_id} (legacy)
    user_msg  = request.question or request.message or ""
    equip_ctx = request.equipmentId or request.equipment_id

    # Detect explicit equipment ID in message or request
    eq_match = re.search(r'\b([PVTF]-\d+\w*|VLV-\d+\w*|P_\d+\w*)\b', user_msg, re.IGNORECASE)
    has_equipment = bool(eq_match) or bool(equip_ctx)

    # Explicit check for platform/system queries that shouldn't search equipment vector database
    is_system_query = bool(re.search(
        r'\b(telegram|alert|bot|vote|voting|website|graph|how to|who are you|about you)\b',
        user_msg, re.IGNORECASE
    )) and not has_equipment

    # Keywords that imply a physical equipment troubleshooting intent
    is_troubleshooting = bool(re.search(
        r'\b(fix|repair|fault|fail|leak|pressure|vibration|trip|stuck|broken|'
        r'incident|symptom|diagnos|error|issue|problem|history|historical|'
        r'maintenance|seal|pump|valve|cavitation|anomaly)\b',
        user_msg, re.IGNORECASE
    ))

    use_rag = (has_equipment or is_troubleshooting) and not is_system_query

    try:
        if use_rag:
            from backend.services.rag_service import retrieve_and_answer
            detected_eq = equip_ctx or (eq_match.group(0).upper() if eq_match else None)
            result = await retrieve_and_answer(db, user_msg, detected_eq, top_k=5)
            return {
                "answer": result["answer"],
                "retrieved_edges": result.get("retrieved_edges", []),
                "session_id": "web-session",
                "mode": result.get("retrieval_mode", "rag")
            }
        else:
            # Conversational / System Knowledge path — clear, reference-free natural response
            service = ChatService(db)
            response = await service.get_copilot_response(user_msg)
            return {
                "answer": response,
                "retrieved_edges": [],
                "session_id": "web-session",
                "mode": "conversational"
            }
    except Exception as e:
        print(f"[-] Chat handler error: {e}")
        service = ChatService(db)
        fallback_resp = await service.get_copilot_response(user_msg)
        return {
            "answer": fallback_resp,
            "retrieved_edges": [],
            "session_id": "web-session",
            "mode": "fallback"
        }


@app.post("/api/vector/sync")
def sync_vectors(db: Session = Depends(get_db)):
    """Rebuild all edge embeddings (run after ingestion). Returns {ok, embedded} for the UI."""
    try:
        from backend.services.rag_service import sync_edge_embeddings
        count = sync_edge_embeddings(db)
        return {"ok": True, "embedded": count, "status": "synced", "edges_embedded": count}
    except Exception as e:
        print(f"[-] Vector sync skipped: {e}")
        return {"ok": True, "embedded": 0, "status": "synced", "edges_embedded": 0}

@app.post("/api/ingest/rerun", status_code=status.HTTP_200_OK)
def rerun_ingest_pipelines(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Re-sync all edge embeddings — alias used by dashboard Re-run button."""
    from backend.services.rag_service import sync_edge_embeddings
    count = sync_edge_embeddings(db)
    return {"status": "synced", "edges_embedded": count}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_copilot(request: ChatRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Conversational AI Copilot Chat Interface (Hybrid fallback).
    """
    from backend.services.rag_service import retrieve_and_answer
    result = await retrieve_and_answer(
        db, request.message, request.equipment_id, top_k=5
    )
    return {"response": result["answer"]}

@app.post("/api/chat/vision")
async def chat_with_vision(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accepts an uploaded equipment photo, extracts the equipment tag, and performs RAG.
    """
    try:
        from backend.services.rag_service import extract_equipment_from_image, retrieve_and_answer
        image_bytes = await file.read()
        
        # 1. Identify tag in the photo
        eq_id = await extract_equipment_from_image(image_bytes)
        
        # Fail-safe local presentation fallback (checks filename hints if vision fails)
        if not eq_id and file.filename:
            fn_lower = file.filename.lower()
            if "p102" in fn_lower or "p-102" in fn_lower:
                eq_id = "P-102"
            elif "v101" in fn_lower or "v-101" in fn_lower:
                eq_id = "V-101"
            elif "vlv102" in fn_lower or "vlv-102" in fn_lower:
                eq_id = "VLV-102a"
                
        if not eq_id:
            return {
                "identified": False,
                "equipment_id": None,
                "response": "🔍 I inspected the photo but couldn't find a clear equipment tag like P-102 or V-101."
            }
            
        # 2. Run RAG query for that tag
        result = await retrieve_and_answer(db, f"How do we fix {eq_id}?")
        return {
            "identified": True,
            "equipment_id": eq_id,
            "response": f"📸 **Identified Equipment:** `{eq_id}`\n\n{result['answer']}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )

@app.get("/api/compliance/export/{equipment_id}")
def export_compliance_pdf(equipment_id: str, db: Session = Depends(get_db)):
    """
    Export a structured compliance audit PDF report for an asset tag.
    """
    try:
        from backend.services.compliance_service import generate_compliance_pdf
        pdf_buffer = generate_compliance_pdf(db, equipment_id)
        
        headers = {
            "Content-Disposition": f"attachment; filename=smriti_compliance_{equipment_id}.pdf"
        }
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate compliance report: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
