"""Synthesis layer – fuses parallel agent outputs + user profile into personalized recommendation."""

from __future__ import annotations
import time
from typing import List, Dict, Any
from agents.base import AgentOutput, SignalLabel, label_from_score
from core.user_profile import UserProfile
from core.market_data import MarketSnapshot


def synthesize(
    agent_outputs: List[AgentOutput],
    snapshot: MarketSnapshot,
    profile: UserProfile,
) -> Dict[str, Any]:
    t0 = time.time()

    # Filter successful agents
    valid = [a for a in agent_outputs if a.error is None]
    if not valid:
        return {
            "final_signal": SignalLabel.HOLD.value,
            "confidence": 0.2,
            "score": 0.0,
            "recommendation": "Insufficient agent outputs – HOLD. System in degraded mode.",
            "personalized_note": "No reliable signals available.",
            "position_hint_pct": 0.0,
            "agent_weights": {},
            "reasoning_chain": ["All agents failed or returned errors."],
            "risk_adjustment": "N/A",
            "latency_ms": round((time.time() - t0) * 1000, 1),
            "degraded": True,
        }

    # Base weighted score (confidence-weighted)
    total_w = sum(a.confidence for a in valid) + 1e-9
    base_score = sum(a.score * a.confidence for a in valid) / total_w

    # User risk adjustment
    risk_mult = profile.risk_multiplier()
    # Conservative users get dampened scores (closer to 0) and higher bar for BUY
    if profile.risk_tolerance == "conservative":
        adj_score = base_score * 0.7  # shrink magnitude
        # Extra penalty if high volatility proxy
        if abs(snapshot.momentum_5d) > 3 or snapshot.volume_zscore > 1.8:
            adj_score *= 0.8
            risk_note = "Volatility dampening applied for conservative profile"
        else:
            risk_note = "Conservative risk multiplier applied (signals attenuated)"
    elif profile.risk_tolerance == "aggressive":
        adj_score = base_score * 1.15
        risk_note = "Aggressive profile – signals amplified modestly"
    else:
        adj_score = base_score
        risk_note = "Moderate profile – neutral weighting"

    adj_score = max(-1.0, min(1.0, adj_score))

    # Behavioral flags
    behavioral_notes = []
    if "fomo_prone" in profile.behavioral_flags and adj_score > 0.4:
        adj_score *= 0.85
        behavioral_notes.append("FOMO-prone flag: slightly reduced conviction to avoid chase")
    if "loss_averse" in profile.behavioral_flags and adj_score < -0.3:
        # Loss averse may hold longer; soften SELL
        adj_score *= 0.75
        behavioral_notes.append("Loss-averse flag: SELL signal softened")

    # Portfolio concentration check
    current_weight = profile.get_holding_weight(snapshot.ticker)
    concentration_warning = ""
    if current_weight > profile.max_position_pct * 0.8 and adj_score > 0:
        adj_score *= 0.7
        concentration_warning = f"Already {current_weight:.0f}% of portfolio (near max {profile.max_position_pct}%) – reduced BUY size"
        behavioral_notes.append(concentration_warning)

    conf = sum(a.confidence for a in valid) / len(valid)
    # Boost conf if agents agree
    signs = [1 if a.score > 0.15 else (-1 if a.score < -0.15 else 0) for a in valid]
    agreement = abs(sum(signs)) / len(signs) if signs else 0
    conf = min(0.92, conf * (0.85 + 0.15 * agreement))
    conf = round(conf, 2)

    final_signal = label_from_score(adj_score, conf)

    # Position size hint
    pos_hint = profile.position_size_hint(adj_score) if final_signal in (SignalLabel.BUY, SignalLabel.STRONG_BUY) else 0.0
    if final_signal in (SignalLabel.SELL, SignalLabel.STRONG_SELL) and current_weight > 0:
        pos_hint = -min(current_weight, profile.max_position_pct * 0.5)

    # Build reasoning chain (full transparency)
    chain = [
        f"1. Parallel agents executed: {[a.agent_name for a in agent_outputs]}",
        f"2. Valid outputs: {len(valid)}/{len(agent_outputs)}. Confidence-weighted base score = {base_score:+.3f}",
        f"3. User profile '{profile.name}' (risk={profile.risk_tolerance}, horizon={profile.investment_horizon}) applied → {risk_note}",
        f"4. Behavioral adjustments: {'; '.join(behavioral_notes) if behavioral_notes else 'none'}",
        f"5. Final adjusted score = {adj_score:+.3f} → {final_signal.value} (conf {conf})",
    ]
    for a in valid:
        chain.append(f"   • {a.agent_name}: {a.signal.value} (score {a.score:+.2f}, conf {a.confidence}) – {a.key_factors[0] if a.key_factors else a.reasoning[:80]}")

    # Personalized recommendation text
    action = {
        SignalLabel.STRONG_BUY: "Consider initiating or adding a high-conviction position",
        SignalLabel.BUY: "Favorable setup for a measured long allocation",
        SignalLabel.HOLD: "No strong edge – maintain current exposure or stay in cash",
        SignalLabel.SELL: "Consider reducing exposure",
        SignalLabel.STRONG_SELL: "Strong case to exit or significantly reduce",
    }[final_signal]

    rec = (
        f"For {profile.name}: {action} in {snapshot.ticker} at ~₹{snapshot.last_price}. "
        f"Personalized conviction {conf:.0%}. "
        f"{concentration_warning} "
        f"Suggested max position size relative to portfolio: {abs(pos_hint):.1f}%."
    )

    agent_weights = {a.agent_name: round(a.confidence / total_w, 3) for a in valid}

    return {
        "final_signal": final_signal.value,
        "confidence": conf,
        "score": round(adj_score, 3),
        "recommendation": rec,
        "personalized_note": f"Risk tolerance '{profile.risk_tolerance}' and flags {profile.behavioral_flags} materially shaped the output.",
        "position_hint_pct": round(pos_hint, 1),
        "agent_weights": agent_weights,
        "reasoning_chain": chain,
        "risk_adjustment": risk_note,
        "agreement": round(agreement, 2),
        "latency_ms": round((time.time() - t0) * 1000, 1),
        "degraded": any(a.degraded for a in agent_outputs) or len(valid) < len(agent_outputs),
        "current_holding_pct": current_weight,
    }
