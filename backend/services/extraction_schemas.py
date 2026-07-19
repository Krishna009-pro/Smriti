"""
services/extraction_schemas.py

Schema-validates extraction payloads from BOTH sources that feed the graph:
  1. Live LLM output (vision or text) -- untrusted by definition.
  2. Cached/hand-edited seed JSON in datasets/cached_extractions/ -- also
     untrusted. A typo in a hand-edited demo fixture should fail loudly during
     rehearsal, not silently during the real thing.

Key naming here ("equipment" / "connections") is the single source of truth for
the P&ID extraction contract. The datasets/cached_extractions/pid_extraction.json
seed file must use these same keys -- if your existing seed file uses "nodes" /
"edges" instead, rename them (see the migration note in ingestion_service.py).
"""
import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# Plant equipment tag convention: 1-4 letter prefix, dash, 2-4 digit number.
# e.g. P-102 (pump), V-101 (valve), TK-201 (tank). Adjust to your plant's real
# tagging convention before the demo -- this is the guard against an LLM
# hallucinating a plausible-looking but fictitious equipment ID.
EQUIPMENT_TAG_FULL_MATCH = re.compile(r"^[A-Z]{1,4}-\d{2,4}[a-zA-Z]?$")
EQUIPMENT_TAG_SEARCH = re.compile(r"\b[A-Z]{1,4}-\d{2,4}[a-zA-Z]?\b")


class PidEquipment(BaseModel):
    id: str
    name: str
    type: str
    properties: dict = Field(default_factory=dict)

    @field_validator("id")
    @classmethod
    def id_must_match_tag_convention(cls, v: str) -> str:
        if not EQUIPMENT_TAG_FULL_MATCH.match(v):
            # Raising here fails validation of the WHOLE payload, not just this
            # item -- by design. ingestion_service treats any schema-validation
            # failure on a live call as reason to fall back to the cache in full
            # (see ExtractionError handling). One hallucinated tag id is treated
            # as evidence the whole extraction is untrustworthy, not as a single
            # bad row to quietly drop from an otherwise-accepted batch.
            raise ValueError(
                f"equipment id '{v}' does not match the plant tag convention "
                f"(e.g. P-102) -- likely a vision hallucination"
            )
        return v


class PidConnection(BaseModel):
    source_id: str
    target_id: str
    flow_direction: Optional[Literal["upstream", "downstream"]] = None


class PidExtraction(BaseModel):
    equipment: list[PidEquipment] = Field(default_factory=list)
    connections: list[PidConnection] = Field(default_factory=list)


class ShiftNoteExtraction(BaseModel):
    equipment_name: str
    symptom_description: str
    fix_description: str
    is_compliance_relevant: bool = False
    source_excerpt: str
    telemetry_signature: dict = Field(default_factory=dict)

    @field_validator("equipment_name", "symptom_description", "fix_description")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field must not be blank")
        return v


class ShiftNoteExtractionBatch(BaseModel):
    extractions: list[ShiftNoteExtraction] = Field(default_factory=list)
