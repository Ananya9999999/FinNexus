"""User behavioral profiling + full portfolio management."""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import json
from pathlib import Path
from datetime import datetime

PROFILES_PATH = Path(__file__).parent.parent / "data" / "user_profiles.json"


@dataclass
class UserProfile:
    user_id: str
    name: str
    risk_tolerance: str = "moderate"       # conservative | moderate | aggressive
    investment_horizon: str = "medium"     # short | medium | long
    max_position_pct: float = 12.0
    preferred_sectors: List[str] = field(default_factory=list)
    avoid_sectors: List[str] = field(default_factory=list)
    holdings: Dict[str, Dict[str, float]] = field(default_factory=dict)  # ticker -> {qty, avg_price, weight_pct}
    watchlist: List[str] = field(default_factory=list)
    behavioral_flags: List[str] = field(default_factory=list)
    past_decisions: List[Dict[str, Any]] = field(default_factory=list)
    cash_pct: float = 10.0
    notes: str = ""

    def risk_multiplier(self) -> float:
        return {"conservative": 0.6, "moderate": 1.0, "aggressive": 1.35}.get(self.risk_tolerance, 1.0)

    def position_size_hint(self, signal_strength: float) -> float:
        base = self.max_position_pct
        return min(base * (0.5 + 0.5 * abs(signal_strength)), self.max_position_pct)

    def get_holding_weight(self, ticker: str) -> float:
        h = self.holdings.get(ticker) or self.holdings.get(ticker.replace(".NS", ""))
        if not h:
            return 0.0
        return float(h.get("weight_pct", 0.0))

    def total_equity_weight(self) -> float:
        return sum(float(h.get("weight_pct", 0)) for h in self.holdings.values())

    def concentration_hhi(self) -> float:
        weights = [float(h.get("weight_pct", 0)) for h in self.holdings.values()]
        total = sum(weights) + 1e-9
        shares = [w / total for w in weights]
        return round(sum(s ** 2 for s in shares), 3)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "UserProfile":
        holdings = d.get("holdings", {})
        new_holdings = {}
        for t, v in holdings.items():
            if isinstance(v, (int, float)):
                new_holdings[t] = {"quantity": 0.0, "avg_price": 0.0, "weight_pct": float(v)}
            else:
                new_holdings[t] = v
        d = {**d, "holdings": new_holdings}
        valid = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(**valid)

    def add_holding(self, ticker: str, quantity: float = 0, avg_price: float = 0, weight_pct: float = 0):
        ticker = ticker.upper().strip()
        if not ticker.endswith((".NS", ".BO")):
            ticker = ticker + ".NS"
        self.holdings[ticker] = {
            "quantity": float(quantity),
            "avg_price": float(avg_price),
            "weight_pct": float(weight_pct),
        }
        if ticker not in self.watchlist:
            self.watchlist.append(ticker)

    def remove_holding(self, ticker: str):
        ticker = ticker.upper()
        keys = [ticker, ticker.replace(".NS", ""), ticker + ".NS"]
        for k in keys:
            self.holdings.pop(k, None)


DEFAULT_PROFILES = {
    "riya": UserProfile(
        user_id="riya",
        name="Riya Sharma",
        risk_tolerance="conservative",
        investment_horizon="long",
        max_position_pct=8.0,
        preferred_sectors=["Banking", "IT", "FMCG"],
        avoid_sectors=["High Beta Midcap", "F&O"],
        holdings={
            "HDFCBANK.NS": {"quantity": 50, "avg_price": 1650, "weight_pct": 35.0},
            "TCS.NS": {"quantity": 20, "avg_price": 3800, "weight_pct": 25.0},
            "RELIANCE.NS": {"quantity": 15, "avg_price": 2800, "weight_pct": 15.0},
        },
        watchlist=["HDFCBANK.NS", "TCS.NS", "INFY.NS", "RELIANCE.NS"],
        behavioral_flags=["loss_averse", "prefers_dividends"],
        cash_pct=25.0,
    ),
    "arjun": UserProfile(
        user_id="arjun",
        name="Arjun Mehta",
        risk_tolerance="aggressive",
        investment_horizon="short",
        max_position_pct=20.0,
        preferred_sectors=["IT", "New Energy", "Midcap"],
        holdings={
            "RELIANCE.NS": {"quantity": 40, "avg_price": 2700, "weight_pct": 40.0},
            "INFY.NS": {"quantity": 30, "avg_price": 1700, "weight_pct": 20.0},
        },
        watchlist=["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"],
        behavioral_flags=["fomo_prone", "momentum_chaser"],
        cash_pct=5.0,
    ),
    "priya": UserProfile(
        user_id="priya",
        name="Priya Nair",
        risk_tolerance="moderate",
        investment_horizon="medium",
        max_position_pct=12.0,
        preferred_sectors=["Banking", "IT"],
        holdings={
            "HDFCBANK.NS": {"quantity": 25, "avg_price": 1600, "weight_pct": 20.0},
            "RELIANCE.NS": {"quantity": 20, "avg_price": 2750, "weight_pct": 20.0},
            "TCS.NS": {"quantity": 10, "avg_price": 3900, "weight_pct": 15.0},
        },
        watchlist=["HDFCBANK.NS", "RELIANCE.NS", "TCS.NS", "INFY.NS"],
        behavioral_flags=["balanced"],
        cash_pct=15.0,
    ),
    "judge": UserProfile(
        user_id="judge",
        name="Hackathon Judge",
        risk_tolerance="moderate",
        investment_horizon="medium",
        max_position_pct=15.0,
        holdings={},
        watchlist=["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
        behavioral_flags=[],
        cash_pct=100.0,
    ),
}


def load_profiles() -> Dict[str, UserProfile]:
    if PROFILES_PATH.exists():
        try:
            data = json.loads(PROFILES_PATH.read_text())
            return {k: UserProfile.from_dict(v) for k, v in data.items()}
        except Exception:
            pass
    return {k: v for k, v in DEFAULT_PROFILES.items()}


def save_profiles(profiles: Dict[str, UserProfile]):
    PROFILES_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {k: v.to_dict() for k, v in profiles.items()}
    PROFILES_PATH.write_text(json.dumps(data, indent=2))


def get_profile(user_id: str) -> UserProfile:
    profiles = load_profiles()
    if user_id in profiles:
        return profiles[user_id]
    p = UserProfile(user_id=user_id, name=user_id.title(), cash_pct=100.0)
    profiles[user_id] = p
    save_profiles(profiles)
    return p


def update_profile(profile: UserProfile):
    profiles = load_profiles()
    profiles[profile.user_id] = profile
    save_profiles(profiles)


def add_decision_to_history(user_id: str, decision: Dict[str, Any]):
    profiles = load_profiles()
    p = profiles.get(user_id) or get_profile(user_id)
    decision["timestamp"] = datetime.utcnow().isoformat() + "Z"
    p.past_decisions.insert(0, decision)
    p.past_decisions = p.past_decisions[:30]
    profiles[user_id] = p
    save_profiles(profiles)
