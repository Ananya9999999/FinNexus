"""FinNexus multi-agent orchestrator — parallel dispatch + Chair synthesis."""

from __future__ import annotations
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

from core.market_data import fetch_market_snapshot, MarketSnapshot
from core.user_profile import UserProfile, get_profile
from agents.technical import run_technical_agent
from agents.flow import run_flow_agent
from agents.fundamental_rag import run_fundamental_rag_agent
from agents.sentiment import run_sentiment_agent
from agents.risk_behavior import run_risk_behavior_agent
from agents.synthesizer import synthesize
from agents.base import AgentOutput, SignalLabel

LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def run_pipeline(
    ticker: str,
    user_id: str = "priya",
    force_degraded: bool = False,
) -> Dict[str, Any]:
    session_id = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    t_start = time.time()
    profile = get_profile(user_id)

    if force_degraded:
        from core.market_data import _synthetic_snapshot
        clean = ticker if ticker.endswith((".NS", ".BO")) else ticker + ".NS"
        snapshot = _synthetic_snapshot(clean, reason="forced degraded demo")
    else:
        snapshot = fetch_market_snapshot(ticker)

    # Five specialized agents in parallel
    agent_fns = [
        ("Momentum", lambda: run_technical_agent(snapshot)),
        ("Flow", lambda: run_flow_agent(snapshot)),
        ("Filing", lambda: run_fundamental_rag_agent(snapshot)),
        ("Sentiment", lambda: run_sentiment_agent(snapshot)),
        ("RiskBehavior", lambda: run_risk_behavior_agent(snapshot, profile)),
    ]

    agent_outputs: List[AgentOutput] = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(fn): name for name, fn in agent_fns}
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                out = fut.result(timeout=12)
                # Normalize display names
                rename = {
                    "TechnicalSignalAgent": "MomentumAgent",
                    "FlowAgent": "FlowAgent",
                    "FundamentalRAGAgent": "FilingAgent",
                    "SentimentMacroAgent": "SentimentAgent",
                    "RiskBehaviorAgent": "RiskBehaviorAgent",
                }
                out.agent_name = rename.get(out.agent_name, out.agent_name)
                agent_outputs.append(out)
            except Exception as e:
                agent_outputs.append(AgentOutput(
                    agent_name=name + "Agent",
                    role="failed",
                    signal=SignalLabel.HOLD,
                    confidence=0.1,
                    score=0.0,
                    reasoning=f"Agent failed: {type(e).__name__}",
                    degraded=True,
                    error=str(e),
                    latency_ms=0,
                ))

    order = {
        "MomentumAgent": 0, "FlowAgent": 1, "FilingAgent": 2,
        "SentimentAgent": 3, "RiskBehaviorAgent": 4,
    }
    agent_outputs.sort(key=lambda a: order.get(a.agent_name, 99))

    synthesis = synthesize(agent_outputs, snapshot, profile)
    total_latency = round((time.time() - t_start) * 1000, 1)

    metrics = {
        "session_id": session_id,
        "ticker": snapshot.ticker,
        "user_id": user_id,
        "total_latency_ms": total_latency,
        "agent_latencies_ms": {a.agent_name: a.latency_ms for a in agent_outputs},
        "data_quality": snapshot.data_quality,
        "num_agents_succeeded": sum(1 for a in agent_outputs if not a.error),
        "signal_agreement": synthesis.get("agreement", 0),
        "portfolio_risk_concentration": profile.concentration_hhi(),
        "final_confidence": synthesis["confidence"],
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

    try:
        log_path = LOG_DIR / f"{session_id}_{snapshot.ticker.replace('.', '_')}.json"
        log_path.write_text(json.dumps(result, indent=2, default=str))
    except Exception:
        pass

    try:
        from core.user_profile import add_decision_to_history
        add_decision_to_history(user_id, {
            "session_id": session_id,
            "ticker": snapshot.ticker,
            "signal": synthesis["final_signal"],
            "confidence": synthesis["confidence"],
            "score": synthesis["score"],
            "recommendation": synthesis.get("recommendation", "")[:200],
        })
    except Exception:
        pass

    return result


def demo_degraded_scenario(ticker: str = "RELIANCE.NS", user_id: str = "priya") -> Dict[str, Any]:
    return run_pipeline(ticker, user_id=user_id, force_degraded=True)
