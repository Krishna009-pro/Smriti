"""Retrieval-Augmented Generation for troubleshooting queries in Cloud-First, Local-Second format."""
import base64
from typing import Optional
import httpx
from sqlalchemy.orm import Session
from backend.db.models import KnowledgeEdge, KnowledgeNode
from backend.config import settings
from backend.services.embeddings import embed_text
from backend.services.vector_store import (
    init_vector_store,
    upsert_edge_embedding,
    search_similar_edges,
)

RAG_SYSTEM_PROMPT = """You are Smriti, an industrial memory OS for plant operations.
Given a technician's question and relevant historical fix records, provide a concise, actionable answer.
Cite specific equipment IDs and fix references. Be precise — lives and equipment depend on accuracy.
If the retrieved fixes don't fully address the question, say so and suggest what to check next.
Format your response as:
**Diagnosis**: <likely cause based on history>
**Recommended Actions**: <numbered steps>
**References**: <edge IDs and confidence scores>
**Confidence**: <0-100%>
"""

def build_fix_context(edges: list[KnowledgeEdge], nodes: dict[str, KnowledgeNode]) -> str:
    """Format retrieved edges into context for LLM."""
    lines = []
    for edge in edges:
        fix_node = nodes.get(edge.target_id)
        fix_name = fix_node.name if fix_node else edge.target_id
        lines.append(
            f"- Edge {edge.id}: {fix_name} | "
            f"Symptom: {edge.symptom_description or 'N/A'} | "
            f"Confidence: {edge.confidence:.2f} | "
            f"Feedback: +{edge.positive_feedback}/-{edge.negative_feedback} | "
            f"Source: {edge.source_excerpt or 'N/A'}"
        )
    return "\n".join(lines) if lines else "No relevant historical fixes found."

async def retrieve_and_answer(
    db: Session,
    query: str,
    equipment_id: Optional[str] = None,
    top_k: int = 5
) -> dict:
    """
    Main RAG pipeline:
    - Attempt cloud RAG (using dynamic context parsing + remote LLM) first.
    - If off-line or API call fails, fall back to SQLite-vec local semantic retrieval.
    """
    # 1. Ensure local vector store is active
    init_vector_store()

    # 2. Embed user query using local sentence-transformers
    query_vec = embed_text(query)

    # 3. SQLite-vec search
    results = search_similar_edges(query_vec, equipment_id=equipment_id, top_k=top_k)

    # If no results in vector database, return quick fallback
    if not results:
        # Check database for exact node symptom matching
        fallback_msg = "🤖 **Smriti Copilot (Offline Fallback):** No similar historical fixes found for this query."
        return {
            "answer": fallback_msg,
            "retrieved_edges": [],
            "confidence": 0.0
        }

    # 4. Fetch full edge + node data for RAG context
    edge_ids = [eid for eid, _ in results]
    edges = db.query(KnowledgeEdge).filter(KnowledgeEdge.id.in_(edge_ids)).all()
    fix_node_ids = list(set(e.target_id for e in edges))
    fix_nodes = db.query(KnowledgeNode).filter(KnowledgeNode.id.in_(fix_node_ids)).all()
    node_map = {n.id: n for n in fix_nodes}

    # Sort edges by match score
    score_map = {eid: score for eid, score in results}
    edges.sort(key=lambda e: score_map.get(e.id, 0), reverse=True)

    # 5. Build context payload
    context = build_fix_context(edges, node_map)

    # 6. Cloud-First: Call OpenRouter or Gemini API if key is available
    if settings.openrouter_api_key:
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://smriti.os",
                "X-Title": "Smriti OS",
            }
            payload = {
                "model": "google/gemini-2.5-flash",
                "messages": [
                    {"role": "system", "content": RAG_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
                ]
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=12.0)
                if response.status_code == 200:
                    res_json = response.json()
                    answer_text = res_json["choices"][0]["message"]["content"]
                    return {
                        "answer": answer_text.strip(),
                        "retrieved_edges": [
                            {"edge_id": e.id, "fix_name": node_map.get(e.target_id, KnowledgeNode(id=e.target_id, name=e.target_id)).name, "confidence": e.confidence}
                            for e in edges
                        ],
                        "confidence": float(edges[0].confidence) if edges else 0.0,
                        "retrieval_mode": "cloud_rag_openrouter"
                    }
        except Exception as e:
            print(f"[-] OpenRouter RAG call failed, trying standard Gemini: {e}")

    if settings.gemini_api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.gemini_api_key}"
            prompt = f"{RAG_SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion: {query}\nAnswer:"
            
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=8.0)
                if response.status_code == 200:
                    res_json = response.json()
                    answer_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                    return {
                        "answer": answer_text.strip(),
                        "retrieved_edges": [
                            {"edge_id": e.id, "fix_name": node_map.get(e.target_id, KnowledgeNode(id=e.target_id, name=e.target_id)).name, "confidence": e.confidence}
                            for e in edges
                        ],
                        "confidence": float(edges[0].confidence) if edges else 0.0,
                        "retrieval_mode": "cloud_rag"
                    }
        except Exception as e:
            print(f"[-] Cloud RAG call failed, falling back to local fallback RAG summary: {e}")

    # 7. Local-Second Fallback Synthesis
    formatted_bullets = []
    for e in edges:
        fix_name = node_map.get(e.target_id, KnowledgeNode(id=e.target_id, name=e.target_id)).name
        formatted_bullets.append(
            f"• **{fix_name}** on **{e.source_id}** ({e.id}) - Confidence: {e.confidence:.1%}\n"
            f"  *Symptom:* {e.symptom_description or 'N/A'}\n"
            f"  *Log excerpt:* \"{e.source_excerpt or 'N/A'}\""
        )
    
    bullets_joined = "\n".join(formatted_bullets)
    fallback_synthesis = (
        f"🤖 **Smriti Copilot (Local Fallback RAG):**\n"
        f"Based on local vector matching, I found {len(edges)} relevant historical fix profiles:\n\n"
        f"{bullets_joined}\n\n"
        f"Please verify these mechanical components and safety regulations."
    )

    return {
        "answer": fallback_synthesis,
        "retrieved_edges": [
            {"edge_id": e.id, "fix_name": node_map.get(e.target_id, KnowledgeNode(id=e.target_id, name=e.target_id)).name, "confidence": e.confidence}
            for e in edges
        ],
        "confidence": float(edges[0].confidence) if edges else 0.0,
        "retrieval_mode": "local_rag_fallback"
    }

def sync_edge_embeddings(db: Session) -> int:
    """
    Rebuild embeddings for all has_known_fix edges.
    Call after ingestion or on startup.
    """
    init_vector_store()
    edges = db.query(KnowledgeEdge).filter(
        KnowledgeEdge.relation_type == "has_known_fix"
    ).all()

    count = 0
    for edge in edges:
        text_parts = []
        if edge.symptom_description:
            text_parts.append(f"Symptom: {edge.symptom_description}")
        if edge.source_excerpt:
            text_parts.append(f"Context: {edge.source_excerpt}")
        fix_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.target_id).first()
        if fix_node:
            text_parts.append(f"Fix: {fix_node.name}")

        if text_parts:
            embed_text_combined = " | ".join(text_parts)
            vec = embed_text(embed_text_combined)
            upsert_edge_embedding(edge.id, vec)
            count += 1

    return count

async def extract_equipment_from_image(image_bytes: bytes) -> Optional[str]:
    """Identify any refinery or industrial equipment tag in an image using Gemini 2.5 Flash."""
    if not settings.gemini_api_key:
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.gemini_api_key}"
        prompt = (
            "Identify any refinery or industrial equipment tag or ID in this image "
            "(e.g., P-102, V-101, V-102, Valve-101). "
            "Respond with ONLY the equipment tag name as a plain string (e.g. 'P-102'), "
            "or respond with 'NONE' if no tag is identified. Do not include markdown formatting or extra text."
        )
        
        # Base64 encode the image
        img_b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": img_b64
                        }
                    }
                ]
            }]
        }
        
        headers = {"Content-Type": "application/json"}
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=15.0)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean up formatting
                text = text.replace("`", "").strip()
                if text == "NONE" or not text:
                    return None
                return text
    except Exception as e:
        print(f"[-] Image equipment extraction failed: {e}")
    return None
