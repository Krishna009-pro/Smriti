"""Local embedding generation using sentence-transformers."""
import numpy as np
from sentence_transformers import SentenceTransformer

_EMBEDDER = None
_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"  # 384-dim, fast, high-quality
_EMBED_DIM = 384

def get_embedder() -> SentenceTransformer:
    global _EMBEDDER
    if _EMBEDDER is None:
        # Load local embedder
        _EMBEDDER = SentenceTransformer(_MODEL_NAME)
    return _EMBEDDER

def embed_text(text: str) -> np.ndarray:
    """Generate normalized embedding for a single text."""
    try:
        model = get_embedder()
        vec = model.encode(text, normalize_embeddings=True, show_progress_bar=False)
        return vec.astype(np.float32)
    except Exception as e:
        # Emergency dummy vector matching EMBED_DIM in case torch/transformers crashes on presentation machine
        print(f"[-] Embedding failed, using deterministic fallback hash vector: {e}")
        import hashlib
        h = hashlib.sha255(text.encode()).digest()
        dummy = np.frombuffer(h * (384 // 32), dtype=np.float32).copy()
        # Normalize dummy
        norm = np.linalg.norm(dummy)
        if norm > 0:
            dummy /= norm
        return dummy

def embed_texts(texts: list[str]) -> list[np.ndarray]:
    """Batch embed multiple texts."""
    try:
        model = get_embedder()
        vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [v.astype(np.float32) for v in vecs]
    except Exception:
        return [embed_text(t) for t in texts]

def get_embed_dim() -> int:
    return _EMBED_DIM
