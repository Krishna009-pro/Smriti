import asyncio
from typing import Callable, Dict, Any
from sqlalchemy.orm import Session
from backend.db.session import SessionLocal
from backend.db.models import KnowledgeEdge, KnowledgeNode

def find_edges_matching_signature(db: Session, reading: Dict[str, Any]) -> list:
    """
    Spec 5.4: Compare live reading against telemetry signatures on has_known_fix edges.
    """
    edges = db.query(KnowledgeEdge).filter(
        KnowledgeEdge.relation_type == "has_known_fix"
    ).all()
    
    matched_edges = []
    reading_metric = reading.get("metric")
    reading_value = reading.get("value", 0.0)
    reading_delta = reading.get("delta_pct", 0.0)
    reading_eq_id = reading.get("equipment_id")
    
    for edge in edges:
        if edge.source_id != reading_eq_id:
            continue
            
        sig = edge.telemetry_signature
        if not sig or not isinstance(sig, dict):
            continue
            
        sig_metric = sig.get("metric")
        if sig_metric != reading_metric:
            continue
            
        match = False
        condition = sig.get("condition")
        threshold = sig.get("threshold")
        operator = sig.get("operator")
        
        # 1. Condition string matching (e.g. "drop_pct > 15")
        if condition and isinstance(condition, str):
            try:
                if ">" in condition:
                    val = float(condition.split(">")[1].strip())
                    if reading_delta > val:
                        match = True
                elif "<" in condition:
                    val = float(condition.split("<")[1].strip())
                    if reading_delta < val:
                        match = True
            except Exception:
                pass
        # 2. Operator checking (e.g. threshold: 80.0, operator: "lt")
        elif threshold is not None and operator:
            try:
                thresh_val = float(threshold)
                read_val = float(reading_value)
                if operator == "lt" and read_val < thresh_val:
                    match = True
                elif operator == "gt" and read_val > thresh_val:
                    match = True
                elif operator == "le" and read_val <= thresh_val:
                    match = True
                elif operator == "ge" and read_val >= thresh_val:
                    match = True
                elif operator == "eq" and read_val == thresh_val:
                    match = True
            except Exception:
                pass
        # 3. Default fallback for standard pressure drop signatures
        elif reading_metric == "pressure" and reading_delta > 15.0:
            match = True
            
        if match:
            matched_edges.append(edge)
            
    return matched_edges

class TelemetryWatcher:
    def __init__(self, poll_interval: int = 5, on_alert: Callable = None, session_factory: Any = None):
        self.poll_interval = poll_interval
        self.on_alert = on_alert
        self.is_running = False
        self._task = None
        self.telemetry_queue = asyncio.Queue()
        self.session_factory = session_factory or SessionLocal

    async def start(self):
        """
        UC-3 & FR-6: Run a background loop waiting for telemetry readings.
        """
        self.is_running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self):
        while self.is_running:
            try:
                # Wait for reading from queue
                reading = await self.telemetry_queue.get()
                db = self.session_factory()
                try:
                    matched_edges = find_edges_matching_signature(db, reading)
                    for edge in matched_edges:
                        # Query target fix node and equipment name
                        fix_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.target_id).first()
                        eq_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.source_id).first()
                        
                        fix_name = fix_node.name if fix_node else "Unknown Fix"
                        eq_name = eq_node.name if eq_node else edge.source_id
                        
                        alert_payload = {
                            "id": f"alert-{edge.id}",
                            "equipment_id": edge.source_id,
                            "equipment_name": eq_name,
                            "symptom": edge.symptom_description or "Telemetry anomaly detected",
                            "suggested_fix": fix_name,
                            "confidence": edge.confidence,
                            "telemetry": reading
                        }
                        
                        if self.on_alert:
                            if asyncio.iscoroutinefunction(self.on_alert):
                                await self.on_alert(alert_payload)
                            else:
                                self.on_alert(alert_payload)
                finally:
                    db.close()
                self.telemetry_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[-] Error in TelemetryWatcher loop: {e}")
                await asyncio.sleep(1)
