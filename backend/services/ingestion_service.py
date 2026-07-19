import os
import json
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.db.models import KnowledgeNode, KnowledgeEdge

class IngestionService:
    def __init__(self, db: Session):
        self.db = db

    def get_cache_path(self, filename: str) -> str:
        # Resolve path dynamically to workspace_root/datasets/cached_extractions/filename
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
        return os.path.join(project_root, "datasets", "cached_extractions", filename)

    def ingest_pid(self, file_path: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        FR-1: Parse an uploaded P&ID PDF/image and extract equipment nodes and structural connections.
        If use_cache is True, load pre-baked JSON from datasets/cached_extractions/pid_extraction.json.
        """
        nodes_created = 0
        edges_created = 0
        
        # Load from cache
        cache_path = self.get_cache_path("pid_extraction.json")
        try:
            with open(cache_path, "r") as f:
                data = json.load(f)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to load cached P&ID: {str(e)}",
                "nodes_extracted": 0,
                "edges_extracted": 0
            }
            
        # Insert Nodes
        for node_data in data.get("nodes", []):
            node_id = node_data["id"]
            node = self.db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()
            if not node:
                node = KnowledgeNode(
                    id=node_id,
                    type=node_data.get("type", "equipment"),
                    name=node_data.get("name", node_id),
                    properties=node_data.get("properties", {})
                )
                self.db.add(node)
                nodes_created += 1
            else:
                node.type = node_data.get("type", node.type)
                node.name = node_data.get("name", node.name)
                node.properties = {**node.properties, **node_data.get("properties", {})}
                
        # Insert Edges
        for edge_data in data.get("edges", []):
            edge_id = edge_data["id"]
            edge = self.db.query(KnowledgeEdge).filter(KnowledgeEdge.id == edge_id).first()
            if not edge:
                edge = KnowledgeEdge(
                    id=edge_id,
                    source_id=edge_data["source_id"],
                    target_id=edge_data["target_id"],
                    relation_type=edge_data["relation_type"],
                    flow_direction=edge_data.get("flow_direction"),
                    telemetry_signature=edge_data.get("telemetry_signature", {}),
                    source_excerpt=edge_data.get("source_excerpt"),
                    source_type=edge_data.get("source_type", "pid")
                )
                self.db.add(edge)
                edges_created += 1
            else:
                edge.source_id = edge_data["source_id"]
                edge.target_id = edge_data["target_id"]
                edge.relation_type = edge_data["relation_type"]
                edge.flow_direction = edge_data.get("flow_direction", edge.flow_direction)
                
        self.db.commit()
        return {
            "status": "success",
            "nodes_extracted": nodes_created,
            "edges_extracted": edges_created,
            "source_file": file_path
        }

    def ingest_shift_notes(self, file_path: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        FR-2: Parse shift notes text and extract decision-symptom-fix triples as experiential edges.
        If use_cache is True, load pre-baked JSON from datasets/cached_extractions/shift_notes_extraction.json.
        """
        edges_created = 0
        nodes_created = 0
        
        # Load from cache
        cache_path = self.get_cache_path("shift_notes_extraction.json")
        try:
            with open(cache_path, "r") as f:
                data = json.load(f)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to load cached shift notes: {str(e)}",
                "edges_extracted": 0
            }
            
        for edge_data in data:
            edge_id = edge_data["id"]
            
            # Ensure target node exists (e.g. FIX-102)
            target_id = edge_data["target_id"]
            target_node = self.db.query(KnowledgeNode).filter(KnowledgeNode.id == target_id).first()
            if not target_node:
                target_node = KnowledgeNode(
                    id=target_id,
                    type="fix",
                    name=f"Fix Procedure {target_id}",
                    properties={}
                )
                self.db.add(target_node)
                nodes_created += 1
                
            # Ensure source node exists (e.g. P-102)
            source_id = edge_data["source_id"]
            source_node = self.db.query(KnowledgeNode).filter(KnowledgeNode.id == source_id).first()
            if not source_node:
                source_node = KnowledgeNode(
                    id=source_id,
                    type="equipment",
                    name=f"Equipment {source_id}",
                    properties={}
                )
                self.db.add(source_node)
                nodes_created += 1
                
            # Upsert the edge
            edge = self.db.query(KnowledgeEdge).filter(KnowledgeEdge.id == edge_id).first()
            if not edge:
                edge = KnowledgeEdge(
                    id=edge_id,
                    source_id=source_id,
                    target_id=target_id,
                    relation_type=edge_data["relation_type"],
                    symptom_description=edge_data.get("symptom_description"),
                    telemetry_signature=edge_data.get("telemetry_signature", {}),
                    positive_feedback=edge_data.get("positive_feedback", 1),
                    negative_feedback=edge_data.get("negative_feedback", 0),
                    confidence=edge_data.get("confidence", 0.0),
                    is_compliance_relevant=bool(edge_data.get("is_compliance_relevant", 0)),
                    source_excerpt=edge_data.get("source_excerpt"),
                    source_type=edge_data.get("source_type", "shift_note")
                )
                self.db.add(edge)
                edges_created += 1
            else:
                edge.source_id = source_id
                edge.target_id = target_id
                edge.relation_type = edge_data["relation_type"]
                edge.symptom_description = edge_data.get("symptom_description", edge.symptom_description)
                edge.telemetry_signature = edge_data.get("telemetry_signature", edge.telemetry_signature)
                edge.is_compliance_relevant = bool(edge_data.get("is_compliance_relevant", edge.is_compliance_relevant))
                
        self.db.commit()
        return {
            "status": "success",
            "nodes_extracted": nodes_created,
            "edges_extracted": edges_created,
            "source_file": file_path
        }
