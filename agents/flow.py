"""Flow Agent — Volume, delivery proxy, money-flow style signals."""

from __future__ import annotations
import time
from agents.base import AgentOutput, SignalLabel, label_from_score
from core.market_data import MarketSnapshot


def run_flow_agent(snapshot: MarketSnapshot) -> AgentOutput:
    t0 = time.time()
    degraded = snapshot.data_quality == "degraded"

    score = 0.0
    factors = []

    # Volume spike
    if snapshot.volume_zscore > 1.8:
        if snapshot.change_pct > 0.4:
            score += 0.4
            factors.append(f"Strong volume confirmation on up-move (z={snapshot.volume_zscore:.2f})")
        elif snapshot.change_pct < -0.4:
            score -= 0.35
            factors.append(f"High volume selling pressure (z={snapshot.volume_zscore:.2f})")
        else:
            factors.append(f"Elevated volume, direction mixed (z={snapshot.volume_zscore:.2f})")
    elif snapshot.volume_zscore < -1.0:
        score -= 0.1
        factors.append("Muted participation — low conviction tape")

    # Price vs volume divergence (retail trap heuristic)
    if snapshot.momentum_5d > 2.5 and snapshot.volume_zscore < 0.2:
        score -= 0.25
        factors.append("Price up on weak volume — possible retail trap / low-quality rally")
    if snapshot.momentum_5d < -2.5 and snapshot.volume_zscore < 0.2:
        score += 0.1
        factors.append("Down-move on light volume — less aggressive distribution")

    # 20d momentum as flow persistence proxy
    if snapshot.momentum_20d > 6:
        score += 0.2
        factors.append(f"Persistent 20d flow +{snapshot.momentum_20d:.1f}%")
    elif snapshot.momentum_20d < -6:
        score -= 0.2
        factors.append(f"Persistent 20d outflow {snapshot.momentum_20d:.1f}%")

    score = max(-1.0, min(1.0, score))
    conf = 0.5 + 0.25 * abs(score)
    if degraded:
        conf *= 0.65
    conf = round(min(0.88, max(0.3, conf)), 2)
    signal = label_from_score(score, conf)

    reasoning = (
        f"Flow analysis for {snapshot.ticker}. Volume z-score {snapshot.volume_zscore:.2f}, "
        f"5d/20d momentum {snapshot.momentum_5d:+.1f}% / {snapshot.momentum_20d:+.1f}%. "
        f"Composite flow score {score:+.2f}. "
        f"{' '.join(factors[:3]) if factors else 'Neutral participation.'}"
    )

    return AgentOutput(
        agent_name="FlowAgent",
        role="Volume spikes, participation, retail-trap detection, money-flow style signals",
        signal=signal,
        confidence=conf,
        score=round(score, 3),
        reasoning=reasoning,
        key_factors=factors[:5],
        citations=[{
            "source": f"Market tape ({snapshot.data_quality})",
            "snippet": f"VolZ={snapshot.volume_zscore}, Mom5={snapshot.momentum_5d}%, Mom20={snapshot.momentum_20d}%"
        }],
        metrics={"volume_zscore": snapshot.volume_zscore, "momentum_5d": snapshot.momentum_5d},
        latency_ms=round((time.time() - t0) * 1000, 1),
        degraded=degraded,
    )
