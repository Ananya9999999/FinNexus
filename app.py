"""
FinAgentVerse — Premium Multi-Agent Financial Intelligence
HACKVERSE 2026 | Sleek UI + Motion + Feature-rich
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import sys
import time
import requests
from datetime import datetime

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from core.auth import authenticate, register_user, list_demo_accounts
from core.orchestrator import run_pipeline
from core.user_profile import get_profile, update_profile, UserProfile
from core.market_data import get_watchlist_snapshots, MarketSnapshot
from core.portfolio_impact import simulate_impact
from core.pdf_export import export_research_memo

st.set_page_config(
    page_title="FinAgentVerse",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

.stApp {
    background: linear-gradient(160deg, #0a0a0f 0%, #12121a 40%, #0d1117 100%);
    color: #e6edf3;
}

#MainMenu, footer, header {visibility: hidden;}
.stDeployButton {display: none;}

section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d0d14 0%, #111118 100%);
    border-right: 1px solid rgba(124, 77, 255, 0.15);
}
section[data-testid="stSidebar"] * {color: #c9d1d9 !important;}

.glass {
    background: rgba(22, 27, 34, 0.7);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(124, 77, 255, 0.18);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.glass:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(124, 77, 255, 0.12);
}

.badge-buy {
    display: inline-block;
    background: linear-gradient(135deg, #00c853, #00e676);
    color: #000; font-weight: 800; font-size: 1.6rem;
    padding: 0.4rem 1.4rem; border-radius: 12px;
    animation: pulse-green 2s infinite;
}
.badge-sell {
    display: inline-block;
    background: linear-gradient(135deg, #ff1744, #ff5252);
    color: #fff; font-weight: 800; font-size: 1.6rem;
    padding: 0.4rem 1.4rem; border-radius: 12px;
    animation: pulse-red 2s infinite;
}
.badge-hold {
    display: inline-block;
    background: linear-gradient(135deg, #ffab00, #ffd740);
    color: #000; font-weight: 800; font-size: 1.6rem;
    padding: 0.4rem 1.4rem; border-radius: 12px;
}

@keyframes pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.4); }
    50% { box-shadow: 0 0 0 12px rgba(0, 200, 83, 0); }
}
@keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.4); }
    50% { box-shadow: 0 0 0 12px rgba(255, 23, 68, 0); }
}

.agent-card {
    background: rgba(30, 30, 46, 0.8);
    border-radius: 14px;
    border-left: 4px solid #7c4dff;
    padding: 1rem 1.2rem;
    height: 100%;
    transition: all 0.3s ease;
}
.agent-card:hover {
    border-left-color: #b388ff;
    background: rgba(40, 40, 60, 0.9);
}
.agent-conflict {
    border-left-color: #ff6f00 !important;
    background: rgba(62, 39, 35, 0.5) !important;
}

div[data-testid="stMetric"] {
    background: rgba(22, 27, 34, 0.6);
    border: 1px solid rgba(124, 77, 255, 0.12);
    border-radius: 12px;
    padding: 0.8rem 1rem;
}
div[data-testid="stMetricValue"] {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
}

.stButton > button {
    border-radius: 10px;
    font-weight: 600;
    transition: all 0.2s ease;
    border: none;
}
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #7c4dff, #536dfe);
    color: white;
}
.stButton > button[kind="primary"]:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(124, 77, 255, 0.4);
}

.logo {
    font-size: 1.8rem;
    font-weight: 800;
    background: linear-gradient(135deg, #7c4dff, #00e5ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.citation {
    font-size: 0.8rem;
    color: #8b949e;
    border-left: 2px solid #30363d;
    padding-left: 0.6rem;
    margin: 0.3rem 0;
}

.hero { text-align: center; padding: 3rem 1rem 2rem; }
.hero h1 {
    font-size: 3.2rem; font-weight: 800;
    background: linear-gradient(135deg, #fff 0%, #7c4dff 50%, #00e5ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
}
.hero p { font-size: 1.15rem; color: #8b949e; max-width: 560px; margin: 0 auto; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0d1117; }
::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
</style>
""", unsafe_allow_html=True)


def login_page():
    st.markdown("""
    <div class="hero">
        <h1>FinAgentVerse</h1>
        <p>Multi-Agent Autonomous Financial Intelligence for Retail Investors.<br>
        Institutional-grade research. Personalised. Explainable. In under 60 seconds.</p>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.4, 1])
    with col2:
        tab_login, tab_reg = st.tabs(["Login", "Create Account"])
        with tab_login:
            username = st.text_input("Username", placeholder="riya")
            password = st.text_input("Password", type="password", placeholder="••••••••")
            if st.button("Enter FinAgentVerse", type="primary", use_container_width=True):
                user = authenticate(username, password)
                if user:
                    st.session_state["user"] = user
                    st.balloons()
                    time.sleep(0.5)
                    st.rerun()
                else:
                    st.error("Invalid credentials")
            st.caption("Demo accounts")
            for acc in list_demo_accounts():
                st.code(acc, language=None)
        with tab_reg:
            nu = st.text_input("Username", key="reg_u")
            nn = st.text_input("Display Name", key="reg_n")
            np_ = st.text_input("Password", type="password", key="reg_p")
            if st.button("Create Account", use_container_width=True):
                ok, msg = register_user(nu, np_, nn)
                st.success(msg) if ok else st.error(msg)

    st.markdown("---")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Agents", "3 Parallel")
    m2.metric("Latency", "< 4s")
    m3.metric("RAG Sources", "SEBI + Earnings")
    m4.metric("Personalisation", "Full Profile")


def portfolio_editor(profile: UserProfile):
    st.markdown("## 💼 Portfolio Command Center")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        risk = st.selectbox("Risk Tolerance", ["conservative", "moderate", "aggressive"],
                            index=["conservative", "moderate", "aggressive"].index(profile.risk_tolerance))
    with c2:
        horizon = st.selectbox("Horizon", ["short", "medium", "long"],
                               index=["short", "medium", "long"].index(profile.investment_horizon))
    with c3:
        max_pos = st.slider("Max Position %", 5.0, 30.0, float(profile.max_position_pct), 1.0)
    with c4:
        cash = st.slider("Cash %", 0.0, 100.0, float(profile.cash_pct), 1.0)

    flags = st.multiselect("Behavioral Flags",
                           ["loss_averse", "fomo_prone", "momentum_chaser", "prefers_dividends", "balanced"],
                           default=profile.behavioral_flags)

    left, right = st.columns([1.3, 1])
    with left:
        st.markdown("#### Holdings")
        if profile.holdings:
            rows = [{"Ticker": t, "Qty": h.get("quantity", 0), "Avg ₹": h.get("avg_price", 0),
                     "Weight %": h.get("weight_pct", 0)} for t, h in profile.holdings.items()]
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        else:
            st.info("Empty portfolio — add your first holding.")

        st.markdown("#### Add / Update")
        a1, a2, a3, a4 = st.columns(4)
        with a1: nt = st.text_input("Ticker", placeholder="RELIANCE")
        with a2: nq = st.number_input("Qty", 0.0, value=10.0)
        with a3: na = st.number_input("Avg Price", 0.0, value=1000.0)
        with a4: nw = st.number_input("Weight %", 0.0, 50.0, value=10.0)
        b1, b2 = st.columns(2)
        with b1:
            if st.button("➕ Save Holding", type="primary", use_container_width=True) and nt.strip():
                profile.add_holding(nt.strip(), nq, na, nw)
                profile.risk_tolerance, profile.investment_horizon = risk, horizon
                profile.max_position_pct, profile.behavioral_flags, profile.cash_pct = max_pos, flags, cash
                update_profile(profile)
                st.success("Saved")
                st.rerun()
        with b2:
            rem = st.selectbox("Remove", ["—"] + list(profile.holdings.keys()), label_visibility="collapsed")
            if st.button("🗑 Remove", use_container_width=True) and rem != "—":
                profile.remove_holding(rem)
                update_profile(profile)
                st.rerun()

    with right:
        if profile.holdings or cash > 0:
            labels = list(profile.holdings.keys()) + (["Cash"] if cash > 0 else [])
            values = [h.get("weight_pct", 0) for h in profile.holdings.values()] + ([cash] if cash > 0 else [])
            fig = px.pie(values=values, names=labels, hole=0.55,
                         color_discrete_sequence=px.colors.sequential.Purples_r)
            fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                              font_color="#c9d1d9", height=320, margin=dict(t=20, b=20, l=20, r=20),
                              showlegend=True, legend=dict(orientation="h", y=-0.1))
            st.plotly_chart(fig, use_container_width=True)
        hhi = profile.concentration_hhi()
        health = max(0, min(100, 100 - hhi * 70 - (5 if cash < 5 else 0)))
        st.metric("Portfolio Health Score", f"{health:.0f}/100")
        st.caption(f"HHI: {hhi:.3f} · Cash: {cash:.0f}%")

    if st.button("💾 Save All Profile Settings", type="primary"):
        profile.risk_tolerance, profile.investment_horizon = risk, horizon
        profile.max_position_pct, profile.behavioral_flags, profile.cash_pct = max_pos, flags, cash
        update_profile(profile)
        st.success("Profile locked in")


def multi_ticker_view(user_id: str, profile: UserProfile):
    st.markdown("## 📊 Multi-Ticker Intelligence")
    default = ",".join((profile.watchlist or ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"])[:4])
    tickers_raw = st.text_input("Tickers (comma separated)", value=default)
    tickers = [t.strip().upper() for t in tickers_raw.split(",") if t.strip()]
    tickers = [t + ".NS" if not t.endswith((".NS", ".BO")) else t for t in tickers]

    if st.button("Run Comparison", type="primary") and tickers:
        results = []
        progress = st.progress(0, text="Dispatching agents…")
        for i, t in enumerate(tickers[:5]):
            progress.progress(i / max(len(tickers), 1), text=f"Analyzing {t}…")
            results.append(run_pipeline(t, user_id=user_id))
        progress.progress(1.0, text="Done")
        time.sleep(0.2)
        progress.empty()

        rows = []
        for r in results:
            syn = r["synthesis"]
            rows.append({
                "Ticker": r["ticker"].replace(".NS", ""),
                "Signal": syn["final_signal"],
                "Score": syn["score"],
                "Confidence": f"{syn['confidence']:.0%}",
                "Position Hint": f"{syn['position_hint_pct']:+.1f}%",
                "Agreement": f"{syn.get('agreement', 0):.0%}",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

        fig = go.Figure(go.Bar(
            x=[r["ticker"].replace(".NS", "") for r in results],
            y=[r["synthesis"]["score"] for r in results],
            marker_color=["#00c853" if s > 0.2 else "#ff1744" if s < -0.2 else "#ffab00"
                          for s in [r["synthesis"]["score"] for r in results]],
            text=[r["synthesis"]["final_signal"] for r in results],
            textposition="auto"
        ))
        fig.update_layout(title="Composite Score Comparison", paper_bgcolor="rgba(0,0,0,0)",
                          plot_bgcolor="rgba(0,0,0,0)", font_color="#c9d1d9", height=340,
                          yaxis=dict(range=[-1, 1], gridcolor="#21262d"), margin=dict(t=40, b=20))
        st.plotly_chart(fig, use_container_width=True)


def market_pulse():
    st.markdown("## 🌐 Market Pulse & Retail Risk")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("""
        <div class="glass">
        <h4>SEBI Retail F&O Reality Check</h4>
        <p><b>89%</b> of retail F&O participants in India lost money (SEBI data).<br>
        India added <b>130 million</b> new retail investors in four years — 80% under 30.</p>
        <p style="color:#ffab00">This system closes the infrastructure gap — it does not encourage leverage.</p>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown("""
        <div class="glass">
        <h4>System Capabilities</h4>
        <ul>
        <li>Parallel multi-perspective research</li>
        <li>RAG-grounded regulatory & earnings context</li>
        <li>Risk-profile aware recommendations</li>
        <li>Full reasoning chain visible</li>
        <li>Portfolio impact simulation</li>
        </ul>
        </div>
        """, unsafe_allow_html=True)


def analyze_page(user: dict, profile: UserProfile):
    st.markdown(f"""
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div>
            <span class="logo">FinAgentVerse</span>
            <span style="color:#8b949e;margin-left:1rem;font-size:0.95rem">
                {profile.name} · {profile.risk_tolerance} · {profile.investment_horizon} horizon
            </span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    wl = profile.watchlist or ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]
    snaps = get_watchlist_snapshots(wl[:5])
    cols = st.columns(len(snaps))
    for i, s in enumerate(snaps):
        with cols[i]:
            st.metric(s.ticker.replace(".NS", ""), f"₹{s.last_price:,.1f}", f"{s.change_pct:+.2f}%",
                      delta_color="normal" if s.change_pct >= 0 else "inverse")

    c1, c2, c3, c4, c5 = st.columns([2.2, 1, 1, 1.1, 1])
    with c1:
        ticker_input = st.text_input("Ticker", value="RELIANCE.NS", label_visibility="collapsed", placeholder="RELIANCE.NS")
    with c2:
        run_btn = st.button("▶  Analyze", type="primary", use_container_width=True)
    with c3:
        degraded_btn = st.button("Degraded", use_container_width=True)
    with c4:
        whatif = st.selectbox("What-if risk", ["(current)", "conservative", "moderate", "aggressive"], label_visibility="collapsed")
    with c5:
        explain_simple = st.checkbox("ELI15", help="Explain like I'm 15")

    if run_btn or degraded_btn or "last_result" in st.session_state:
        force_deg = degraded_btn
        if run_btn or degraded_btn:
            progress_placeholder = st.empty()
            with progress_placeholder.container():
                st.markdown("#### Agent Team Deploying")
                steps = [
                    ("TechnicalSignalAgent", "Momentum · Volume · RSI/MACD"),
                    ("FundamentalRAGAgent", "SEBI filings · Earnings transcripts"),
                    ("SentimentMacroAgent", "Regime · Participation · Macro"),
                    ("Synthesis Layer", "Risk profile · Behavioral · Concentration"),
                ]
                pbar = st.progress(0)
                status = st.empty()
                for i, (name, desc) in enumerate(steps):
                    status.markdown(f"**{name}** — {desc}")
                    pbar.progress((i + 1) / len(steps))
                    time.sleep(0.32)
                status.markdown("**Synthesizing personalised recommendation…**")
                time.sleep(0.2)

            orig_risk = profile.risk_tolerance
            if whatif != "(current)":
                profile.risk_tolerance = whatif
            result = run_pipeline(ticker_input, user_id=user["username"], force_degraded=force_deg)
            profile.risk_tolerance = orig_risk
            st.session_state["last_result"] = result
            progress_placeholder.empty()
        else:
            result = st.session_state["last_result"]

        snap = result["market_snapshot"]
        syn = result["synthesis"]
        agents = result["agent_outputs"]
        metrics = result["metrics"]
        sig = syn["final_signal"]

        badge_class = "badge-buy" if "BUY" in sig else ("badge-sell" if "SELL" in sig else "badge-hold")
        st.markdown(f"""
        <div style="text-align:center;margin:1.5rem 0 1rem">
            <span class="{badge_class}">{sig}</span>
            <div style="margin-top:0.8rem;font-size:1.1rem;color:#c9d1d9">
                Confidence <b>{syn['confidence']:.0%}</b> · Score <b>{syn['score']:+.2f}</b> · {snap['ticker']} @ ₹{snap['last_price']}
            </div>
        </div>
        """, unsafe_allow_html=True)

        rec = syn["recommendation"]
        if explain_simple:
            rec = (f"**Simple take:** The agents looked at price action, company filings, and market mood. "
                   f"For your risk style ({profile.risk_tolerance}), they suggest **{sig.replace('_', ' ').title()}**. "
                   f"{'Consider a measured add' if 'BUY' in sig else 'Consider reducing or waiting' if 'SELL' in sig else 'No strong reason to change right now'}.")
        st.markdown(f"<div class='glass' style='font-size:1.05rem'>{rec}</div>", unsafe_allow_html=True)

        k1, k2, k3, k4, k5 = st.columns(5)
        k1.metric("Position Hint", f"{syn['position_hint_pct']:+.1f}%")
        k2.metric("Agent Agreement", f"{syn.get('agreement', 0):.0%}")
        k3.metric("Latency", f"{metrics['total_latency_ms']:.0f} ms")
        k4.metric("Data Quality", snap["data_quality"].upper())
        k5.metric("Conviction", f"{metrics['conviction_score']:.2f}")

        st.markdown("### 📊 Portfolio Impact")
        try:
            ms = MarketSnapshot(**{k: snap[k] for k in MarketSnapshot.__dataclass_fields__ if k in snap})
            impact = simulate_impact(profile, ms, syn["final_signal"], syn["position_hint_pct"], syn["confidence"])
            ic1, ic2, ic3, ic4 = st.columns(4)
            ic1.metric("Weight", f"{impact['current_weight_pct']}%", f"→ {impact['proposed_weight_pct']}%")
            ic2.metric("Cash", f"{impact['cash_before']}%", f"→ {impact['cash_after']}%")
            ic3.metric("HHI", f"{impact['hhi_before']}", f"→ {impact['hhi_after']}")
            ic4.metric("Risk Score", f"{impact['risk_score_before']}", f"→ {impact['risk_score_after']}")
            st.info(f"{impact['action']} · {impact['diversification_note']} · Limits: {'✅' if impact['within_limits'] else '⚠️'}")
        except Exception as e:
            st.caption(f"Impact: {e}")

        st.markdown("### 🗣️ Agent Debate")
        scores = [a["score"] for a in agents]
        signals = [a["signal"] for a in agents]
        has_conflict = (len(set(s for s in signals if s != "HOLD")) > 1) or (max(scores) - min(scores) > 0.55 if scores else False)
        if has_conflict:
            st.markdown("""
            <div style="background:rgba(255,111,0,0.12);border-left:4px solid #ff6f00;padding:0.7rem 1rem;border-radius:8px;margin-bottom:1rem">
                ⚡ <b>Agents disagree</b> — synthesis resolved via confidence weighting + your risk profile.
            </div>
            """, unsafe_allow_html=True)

        a_cols = st.columns(3)
        colors = ["#7c4dff", "#00bcd4", "#ff9800"]
        for i, a in enumerate(agents):
            with a_cols[i]:
                conflict_cls = "agent-conflict" if has_conflict and a["signal"] != sig else ""
                st.markdown(f"""
                <div class="agent-card {conflict_cls}">
                    <div style="font-weight:700;font-size:1.05rem;color:{colors[i]}">{a['agent_name']}</div>
                    <div style="font-size:1.2rem;font-weight:700;margin:0.4rem 0">{a['signal']}
                        <span style="font-size:0.85rem;color:#8b949e">({a['score']:+.2f} · {a['confidence']:.0%})</span>
                    </div>
                    <div style="font-size:0.88rem;color:#c9d1d9;line-height:1.45">{a['reasoning'][:280]}…</div>
                </div>
                """, unsafe_allow_html=True)
                if a.get("key_factors"):
                    for f in a["key_factors"][:3]:
                        st.markdown(f"<span style='font-size:0.82rem'>▸ {f}</span>", unsafe_allow_html=True)
                if a.get("citations"):
                    for c in a["citations"][:1]:
                        st.markdown(f"<div class='citation'>📎 {c['source']}<br/>{c['snippet'][:120]}…</div>", unsafe_allow_html=True)

        fig = go.Figure(go.Bar(
            x=[a["score"] for a in agents],
            y=[a["agent_name"].replace("Agent", "") for a in agents],
            orientation="h", marker_color=colors,
            text=[f"{a['score']:+.2f}" for a in agents], textposition="auto"
        ))
        fig.update_layout(title="Agent Score Spectrum", paper_bgcolor="rgba(0,0,0,0)",
                          plot_bgcolor="rgba(0,0,0,0)", font_color="#c9d1d9", height=240,
                          xaxis=dict(range=[-1, 1], gridcolor="#21262d"), margin=dict(t=40, b=10, l=10, r=10))
        st.plotly_chart(fig, use_container_width=True)

        with st.expander("🔍 Full Transparent Reasoning Chain", expanded=True):
            for step in syn.get("reasoning_chain", []):
                st.markdown(f"- {step}")

        st.markdown("### Session Metrics")
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Agents OK", f"{metrics['num_agents_succeeded']}/3")
        m2.metric("Portfolio HHI", metrics["portfolio_risk_concentration"])
        m3.metric("Final Confidence", f"{metrics['final_confidence']:.0%}")
        m4.metric("Session", result["session_id"][-8:])

        if st.button("📄 Export Research Memo (PDF)", type="primary"):
            path = export_research_memo(result, profile.name)
            with open(path, "rb") as f:
                mime = "application/pdf" if path.suffix == ".pdf" else "text/plain"
                st.download_button("⬇ Download Memo", f, file_name=path.name, mime=mime)
            st.success(f"Ready → {path.name}")
    else:
        st.markdown("""
        <div class="glass" style="text-align:center;padding:2.5rem">
            <div style="font-size:2.5rem;margin-bottom:0.5rem">◈</div>
            <div style="font-size:1.3rem;font-weight:600">Ready when you are</div>
            <div style="color:#8b949e;margin-top:0.4rem">
                Enter a ticker and launch the agent team.<br>
                Your portfolio and risk profile shape every recommendation.
            </div>
        </div>
        """, unsafe_allow_html=True)


def main_app():
    user = st.session_state["user"]
    profile = get_profile(user["username"])

    with st.sidebar:
        st.markdown('<div class="logo" style="font-size:1.4rem;margin-bottom:0.3rem">FinAgentVerse</div>', unsafe_allow_html=True)
        st.caption(f"{user['display_name']} · @{user['username']}")
        st.markdown(f"`{profile.risk_tolerance}` · max {profile.max_position_pct}%")
        st.markdown("---")
        page = st.radio("Navigate",
                        ["🔍 Analyze", "📊 Compare", "💼 Portfolio", "🌐 Market Pulse", "📜 History", "💬 Ask", "ℹ️ About"],
                        label_visibility="collapsed")
        st.markdown("---")
        if st.button("Logout", use_container_width=True):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.rerun()

    if page == "🔍 Analyze":
        analyze_page(user, profile)
    elif page == "📊 Compare":
        multi_ticker_view(user["username"], profile)
    elif page == "💼 Portfolio":
        portfolio_editor(profile)
    elif page == "🌐 Market Pulse":
        market_pulse()
    elif page == "📜 History":
        st.markdown("## Decision History")
        if not profile.past_decisions:
            st.info("No history yet. Run analyses to build your track record.")
        else:
            for d in profile.past_decisions[:20]:
                with st.expander(f"{d.get('ticker','?')} → **{d.get('signal','?')}** · {str(d.get('timestamp',''))[:16]}"):
                    st.write(d.get("recommendation", ""))
                    st.caption(f"Conf {d.get('confidence',0):.0%} · Score {d.get('score',0):+.2f}")
    elif page == "💬 Ask":
        st.markdown("## Ask the Agent Team")
        q = st.text_input("Question", placeholder="Should I increase my TCS position given my conservative profile?")
        if st.button("Ask", type="primary") and q:
            ticker = "RELIANCE.NS"
            for t in ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN", "WIPRO", "ICICIBANK"]:
                if t.lower() in q.lower():
                    ticker = t + ".NS"
                    break
            with st.spinner(f"Routing to agents on {ticker}…"):
                result = run_pipeline(ticker, user_id=user["username"])
            syn = result["synthesis"]
            badge = "badge-buy" if "BUY" in syn["final_signal"] else ("badge-sell" if "SELL" in syn["final_signal"] else "badge-hold")
            st.markdown(f'<span class="{badge}">{syn["final_signal"]}</span>', unsafe_allow_html=True)
            st.markdown(syn["recommendation"])
            with st.expander("Reasoning"):
                for s in syn["reasoning_chain"]:
                    st.markdown(f"- {s}")
    else:
        st.markdown("## Architecture")
        arch = ROOT / "docs" / "ARCHITECTURE.md"
        if arch.exists():
            st.markdown(arch.read_text())
        st.markdown("---")
        st.markdown("Built for **HACKVERSE: INTO THE WEB · Sprint 1 · PS-01**")


if "user" not in st.session_state:
    login_page()
else:
    main_app()
