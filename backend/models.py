from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, List, Optional

# --- Node Schemas ---
class NodeBase(BaseModel):
    id: str
    type: str = Field(..., description="Must be 'equipment', 'fix', or 'procedure'")
    name: str
    properties: Dict[str, Any] = Field(default_factory=dict)

class NodeCreate(NodeBase):
    pass

class NodeResponse(NodeBase):
    created_at: datetime

    class Config:
        from_attributes = True

# --- Edge Schemas ---
class EdgeBase(BaseModel):
    id: str
    source_id: str
    target_id: str
    relation_type: str = Field(..., description="Must be 'connects_to' or 'has_known_fix'")
    flow_direction: str | None = Field(default=None, description="upstream/downstream for connects_to")
    symptom_description: str | None = Field(default=None, description="For experiential edges")
    telemetry_signature: Dict[str, Any] = Field(default_factory=dict, description="For experiential edges")
    positive_feedback: int = 1
    negative_feedback: int = 0
    confidence: float = 0.0
    is_compliance_relevant: int = 0
    source_excerpt: str | None = None
    source_type: str | None = Field(default=None, description="pid/shift_note/work_order/feedback")

class EdgeCreate(EdgeBase):
    pass

class EdgeResponse(EdgeBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    edge_id: str
    technician_id: str
    outcome: str = Field(..., description="Must be 'confirmed' or 'rejected'")
    note: str | None = None

class FeedbackResponse(BaseModel):
    id: int
    edge_id: str
    technician_id: str
    outcome: str
    note: str | None
    timestamp: datetime

    class Config:
        from_attributes = True

# --- Telemetry and Alert Schemas ---
class TelemetryReading(BaseModel):
    equipment_id: str
    metric: str
    value: float
    delta_pct: float

class AlertResponse(BaseModel):
    id: str
    equipment_id: str
    equipment_name: str
    symptom: str
    suggested_fix: str
    confidence: float
    telemetry: TelemetryReading
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- Graph Traversal and Search Schemas ---
class GraphTraceResult(BaseModel):
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]

# --- AI Chat Copilot Schemas ---
class ChatRequest(BaseModel):
    message: str
    equipment_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
