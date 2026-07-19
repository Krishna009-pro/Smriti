"""
services/extraction_client.py

The piece that was missing from the original ingestion_service: an actual live
extraction call. One interface for both modalities (P&ID vision, shift-note
text) so ingestion_service has exactly one fallback policy to reason about,
not two that can drift apart.

This client NEVER falls back to cache itself -- it either returns validated
data or raises ExtractionError. Keeping the fallback decision in one place
(ingestion_service) means there's one place to read to understand the demo's
reliability behavior, not two.
"""
import base64
import logging

import httpx

from backend.config import settings
from .extraction_schemas import PidExtraction, ShiftNoteExtractionBatch

logger = logging.getLogger(__name__)

PID_SYSTEM_PROMPT = """You are a P&ID (Piping and Instrumentation Diagram) parsing engine.
Given an image of a P&ID, extract every distinct equipment item and the
structural connections between them. Respond ONLY with valid JSON matching
this schema, no prose, no markdown fences:

{"equipment": [{"id": string, "name": string, "type": string}],
 "connections": [{"source_id": string, "target_id": string, "flow_direction": "upstream"|"downstream"}]}

Equipment ids must follow the plant tag convention: 1-4 letter prefix, dash,
2-4 digit number (e.g. P-102, V-101, TK-201). If you cannot read a tag
confidently, omit that item rather than guessing."""

SHIFT_NOTE_SYSTEM_PROMPT = """You are an industrial knowledge extraction engine.
Given a raw shift-handover note or work-order comment, extract every distinct
equipment-symptom-fix relationship explicitly mentioned. Do not infer a fix
that isn't stated as having been applied or recommended. Respond ONLY with
valid JSON matching this schema, no prose, no markdown fences:

{"extractions": [{"equipment_name": string, "symptom_description": string,
 "fix_description": string, "is_compliance_relevant": boolean, "source_excerpt": string}]}

If nothing qualifies, return {"extractions": []}."""


class ExtractionError(Exception):
    """Raised on timeout, HTTP failure, or schema-validation failure. Callers
    (ingestion_service) catch this specifically and fall back to cache -- it
    is never swallowed silently inside this client."""


class ExtractionClient:
    def __init__(self, timeout: float | None = None):
        self.timeout = timeout if timeout is not None else 8.0
        self.provider = settings.llm_provider
        self.api_key = settings.gemini_api_key if self.provider == "gemini" else settings.anthropic_api_key

    # --- public interface ------------------------------------------------

    def extract_pid(self, file_path: str) -> dict:
        raw_json_text = self._call_vision(file_path)
        try:
            parsed = PidExtraction.model_validate_json(raw_json_text)
        except Exception as e:
            raise ExtractionError(f"P&ID response failed schema validation: {e}") from e
        return parsed.model_dump()

    def extract_shift_notes(self, text: str) -> list[dict]:
        raw_json_text = self._call_text(text)
        try:
            parsed = ShiftNoteExtractionBatch.model_validate_json(raw_json_text)
        except Exception as e:
            raise ExtractionError(f"Shift-note response failed schema validation: {e}") from e
        return [item.model_dump() for item in parsed.extractions]

    # --- provider dispatch -------------------------------------------------

    def _call_vision(self, file_path: str) -> str:
        try:
            with open(file_path, "rb") as f:
                image_bytes = f.read()
        except OSError as e:
            raise ExtractionError(f"could not read file {file_path}: {e}") from e

        try:
            if self.provider == "gemini":
                return self._call_gemini_vision(image_bytes)
            if self.provider == "claude":
                return self._call_claude_vision(image_bytes)
            raise ExtractionError(f"unknown LLM_PROVIDER: {self.provider}")
        except httpx.TimeoutException as e:
            raise ExtractionError(f"vision call timed out after {self.timeout}s") from e
        except httpx.HTTPError as e:
            raise ExtractionError(f"vision call failed: {e}") from e

    def _call_text(self, text: str) -> str:
        try:
            if self.provider == "gemini":
                return self._call_gemini_text(text)
            if self.provider == "claude":
                return self._call_claude_text(text)
            raise ExtractionError(f"unknown LLM_PROVIDER: {self.provider}")
        except httpx.TimeoutException as e:
            raise ExtractionError(f"text extraction timed out after {self.timeout}s") from e
        except httpx.HTTPError as e:
            raise ExtractionError(f"text extraction failed: {e}") from e

    # --- provider calls ------------------------------------------------
    # Swap these two methods per provider if you standardize on one -- kept
    # both so the demo isn't locked to a single vendor's uptime.

    def _call_gemini_vision(self, image_bytes: bytes) -> str:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [{
                "parts": [
                    {"text": PID_SYSTEM_PROMPT},
                    {"inline_data": {"mime_type": "image/png", "data": base64.b64encode(image_bytes).decode()}},
                ]
            }],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    def _call_gemini_text(self, text: str) -> str:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [{"parts": [{"text": f"{SHIFT_NOTE_SYSTEM_PROMPT}\n\nINPUT:\n{text}"}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    def _call_claude_vision(self, image_bytes: bytes) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2000,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                                  "data": base64.b64encode(image_bytes).decode()}},
                    {"type": "text", "text": PID_SYSTEM_PROMPT},
                ],
            }],
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["content"][0]["text"]

    def _call_claude_text(self, text: str) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2000,
            "messages": [{"role": "user", "content": f"{SHIFT_NOTE_SYSTEM_PROMPT}\n\nINPUT:\n{text}"}],
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["content"][0]["text"]
