"""
FinNexus — Multi-Agent Autonomous Financial Intelligence
HACKVERSE 2026 | Killer UI · 5 Agents + Chair · Zero-lag feel
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import sys
import time

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from core.auth import authenticate, register_user, list_demo_accounts
from core.orchestrator import run_pipeline
from core.user_profile import get_profile, update_profile, UserProfile
from core.market_data import get_watchlist_snapshots, MarketSnapshot
from core.portfolio_impact import simulate_impact
from core.pdf_export import export_research_memo

st.set_page_config(page_title="FinNexus", page_icon="◈", layout="wide", initial_sidebar_state="expanded")

# ═══════════════════════════════════════════════════════════
# PREMIUM CSS — static sidebar, glass, motion, FinNexus brand
# ═══════════════════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
.stApp { background: #07070c; color: #e6edf3; }

#MainMenu, footer, header, .stDeployButton { display: none !important; visibility: hidden !important; }

/* ── STATIC SIDEBAR ── */
section[data-testid="stSidebar"] {
    background: #0b0b12 !important;
    border-right: 1px solid rgba(99, 102, 241, 0.2) !important;
    min-width: 260px !important;
}
section[data-testid="stSidebar"] > div { background: #0b0b12 !important; }
section[data-testid="stSidebar"] * { color: #c4c4d4 !important; }
section[data-testid="stSidebar"] .stRadio label {
    padding: 0.55rem 0.85rem !important;
    border-radius: 10px !important;
    margin: 2px 0 !important;
    transition: all 0.15s ease !important;
}
section[data-testid="stSidebar"] .stRadio label:hover {
    background: rgba(99, 102, 241, 0.12) !important;
}
div[data-testid="stSidebarNav"] { display: none; }

/* Brand */
.fnx-logo {
    font-size: 1.55rem; font-weight: 800; letter-spacing: -0.03em;
    background: linear-gradient(120deg, #818cf8, #22d3ee);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.fnx-tag { font-size: 0.72rem; color: #64748b; letter-spacing: 0.04em; text-transform: uppercase; }

/* Glass */
.glass {
    background: rgba(15, 15, 25, 0.75);
    border: 1px solid rgba(99, 102, 241, 0.15);
    border-radius: 14px; padding: 1.1rem 1.3rem;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}

/* Signal badges */
.badge {
    display: inline-block; font-weight: 800; font-size: 1.45rem;
    padding: 0.35rem 1.25rem; border-radius: 10px; letter-spacing: 0.04em;
}
.badge-buy { background: linear-gradient(135deg,#059669,#34d399); color:#022c22; box-shadow: 0 0 24px rgba(52,211,153,0.35); }
.badge-sell { background: linear-gradient(135deg,#dc2626,#f87171); color:#fff; box-shadow: 0 0 24px rgba(248,113,113,0.35); }
.badge-hold { background: linear-gradient(135deg,#d97706,#fbbf24); color:#1c1000; }

/* Agent cards */
.acard {
    background: #12121c; border-radius: 12px; border-left: 3px solid #6366f1;
    padding: 0.9rem 1rem; height: 100%; transition: border-color 0.2s;
}
.acard:hover { border-left-color: #a5b4fc; }
.acard-conflict { border-left-color: #f97316 !important; background: #1a1210 !important; }

/* Metrics */
div[data-testid="stMetric"] {
    background: #12121c; border: 1px solid rgba(99,102,241,0.1);
    border-radius: 12px; padding: 0.7rem 0.9rem;
}
div[data-testid="stMetricValue"] { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 1.25rem !important; }

/* Buttons */
.stButton > button {
    border-radius: 10px !important; font-weight: 600 !important;
    border: none !important; transition: all 0.15s ease !important;
}
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #6366f1, #4f46e5) !important; color: #fff !important;
}
.stButton > button[kind="primary"]:hover {
    box-shadow: 0 4px 18px rgba(99,102,241,0.45) !important; transform: translateY(-1px);
}

/* Inputs */
.stTextInput input, .stSelectbox div[data-baseweb="select"] {
    background: #12121c !important; border: 1px solid rgba(99,102,241,0.2) !important;
    border-radius: 10px !important; color: #e6edf3 !important;
}

/* Hero */
.hero { text-align: center; padding: 2.5rem 1rem 1.5rem; }
.hero h1 {
    font-size: 2.8rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.4rem;
    background: linear-gradient(120deg, #f1f5f9 10%, #818cf8 50%, #22d3ee 90%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hero p { color: #94a3b8; font-size: 1.05rem; max-width: 520px; margin: 0 auto; }

.citation { font-size: 0.78rem; color: #64748b; border-left: 2px solid #334155; padding-left: 0.5rem; margin: 0.25rem 0; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #07070c; }
::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════
# LOGIN — button only, no Enter dependency
# ═══════════════════════════════════════════════════════════
def login_page():
    st.markdown("""
    <div class="hero">
        <h1>FinNexus</h1>
        <p>Five specialized agents. One Chair. Personalised, explainable intelligence for retail investors — in seconds.</p>
    </div>
    """, unsafe_allow_html=True)

    _, mid, _ = st.columns([1, 1.35, 1])
    with mid:
        tab1, tab2 = st.tabs(["Sign In", "Create Account"])
        with tab1:
            u = st.text_input("Username", key="lu", placeholder="riya", autocomplete="username")
            p = st.text_input("Password", key="lp", type="password", placeholder="••••••••", autocomplete="current-password")
            # Pure button trigger — no form Enter issues
            clicked = st.button("Enter FinNexus", type="primary", use_container_width=True, key="login_btn")
            if clicked:
                if not u or not p:
                    st.warning("Enter username and password")
                else:
                    user = authenticate(u.strip(), p)
                    if user:
                        st.session_state["user"] = user
                        st.rerun()
                    else:
                        st.error("Invalid credentials")
            st.caption("Demo · riya / arjun / priya  →  demo123  ·  judge → hackverse")
        with tab2:
            nu = st.text_input("Username", key="ru")
            nn = st.text_input("Display name", key="rn")
            np = st.text_input("Password", key="rp", type="password")
            if st.button("Create account", use_container_width=True, key="reg_btn"):
                ok, msg = register_user(nu, np, nn)
                st.success(msg) if ok else st.error(msg)

    st.markdown("---")
    a,b,c,d,e = st.columns(5)
    a.metric("Agents", "5 + Chair")
    b.metric("Parallel", "Yes")
    c.metric("RAG", "SEBI + Earnings")
    d.metric("Personalised", "Full profile")
    e.metric("Explainable", "Full chain")


# ═══════════════════════════════════════════════════════════
# PORTFOLIO
# ═══════════════════════════════════════════════════════════
def portfolio_page(profile: UserProfile):
    st.markdown("### Portfolio Command Center")
    c1,c2,c3,c4 = st.columns(4)
    risk = c1.selectbox("Risk", ["conservative","moderate","aggressive"], index=["conservative","moderate","aggressive"].index(profile.risk_tolerance))
    horizon = c2.selectbox("Horizon", ["short","medium","long"], index=["short","medium","long"].index(profile.investment_horizon))
    max_pos = c3.slider("Max position %", 5.0, 30.0, float(profile.max_position_pct), 1.0)
    cash = c4.slider("Cash %", 0.0, 100.0, float(profile.cash_pct), 1.0)
    flags = st.multiselect("Behavioral flags", ["loss_averse","fomo_prone","momentum_chaser","prefers_dividends","balanced"], default=profile.behavioral_flags)

    left, right = st.columns([1.35, 1])
    with left:
        if profile.holdings:
            rows = [{"Ticker":t,"Qty":h.get("quantity",0),"Avg ₹":h.get("avg_price",0),"Weight %":h.get("weight_pct",0)} for t,h in profile.holdings.items()]
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        else:
            st.info("No holdings yet.")
        a1,a2,a3,a4 = st.columns(4)
        nt = a1.text_input("Ticker", placeholder="RELIANCE")
        nq = a2.number_input("Qty", 0.0, value=10.0)
        na = a3.number_input("Avg ₹", 0.0, value=1000.0)
        nw = a4.number_input("Weight %", 0.0, 50.0, value=10.0)
        b1,b2 = st.columns(2)
        if b1.button("Save holding", type="primary", use_container_width=True) and nt.strip():
            profile.add_holding(nt.strip(), nq, na, nw)
            profile.risk_tolerance, profile.investment_horizon = risk, horizon
            profile.max_position_pct, profile.behavioral_flags, profile.cash_pct = max_pos, flags, cash
            update_profile(profile); st.rerun()
        rem = b2.selectbox("Remove", ["—"]+list(profile.holdings.keys()), label_visibility="collapsed")
        if b2.button("Remove", use_container_width=True) and rem != "—":
            profile.remove_holding(rem); update_profile(profile); st.rerun()
    with right:
        if profile.holdings or cash > 0:
            labels = list(profile.holdings.keys()) + (["Cash"] if cash>0 else [])
            values = [h.get("weight_pct",0) for h in profile.holdings.values()] + ([cash] if cash>0 else [])
            fig = px.pie(values=values, names=labels, hole=0.58, color_discrete_sequence=px.colors.sequential.Purples_r)
            fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#94a3b8",
                              height=280, margin=dict(t=10,b=10,l=10,r=10), showlegend=True, legend=dict(orientation="h", y=-0.12))
            st.plotly_chart(fig, use_container_width=True)
        hhi = profile.concentration_hhi()
        health = max(0, min(100, 100 - hhi*70 - (5 if cash<5 else 0)))
        st.metric("Portfolio Health", f"{health:.0f}/100")
        st.caption(f"HHI {hhi:.3f} · Cash {cash:.0f}%")
    if st.button("Save profile settings", type="primary"):
        profile.risk_tolerance, profile.investment_horizon = risk, horizon
        profile.max_position_pct, profile.behavioral_flags, profile.cash_pct = max_pos, flags, cash
        update_profile(profile); st.success("Saved")


# ═══════════════════════════════════════════════════════════
# ANALYZE — zero artificial lag
# ═══════════════════════════════════════════════════════════
def analyze_page(user, profile):
    st.markdown(f'<span class="fnx-logo">FinNexus</span> &nbsp; <span style="color:#64748b">{profile.name} · {profile.risk_tolerance}</span>', unsafe_allow_html=True)

    wl = profile.watchlist or ["RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS"]
    snaps = get_watchlist_snapshots(wl[:4])
    cols = st.columns(len(snaps))
    for i,s in enumerate(snaps):
        cols[i].metric(s.ticker.replace(".NS",""), f"₹{s.last_price:,.1f}", f"{s.change_pct:+.2f}%")

    c1,c2,c3,c4 = st.columns([2.4, 1, 1, 1.1])
    ticker = c1.text_input("Ticker", value="RELIANCE.NS", label_visibility="collapsed", placeholder="RELIANCE.NS")
    run = c2.button("Analyze", type="primary", use_container_width=True)
    deg = c3.button("Degraded", use_container_width=True)
    whatif = c4.selectbox("What-if", ["(current)","conservative","moderate","aggressive"], label_visibility="collapsed")

    if run or deg or "last_result" in st.session_state:
        if run or deg:
            status = st.empty()
            status.caption("Running Momentum · Flow · Filing · Sentiment · Risk in parallel…")
            orig = profile.risk_tolerance
            if whatif != "(current)":
                profile.risk_tolerance = whatif
            result = run_pipeline(ticker, user_id=user["username"], force_degraded=bool(deg))
            profile.risk_tolerance = orig
            st.session_state["last_result"] = result
            status.empty()
        else:
            result = st.session_state["last_result"]

        snap, syn, agents, metrics = result["market_snapshot"], result["synthesis"], result["agent_outputs"], result["metrics"]
        sig = syn["final_signal"]
        bc = "badge-buy" if "BUY" in sig else ("badge-sell" if "SELL" in sig else "badge-hold")

        st.markdown(f"""
        <div style="text-align:center;margin:1.2rem 0 0.8rem">
            <span class="badge {bc}">{sig}</span>
            <div style="margin-top:0.55rem;color:#94a3b8;font-size:0.95rem">
                Confidence <b style="color:#e2e8f0">{syn['confidence']:.0%}</b> · Score <b style="color:#e2e8f0">{syn['score']:+.2f}</b>
                · {snap['ticker']} @ ₹{snap['last_price']} · {metrics['total_latency_ms']:.0f} ms
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f'<div class="glass">{syn["recommendation"]}</div>', unsafe_allow_html=True)

        k1,k2,k3,k4,k5 = st.columns(5)
        k1.metric("Position hint", f"{syn['position_hint_pct']:+.1f}%")
        k2.metric("Agreement", f"{syn.get('agreement',0):.0%}")
        k3.metric("Latency", f"{metrics['total_latency_ms']:.0f} ms")
        k4.metric("Data", snap["data_quality"].upper())
        k5.metric("Agents", f"{metrics['num_agents_succeeded']}/5")

        # Impact
        st.markdown("##### Portfolio impact")
        try:
            ms = MarketSnapshot(**{k:snap[k] for k in MarketSnapshot.__dataclass_fields__ if k in snap})
            imp = simulate_impact(profile, ms, syn["final_signal"], syn["position_hint_pct"], syn["confidence"])
            i1,i2,i3,i4 = st.columns(4)
            i1.metric("Weight", f"{imp['current_weight_pct']}%", f"→ {imp['proposed_weight_pct']}%")
            i2.metric("Cash", f"{imp['cash_before']}%", f"→ {imp['cash_after']}%")
            i3.metric("HHI", f"{imp['hhi_before']}", f"→ {imp['hhi_after']}")
            i4.metric("Risk", f"{imp['risk_score_before']}", f"→ {imp['risk_score_after']}")
            st.caption(f"{imp['action']} · {imp['diversification_note']}")
        except Exception:
            pass

        # Agent grid
        st.markdown("##### Agent desk")
        scores = [a["score"] for a in agents]
        has_conflict = (max(scores)-min(scores) > 0.5) if scores else False
        if has_conflict:
            st.markdown('<div style="background:rgba(249,115,22,0.1);border-left:3px solid #f97316;padding:0.5rem 0.8rem;border-radius:8px;margin-bottom:0.6rem;font-size:0.9rem">⚡ Agents disagree — Chair resolved via confidence + your risk profile. No fake certainty.</div>', unsafe_allow_html=True)

        # 5 agents in a responsive row
        colors = {"MomentumAgent":"#818cf8","FlowAgent":"#22d3ee","FilingAgent":"#a78bfa","SentimentAgent":"#fbbf24","RiskBehaviorAgent":"#f472b6"}
        n = len(agents)
        acols = st.columns(min(n, 5))
        for i, a in enumerate(agents):
            with acols[i % len(acols)]:
                conf_cls = "acard-conflict" if has_conflict and a["signal"] != sig else ""
                col = colors.get(a["agent_name"], "#6366f1")
                st.markdown(f"""
                <div class="acard {conf_cls}">
                    <div style="font-weight:700;color:{col};font-size:0.9rem">{a['agent_name'].replace('Agent','')}</div>
                    <div style="font-size:1.1rem;font-weight:700;margin:0.25rem 0">{a['signal']}
                        <span style="font-size:0.78rem;color:#64748b">{a['score']:+.2f} · {a['confidence']:.0%}</span>
                    </div>
                    <div style="font-size:0.8rem;color:#94a3b8;line-height:1.4">{a['reasoning'][:200]}…</div>
                </div>
                """, unsafe_allow_html=True)
                if a.get("key_factors"):
                    for f in a["key_factors"][:2]:
                        st.caption(f"▸ {f}")
                if a.get("citations"):
                    c = a["citations"][0]
                    st.markdown(f"<div class='citation'>{c.get('source','')[:50]}</div>", unsafe_allow_html=True)

        # Score bars
        fig = go.Figure(go.Bar(
            x=[a["score"] for a in agents],
            y=[a["agent_name"].replace("Agent","") for a in agents],
            orientation="h",
            marker_color=[colors.get(a["agent_name"],"#6366f1") for a in agents],
            text=[f"{a['score']:+.2f}" for a in agents], textposition="auto"
        ))
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#94a3b8",
                          height=220, xaxis=dict(range=[-1,1], gridcolor="#1e1e2e"), margin=dict(t=10,b=10,l=10,r=10),
                          title=dict(text="Chair view — agent scores", font=dict(size=13)))
        st.plotly_chart(fig, use_container_width=True)

        with st.expander("Full reasoning chain (Chair)", expanded=False):
            for step in syn.get("reasoning_chain", []):
                st.markdown(f"- {step}")

        if st.button("Export research memo (PDF)", type="primary"):
            path = export_research_memo(result, profile.name)
            with open(path, "rb") as f:
                st.download_button("Download", f, file_name=path.name,
                                   mime="application/pdf" if path.suffix==".pdf" else "text/plain")
    else:
        st.markdown("""
        <div class="glass" style="text-align:center;padding:2rem">
            <div style="font-size:1.8rem;margin-bottom:0.3rem">◈</div>
            <div style="font-weight:600;font-size:1.15rem">Agent desk is ready</div>
            <div style="color:#64748b;margin-top:0.3rem;font-size:0.9rem">
                Momentum · Flow · Filing · Sentiment · Risk → Chair<br>
                Enter a ticker and run. Your profile shapes every output.
            </div>
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════
# OTHER PAGES
# ═══════════════════════════════════════════════════════════
def compare_page(user_id, profile):
    st.markdown("### Multi-ticker desk")
    default = ",".join((profile.watchlist or ["RELIANCE.NS","TCS.NS","HDFCBANK.NS"])[:3])
    raw = st.text_input("Tickers", value=default)
    tickers = [t.strip().upper() for t in raw.split(",") if t.strip()]
    tickers = [t if t.endswith((".NS",".BO")) else t+".NS" for t in tickers]
    if st.button("Run comparison", type="primary") and tickers:
        results = []
        bar = st.progress(0)
        for i,t in enumerate(tickers[:4]):
            bar.progress((i)/max(len(tickers),1), text=t)
            results.append(run_pipeline(t, user_id=user_id))
        bar.empty()
        rows = [{"Ticker":r["ticker"].replace(".NS",""), "Signal":r["synthesis"]["final_signal"],
                 "Score":r["synthesis"]["score"], "Conf":f"{r['synthesis']['confidence']:.0%}",
                 "Hint":f"{r['synthesis']['position_hint_pct']:+.1f}%"} for r in results]
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        fig = go.Figure(go.Bar(x=[r["ticker"].replace(".NS","") for r in results],
                               y=[r["synthesis"]["score"] for r in results],
                               marker_color=["#34d399" if s>0.2 else "#f87171" if s<-0.2 else "#fbbf24"
                                             for s in [r["synthesis"]["score"] for r in results]]))
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color="#94a3b8",
                          height=300, yaxis=dict(range=[-1,1], gridcolor="#1e1e2e"), margin=dict(t=20,b=20))
        st.plotly_chart(fig, use_container_width=True)


def history_page(profile):
    st.markdown("### Decision history")
    if not profile.past_decisions:
        st.info("Run analyses to build history.")
    for d in profile.past_decisions[:20]:
        with st.expander(f"{d.get('ticker','?')} → {d.get('signal','?')} · {str(d.get('timestamp',''))[:16]}"):
            st.write(d.get("recommendation",""))
            st.caption(f"Conf {d.get('confidence',0):.0%} · Score {d.get('score',0):+.2f}")


def about_page():
    st.markdown("### Agent roles")
    st.markdown("""
| Agent | Role | What it does |
|-------|------|----------------|
| **Momentum** | Technicals | Price trend, RSI, 20/50 DMA, breakouts. Classified signal + confidence. |
| **Flow** | Volume & money | Volume spikes, participation, retail-trap detection. |
| **Filing** | Fundamentals + RAG | Semantic search over SEBI filings & earnings transcripts. Every claim cited. |
| **Sentiment** | Narrative | Tone, management language, crowding. Hype vs substance. |
| **Risk & Behavior** | You | Your profile + portfolio. Can downgrade or refuse (FOMO, concentration, F&O). |
| **Chair (Quorum)** | Synthesis | Weighs all five, surfaces agreement & dissent, writes the memo. Never averages conflict into fake certainty. |
    """)
    arch = ROOT / "docs" / "ARCHITECTURE.md"
    if arch.exists():
        with st.expander("Full architecture"):
            st.markdown(arch.read_text())


# ═══════════════════════════════════════════════════════════
# ROUTER + STATIC SIDEBAR
# ═══════════════════════════════════════════════════════════
def main():
    user = st.session_state["user"]
    profile = get_profile(user["username"])

    with st.sidebar:
        st.markdown('<div class="fnx-logo">FinNexus</div>', unsafe_allow_html=True)
        st.markdown('<div class="fnx-tag">Multi-agent intelligence</div>', unsafe_allow_html=True)
        st.markdown(f"**{user['display_name']}**")
        st.caption(f"@{user['username']} · {profile.risk_tolerance}")
        st.markdown("---")
        page = st.radio("Nav", ["Analyze", "Compare", "Portfolio", "History", "About"],
                        label_visibility="collapsed")
        st.markdown("---")
        st.caption("Momentum · Flow · Filing\nSentiment · Risk → Chair")
        st.markdown("")
        if st.button("Sign out", use_container_width=True):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.rerun()

    if page == "Analyze":
        analyze_page(user, profile)
    elif page == "Compare":
        compare_page(user["username"], profile)
    elif page == "Portfolio":
        portfolio_page(profile)
    elif page == "History":
        history_page(profile)
    else:
        about_page()


if "user" not in st.session_state:
    login_page()
else:
    main()
