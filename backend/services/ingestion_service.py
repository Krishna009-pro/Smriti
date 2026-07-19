import os
import json
import uuid
import hashlib
import logging
import anyio
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.db.models import KnowledgeNode, KnowledgeEdge, Document
from backend.services.confidence import wilson_lower_bound
from backend.services.extraction_client import ExtractionClient

logger = logging.getLogger("ingestion_service")

class IngestionService:
    def __init__(self, db: Session):
        self.db = db
        self.extraction_client = ExtractionClient()

    def get_cache_path(self, filename: str) -> str:
        # Resolve path dynamically to workspace_root/datasets/cached_extractions/filename
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
        return os.path.join(project_root, "datasets", "cached_extractions", filename)

    def _stable_edge_id(self, source_id: str, target_id: str, relation_type: str, symptom_desc: str | None) -> str:
        key = f"{source_id}|{target_id}|{relation_type}|{symptom_desc or ''}"
        return "E-" + hashlib.sha1(key.encode()).hexdigest()[:12]

    def _create_document(self, file_path: str, file_type: str) -> str:
        doc_id = "DOC-" + str(uuid.uuid4())[:8]
        doc = Document(
            id=doc_id,
            filename=os.path.basename(file_path),
            file_type=file_type,
            status="processing"
        )
        self.db.add(doc)
        self.db.commit()
        return doc_id

    def _update_document_status(self, doc_id: str, status: str):
        doc = self.db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = status
            self.db.commit()

    def ingest_pid(self, file_path: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        FR-1: Parse an uploaded P&ID PDF/image and extract equipment nodes and structural connections.
        If use_cache is True, load pre-baked JSON from datasets/cached_extractions/pid_extraction.json.
        Otherwise, call the live ExtractionClient and fall back to the cache if it fails.
        """
        doc_id = self._create_document(file_path, "pid")
        data = None

        # 1. Attempt extraction
        if not use_cache:
            try:
                # Run the async extraction client call synchronously using anyio
                data = anyio.run(self.extraction_client.extract_pid, file_path)
                logger.info(f"Live P&ID vision extraction succeeded for: {file_path}")
            except Exception as e:
                logger.warning(f"Live P&ID extraction failed ({e}) — falling back to cached extraction")

        if not data:
            # Load from cache fallback
            cache_path = self.get_cache_path("pid_extraction.json")
            try:
                with open(cache_path, "r") as f:
                    data = json.load(f)
            except Exception as e:
                self._update_document_status(doc_id, "failed")
                return {
                    "status": "error",
                    "message": f"Failed to load cached P&ID: {str(e)}",
                    "nodes_extracted": 0,
                    "edges_extracted": 0
                }

        # 2. Validate input schema before database writes
        if "nodes" not in data or "edges" not in data:
            self._update_document_status(doc_id, "failed")
            return {
                "status": "error",
                "message": "Malformed extraction payload: missing 'nodes' or 'edges' keys.",
                "nodes_extracted": 0,
                "edges_extracted": 0
            }

        nodes_created = 0
        edges_created = 0

        # 3. Write batch atomically
        try:
            # Upsert Nodes
            for node_data in data["nodes"]:
                node_id = node_data.get("id")
                if not node_id:
                    raise KeyError("Node record is missing 'id'")
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

            # Upsert Edges
            for edge_data in data["edges"]:
                source_id = edge_data.get("source_id")
                target_id = edge_data.get("target_id")
                relation_type = edge_data.get("relation_type")
                if not source_id or not target_id or not relation_type:
                    raise KeyError("Edge record is missing required source/target/relation_type tags")

                # Generate content-hashed edge ID
                edge_id = self._stable_edge_id(source_id, target_id, relation_type, edge_data.get("symptom_description"))

                edge = self.db.query(KnowledgeEdge).filter(KnowledgeEdge.id == edge_id).first()
                if not edge:
                    edge = KnowledgeEdge(
                        id=edge_id,
                        source_id=source_id,
                        target_id=target_id,
                        relation_type=relation_type,
                        flow_direction=edge_data.get("flow_direction"),
                        telemetry_signature=edge_data.get("telemetry_signature", {}),
                        source_excerpt=edge_data.get("source_excerpt"),
                        source_type=edge_data.get("source_type", "pid"),
                        document_id=doc_id
                    )
                    self.db.add(edge)
                    edges_created += 1
                else:
                    edge.flow_direction = edge_data.get("flow_direction", edge.flow_direction)
                    edge.document_id = doc_id

            self.db.commit()
            self._update_document_status(doc_id, "processed")
            return {
                "status": "success",
                "nodes_extracted": nodes_created,
                "edges_extracted": edges_created,
                "source_file": file_path,
                "document_id": doc_id
            }

        except Exception as err:
            self.db.rollback()
            self._update_document_status(doc_id, "failed")
            logger.error(f"P&ID DB ingestion transaction failed: {err}")
            return {
                "status": "error",
                "message": f"Database transaction rolled back due to error: {str(err)}",
                "nodes_extracted": 0,
                "edges_extracted": 0
            }

    def ingest_shift_notes(self, file_path: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        FR-2: Parse shift notes text and extract decision-symptom-fix triples as experiential edges.
        If use_cache is True, load pre-baked JSON from datasets/cached_extractions/shift_notes_extraction.json.
        Otherwise, call the live ExtractionClient and fall back to the cache if it fails.
        """
        doc_id = self._create_document(file_path, "shift_note")
        data = None

        # 1. Attempt extraction
        if not use_cache:
            try:
                # Read raw file content to feed to extraction client
                raw_text = ""
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        raw_text = f.read()
                
                if raw_text.strip():
                    data = anyio.run(self.extraction_client.extract_shift_notes, raw_text)
                    logger.info(f"Live shift notes text extraction succeeded for: {file_path}")
            except Exception as e:
                logger.warning(f"Live shift notes extraction failed ({e}) — falling back to cached extraction")

        if not data:
            # Load from cache fallback
            cache_path = self.get_cache_path("shift_notes_extraction.json")
            try:
                with open(cache_path, "r") as f:
                    data = json.load(f)
            except Exception as e:
                self._update_document_status(doc_id, "failed")
                return {
                    "status": "error",
                    "message": f"Failed to load cached shift notes: {str(e)}",
                    "edges_extracted": 0
                }

        edges_created = 0
        nodes_created = 0

        # 2. Write batch atomically
        try:
            for edge_data in data:
                source_id = edge_data.get("source_id")
                target_id = edge_data.get("target_id")
                relation_type = edge_data.get("relation_type")
                if not source_id or not target_id or not relation_type:
                    raise KeyError("Shift note edge record is missing source_id/target_id/relation_type keys")

                # Ensure target node exists (e.g. FIX-102)
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

                # Generate content-hashed edge ID
                edge_id = self._stable_edge_id(source_id, target_id, relation_type, edge_data.get("symptom_description"))

                # Deriving confidence score strictly via positive/negative feedback
                pos = edge_data.get("positive_feedback", 1)
                neg = edge_data.get("negative_feedback", 0)
                derived_conf = wilson_lower_bound(pos, pos + neg)

                # Upsert the edge
                edge = self.db.query(KnowledgeEdge).filter(KnowledgeEdge.id == edge_id).first()
                if not edge:
                    edge = KnowledgeEdge(
                        id=edge_id,
                        source_id=source_id,
                        target_id=target_id,
                        relation_type=relation_type,
                        symptom_description=edge_data.get("symptom_description"),
                        telemetry_signature=edge_data.get("telemetry_signature", {}),
                        positive_feedback=pos,
                        negative_feedback=neg,
                        confidence=derived_conf,
                        is_compliance_relevant=bool(edge_data.get("is_compliance_relevant", 0)),
                        source_excerpt=edge_data.get("source_excerpt"),
                        source_type=edge_data.get("source_type", "shift_note"),
                        document_id=doc_id
                    )
                    self.db.add(edge)
                    edges_created += 1
                else:
                    edge.source_id = source_id
                    edge.target_id = target_id
                    edge.relation_type = relation_type
                    edge.symptom_description = edge_data.get("symptom_description", edge.symptom_description)
                    edge.telemetry_signature = edge_data.get("telemetry_signature", edge.telemetry_signature)
                    edge.positive_feedback = pos
                    edge.negative_feedback = neg
                    edge.confidence = derived_conf
                    edge.is_compliance_relevant = bool(edge_data.get("is_compliance_relevant", edge.is_compliance_relevant))
                    edge.document_id = doc_id

            self.db.commit()
            self._update_document_status(doc_id, "processed")
            return {
                "status": "success",
                "nodes_extracted": nodes_created,
                "edges_extracted": edges_created,
                "source_file": file_path,
                "document_id": doc_id
            }

        except Exception as err:
            self.db.rollback()
            self._update_document_status(doc_id, "failed")
            logger.error(f"Shift notes DB ingestion transaction failed: {err}")
            return {
                "status": "error",
                "message": f"Database transaction rolled back due to error: {str(err)}",
                "edges_extracted": 0
            }
