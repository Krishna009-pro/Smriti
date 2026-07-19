"""SQLite-vec backed vector store for edge embeddings."""
import sqlite3
import struct
import numpy as np
from backend.config import settings

VEC_TABLE = "edge_embeddings"
EMBED_DIM = 384

def _get_db_path() -> str:
    """Resolve SQLite path from settings."""
    url = settings.database_url
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "")
    raise ValueError("Vector store requires SQLite database")

def _serialize_vec(vec: np.ndarray) -> bytes:
    """Serialize float32 array to bytes for sqlite-vec."""
    if vec.dtype != np.float32:
        vec = vec.astype(np.float32)
    return struct.pack(f"{len(vec)}f", *vec)

def _deserialize_vec(blob: bytes) -> np.ndarray:
    """Deserialize bytes to float32 array."""
    n = len(blob) // 4
    return np.array(struct.unpack(f"{n}f", blob), dtype=np.float32)

def init_vector_store() -> None:
    """Create the virtual table if not exists. Call on startup."""
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        # Load sqlite-vec extension
        conn.enable_load_extension(True)
        import sqlite_vec
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        # Create virtual table for KNN search
        conn.execute(f"""
            CREATE VIRTUAL TABLE IF NOT EXISTS {VEC_TABLE} USING vec0(
                edge_id TEXT PRIMARY KEY,
                embedding FLOAT[{EMBED_DIM}]
            );
        """)
        conn.commit()
    except Exception as e:
        print(f"[-] Failed to load sqlite-vec: {e}. Check if Visual C++ runtime is installed.")
    finally:
        conn.close()

def upsert_edge_embedding(edge_id: str, embedding: np.ndarray) -> None:
    """Insert or update embedding for an edge."""
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.enable_load_extension(True)
        import sqlite_vec
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        blob = _serialize_vec(embedding)
        conn.execute(
            f"INSERT OR REPLACE INTO {VEC_TABLE} (edge_id, embedding) VALUES (?, ?)",
            (edge_id, blob)
        )
        conn.commit()
    except Exception as e:
        print(f"[-] Failed to upsert embedding: {e}")
    finally:
        conn.close()

def delete_edge_embedding(edge_id: str) -> None:
    """Remove embedding when edge is deleted."""
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.enable_load_extension(True)
        import sqlite_vec
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        conn.execute(f"DELETE FROM {VEC_TABLE} WHERE edge_id = ?", (edge_id,))
        conn.commit()
    except Exception as e:
        print(f"[-] Failed to delete embedding: {e}")
    finally:
        conn.close()

def search_similar_edges(
    query_embedding: np.ndarray,
    equipment_id: str | None = None,
    top_k: int = 5,
    min_score: float = 0.0
) -> list[tuple[str, float]]:
    """
    Search for similar edges using cosine similarity (via dot product on normalized vectors).
    Returns list of (edge_id, similarity_score).
    """
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.enable_load_extension(True)
        import sqlite_vec
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        query_blob = _serialize_vec(query_embedding)

        if equipment_id:
            # Filter by equipment: join with knowledge_edges to get source_id
            sql = f"""
                SELECT ve.edge_id,
                       vec_distance_cosine(ve.embedding, ?) as distance
                FROM {VEC_TABLE} ve
                JOIN knowledge_edges ke ON ke.id = ve.edge_id
                WHERE ke.source_id = ?
                ORDER BY distance ASC
                LIMIT ?
            """
            params = (query_blob, equipment_id, top_k)
        else:
            sql = f"""
                SELECT edge_id, vec_distance_cosine(embedding, ?) as distance
                FROM {VEC_TABLE}
                ORDER BY distance ASC
                LIMIT ?
            """
            params = (query_blob, top_k)

        rows = conn.execute(sql, params).fetchall()
        # Convert cosine distance to similarity
        results = [(row[0], 1.0 - row[1] / 2.0) for row in rows]
        return [(eid, score) for eid, score in results if score >= min_score]
    except Exception as e:
        print(f"[-] Failed semantic search query: {e}. Falling back to default edge matching.")
        return []
    finally:
        conn.close()

def get_edge_embedding(edge_id: str) -> np.ndarray | None:
    """Retrieve stored embedding for an edge."""
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.enable_load_extension(True)
        import sqlite_vec
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)

        row = conn.execute(
            f"SELECT embedding FROM {VEC_TABLE} WHERE edge_id = ?", (edge_id,)
        ).fetchone()
        if row:
            return _deserialize_vec(row[0])
        return None
    except Exception:
        return None
    finally:
        conn.close()
