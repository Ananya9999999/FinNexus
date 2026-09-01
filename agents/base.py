"""Base agent contracts and shared types."""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Literal
from enum import Enum
import time


class SignalLabel(str, Enum):
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"


@dataclass
class AgentOutput:
    agent_name: str
    role: str
    signal: SignalLabel
    confidence: float  # 0-1
    score: float  # -1 to +1 (bearish to bullish)
    reasoning: str
    key_factors: List[str] = field(default_factory=list)
    citations: List[Dict[str, str]] = field(default_factory=list)  # {source, snippet}
    metrics: Dict[str, Any] = field(default_factory=dict)
    latency_ms: float = 0.0
    degraded: bool = False
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["signal"] = self.signal.value
        return d


def label_from_score(score: float, conf: float) -> SignalLabel:
    if conf < 0.35:
        return SignalLabel.HOLD
    if score >= 0.55:
        return SignalLabel.STRONG_BUY if score >= 0.75 else SignalLabel.BUY
    if score <= -0.55:
        return SignalLabel.STRONG_SELL if score <= -0.75 else SignalLabel.SELL
    return SignalLabel.HOLD
