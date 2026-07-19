import json
import httpx
from typing import Dict, Any, List
from backend.config import settings

class ExtractionClient:
    async def extract_pid(self, file_path: str, timeout: float = 8.0) -> Dict[str, Any]:
        """
        UC-1: Real extraction call to Gemini API for P&ID structure.
        """
        if not settings.gemini_api_key:
            raise ValueError("Gemini API key not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        prompt = (
            "Analyze the uploaded P&ID schematic. Extract the equipment nodes and physical flow connections. "
            "Respond ONLY with a valid JSON containing 'nodes' and 'edges'.\n"
            "Schema:\n"
            "{\n"
            "  \"nodes\": [{\"id\": \"tag\", \"type\": \"equipment\", \"name\": \"full name\", \"properties\": {}}],\n"
            "  \"edges\": [{\"source_id\": \"from_tag\", \"target_id\": \"to_tag\", \"relation_type\": \"connects_to\", \"flow_direction\": \"downstream\"}]\n"
            "}"
        )
        payload = {
            "contents": [{"parts": [
                {"text": f"Analyzing file: {file_path}"},
                {"text": prompt}
            ]}]
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=timeout)
            if response.status_code != 200:
                raise httpx.HTTPStatusError(f"Gemini API returned status {response.status_code}", request=response.request, response=response)
            res_json = response.json()
            text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            text_clean = text.replace("```json", "").replace("```", "").strip()
            return json.loads(text_clean)

    async def extract_shift_notes(self, text_content: str, timeout: float = 8.0) -> List[Dict[str, Any]]:
        """
        UC-2: Real extraction call to Gemini API for shift notes.
        """
        if not settings.gemini_api_key:
            raise ValueError("Gemini API key not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        prompt = (
            "Analyze the following shift notes text. Extract decision-symptom-fix triples as experiential edges. "
            "Respond ONLY with a valid JSON array of edges.\n"
            "Schema:\n"
            "[\n"
            "  {\n"
            "    \"source_id\": \"equipment_tag\",\n"
            "    \"target_id\": \"fix_id\",\n"
            "    \"relation_type\": \"has_known_fix\",\n"
            "    \"symptom_description\": \"symptom text\",\n"
            "    \"telemetry_signature\": {\"metric\": \"pressure\", \"condition\": \"drop_pct > 15\"},\n"
            "    \"positive_feedback\": 1,\n"
            "    \"negative_feedback\": 0,\n"
            "    \"is_compliance_relevant\": 1,\n"
            "    \"source_excerpt\": \"exact text snippet\"\n"
            "  }\n"
            "]"
        )
        payload = {
            "contents": [{"parts": [
                {"text": f"Shift Notes Content:\n{text_content}"},
                {"text": prompt}
            ]}]
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=timeout)
            if response.status_code != 200:
                raise httpx.HTTPStatusError(f"Gemini API returned status {response.status_code}", request=response.request, response=response)
            res_json = response.json()
            text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            text_clean = text.replace("```json", "").replace("```", "").strip()
            return json.loads(text_clean)
