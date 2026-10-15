import hashlib
import math
import os
import re
from typing import List, Dict, Any, Optional, Tuple

# Fixed embedding dim for local free embeddings (no paid API required)
EMBED_DIM = 384


class TigerDataTool:
    """
    QuoteFlow historical job memory — Tiger Data G3 hybrid:

    - Always: SQLite keyword + win/loss weighted retrieval
    - When TIGER_DATA_CONNECTION_STRING is set: upsert + pgvector cosine search,
      fused with keyword ranks (RRF-style) for Best Use of Tiger Data

    Embeddings default to a free local hashing encoder so Tiger Cloud stays
    free-tier friendly. Set EMBEDDING_MODE=openai + OPENAI_API_KEY for
    text-embedding-3-small if you prefer.
    """

    def __init__(self, connection_string: Optional[str] = None):
        self.conn_str = (connection_string or os.getenv("TIGER_DATA_CONNECTION_STRING", "")).strip()
        self._schema_ready = False

    def _tokenize(self, text: str) -> set:
        return set(re.findall(r"[a-z0-9]+", (text or "").lower()))

    def _score_keyword(self, query: str, title: str, notes: str, trade: str, target_trade: str) -> float:
        q = self._tokenize(query)
        doc = self._tokenize(f"{title} {notes} {trade}")
        if not q:
            return 0.0
        overlap = len(q & doc) / max(len(q), 1)
        trade_boost = 0.25 if trade.lower() == (target_trade or "").lower() else 0.0
        return min(0.99, overlap + trade_boost)

    def _embed_local(self, text: str) -> List[float]:
        """Deterministic bag-of-ngrams hash embedding — $0, offline-free."""
        vec = [0.0] * EMBED_DIM
        tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
        if not tokens:
            return vec
        for i, tok in enumerate(tokens):
            for n in (1, 2, 3):
                gram = tok if n == 1 else f"{tok}_{tokens[min(i + n - 1, len(tokens) - 1)]}"
                h = hashlib.sha256(gram.encode("utf-8")).digest()
                idx = int.from_bytes(h[:4], "little") % EMBED_DIM
                sign = 1.0 if h[4] % 2 == 0 else -1.0
                vec[idx] += sign
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    async def _embed(self, text: str) -> List[float]:
        mode = (os.getenv("EMBEDDING_MODE") or "local").lower()
        if mode == "openai" and os.getenv("OPENAI_API_KEY"):
            try:
                import httpx

                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"},
                        json={"model": "text-embedding-3-small", "input": text[:8000]},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        emb = data["data"][0]["embedding"]
                        # Pad/truncate to EMBED_DIM if needed for schema consistency
                        if len(emb) >= EMBED_DIM:
                            return emb[:EMBED_DIM]
                        return emb + [0.0] * (EMBED_DIM - len(emb))
            except Exception as e:
                print(f"OpenAI embedding failed, using local: {e}")
        return self._embed_local(text)

    async def _get_conn(self):
        import asyncpg

        return await asyncpg.connect(self.conn_str)

    async def ensure_schema(self) -> bool:
        if not self.conn_str:
            return False
        if self._schema_ready:
            return True
        try:
            conn = await self._get_conn()
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
                await conn.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS quoteflow_jobs (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        trade TEXT NOT NULL,
                        notes TEXT NOT NULL,
                        total DOUBLE PRECISION NOT NULL DEFAULT 0,
                        status TEXT NOT NULL DEFAULT 'draft',
                        embedding vector({EMBED_DIM}),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
                # HNSW when enough rows; ignore if extension/version lacks it
                try:
                    await conn.execute(
                        """
                        CREATE INDEX IF NOT EXISTS quoteflow_jobs_embedding_hnsw
                        ON quoteflow_jobs USING hnsw (embedding vector_cosine_ops)
                        """
                    )
                except Exception:
                    pass
                self._schema_ready = True
                return True
            finally:
                await conn.close()
        except Exception as e:
            print(f"Tiger Data schema init failed: {e}")
            return False

    async def upsert_job(
        self,
        job_id: str,
        title: str,
        trade: str,
        notes: str,
        total: float,
        status: str = "draft",
    ) -> bool:
        if not self.conn_str:
            return False
        ok = await self.ensure_schema()
        if not ok:
            return False
        try:
            emb = await self._embed(f"{title}. {trade}. {notes}")
            emb_literal = "[" + ",".join(f"{x:.8f}" for x in emb) + "]"
            conn = await self._get_conn()
            try:
                await conn.execute(
                    """
                    INSERT INTO quoteflow_jobs (id, title, trade, notes, total, status, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        trade = EXCLUDED.trade,
                        notes = EXCLUDED.notes,
                        total = EXCLUDED.total,
                        status = EXCLUDED.status,
                        embedding = EXCLUDED.embedding
                    """,
                    job_id,
                    title,
                    trade,
                    notes[:2000],
                    float(total),
                    status,
                    emb_literal,
                )
                return True
            finally:
                await conn.close()
        except Exception as e:
            print(f"Tiger Data upsert failed: {e}")
            return False

    async def _search_pgvector(
        self, query: str, trade: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        ok = await self.ensure_schema()
        if not ok:
            return []
        try:
            emb = await self._embed(query)
            emb_literal = "[" + ",".join(f"{x:.8f}" for x in emb) + "]"
            conn = await self._get_conn()
            try:
                # Cosine distance <=> ; similarity = 1 - distance
                rows = await conn.fetch(
                    """
                    SELECT id, title, trade, notes, total, status,
                           1 - (embedding <=> $1::vector) AS similarity
                    FROM quoteflow_jobs
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> $1::vector
                    LIMIT $2
                    """,
                    emb_literal,
                    limit * 3,
                )
                results = []
                for r in rows:
                    sim = float(r["similarity"] or 0)
                    if trade and r["trade"] and r["trade"].lower() == trade.lower():
                        sim = min(0.99, sim + 0.08)
                    results.append(
                        {
                            "title": r["title"],
                            "trade": r["trade"],
                            "total": float(r["total"] or 0),
                            "similarity_score": round(max(0.0, min(0.99, sim)), 2),
                            "notes": (r["notes"] or "")[:180],
                            "status": r["status"] or "draft",
                            "source": "tiger_pgvector",
                            "id": r["id"],
                        }
                    )
                return results
            finally:
                await conn.close()
        except Exception as e:
            print(f"Tiger pgvector search failed: {e}")
            return []

    def _rrf_fuse(
        self, keyword_jobs: List[Dict[str, Any]], vector_jobs: List[Dict[str, Any]], limit: int
    ) -> List[Dict[str, Any]]:
        """Reciprocal Rank Fusion of keyword + vector lists."""
        scores: Dict[str, float] = {}
        meta: Dict[str, Dict[str, Any]] = {}
        k = 60

        def key_of(j: Dict[str, Any]) -> str:
            return (j.get("id") or j.get("title") or "").lower()

        for rank, j in enumerate(keyword_jobs):
            key = key_of(j)
            if not key:
                continue
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
            meta[key] = j
        for rank, j in enumerate(vector_jobs):
            key = key_of(j)
            if not key:
                continue
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
            # Prefer tiger source metadata when present
            if key not in meta or j.get("source") == "tiger_pgvector":
                prev = meta.get(key, {})
                merged = {**prev, **j}
                merged["source"] = (
                    "tiger_hybrid"
                    if prev.get("source") and prev.get("source") != j.get("source")
                    else j.get("source", "tiger_pgvector")
                )
                meta[key] = merged

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        out = []
        for key, rrf in ranked[:limit]:
            job = dict(meta[key])
            job["similarity_score"] = round(min(0.99, 0.5 + rrf * 10), 2)
            job["rrf_score"] = round(rrf, 5)
            out.append(job)
        return out

    async def search_similar_past_jobs(
        self, query: str, trade: str, limit: int = 3
    ) -> List[Dict[str, Any]]:
        keyword_jobs: List[Dict[str, Any]] = []

        # SQLite keyword memory
        try:
            from db.database import get_all_quotes

            quotes = await get_all_quotes()
            for q in quotes:
                status = (q.get("status") or "").lower()
                status_boost = 0.15 if status in ("approved", "completed") else 0.0
                title = q.get("project_title") or ""
                notes = q.get("project_scope_summary") or ""
                q_trade = q.get("trade_type") or trade
                score = self._score_keyword(query, title, notes, q_trade, trade) + status_boost
                if score < 0.12:
                    continue
                keyword_jobs.append(
                    {
                        "id": q.get("id"),
                        "title": title,
                        "trade": q_trade,
                        "total": float(q.get("total_amount") or 0),
                        "similarity_score": round(min(0.99, score), 2),
                        "notes": notes[:180],
                        "status": status or "draft",
                        "source": "sqlite_history",
                    }
                )
        except Exception as e:
            print(f"Tiger SQLite memory read failed: {e}")

        seed = [
            {
                "id": "seed-wh",
                "title": "50-Gal Bradford White Water Heater Replacement",
                "trade": "Plumbing",
                "total": 2450.00,
                "notes": "Includes expansion tank, earthquake straps, code ball valve.",
                "status": "approved",
                "source": "seed",
            },
            {
                "id": "seed-elec",
                "title": "200-Amp Overhead Electrical Service Upgrade",
                "trade": "Electrical",
                "total": 3200.00,
                "notes": "Includes city disconnect, new meter base, ground rods.",
                "status": "approved",
                "source": "seed",
            },
            {
                "id": "seed-bath",
                "title": "Master Bathroom Vanity & Subway Tile Remodel",
                "trade": "Carpentry / Remodeling",
                "total": 4800.00,
                "notes": "Includes moisture barrier, Schluter Ditra, custom grout.",
                "status": "approved",
                "source": "seed",
            },
        ]
        for s in seed:
            score = self._score_keyword(query, s["title"], s["notes"], s["trade"], trade)
            if score < 0.08 and s["trade"].lower() != (trade or "").lower():
                continue
            keyword_jobs.append(
                {
                    **s,
                    "similarity_score": round(
                        max(score, 0.55 if s["trade"].lower() == trade.lower() else score), 2
                    ),
                }
            )

        keyword_jobs.sort(key=lambda j: j.get("similarity_score", 0), reverse=True)

        # Tiger pgvector path → hybrid RRF
        if self.conn_str:
            try:
                vector_jobs = await self._search_pgvector(query, trade, limit=limit)
                if vector_jobs:
                    return self._rrf_fuse(keyword_jobs, vector_jobs, limit)
            except Exception as e:
                print(f"Tiger Data hybrid unavailable, SQLite only: {e}")

        # De-dupe keyword-only
        seen = set()
        unique = []
        for j in keyword_jobs:
            key = (j.get("title") or "").lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(j)
        return unique[:limit]

    async def status(self) -> Dict[str, Any]:
        info: Dict[str, Any] = {
            "mode": "sqlite_keyword",
            "tiger_configured": bool(self.conn_str),
            "pgvector_ready": False,
            "embedding_mode": os.getenv("EMBEDDING_MODE", "local"),
        }
        if self.conn_str:
            ready = await self.ensure_schema()
            info["pgvector_ready"] = ready
            info["mode"] = "tiger_hybrid_g3" if ready else "sqlite_keyword (tiger connect failed)"
        return info
