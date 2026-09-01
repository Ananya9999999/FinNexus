"""Portfolio Impact Simulator – what happens if user follows the recommendation."""

from __future__ import annotations
from typing import Dict, Any, List
from core.user_profile import UserProfile
from core.market_data import MarketSnapshot


def simulate_impact(
    profile: UserProfile,
    snapshot: MarketSnapshot,
    final_signal: str,
    position_hint_pct: float,
    confidence: float,
) -> Dict[str, Any]:
    """Estimate portfolio changes if recommendation is followed."""
    ticker = snapshot.ticker
    current_weight = profile.get_holding_weight(ticker)
    cash = profile.cash_pct
    total_equity = profile.total_equity_weight()
    hhi_before = profile.concentration_hhi()

    # Proposed new weight
    if "BUY" in final_signal:
        delta = min(position_hint_pct, cash * 0.8)  # can't spend more than available cash
        new_weight = current_weight + delta
        new_cash = max(0, cash - delta)
        action = f"Add ~{delta:.1f}% allocation"
    elif "SELL" in final_signal:
        delta = min(abs(position_hint_pct), current_weight)
        new_weight = max(0, current_weight - delta)
        new_cash = cash + delta
        action = f"Reduce by ~{delta:.1f}%"
    else:
        delta = 0.0
        new_weight = current_weight
        new_cash = cash
        action = "No change recommended"

    # Rough new HHI (simplified: replace this ticker's weight)
    other_weights = []
    for t, h in profile.holdings.items():
        if t != ticker and t != ticker.replace(".NS", ""):
            other_weights.append(float(h.get("weight_pct", 0)))
    all_new = other_weights + ([new_weight] if new_weight > 0 else [])
    total_new = sum(all_new) + 1e-9
    shares = [w / total_new for w in all_new]
    hhi_after = round(sum(s ** 2 for s in shares), 3) if shares else 0.0

    # Simple risk score (0-100, higher = riskier)
    risk_before = min(100, hhi_before * 80 + (100 - cash) * 0.3)
    risk_after = min(100, hhi_after * 80 + (100 - new_cash) * 0.3)

    # Diversification comment
    if hhi_after < hhi_before - 0.05:
        div_note = "Improves diversification"
    elif hhi_after > hhi_before + 0.05:
        div_note = "Increases concentration risk"
    else:
        div_note = "Neutral impact on concentration"

    return {
        "action": action,
        "current_weight_pct": round(current_weight, 1),
        "proposed_weight_pct": round(new_weight, 1),
        "delta_pct": round(new_weight - current_weight, 1),
        "cash_before": round(cash, 1),
        "cash_after": round(new_cash, 1),
        "hhi_before": hhi_before,
        "hhi_after": hhi_after,
        "risk_score_before": round(risk_before, 1),
        "risk_score_after": round(risk_after, 1),
        "diversification_note": div_note,
        "confidence_used": confidence,
        "max_position_limit": profile.max_position_pct,
        "within_limits": new_weight <= profile.max_position_pct + 0.5,
    }
