"""User behavioral profiling – risk preference, portfolio, interaction history."""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import json
from pathlib import Path

PROFILES_PATH = Path(__file__).parent.parent / "data" / "user_profiles.json"


@dataclass
class UserProfile:
    user_id: str
    name: str
    risk_tolerance: str  # "conservative" | "moderate" | "aggressive"
    investment_horizon: str  # "short" | "medium" | "long"
    max_position_pct: float  # max single stock % of portfolio
    preferred_sectors: List[str] = field(default_factory=list)
    avoid_sectors: List[str] = field(default_factory=list)
    holdings: Dict[str, float] = field(default_factory=dict)  # ticker -> qty or value weight
    watchlist: List[str] = field(default_factory=list)
    behavioral_flags: List[str] = field(default_factory=list)  # e.g. "fomo_prone", "loss_averse"
    past_decisions: List[Dict[str, Any]] = field(default_factory=list)

    def risk_multiplier(self) -> float:
        """How much to dampen or amplify signal strength."""
        return {"conservative": 0.6, "moderate": 1.0, "aggressive": 1.35}.get(self.risk_tolerance, 1.0)

    def position_size_hint(self, signal_strength: float) -> float:
        base = self.max_position_pct
        return min(base * (0.5 + 0.5 * abs(signal_strength)), self.max_position_pct)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "UserProfile":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


DEFAULT_PROFILES = {
    "conservative_riya": UserProfile(
        user_id="conservative_riya",
        name="Riya (Conservative)",
        risk_tolerance="conservative",
        investment_horizon="long",
        max_position_pct=8.0,
        preferred_sectors=["Banking", "IT", "FMCG"],
        avoid_sectors=["High Beta Midcap", "F&O"],
        holdings={"HDFCBANK.NS": 35.0, "TCS.NS": 25.0, "RELIANCE.NS": 15.0},
        watchlist=["HDFCBANK.NS", "TCS.NS", "INFY.NS", "RELIANCE.NS"],
        behavioral_flags=["loss_averse", "prefers_dividends"],
    ),
    "aggressive_arjun": UserProfile(
        user_id="aggressive_arjun",
        name="Arjun (Aggressive)",
        risk_tolerance="aggressive",
        investment_horizon="short",
        max_position_pct=20.0,
        preferred_sectors=["IT", "New Energy", "Midcap"],
        avoid_sectors=[],
        holdings={"RELIANCE.NS": 40.0, "INFY.NS": 20.0},
        watchlist=["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"],
        behavioral_flags=["fomo_prone", "momentum_chaser"],
    ),
    "moderate_priya": UserProfile(
        user_id="moderate_priya",
        name="Priya (Moderate)",
        risk_tolerance="moderate",
        investment_horizon="medium",
        max_position_pct=12.0,
        preferred_sectors=["Banking", "IT"],
        holdings={"HDFCBANK.NS": 20.0, "RELIANCE.NS": 20.0, "TCS.NS": 15.0},
        watchlist=["HDFCBANK.NS", "RELIANCE.NS", "TCS.NS", "INFY.NS"],
        behavioral_flags=["balanced"],
    ),
}


def load_profiles() -> Dict[str, UserProfile]:
    if PROFILES_PATH.exists():
        try:
            data = json.loads(PROFILES_PATH.read_text())
            return {k: UserProfile.from_dict(v) for k, v in data.items()}
        except Exception:
            pass
    return DEFAULT_PROFILES.copy()


def save_profiles(profiles: Dict[str, UserProfile]):
    PROFILES_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {k: v.to_dict() for k, v in profiles.items()}
    PROFILES_PATH.write_text(json.dumps(data, indent=2))


def get_profile(user_id: str) -> UserProfile:
    profiles = load_profiles()
    return profiles.get(user_id, DEFAULT_PROFILES["moderate_priya"])
