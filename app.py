"""
FinAgentVerse – Multi-Agent Autonomous Financial Intelligence System
HACKVERSE Sprint 1 | PS-01 | Full Demo UI with Auth + Portfolio + Impact
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import sys
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
    page_title="FinAgentVerse | Multi-Agent Retail Intelligence",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .signal-buy { color: #00c853; font-weight: 700; font-size: 1.5rem; }
    .signal-sell { color: #ff1744; font-weight: 700; font-size: 1.5rem; }
    .signal-hold { color: #ffab00; font-weight: 700; font-size: 1.5rem; }
    .agent-box { border-left: 4px solid #7c4dff; padding-left: 0.8rem; margin: 0.5rem 0; }
    .debate-conflict { background: #3e2723; border-left: 4px solid #ff6f00; padding: 0.6rem; border-radius: 4px; }
    .citation { font-size: 0.82rem; color: #aaa; }
</style>
""", unsafe_allow_html=True)


def login_page():
    st.title("FinAgentVerse")
    st.markdown("### Multi-Agent Autonomous Financial Intelligence for Retail Investors")
    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Login")
        username = st.text_input("Username", key="login_user")
        password = st.text_input("Password", type="password", key="login_pass")
        if st.button("Login", type="primary", use_container_width=True):
            user = authenticate(username, password)
            if user:
                st.session_state["user"] = user
                st.rerun()
            else:
                st.error("Invalid credentials")
        st.caption("Demo accounts:")
        for acc in list_demo_accounts():
            st.code(acc, language=None)
    with col2:
        st.subheader("Register New Investor")
        new_user = st.text_input("Choose Username", key="reg_user")
        new_name = st.text_input("Display Name", key="reg_name")
        new_pass = st.text_input("Password", type="password", key="reg_pass")
        if st.button("Create Account", use_container_width=True):
            ok, msg = register_user(new_user, new_pass, new_name)
            if ok:
                st.success(msg + " — please login.")
            else:
                st.error(msg)
    st.markdown("---")
    st.info("Hackathon demo system. Local data only. Not investment advice.")


def portfolio_editor(profile: UserProfile):
    st.subheader("Your Portfolio & Risk Profile")
    c1, c2, c3 = st.columns(3)
    with c1:
        risk = st.selectbox("Risk Tolerance", ["conservative", "moderate", "aggressive"],
                            index=["conservative", "moderate", "aggressive"].index(profile.risk_tolerance))
    with c2:
        horizon = st.selectbox("Investment Horizon", ["short", "medium", "long"],
                               index=["short", "medium", "long"].index(profile.investment_horizon))
    with c3:
        max_pos = st.slider("Max Single Position %", 5.0, 30.0, float(profile.max_position_pct), 1.0)

    flags = st.multiselect("Behavioral Flags",
                           ["loss_averse", "fomo_prone", "momentum_chaser", "prefers_dividends", "balanced"],
                           default=profile.behavioral_flags)
    cash = st.slider("Cash % of Portfolio", 0.0, 100.0, float(profile.cash_pct), 1.0)

    st.markdown("#### Holdings")
    if profile.holdings:
        rows = [{"Ticker": t, "Qty": h.get("quantity", 0), "Avg Price": h.get("avg_price", 0),
                 "Weight %": h.get("weight_pct", 0)} for t, h in profile.holdings.items()]
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        labels = list(profile.holdings.keys()) + (["Cash"] if cash > 0 else [])
        values = [h.get("weight_pct", 0) for h in profile.holdings.values()] + ([cash] if cash > 0 else [])
        fig = px.pie(values=values, names=labels, title="Current Allocation", hole=0.4)
        fig.update_layout(height=280, margin=dict(t=40, b=0, l=0, r=0))
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No holdings yet. Add your first stock below.")

    st.markdown("#### Add / Update Holding")
    ac1, ac2, ac3, ac4 = st.columns(4)
    with ac1:
        new_ticker = st.text_input("Ticker", placeholder="RELIANCE or RELIANCE.NS")
    with ac2:
        new_qty = st.number_input("Quantity", min_value=0.0, value=10.0, step=1.0)
    with ac3:
        new_avg = st.number_input("Avg Buy Price ₹", min_value=0.0, value=1000.0, step=10.0)
    with ac4:
        new_w = st.number_input("Target Weight %", min_value=0.0, max_value=50.0, value=10.0, step=1.0)

    bc1, bc2 = st.columns(2)
    with bc1:
        if st.button("➕ Add / Update Holding", use_container_width=True):
            if new_ticker.strip():
                profile.add_holding(new_ticker.strip(), new_qty, new_avg, new_w)
                profile.risk_tolerance = risk
                profile.investment_horizon = horizon
                profile.max_position_pct = max_pos
                profile.behavioral_flags = flags
                profile.cash_pct = cash
                update_profile(profile)
                st.success(f"Updated {new_ticker}")
                st.rerun()
    with bc2:
        rem = st.selectbox("Remove holding", ["—"] + list(profile.holdings.keys()))
        if st.button("🗑 Remove", use_container_width=True) and rem != "—":
            profile.remove_holding(rem)
            update_profile(profile)
            st.rerun()

    if st.button("💾 Save Profile Settings", type="primary"):
        profile.risk_tolerance = risk
        profile.investment_horizon = horizon
        profile.max_position_pct = max_pos
        profile.behavioral_flags = flags
        profile.cash_pct = cash
        update_profile(profile)
        st.success("Profile saved")


def main_app():
    user = st.session_state["user"]
    profile = get_profile(user["username"])

    st.sidebar.title("🧠 FinAgentVerse")
    st.sidebar.markdown(f"**{user['display_name']}**")
    st.sidebar.caption(f"@{user['username']} · {profile.risk_tolerance}")

    page = st.sidebar.radio("Navigate", ["🔍 Analyze", "💼 My Portfolio", "📜 History", "💬 Ask Agents", "ℹ️ About"],
                            label_visibility="collapsed")

    if st.sidebar.button("Logout"):
        for k in list(st.session_state.keys()):
            del st.session_state[k]
        st.rerun()
    st.sidebar.markdown("---")

    if page == "💼 My Portfolio":
        portfolio_editor(profile)
        return

    if page == "📜 History":
        st.header("Decision History")
        if not profile.past_decisions:
            st.info("No past analyses yet. Run an analysis to build history.")
        else:
            for d in profile.past_decisions[:15]:
                with st.expander(f"{d.get('ticker','?')} → {d.get('signal','?')} ({str(d.get('timestamp',''))[:16]})"):
                    st.write(d.get("recommendation", ""))
                    st.caption(f"Confidence {d.get('confidence',0):.0%} · Score {d.get('score',0):+.2f}")
        return

    if page == "💬 Ask Agents":
        st.header("Chat with the Agent Team")
        st.caption("Natural language questions are routed to the multi-agent pipeline.")
        q = st.text_input("Your question", placeholder="Should I add more TCS given my conservative profile?")
        if st.button("Ask") and q:
            ticker_guess = "RELIANCE.NS"
            for t in ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN", "WIPRO"]:
                if t.lower() in q.lower():
                    ticker_guess = t + ".NS"
                    break
            with st.spinner(f"Agents analyzing {ticker_guess}..."):
                result = run_pipeline(ticker_guess, user_id=user["username"])
            syn = result["synthesis"]
            st.markdown(f"**Routed to full analysis on `{ticker_guess}`**")
            st.markdown(f"### {syn['final_signal']} (conf {syn['confidence']:.0%})")
            st.write(syn["recommendation"])
            with st.expander("Full reasoning"):
                for step in syn["reasoning_chain"]:
                    st.markdown(f"- {step}")
        return

    if page == "ℹ️ About":
        st.header("About FinAgentVerse")
        arch = ROOT / "docs" / "ARCHITECTURE.md"
        if arch.exists():
            st.markdown(arch.read_text())
        return

    # ===== ANALYZE =====
    st.title("Multi-Agent Analysis")
    st.caption(f"Personalized for **{profile.name}** · Risk: `{profile.risk_tolerance}` · Horizon: `{profile.investment_horizon}`")

    wl = profile.watchlist or ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]
    snaps = get_watchlist_snapshots(wl[:5])
    cols = st.columns(len(snaps))
    for i, s in enumerate(snaps):
        with cols[i]:
            st.metric(s.ticker.replace(".NS", ""), f"₹{s.last_price:,.1f}", f"{s.change_pct:+.2f}%")

    st.markdown("---")
    c1, c2, c3, c4 = st.columns([2, 1, 1, 1])
    with c1:
        ticker_input = st.text_input("Ticker", value="RELIANCE.NS")
    with c2:
        run_btn = st.button("🚀 Run Analysis", type="primary", use_container_width=True)
    with c3:
        degraded_btn = st.button("⚠️ Degraded Path", use_container_width=True)
    with c4:
        whatif_risk = st.selectbox("What-if Risk", ["(current)", "conservative", "moderate", "aggressive"],
                                   label_visibility="collapsed")

    if run_btn or degraded_btn or "last_result" in st.session_state:
        force_deg = degraded_btn
        if run_btn or degraded_btn:
            orig_risk = profile.risk_tolerance
            if whatif_risk != "(current)":
                profile.risk_tolerance = whatif_risk
            with st.spinner("Dispatching parallel agents: Technical · Fundamental-RAG · Sentiment-Macro …"):
                result = run_pipeline(ticker_input, user_id=user["username"], force_degraded=force_deg)
            profile.risk_tolerance = orig_risk
            st.session_state["last_result"] = result
        else:
            result = st.session_state["last_result"]

        snap = result["market_snapshot"]
        syn = result["synthesis"]
        agents = result["agent_outputs"]
        metrics = result["metrics"]

        sig = syn["final_signal"]
        css = "signal-buy" if "BUY" in sig else ("signal-sell" if "SELL" in sig else "signal-hold")
        st.markdown(f"<div class='{css}'>{sig} &nbsp;·&nbsp; Confidence {syn['confidence']:.0%}</div>", unsafe_allow_html=True)
        st.markdown(f"**{syn['recommendation']}**")
        st.caption(syn.get("personalized_note", ""))

        k1, k2, k3, k4, k5 = st.columns(5)
        k1.metric("Adjusted Score", f"{syn['score']:+.2f}")
        k2.metric("Position Hint", f"{syn['position_hint_pct']:+.1f}%")
        k3.metric("Agent Agreement", f"{syn.get('agreement', 0):.0%}")
        k4.metric("Latency", f"{metrics['total_latency_ms']:.0f} ms")
        k5.metric("Data Quality", snap["data_quality"].upper())

        # Portfolio Impact
        st.subheader("📊 Portfolio Impact Simulator")
        try:
            ms = MarketSnapshot(**{k: snap[k] for k in MarketSnapshot.__dataclass_fields__ if k in snap})
            impact = simulate_impact(profile, ms, syn["final_signal"], syn["position_hint_pct"], syn["confidence"])
            ic1, ic2, ic3, ic4 = st.columns(4)
            ic1.metric("Current Weight", f"{impact['current_weight_pct']}%", f"→ {impact['proposed_weight_pct']}%")
            ic2.metric("Cash", f"{impact['cash_before']}%", f"→ {impact['cash_after']}%")
            ic3.metric("Concentration (HHI)", f"{impact['hhi_before']}", f"→ {impact['hhi_after']}")
            ic4.metric("Risk Score", f"{impact['risk_score_before']}", f"→ {impact['risk_score_after']}")
            st.info(f"**Action:** {impact['action']} · {impact['diversification_note']} · Within limits: {'✅' if impact['within_limits'] else '⚠️ Exceeds max'}")
        except Exception as e:
            st.warning(f"Impact calc: {e}")

        # Agent Debate
        st.subheader("🗣️ Agent Outputs & Debate")
        scores = [a["score"] for a in agents]
        signals = [a["signal"] for a in agents]
        has_conflict = len(set(s for s in signals if s != "HOLD")) > 1 or (max(scores) - min(scores) > 0.6 if scores else False)
        if has_conflict:
            st.markdown("<div class='debate-conflict'>⚡ <b>Agents disagree</b> — synthesis resolved conflict via confidence weighting + your risk profile.</div>", unsafe_allow_html=True)

        a_cols = st.columns(3)
        for i, a in enumerate(agents):
            with a_cols[i % 3]:
                st.markdown(f"#### {a['agent_name']}")
                st.markdown(f"**{a['signal']}** (score {a['score']:+.2f}, conf {a['confidence']:.0%})")
                st.markdown(f"<div class='agent-box'>{a['reasoning'][:300]}…</div>", unsafe_allow_html=True)
                if a.get("key_factors"):
                    for f in a["key_factors"][:3]:
                        st.markdown(f"- {f}")
                if a.get("citations"):
                    st.markdown("**Citations**")
                    for c in a["citations"][:2]:
                        st.markdown(f"<div class='citation'>📎 {c['source']}<br/>{c['snippet'][:130]}…</div>", unsafe_allow_html=True)
                if a.get("degraded"):
                    st.warning("Degraded")
                st.caption(f"{a['latency_ms']} ms")

        fig = go.Figure(data=[go.Bar(name="Score", x=[a["agent_name"].replace("Agent", "") for a in agents],
                                     y=[a["score"]], marker_color=["#7c4dff", "#00bcd4", "#ff9800"])])
        fig.update_layout(title="Agent Score Comparison", height=260, margin=dict(t=40, b=0), yaxis=dict(range=[-1, 1]))
        st.plotly_chart(fig, use_container_width=True)

        with st.expander("🔍 Full Reasoning Chain (transparent)", expanded=True):
            for step in syn.get("reasoning_chain", []):
                st.markdown(f"- {step}")

        st.subheader("Session Performance Log")
        mcols = st.columns(4)
        mcols[0].metric("Agents Succeeded", f"{metrics['num_agents_succeeded']}/3")
        mcols[1].metric("Portfolio HHI", metrics["portfolio_risk_concentration"])
        mcols[2].metric("Conviction", f"{metrics['conviction_score']:.2f}")
        mcols[3].metric("Final Confidence", f"{metrics['final_confidence']:.0%}")

        st.markdown("---")
        if st.button("📄 Export Research Memo (PDF)"):
            path = export_research_memo(result, profile.name)
            with open(path, "rb") as f:
                st.download_button("Download Memo", f, file_name=path.name, mime="application/pdf" if path.suffix == ".pdf" else "text/plain")
            st.success(f"Memo ready: {path.name}")
    else:
        st.info("Enter a ticker and click **Run Analysis**. Your portfolio and risk profile shape the recommendation.")
        st.markdown("""
        ### Demo Highlights
        - **Auth + Personal Portfolio** — login, add real holdings
        - **3 Parallel Agents** + synthesis with full reasoning chain
        - **Portfolio Impact Simulator** — risk & allocation change
        - **Agent Debate View** — conflicts highlighted
        - **What-If Risk** — test conservative vs aggressive instantly
        - **RAG with citations** from SEBI / earnings docs
        - **PDF Research Memo** export
        - **Decision History** per user
        """)


if "user" not in st.session_state:
    login_page()
else:
    main_app()
