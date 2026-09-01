"""Risk & Behavior Agent — profile-aware guardrails."""

from __future__ import annotations
import time
from agents.base import AgentOutput, SignalLabel, label_from_score
from core.market_data import MarketSnapshot
from core.user_profile import UserProfile


def run_risk_behavior_agent(snapshot: MarketSnapshot, profile: UserProfile) -> AgentOutput:
    t0 = time.time()
    score = 0.0  # starts neutral; only adjusts for risk suitability
    factors = []
    conf = 0.7

    weight = profile.get_holding_weight(snapshot.ticker)
    max_pos = profile.max_position_pct

    # Concentration
    if weight > max_pos * 0.85:
        score -= 0.35
        factors.append(f"Already {weight:.0f}% of portfolio (near max {max_pos}%) — size risk elevated")
        conf += 0.05

    # Volatility vs risk tolerance
    vol_proxy = abs(snapshot.momentum_5d) + abs(snapshot.volume_zscore)
    if profile.risk_tolerance == "conservative" and vol_proxy > 4:
        score -= 0.3
        factors.append("High short-term volatility unsuitable for conservative profile")
    elif profile.risk_tolerance == "aggressive" and vol_proxy < 1.5:
        factors.append("Low volatility — limited edge for aggressive style")

    # Behavioral flags
    if "fomo_prone" in profile.behavioral_flags and snapshot.momentum_5d > 3 and snapshot.rsi_14 > 65:
        score -= 0.25
        factors.append("FOMO-prone flag + extended move — guardrail engaged")
    if "loss_averse" in profile.behavioral_flags and snapshot.momentum_5d < -3:
        score += 0.1  # soften panic sell
        factors.append("Loss-averse flag — avoiding forced selling into weakness")

    # F&O unsuitability heuristic
    if profile.risk_tolerance == "conservative" and abs(snapshot.momentum_5d) > 2.5:
        factors.append("Elevated move — F&O / leverage unsuitable for this profile")

    # Horizon mismatch
    if profile.investment_horizon == "long" and abs(snapshot.momentum_5d) > 4:
        factors.append("Short-term noise vs long horizon — de-emphasize tactical signal")

    if not factors:
        factors.append("No material risk or behavioral overrides")
        score = 0.05  # slight positive if clean

    score = max(-1.0, min(1.0, score))
    conf = round(min(0.9, max(0.4, conf)), 2)
    signal = label_from_score(score, conf)

    reasoning = (
        f"Risk & Behavior check for {profile.name} ({profile.risk_tolerance}, "
        f"horizon={profile.investment_horizon}). Current weight {weight:.1f}%. "
        f"Flags: {profile.behavioral_flags or 'none'}. Score {score:+.2f}. "
        f"{'; '.join(factors)}"
    )

    return AgentOutput(
        agent_name="RiskBehaviorAgent",
        role="Profile + portfolio guardrails: concentration, FOMO, F&O suitability, horizon fit",
        signal=signal,
        confidence=conf,
        score=round(score, 3),
        reasoning=reasoning,
        key_factors=factors[:5],
        citations=[{
            "source": "User profile & portfolio state",
            "snippet": f"risk={profile.risk_tolerance}, weight={weight}%, max={max_pos}%, flags={profile.behavioral_flags}"
        }],
        metrics={"current_weight": weight, "max_position": max_pos},
        latency_ms=round((time.time() - t0) * 1000, 1),
        degraded=False,
    )
