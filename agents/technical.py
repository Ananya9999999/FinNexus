"""Technical Signal Agent – price momentum, volume anomaly, RSI/MACD dimensions."""

from __future__ import annotations
import time
from typing import Dict, Any
from agents.base import AgentOutput, SignalLabel, label_from_score
from core.market_data import MarketSnapshot


def run_technical_agent(snapshot: MarketSnapshot) -> AgentOutput:
    t0 = time.time()
    degraded = snapshot.data_quality == "degraded"

    # Dimension 1: Price Momentum (5d + 20d)
    mom_score = 0.0
    mom_factors = []
    if snapshot.momentum_5d > 2.0:
        mom_score += 0.35
        mom_factors.append(f"Strong 5d momentum +{snapshot.momentum_5d:.1f}%")
    elif snapshot.momentum_5d > 0.5:
        mom_score += 0.15
        mom_factors.append(f"Positive 5d momentum +{snapshot.momentum_5d:.1f}%")
    elif snapshot.momentum_5d < -2.0:
        mom_score -= 0.35
        mom_factors.append(f"Weak 5d momentum {snapshot.momentum_5d:.1f}%")
    elif snapshot.momentum_5d < -0.5:
        mom_score -= 0.15
        mom_factors.append(f"Negative 5d momentum {snapshot.momentum_5d:.1f}%")

    if snapshot.momentum_20d > 5.0:
        mom_score += 0.25
        mom_factors.append(f"Strong 20d trend +{snapshot.momentum_20d:.1f}%")
    elif snapshot.momentum_20d < -5.0:
        mom_score -= 0.25
        mom_factors.append(f"Weak 20d trend {snapshot.momentum_20d:.1f}%")

    # Dimension 2: Volume Anomaly
    vol_score = 0.0
    vol_factors = []
    if snapshot.volume_zscore > 1.5:
        vol_score += 0.3 if snapshot.change_pct > 0 else -0.2
        vol_factors.append(f"Volume spike z={snapshot.volume_zscore:.2f} (confirming move)" if snapshot.change_pct > 0 else f"High volume on down day z={snapshot.volume_zscore:.2f}")
    elif snapshot.volume_zscore < -1.0:
        vol_score -= 0.1
        vol_factors.append(f"Below-average volume z={snapshot.volume_zscore:.2f}")

    # Dimension 3: Mean-reversion / Overbought-Oversold (RSI + MACD)
    osc_score = 0.0
    osc_factors = []
    if snapshot.rsi_14 > 70:
        osc_score -= 0.35
        osc_factors.append(f"RSI overbought at {snapshot.rsi_14:.0f}")
    elif snapshot.rsi_14 > 60:
        osc_score -= 0.1
        osc_factors.append(f"RSI elevated {snapshot.rsi_14:.0f}")
    elif snapshot.rsi_14 < 30:
        osc_score += 0.35
        osc_factors.append(f"RSI oversold at {snapshot.rsi_14:.0f}")
    elif snapshot.rsi_14 < 40:
        osc_score += 0.15
        osc_factors.append(f"RSI low {snapshot.rsi_14:.0f}")

    if snapshot.macd_hist > 1.0:
        osc_score += 0.15
        osc_factors.append(f"MACD histogram positive {snapshot.macd_hist:.2f}")
    elif snapshot.macd_hist < -1.0:
        osc_score -= 0.15
        osc_factors.append(f"MACD histogram negative {snapshot.macd_hist:.2f}")

    # Trend vs SMA
    trend_score = 0.0
    if snapshot.last_price > snapshot.sma_20 > snapshot.sma_50:
        trend_score += 0.2
        mom_factors.append("Price > SMA20 > SMA50 (uptrend structure)")
    elif snapshot.last_price < snapshot.sma_20 < snapshot.sma_50:
        trend_score -= 0.2
        mom_factors.append("Price < SMA20 < SMA50 (downtrend structure)")

    raw_score = mom_score + vol_score + osc_score + trend_score
    # Clamp
    score = max(-1.0, min(1.0, raw_score))

    # Confidence based on data quality and signal clarity
    conf = 0.55 + 0.25 * abs(score)
    if degraded:
        conf *= 0.65
    if abs(snapshot.volume_zscore) > 2.0:
        conf = min(0.92, conf + 0.08)
    conf = round(min(0.95, max(0.25, conf)), 2)

    signal = label_from_score(score, conf)

    all_factors = mom_factors + vol_factors + osc_factors
    reasoning = (
        f"Technical analysis of {snapshot.ticker} (as of {snapshot.as_of}, quality={snapshot.data_quality}). "
        f"Composite technical score {score:+.2f}. "
        f"Key drivers: {'; '.join(all_factors[:5]) if all_factors else 'mixed/neutral indicators'}. "
        f"Price ₹{snapshot.last_price} ({snapshot.change_pct:+.2f}%). "
        f"{'Note: using degraded/synthetic data – treat with lower confidence.' if degraded else ''}"
    )

    return AgentOutput(
        agent_name="TechnicalSignalAgent",
        role="Evaluates price momentum, volume anomalies, and oscillator extremes across three independent dimensions",
        signal=signal,
        confidence=conf,
        score=round(score, 3),
        reasoning=reasoning.strip(),
        key_factors=all_factors[:6],
        citations=[{
            "source": f"Market data feed ({snapshot.data_quality})",
            "snippet": f"Last ₹{snapshot.last_price}, RSI={snapshot.rsi_14}, VolZ={snapshot.volume_zscore}, Mom5d={snapshot.momentum_5d}%"
        }],
        metrics={
            "rsi_14": snapshot.rsi_14,
            "momentum_5d": snapshot.momentum_5d,
            "momentum_20d": snapshot.momentum_20d,
            "volume_zscore": snapshot.volume_zscore,
            "macd_hist": snapshot.macd_hist,
            "dimensions_evaluated": 3,
        },
        latency_ms=round((time.time() - t0) * 1000, 1),
        degraded=degraded,
    )
