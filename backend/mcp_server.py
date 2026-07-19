import os
import sys
from typing import List, Dict, Any

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastmcp import FastMCP
from backend.db.session import SessionLocal
from backend.services.graph_service import GraphService

mcp = FastMCP("smriti")

@mcp.tool()
def trace_topology_and_history(equipment_id: str) -> dict:
    """
    Trace physically connected equipment (up to 3 hops) and get ranked historical fixes.
    """
    db = SessionLocal()
    try:
        service = GraphService(db)
        res = service.trace_topology_and_history(equipment_id)
        # Convert model properties to dictionaries for JSON-RPC serialization
        nodes = []
        for node in res["nodes"]:
            nodes.append({
                "id": node.id,
                "type": node.type,
                "name": node.name,
                "properties": node.properties
            })
        edges = []
        for edge in res["edges"]:
            edges.append({
                "id": edge.id,
                "source_id": edge.source_id,
                "target_id": edge.target_id,
                "relation_type": edge.relation_type,
                "flow_direction": edge.flow_direction,
                "symptom_description": edge.symptom_description,
                "telemetry_signature": edge.telemetry_signature,
                "positive_feedback": edge.positive_feedback,
                "negative_feedback": edge.negative_feedback,
                "confidence": edge.confidence,
                "is_compliance_relevant": 1 if edge.is_compliance_relevant else 0,
                "source_excerpt": edge.source_excerpt,
                "source_type": edge.source_type
            })
        return {"nodes": nodes, "edges": edges}
    finally:
        db.close()

@mcp.tool()
def capture_feedback(edge_id: str, technician_id: str, outcome: str, note: str | None = None) -> dict:
    """
    Submit technician feedback on a recommended fix suggestion (confirm/reject) and update confidence.
    """
    db = SessionLocal()
    try:
        service = GraphService(db)
        res = service.record_feedback(
            edge_id=edge_id,
            technician_id=technician_id,
            outcome=outcome,
            note=note
        )
        return res
    finally:
        db.close()

@mcp.tool()
def check_compliance_status() -> list:
    """
    Retrieve all decision traces flagged as compliance or safety-relevant.
    """
    db = SessionLocal()
    try:
        service = GraphService(db)
        edges = service.check_compliance_status()
        res = []
        for edge in edges:
            res.append({
                "id": edge.id,
                "source_id": edge.source_id,
                "target_id": edge.target_id,
                "relation_type": edge.relation_type,
                "flow_direction": edge.flow_direction,
                "symptom_description": edge.symptom_description,
                "telemetry_signature": edge.telemetry_signature,
                "positive_feedback": edge.positive_feedback,
                "negative_feedback": edge.negative_feedback,
                "confidence": edge.confidence,
                "is_compliance_relevant": 1 if edge.is_compliance_relevant else 0,
                "source_excerpt": edge.source_excerpt,
                "source_type": edge.source_type
            })
        return res
    finally:
        db.close()

if __name__ == "__main__":
    mcp.run()
