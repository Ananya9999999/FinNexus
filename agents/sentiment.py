"""Sentiment & Macro Context Agent – market regime + simulated behavioral/news signals."""

from __future__ import annotations
import time
from typing import Dict, Any
from agents.base import AgentOutput, SignalLabel, label_from_score
from core.market_data import MarketSnapshot
from core.vector_store import get_store


def run_sentiment_agent(snapshot: MarketSnapshot) -> AgentOutput:
    t0 = time.time()
    store = get_store()
    ticker = snapshot.ticker.replace(".NS", "").replace(".BO", "")

    # Retrieve macro / sector context
    macro_docs = store.search(
        f"market outlook sector risks FII retail F&O SEBI {ticker}",
        top_k=2,
        ticker_filter="MACRO"
    )

    # Simple market regime from technicals (as proxy for broader sentiment)
    regime_score = 0.0
    factors = []

    # Breadth proxy from single name (demo)
    if snapshot.momentum_20d > 3 and snapshot.rsi_14 < 65:
        regime_score += 0.3
        factors.append("Constructive intermediate trend with non-overbought RSI")
    elif snapshot.momentum_20d < -3:
        regime_score -= 0.3
        factors.append("Negative intermediate momentum regime")

    # Volume confirmation as sentiment proxy
    if snapshot.volume_zscore > 1.2 and snapshot.change_pct > 0:
        regime_score += 0.2
        factors.append("Positive price action on elevated volume (bullish participation)")
    elif snapshot.volume_zscore > 1.2 and snapshot.change_pct < 0:
        regime_score -= 0.25
        factors.append("Selling on high volume (bearish participation)")

    # Macro document tone
    macro_tone = 0.0
    citations = []
    for d in macro_docs:
        citations.append({
            "source": f"{d['title']} ({d['date']})",
            "snippet": d["snippet"][:250]
        })
        text = d.get("full_content", "").lower()
        if "record" in text or "positive" in text or "recovery" in text:
            macro_tone += 0.15
        if "89%" in text or "lose money" in text or "risk" in text and "retail" in text:
            macro_tone -= 0.1
            factors.append("SEBI data highlights high retail F&O loss rate – caution for leveraged positions")
        if "elevated valuations" in text or "midcap" in text:
            factors.append("Macro note flags elevated midcap valuations; prefer quality largecaps")

    score = max(-1.0, min(1.0, regime_score + macro_tone))
    conf = 0.5 + 0.2 * abs(score) + (0.1 if macro_docs else 0)
    if snapshot.data_quality == "degraded":
        conf *= 0.7
    conf = round(min(0.85, max(0.3, conf)), 2)

    signal = label_from_score(score, conf)

    reasoning = (
        f"Sentiment & macro context for {snapshot.ticker}. "
        f"Regime score derived from price/volume participation and retrieved macro notes. "
        f"Composite sentiment score {score:+.2f}. "
        f"Factors: {'; '.join(factors) if factors else 'neutral market tone'}. "
        f"{'Macro documents retrieved and cited.' if citations else 'Limited macro context available.'}"
    )

    return AgentOutput(
        agent_name="SentimentMacroAgent",
        role="Assesses market regime, participation signals, and macro/regulatory context",
        signal=signal,
        confidence=conf,
        score=round(score, 3),
        reasoning=reasoning,
        key_factors=factors[:5],
        citations=citations,
        metrics={
            "regime_score": round(regime_score, 3),
            "macro_docs": len(macro_docs),
            "volume_participation": snapshot.volume_zscore,
        },
        latency_ms=round((time.time() - t0) * 1000, 1),
        degraded=snapshot.data_quality == "degraded",
    )
