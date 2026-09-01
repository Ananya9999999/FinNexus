"""
FinAgentVerse – Multi-Agent Autonomous Financial Intelligence System
HACKVERSE Sprint 1 | PS-01 Demo UI
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from pathlib import Path
import sys
import time

# Ensure package root on path
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from core.orchestrator import run_pipeline, demo_degraded_scenario
from core.user_profile import load_profiles, DEFAULT_PROFILES
from core.market_data import get_watchlist_snapshots

st.set_page_config(
    page_title="FinAgentVerse | Multi-Agent Retail Intelligence",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------- Styles ----------
st.markdown("""
<style>
    .signal-buy { color: #00c853; font-weight: 700; font-size: 1.4rem; }
    .signal-sell { color: #ff1744; font-weight: 700; font-size: 1.4rem; }
    .signal-hold { color: #ffab00; font-weight: 700; font-size: 1.4rem; }
    .metric-card { background: #1e1e2e; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; }
    .agent-box { border-left: 4px solid #7c4dff; padding-left: 1rem; margin: 0.8rem 0; }
    .citation { font-size: 0.85rem; color: #aaa; }
</style>
""", unsafe_allow_html=True)

# ---------- Sidebar ----------
st.sidebar.title("🧠 FinAgentVerse")
st.sidebar.caption("Multi-Agent Financial Intelligence for Retail Investors")
st.sidebar.markdown("---")

profiles = load_profiles()
profile_names = {uid: p.name for uid, p in profiles.items()}
selected_uid = st.sidebar.selectbox(
    "Investor Profile",
    options=list(profile_names.keys()),
    format_func=lambda x: profile_names[x],
    index=2,
)
profile = profiles[selected_uid]

st.sidebar.markdown(f"**Risk:** `{profile.risk_tolerance}`")
st.sidebar.markdown(f"**Horizon:** `{profile.investment_horizon}`")
st.sidebar.markdown(f"**Max position:** `{profile.max_position_pct}%`")
st.sidebar.markdown(f"**Flags:** {', '.join(profile.behavioral_flags) or '—'}")

st.sidebar.markdown("### Holdings")
if profile.holdings:
    for t, w in profile.holdings.items():
        st.sidebar.progress(min(w / 50, 1.0), text=f"{t}: {w:.0f}%")
else:
    st.sidebar.write("No holdings recorded")

st.sidebar.markdown("---")
ticker_input = st.sidebar.text_input("Ticker (NSE)", value="RELIANCE.NS")
run_btn = st.sidebar.button("🚀 Run Multi-Agent Analysis", type="primary", use_container_width=True)
degraded_btn = st.sidebar.button("⚠️ Demo Degraded Data Path", use_container_width=True)

st.sidebar.markdown("---")
st.sidebar.caption("Hackathon PS-01 · IEEE RAS VIT Chennai · 2026")

# ---------- Main ----------
st.title("FinAgentVerse")
st.markdown("**Multi-Agent Autonomous Financial Intelligence System for Retail Investors**")
st.markdown("Bridging the gap between raw market data and *explainable, personalized* decision intelligence.")

# Quick watchlist strip
wl = profile.watchlist or ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]
with st.spinner("Refreshing watchlist…"):
    snaps = get_watchlist_snapshots(wl[:4])

cols = st.columns(len(snaps))
for i, s in enumerate(snaps):
    with cols[i]:
        delta_color = "normal" if s.change_pct >= 0 else "inverse"
        st.metric(
            label=s.ticker.replace(".NS", ""),
            value=f"₹{s.last_price:,.1f}",
            delta=f"{s.change_pct:+.2f}%",
            delta_color=delta_color,
        )

st.markdown("---")

# ---------- Run Analysis ----------
if run_btn or degraded_btn or "last_result" in st.session_state:
    force_deg = degraded_btn
    if run_btn or degraded_btn:
        with st.spinner("Dispatching parallel agents… Technical · Fundamental-RAG · Sentiment-Macro"):
            result = run_pipeline(ticker_input, user_id=selected_uid, force_degraded=force_deg)
            st.session_state["last_result"] = result
    else:
        result = st.session_state["last_result"]

    snap = result["market_snapshot"]
    syn = result["synthesis"]
    agents = result["agent_outputs"]
    metrics = result["metrics"]

    # Header signal
    sig = syn["final_signal"]
    css_class = "signal-buy" if "BUY" in sig else ("signal-sell" if "SELL" in sig else "signal-hold")
    st.markdown(f"<div class='{css_class}'>{sig}  ·  Confidence {syn['confidence']:.0%}</div>", unsafe_allow_html=True)
    st.markdown(f"**{syn['recommendation']}**")
    st.caption(syn.get("personalized_note", ""))

    # KPI row
    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Adjusted Score", f"{syn['score']:+.2f}")
    k2.metric("Position Hint", f"{syn['position_hint_pct']:+.1f}%")
    k3.metric("Agent Agreement", f"{syn.get('agreement', 0):.0%}")
    k4.metric("Total Latency", f"{metrics['total_latency_ms']:.0f} ms")
    k5.metric("Data Quality", snap["data_quality"].upper())

    # Three agent columns
    st.subheader("Parallel Agent Outputs")
    a_cols = st.columns(3)
    for i, a in enumerate(agents):
        with a_cols[i % 3]:
            st.markdown(f"#### {a['agent_name']}")
            st.markdown(f"**{a['signal']}** (conf {a['confidence']:.0%}, score {a['score']:+.2f})")
            st.markdown(f"<div class='agent-box'>{a['reasoning']}</div>", unsafe_allow_html=True)
            if a.get("key_factors"):
                st.markdown("**Key factors**")
                for f in a["key_factors"][:4]:
                    st.markdown(f"- {f}")
            if a.get("citations"):
                st.markdown("**Citations / Attribution**")
                for c in a["citations"][:2]:
                    st.markdown(f"<div class='citation'>📎 {c['source']}<br/>{c['snippet'][:160]}…</div>", unsafe_allow_html=True)
            if a.get("degraded"):
                st.warning("Degraded mode")
            st.caption(f"Latency {a['latency_ms']} ms · Role: {a['role'][:60]}…")

    # Reasoning chain (full transparency)
    with st.expander("🔍 Full Reasoning Chain (visible to user & judges)", expanded=True):
        for step in syn.get("reasoning_chain", []):
            st.markdown(f"- {step}")

    # Metrics & Performance Log
    st.subheader("Session Performance Log")
    mcols = st.columns(4)
    mcols[0].metric("Agents Succeeded", f"{metrics['num_agents_succeeded']}/3")
    mcols[1].metric("Portfolio Concentration (HHI)", metrics["portfolio_risk_concentration"])
    mcols[2].metric("Conviction |score|", f"{metrics['conviction_score']:.2f}")
    mcols[3].metric("Final Confidence", f"{metrics['final_confidence']:.0%}")

    st.json({
        "session_id": result["session_id"],
        "metrics": metrics,
        "agent_weights": syn.get("agent_weights"),
        "risk_adjustment": syn.get("risk_adjustment"),
    })

    # Market snapshot detail
    with st.expander("Raw Market Snapshot"):
        st.json(snap)

else:
    st.info("Select an investor profile, enter a ticker (e.g. RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS), and click **Run Multi-Agent Analysis**.")
    st.markdown("""
    ### What this system demonstrates (PS-01 Minimum Requirements)
    | Requirement | Implementation |
    |-------------|----------------|
    | Signal classification ≥ 3 dimensions | Technical agent: momentum + volume anomaly + RSI/MACD |
    | RAG with attribution | FundamentalRAGAgent retrieves synthetic SEBI/earnings docs via FAISS + MiniLM |
    | ≥ 3 parallel specialized agents | Technical, Fundamental-RAG, Sentiment-Macro → Synthesis |
    | User profiling changes outputs | Conservative vs Aggressive profiles produce different position sizes & signal attenuation |
    | Live interface | Signals + agent traces + portfolio state + citations |
    | Performance log ≥ 3 metrics | Latency, agreement, concentration, conviction, data quality |
    | End-to-end demo + full chain | Visible reasoning chain + JSON session logs |
    | Degraded-data handling | Forced synthetic path + partial agent failure resilience |
    """)

# Footer
st.markdown("---")
st.caption("Architecture summary written for judges is in `docs/ARCHITECTURE.md`. Session logs stored under `logs/`.")
