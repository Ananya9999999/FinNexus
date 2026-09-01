"""Simple FAISS + SentenceTransformer RAG layer for regulatory filings."""

from __future__ import annotations
from typing import List, Dict, Any, Optional
import numpy as np

from data.synthetic_filings import SYNTHETIC_DOCS

try:
    from sentence_transformers import SentenceTransformer
    import faiss
    HAS_EMB = True
except Exception:
    HAS_EMB = False


class DocumentStore:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.docs = SYNTHETIC_DOCS
        self.model = None
        self.index = None
        self.embeddings = None
        if HAS_EMB:
            try:
                self.model = SentenceTransformer(model_name)
                texts = [f"{d['title']}\n{d['content']}" for d in self.docs]
                self.embeddings = self.model.encode(texts, show_progress_bar=False)
                dim = self.embeddings.shape[1]
                self.index = faiss.IndexFlatIP(dim)
                # normalize for cosine
                faiss.normalize_L2(self.embeddings)
                self.index.add(self.embeddings.astype(np.float32))
            except Exception as e:
                print(f"[vector_store] Embedding init failed: {e}")
                self.model = None

    def search(self, query: str, top_k: int = 3, ticker_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Semantic search with optional ticker filter. Returns list of {doc, score, snippet}."""
        if not self.model or self.index is None:
            # Keyword fallback
            return self._keyword_fallback(query, top_k, ticker_filter)

        q_emb = self.model.encode([query], show_progress_bar=False)
        faiss.normalize_L2(q_emb)
        scores, idxs = self.index.search(q_emb.astype(np.float32), min(top_k * 3, len(self.docs)))

        results = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx < 0:
                continue
            doc = self.docs[idx]
            if ticker_filter:
                t = ticker_filter.upper().replace(".NS", "").replace(".BO", "")
                if doc["ticker"] not in (t, "MACRO"):
                    continue
            results.append({
                "doc_id": doc["id"],
                "ticker": doc["ticker"],
                "type": doc["type"],
                "date": doc["date"],
                "title": doc["title"],
                "score": float(score),
                "snippet": doc["content"][:450].strip() + "...",
                "full_content": doc["content"].strip(),
            })
            if len(results) >= top_k:
                break
        return results

    def _keyword_fallback(self, query: str, top_k: int, ticker_filter: Optional[str]) -> List[Dict[str, Any]]:
        q_terms = set(query.lower().split())
        scored = []
        for d in self.docs:
            if ticker_filter:
                t = ticker_filter.upper().replace(".NS", "").replace(".BO", "")
                if d["ticker"] not in (t, "MACRO"):
                    continue
            text = (d["title"] + " " + d["content"]).lower()
            overlap = len(q_terms & set(text.split()))
            scored.append((overlap, d))
        scored.sort(key=lambda x: -x[0])
        results = []
        for score, doc in scored[:top_k]:
            results.append({
                "doc_id": doc["id"],
                "ticker": doc["ticker"],
                "type": doc["type"],
                "date": doc["date"],
                "title": doc["title"],
                "score": float(score) / 10.0,
                "snippet": doc["content"][:450].strip() + "...",
                "full_content": doc["content"].strip(),
            })
        return results


# Singleton for app
_store: Optional[DocumentStore] = None

def get_store() -> DocumentStore:
    global _store
    if _store is None:
        _store = DocumentStore()
    return _store
