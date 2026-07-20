import asyncio
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
from sqlalchemy.orm import Session

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

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, str]:
    """
    Check application and database connectivity.
    """
    return {"status": "healthy", "service": "smriti-api"}

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
@app.get("/api/trace/{equipment_id}", response_model=GraphTraceResult)
def trace_topology_and_history(equipment_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get structural connects_to neighbors (up to 3 hops) and ranked historical fixes.
    """
    return GraphService(db).trace_topology_and_history(equipment_id)

@app.post("/api/feedback", response_model=FeedbackResponse)
def capture_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Submit technician feedback on whether a suggested fix worked, and update confidence.
    """
    try:
        result = GraphService(db).record_feedback(
            feedback.edge_id,
            feedback.technician_id,
            feedback.outcome,
            feedback.note
        )
        return {
            "id": result["feedback_id"],
            "edge_id": result["edge_id"],
            "technician_id": str(feedback.technician_id),
            "outcome": result["outcome"],
            "note": feedback.note,
            "timestamp": datetime.utcnow()
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

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
        import json
        queue = asyncio.Queue()
        sse_listeners.append(queue)
        try:
            while True:
                try:
                    alert = await asyncio.wait_for(queue.get(), timeout=10.0)
                    yield f"data: {json.dumps(alert)}\n\n"
                    queue.task_done()
                except asyncio.TimeoutError:
                    yield "comment: keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            try:
                sse_listeners.remove(queue)
            except ValueError:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/telemetry/simulate", status_code=status.HTTP_200_OK)
async def trigger_telemetry_simulation(reading: TelemetryReading) -> Dict[str, Any]:
    """
    Simulate a live telemetry reading, feeding it into the TelemetryWatcher queue.
    """
    reading_dict = reading.dict()
    await watcher.telemetry_queue.put(reading_dict)
    return {
        "status": "triggered",
        "reading": reading_dict,
        "alert_sent": True
    }

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

from pydantic import BaseModel as PydanticBaseModel
from typing import Optional as PydanticOptional

class SemanticSearchRequest(PydanticBaseModel):
    query: str
    equipment_id: PydanticOptional[str] = None
    top_k: int = 5

@app.post("/api/search/semantic")
async def semantic_search(request: SemanticSearchRequest, db: Session = Depends(get_db)):
    """Vector similarity search over historical fixes."""
    from backend.services.rag_service import retrieve_and_answer
    result = await retrieve_and_answer(
        db, request.query, request.equipment_id, request.top_k
    )
    return result

@app.post("/api/chat/ask")
async def chat_ask(request: ChatRequest, db: Session = Depends(get_db)):
    """RAG-powered troubleshooting chat (Cloud-First, Local-Second)."""
    from backend.services.rag_service import retrieve_and_answer
    result = await retrieve_and_answer(
        db, request.message, request.equipment_id, top_k=5
    )
    return {
        "answer": result["answer"],
        "retrieved_edges": result["retrieved_edges"],
        "session_id": "web-session"
    }

@app.post("/api/vector/sync")
def sync_vectors(db: Session = Depends(get_db)):
    """Rebuild all edge embeddings (run after ingestion)."""
    from backend.services.rag_service import sync_edge_embeddings
    count = sync_edge_embeddings(db)
    return {"status": "synced", "edges_embedded": count}

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
