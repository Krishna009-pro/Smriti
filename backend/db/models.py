from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from backend.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="technician")  # technician, engineer, manager, safety_officer
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    documents = relationship("Document", back_populates="uploader")
    feedbacks = relationship("Feedback", back_populates="technician")
    acknowledged_alerts = relationship("Alert", back_populates="acknowledged_by")
    chat_sessions = relationship("ChatSession", back_populates="user")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True)  # physical ID, e.g., P-102
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # pump, tank, valve, etc.
    properties = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)  # UUID or hash
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pid, shift_note, work_order
    content = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, processed, failed
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    uploader = relationship("User", back_populates="documents")
    edges = relationship("KnowledgeEdge", back_populates="document")


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id = Column(String, primary_key=True, index=True)  # e.g., P-102, FIX-102
    type = Column(String, nullable=False)  # equipment, fix, procedure
    name = Column(String, nullable=False)
    properties = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incoming_edges = relationship("KnowledgeEdge", foreign_keys="[KnowledgeEdge.target_id]", back_populates="target")
    outgoing_edges = relationship("KnowledgeEdge", foreign_keys="[KnowledgeEdge.source_id]", back_populates="source")
    alerts = relationship("Alert", foreign_keys="[Alert.equipment_id]", back_populates="equipment")


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id = Column(String, primary_key=True, index=True)
    source_id = Column(String, ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String, ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False)  # connects_to, has_known_fix
    
    # connects_to specific
    flow_direction = Column(String, nullable=True)  # upstream, downstream
    
    # has_known_fix specific
    symptom_description = Column(String, nullable=True)
    telemetry_signature = Column(JSON, nullable=False, default=dict)
    positive_feedback = Column(Integer, nullable=False, default=1)
    negative_feedback = Column(Integer, nullable=False, default=0)
    confidence = Column(Float, nullable=False, default=0.0)
    is_compliance_relevant = Column(Boolean, nullable=False, default=False)
    
    source_excerpt = Column(String, nullable=True)
    source_type = Column(String, nullable=True)  # pid, shift_note, work_order, feedback
    document_id = Column(String, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    source = relationship("KnowledgeNode", foreign_keys=[source_id], back_populates="outgoing_edges")
    target = relationship("KnowledgeNode", foreign_keys=[target_id], back_populates="incoming_edges")
    document = relationship("Document", back_populates="edges")
    feedbacks = relationship("Feedback", back_populates="edge")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    edge_id = Column(String, ForeignKey("knowledge_edges.id", ondelete="CASCADE"), nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    outcome = Column(String, nullable=False)  # confirmed, rejected
    note = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    edge = relationship("KnowledgeEdge", back_populates="feedbacks")
    technician = relationship("User", back_populates="feedbacks")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    equipment_id = Column(String, ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False)
    symptom = Column(String, nullable=False)
    suggested_fix_id = Column(String, ForeignKey("knowledge_nodes.id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    telemetry_data = Column(JSON, nullable=False, default=dict)
    status = Column(String, nullable=False, default="active")  # active, acknowledged, resolved
    acknowledged_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    equipment = relationship("KnowledgeNode", foreign_keys=[equipment_id], back_populates="alerts")
    suggested_fix = relationship("KnowledgeNode", foreign_keys=[suggested_fix_id])
    acknowledged_by = relationship("User", back_populates="acknowledged_alerts")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False, default="New Conversation")
    history = Column(JSON, nullable=False, default=list)  # list of message dicts
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
