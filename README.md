# FinAgentVerse

**Multi-Agent Autonomous Financial Intelligence System for Retail Investors**

HACKVERSE: INTO THE WEB · Sprint 1 – Rapid Vibe Coding · PS-01  
IEEE Robotics & Automation Society · VIT Chennai Student Chapter · 2026

## Quick Start

```bash
cd finagent
pip install -r requirements.txt
PYTHONPATH=. streamlit run app.py
```

Open http://localhost:8501

1. Select an investor profile (Conservative / Moderate / Aggressive)
2. Enter a ticker (e.g. `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `INFY.NS`)
3. Click **Run Multi-Agent Analysis**
4. Use **Demo Degraded Data Path** to show graceful failure handling

## What is implemented

- ✅ Signal classification across 3+ dimensions (momentum, volume anomaly, RSI/MACD)
- ✅ RAG over synthetic SEBI filings & earnings transcripts with visible attribution
- ✅ 3 specialized agents running in parallel + synthesis layer
- ✅ User profiling that changes outputs for identical market inputs
- ✅ Live Streamlit interface: signals, agent traces, citations, portfolio state
- ✅ Performance log (latency, agreement, concentration, conviction…)
- ✅ Full reasoning chain visible
- ✅ Degraded-data path
- ✅ Written architecture summary (`docs/ARCHITECTURE.md`)

## Project Layout

```
finagent/
├── app.py                 # Streamlit UI
├── agents/                # Technical, FundamentalRAG, Sentiment, Synthesizer
├── core/                  # market_data, vector_store, user_profile, orchestrator
├── data/                  # synthetic_filings.py
├── docs/ARCHITECTURE.md   # Judge-facing summary
├── logs/                  # Session JSON logs
└── requirements.txt
```

## Notes for Judges

- yfinance may fall back to synthetic snapshots under rate limits / auth issues; the degraded path is fully functional and explicitly demoable.
- All agent outputs are structured, cited where applicable, and the synthesis layer produces a transparent, auditable chain.
- Different user profiles produce observably different recommendations and position sizing on the same ticker.
