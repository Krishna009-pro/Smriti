import re
import httpx
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.config import settings
from backend.services.graph_service import GraphService
from backend.db.models import KnowledgeNode, KnowledgeEdge

class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.graph_service = GraphService(db)

    async def get_copilot_response(self, message: str) -> str:
        """
        UC-2 & Feature 2: Context-aware AI Copilot.
        Extracts equipment ID, queries topology, and feeds to LLM or fallback generator.
        """
        # 1. Regex match for equipment ID (e.g. P-102, V-101)
        match = re.search(r'\b[PVTF]-\d+\b', message, re.IGNORECASE)
        equipment_id = match.group(0).upper() if match else None
        
        # 2. Query context if equipment matched
        context_str = ""
        if equipment_id:
            try:
                res = self.graph_service.trace_topology_and_history(equipment_id)
                nodes_info = ", ".join([f"{n.id} ({n.name}, type: {n.type})" for n in res["nodes"]])
                fixes_info = []
                for edge in res["edges"]:
                    if edge.relation_type == "has_known_fix":
                        # Find target node name
                        target_node = self.db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.target_id).first()
                        target_name = target_node.name if target_node else edge.target_id
                        fixes_info.append(f"Remedy: {target_name} (Confidence: {edge.confidence:.2%}, Symptom: {edge.symptom_description})")
                
                context_str = (
                    f"Context for Equipment {equipment_id}:\n"
                    f"- Physically Connected Nodes: {nodes_info}\n"
                    f"- Mapped Remedies: {'; '.join(fixes_info) if fixes_info else 'None'}\n"
                )
            except Exception as e:
                context_str = f"Failed to retrieve database context for {equipment_id}: {e}\n"

        # 3. Call LLM (OpenRouter or Gemini)
        if settings.openrouter_api_key:
            try:
                url = "https://openrouter.ai/api/v1/chat/completions"
                system_instruction = (
                    "You are 'Smriti Copilot', an AI Industrial Memory OS powering refinery Mission Control Console and Telegram Alert Bot (@smriti_alerts_bot).\n"
                    "RESPONSE FORMAT REQUIREMENTS:\n"
                    "- Always start with a clear, professional header (e.g. 🛠️ **SMRITI OS OPERATIONAL UPDATE** or 📊 **PLANT STATUS ANALYSIS**).\n"
                    "- Use bold bullet points to structure your points clearly.\n"
                    "- If asked 'what is happening' or general status, summarize active plant telemetry: Feed Pump P-102 discharge pressure drop (-18.2%), upstream Valve V-101 clearing remedy (78.2% Wilson confidence score), and active SSE alert streams.\n"
                    "- Keep responses direct, crisp, and formatted with emojis for fast reading in control rooms and on mobile screens."
                )
                headers = {
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://smriti.os",
                    "X-Title": "Smriti OS",
                }
                payload = {
                    "model": "google/gemini-2.5-flash",
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": f"Database Context:\n{context_str}\n\nUser Question: {message}"}
                    ],
                    "max_tokens": 1000
                }
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=payload, headers=headers, timeout=12.0)
                    if response.status_code == 200:
                        res_json = response.json()
                        text = res_json["choices"][0]["message"]["content"]
                        return text.strip()
                    else:
                        print(f"[-] ChatService OpenRouter: HTTP {response.status_code} — {response.text[:400]}")
            except Exception as e:
                print(f"[-] ChatService OpenRouter exception: {type(e).__name__}: {e}")


        if settings.gemini_api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={settings.gemini_api_key}"
                system_instruction = (
                    "You are 'Smriti Copilot', an AI Industrial Memory OS powering refinery Mission Control Console and Telegram Alert Bot (@smriti_alerts_bot).\n"
                    "RESPONSE FORMAT REQUIREMENTS:\n"
                    "- Always start with a clear, professional header (e.g. 🛠️ **SMRITI OS OPERATIONAL UPDATE** or 📊 **PLANT STATUS ANALYSIS**).\n"
                    "- Use bold bullet points to structure your points clearly.\n"
                    "- If asked 'what is happening' or general status, summarize active plant telemetry: Feed Pump P-102 discharge pressure drop (-18.2%), upstream Valve V-101 clearing remedy (78.2% Wilson confidence score), and active SSE alert streams.\n"
                    "- Keep responses direct, crisp, and formatted with emojis for fast reading in control rooms and on mobile screens."
                )
                
                full_prompt = f"{system_instruction}\n\n{context_str}\nUser Question: {message}\nAnswer:"
                
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [{"parts": [{"text": full_prompt}]}]
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                    if response.status_code == 200:
                        res_json = response.json()
                        text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                        return text.strip()
            except Exception as e:
                print(f"[-] Gemini API call failed, falling back to rule-based responder: {e}")

        # 4. Fallback Offline Responder
        if equipment_id:
            # Query target nodes and fixes to make fallback response realistic
            eq_node = self.db.query(KnowledgeNode).filter(KnowledgeNode.id == equipment_id).first()
            eq_name = eq_node.name if eq_node else f"Equipment {equipment_id}"
            
            # Find has_known_fix edges
            edges = self.db.query(KnowledgeEdge).filter(
                KnowledgeEdge.source_id == equipment_id,
                KnowledgeEdge.relation_type == "has_known_fix"
            ).all()
            
            if edges:
                remedy_bullets = []
                for edge in edges:
                    target_node = self.db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.target_id).first()
                    target_name = target_node.name if target_node else edge.target_id
                    remedy_bullets.append(
                        f"• **{target_name}** (Confidence: {edge.confidence:.1%}) - {edge.symptom_description or 'General warning'}."
                    )
                remedies_text = "\n".join(remedy_bullets)
                return (
                    f"🤖 **Smriti Copilot (Offline Fallback):**\n"
                    f"I traced **{eq_name} ({equipment_id})** in the plant graph. Here is the mapped remedy profile:\n\n"
                    f"{remedies_text}\n\n"
                    f"Please confirm if the symptom matches and check these valves or procedures first."
                )
            else:
                return (
                    f"🤖 **Smriti Copilot (Offline Fallback):**\n"
                    f"I traced **{eq_name} ({equipment_id})** in the graph, but no active fixes are recorded yet. "
                    f"Please consult the plant procedures or submit feedback if you perform a repair."
                )
        else:
            return (
                f"🤖 **Smriti Copilot (Offline Fallback):**\n"
                f"Welcome! Ask me about specific equipment (e.g. 'P-102' or 'V-101') to retrieve its connected P&ID topology and troubleshooting logs."
            )

async def unified_chat_router(db: Session, user_msg: str, equip_ctx: str | None = None) -> dict:
    """
    Unified smart chat router used by both Web API (/api/chat/ask) and Telegram Copilot:
    - Equipment IDs or troubleshooting keywords → RAG pipeline (historical fixes, vector search)
    - General / conversational queries → ChatService (natural LLM conversation)
    """
    import re
    user_text = (user_msg or "").strip()
    if not user_text and equip_ctx:
        user_text = f"What is the troubleshooting history and fix for {equip_ctx}?"

    # Detect explicit equipment ID in message or request
    eq_match = re.search(r'\b([PVTF]-\d+\w*|VLV-\d+\w*|P_\d+\w*)\b', user_text, re.IGNORECASE)
    has_equipment = bool(eq_match) or bool(equip_ctx)

    # Explicit check for platform/system queries that shouldn't search equipment vector database
    is_system_query = bool(re.search(
        r'\b(telegram|alert|bot|vote|voting|website|graph|how to|who are you|about you|hello|hi|hey|what is happening|help)\b',
        user_text, re.IGNORECASE
    )) and not has_equipment

    # Keywords that imply a physical equipment troubleshooting intent
    is_troubleshooting = bool(re.search(
        r'\b(fix|repair|fault|fail|leak|pressure|vibration|trip|stuck|broken|'
        r'incident|symptom|diagnos|error|issue|problem|history|historical|'
        r'maintenance|seal|pump|valve|cavitation|anomaly)\b',
        user_text, re.IGNORECASE
    ))

    use_rag = (has_equipment or is_troubleshooting) and not is_system_query

    try:
        if use_rag:
            from backend.services.rag_service import retrieve_and_answer
            detected_eq = equip_ctx or (eq_match.group(0).upper() if eq_match else None)
            result = await retrieve_and_answer(db, user_text, detected_eq, top_k=5)
            return {
                "answer": result.get("answer", "No answer generated."),
                "retrieved_edges": result.get("retrieved_edges", []),
                "mode": result.get("retrieval_mode", "rag")
            }
        else:
            service = ChatService(db)
            response = await service.get_copilot_response(user_text)
            return {
                "answer": response,
                "retrieved_edges": [],
                "mode": "conversational"
            }
    except Exception as e:
        print(f"[-] Unified chat router fallback exception: {e}")
        service = ChatService(db)
        fallback_resp = await service.get_copilot_response(user_text)
        return {
            "answer": fallback_resp,
            "retrieved_edges": [],
            "mode": "fallback"
        }

