"""Multi-agent orchestrator – parallel dispatch + synthesis + logging."""

from __future__ import annotations
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from core.market_data import fetch_market_snapshot, MarketSnapshot
from core.user_profile import UserProfile, get_profile
from agents.technical import run_technical_agent
from agents.fundamental_rag import run_fundamental_rag_agent
from agents.sentiment import run_sentiment_agent
from agents.synthesizer import synthesize
from agents.base import AgentOutput

LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def run_pipeline(
    ticker: str,
    user_id: str = "moderate_priya",
    force_degraded: bool = False,
) -> Dict[str, Any]:
    """End-to-end: data → parallel agents → synthesis → metrics."""
    session_id = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    t_start = time.time()

    profile = get_profile(user_id)

    # 1. Market data (with optional forced degradation for demo)
    if force_degraded:
        from core.market_data import _synthetic_snapshot
        snapshot = _synthetic_snapshot(ticker if ticker.endswith(".NS") else ticker + ".NS", reason="forced degraded demo")
    else:
        snapshot = fetch_market_snapshot(ticker)

    # 2. Parallel agent execution (min 3 specialized agents)
    agent_fns = [
        ("technical", lambda: run_technical_agent(snapshot)),
        ("fundamental_rag", lambda: run_fundamental_rag_agent(snapshot)),
        ("sentiment", lambda: run_sentiment_agent(snapshot)),
    ]

    agent_outputs: List[AgentOutput] = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(fn): name for name, fn in agent_fns}
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                out = fut.result(timeout=15)
                agent_outputs.append(out)
            except Exception as e:
                # Graceful degradation: still produce a placeholder
                from agents.base import SignalLabel
                agent_outputs.append(AgentOutput(
                    agent_name=name,
                    role="failed",
                    signal=SignalLabel.HOLD,
                    confidence=0.1,
                    score=0.0,
                    reasoning=f"Agent failed: {type(e).__name__}: {e}",
                    degraded=True,
                    error=str(e),
                    latency_ms=0,
                ))

    # Ensure order roughly technical, fundamental, sentiment
    order = {"TechnicalSignalAgent": 0, "FundamentalRAGAgent": 1, "SentimentMacroAgent": 2}
    agent_outputs.sort(key=lambda a: order.get(a.agent_name, 99))

    # 3. Synthesis with user profile
    synthesis = synthesize(agent_outputs, snapshot, profile)

    total_latency = round((time.time() - t_start) * 1000, 1)

    # 4. Performance metrics (at least 3)
    metrics = {
        "session_id": session_id,
        "ticker": snapshot.ticker,
        "user_id": user_id,
        "total_latency_ms": total_latency,
        "agent_latencies_ms": {a.agent_name: a.latency_ms for a in agent_outputs},
        "data_quality": snapshot.data_quality,
        "num_agents_succeeded": sum(1 for a in agent_outputs if not a.error),
        "signal_agreement": synthesis.get("agreement", 0),
        "portfolio_risk_concentration": _concentration_score(profile),
        "final_confidence": synthesis["confidence"],
        # Proxy for "signal accuracy" – in real system would track forward returns; here we log the score magnitude as conviction proxy
        "conviction_score": abs(synthesis["score"]),
    }

    result = {
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ticker": snapshot.ticker,
        "market_snapshot": snapshot.to_dict(),
        "user_profile": {
            "user_id": profile.user_id,
            "name": profile.name,
            "risk_tolerance": profile.risk_tolerance,
            "holdings": profile.holdings,
            "behavioral_flags": profile.behavioral_flags,
        },
        "agent_outputs": [a.to_dict() for a in agent_outputs],
        "synthesis": synthesis,
        "metrics": metrics,
        "full_reasoning_chain_visible": True,
    }

    # Persist log
    log_path = LOG_DIR / f"{session_id}_{snapshot.ticker.replace('.', '_')}.json"
    try:
        log_path.write_text(json.dumps(result, indent=2, default=str))
    except Exception:
        pass

    return result


def _concentration_score(profile: UserProfile) -> float:
    """Simple Herfindahl-style concentration (0-1, higher = more concentrated)."""
    weights = list(profile.holdings.values())
    if not weights:
        return 0.0
    total = sum(weights) + 1e-9
    shares = [w / total for w in weights]
    hhi = sum(s ** 2 for s in shares)
    return round(hhi, 3)


def demo_degraded_scenario(ticker: str = "RELIANCE.NS", user_id: str = "moderate_priya") -> Dict[str, Any]:
    """Explicit degraded-data demo path required by PS."""
    return run_pipeline(ticker, user_id=user_id, force_degraded=True)
