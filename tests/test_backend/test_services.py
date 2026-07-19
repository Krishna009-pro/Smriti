import sys
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.db.models import Base, User, KnowledgeNode, KnowledgeEdge
from backend.services.ingestion_service import IngestionService
from backend.services.graph_service import GraphService
from backend.auth.security import hash_password

# Use temporary file-based SQLite database for services tests
SQLALCHEMY_DATABASE_URL = "sqlite:///test_services_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_services_temp.db"):
        try:
            os.remove("test_services_temp.db")
        except Exception:
            pass

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_cached_ingestion(db_session):
    ingest_service = IngestionService(db_session)
    
    # 1. Ingest P&ID cache
    pid_res = ingest_service.ingest_pid("dummy_pid.pdf", use_cache=True)
    assert pid_res["status"] == "success"
    assert pid_res["nodes_extracted"] > 0
    assert pid_res["edges_extracted"] > 0

    # Verify nodes were inserted
    tk = db_session.query(KnowledgeNode).filter(KnowledgeNode.id == "TK-101").first()
    assert tk is not None
    assert tk.type == "equipment"
    
    # 2. Ingest shift notes cache
    notes_res = ingest_service.ingest_shift_notes("dummy_notes.txt", use_cache=True)
    assert notes_res["status"] == "success"
    assert notes_res["edges_extracted"] > 0

    # Verify fix node and edge were created
    fix_node = db_session.query(KnowledgeNode).filter(KnowledgeNode.id == "FIX-102").first()
    assert fix_node is not None
    assert fix_node.type == "fix"
    
    edge = db_session.query(KnowledgeEdge).filter(
        KnowledgeEdge.source_id == "P-102",
        KnowledgeEdge.target_id == "FIX-102",
        KnowledgeEdge.relation_type == "has_known_fix"
    ).first()
    assert edge is not None
    assert edge.relation_type == "has_known_fix"

def test_recursive_topology_and_history(db_session):
    graph_service = GraphService(db_session)
    
    # We trace starting from TK-101
    trace_res = graph_service.trace_topology_and_history("TK-101")
    assert "nodes" in trace_res
    assert "edges" in trace_res
    
    # Nodes list should contain TK-101, VLV-102a, P-102, and FIX-102 (from the shift notes on P-102)
    node_ids = [node.id for node in trace_res["nodes"]]
    assert "TK-101" in node_ids
    assert "VLV-102a" in node_ids
    assert "P-102" in node_ids
    assert "FIX-102" in node_ids
    
    # Edges should contain connects_to and has_known_fix
    edge_types = [edge.relation_type for edge in trace_res["edges"]]
    assert "connects_to" in edge_types
    assert "has_known_fix" in edge_types

def test_feedback_and_wilson_recalculation(db_session):
    graph_service = GraphService(db_session)
    
    # Create technician user for audit trail
    tech = User(username="tech_feedback_test", hashed_password=hash_password("pass123"), role="technician")
    db_session.add(tech)
    db_session.commit()
    db_session.refresh(tech)
    
    edge_before = db_session.query(KnowledgeEdge).filter(
        KnowledgeEdge.source_id == "P-102",
        KnowledgeEdge.target_id == "FIX-102",
        KnowledgeEdge.relation_type == "has_known_fix"
    ).first()
    assert edge_before is not None
    edge_id = edge_before.id
    pos_before = edge_before.positive_feedback
    
    # Record confirmation feedback
    fb_res = graph_service.record_feedback(edge_id, tech.id, "confirmed", "Tested gland nut tightening")
    assert fb_res["success"] is True
    assert fb_res["outcome"] == "confirmed"
    
    # Verify edge values updated
    edge_after = db_session.query(KnowledgeEdge).filter(KnowledgeEdge.id == edge_id).first()
    assert edge_after.positive_feedback == pos_before + 1
    assert edge_after.confidence > 0.0

def test_dashboard_metrics(db_session):
    graph_service = GraphService(db_session)
    
    metrics = graph_service.get_dashboard_metrics()
    assert "context_retained_pct" in metrics
    assert "expert_dependency_score" in metrics
    assert "compliance_flags_count" in metrics
    assert metrics["compliance_flags_count"] >= 1
