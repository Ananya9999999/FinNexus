"""Fundamental + RAG Agent – retrieves filings/transcripts and grounds analysis."""

from __future__ import annotations
import time
import re
from typing import List, Dict, Any
from agents.base import AgentOutput, SignalLabel, label_from_score
from core.vector_store import get_store
from core.market_data import MarketSnapshot


def _extract_sentiment_from_text(text: str) -> float:
    """Simple lexicon-based fundamental tone score [-1, 1]."""
    positive = ["growth", "up", "strong", "expansion", "improved", "confident", "record", "synergies",
                "optimistic", "recovery", "margin expansion", "double-digit", "ahead of plan"]
    negative = ["pressure", "risk", "volatility", "decline", "weak", "challenge", "delay", "stress",
                "slowdown", "competition", "uncertainty", "loss", "margin pressure"]
    t = text.lower()
    pos = sum(1 for w in positive if w in t)
    neg = sum(1 for w in negative if w in t)
    total = pos + neg + 1e-6
    return (pos - neg) / total


def run_fundamental_rag_agent(snapshot: MarketSnapshot, query_extra: str = "") -> AgentOutput:
    t0 = time.time()
    store = get_store()
    ticker = snapshot.ticker.replace(".NS", "").replace(".BO", "")

    query = f"{ticker} earnings revenue growth risks outlook guidance margin {query_extra}"
    results = store.search(query, top_k=3, ticker_filter=ticker)

    citations = []
    combined_text = ""
    for r in results:
        citations.append({
            "source": f"{r['title']} ({r['date']}) [{r['type']}]",
            "snippet": r["snippet"][:280]
        })
        combined_text += " " + r.get("full_content", r["snippet"])

    if not results:
        # Degraded path – no retrieval
        return AgentOutput(
            agent_name="FundamentalRAGAgent",
            role="Retrieves regulatory filings & earnings transcripts via semantic search and grounds fundamental view",
            signal=SignalLabel.HOLD,
            confidence=0.3,
            score=0.0,
            reasoning=f"No relevant filings retrieved for {ticker}. Unable to ground fundamental view. Defaulting to HOLD with low confidence.",
            key_factors=["Retrieval miss – degraded"],
            citations=[],
            metrics={"docs_retrieved": 0},
            latency_ms=round((time.time() - t0) * 1000, 1),
            degraded=True,
            error="No documents matched",
        )

    tone = _extract_sentiment_from_text(combined_text)
    # Look for explicit growth numbers
    growth_mentions = re.findall(r"up\s+(\d+(?:\.\d+)?)%|growth\s+of\s+(\d+(?:\.\d+)?)%|(\d+(?:\.\d+)?)%\s+YoY", combined_text, re.I)
    growth_vals = []
    for m in growth_mentions:
        for g in m:
            if g:
                try:
                    growth_vals.append(float(g))
                except ValueError:
                    pass
    avg_growth = sum(growth_vals) / len(growth_vals) if growth_vals else None

    score = tone * 0.7
    factors = []
    if avg_growth is not None:
        if avg_growth >= 8:
            score += 0.25
            factors.append(f"Reported/ guided growth ~{avg_growth:.1f}% (supportive)")
        elif avg_growth <= 2:
            score -= 0.2
            factors.append(f"Soft growth print ~{avg_growth:.1f}%")
        else:
            factors.append(f"Moderate growth ~{avg_growth:.1f}%")

    # Risk language density
    risk_count = combined_text.lower().count("risk") + combined_text.lower().count("volatility")
    if risk_count >= 4:
        score -= 0.1
        factors.append("Elevated risk language in filings/transcripts")

    if "margin expansion" in combined_text.lower() or "margin" in combined_text.lower() and "improved" in combined_text.lower():
        score += 0.1
        factors.append("Margin expansion commentary present")

    score = max(-1.0, min(1.0, score))
    conf = 0.5 + 0.3 * abs(tone) + 0.1 * min(len(results), 3) / 3
    conf = round(min(0.9, max(0.35, conf)), 2)

    signal = label_from_score(score, conf)

    top_titles = ", ".join(r["title"][:40] for r in results[:2])
    reasoning = (
        f"RAG-grounded fundamental view for {ticker}. Retrieved {len(results)} document(s): {top_titles}. "
        f"Tone score {tone:+.2f}. Composite fundamental score {score:+.2f}. "
        f"Key observations: {'; '.join(factors) if factors else 'mixed fundamental signals from corpus'}. "
        f"All claims attributed to retrieved SEBI/earnings sources visible in citations."
    )

    return AgentOutput(
        agent_name="FundamentalRAGAgent",
        role="Retrieves regulatory filings & earnings transcripts via semantic search and grounds fundamental view with attribution",
        signal=signal,
        confidence=conf,
        score=round(score, 3),
        reasoning=reasoning,
        key_factors=factors or ["Corpus tone analysis"],
        citations=citations,
        metrics={
            "docs_retrieved": len(results),
            "avg_retrieval_score": round(sum(r["score"] for r in results) / len(results), 3),
            "tone": round(tone, 3),
            "growth_mentions": growth_vals[:3],
        },
        latency_ms=round((time.time() - t0) * 1000, 1),
        degraded=False,
    )
