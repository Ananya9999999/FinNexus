# FinAgentVerse

**Multi-Agent Autonomous Financial Intelligence System for Retail Investors**

HACKVERSE: INTO THE WEB · Sprint 1 · PS-01  
IEEE RAS VIT Chennai · 2026

## Features

- **Authentication** — Login / Register (local JSON). Demo accounts ready.
- **Personal Portfolio Editor** — Add/edit/remove holdings (qty, avg price, weight %), risk tolerance, horizon, behavioral flags, cash %.
- **3 Parallel Specialized Agents**
  - Technical Signal (momentum + volume anomaly + RSI/MACD)
  - Fundamental RAG (SEBI filings & earnings transcripts + citations)
  - Sentiment / Macro
- **Synthesis Layer** — Confidence-weighted fusion + risk profile + behavioral dampening + concentration checks
- **Portfolio Impact Simulator** — See how recommendation changes your weights, cash, HHI, risk score
- **Agent Debate View** — Conflicts between agents highlighted
- **What-If Risk Toggle** — Instantly re-run under conservative / moderate / aggressive
- **Decision History** — Per-user past recommendations
- **PDF Research Memo Export**
- **Chat-style Ask Agents** routing
- **Graceful degraded-data path**
- Full transparent reasoning chain

## Quick Start (Windows PowerShell)

```powershell
cd D:\FinNexus
pip install -r requirements.txt
$env:PYTHONPATH = "."
streamlit run app.py
```

## Demo Accounts

| Username | Password   | Profile      |
|----------|------------|--------------|
| riya     | demo123    | Conservative |
| arjun    | demo123    | Aggressive   |
| priya    | demo123    | Moderate     |
| judge    | hackverse  | Empty (fresh)|

## Project Layout

```
finagent/
├── app.py
├── agents/
├── core/   (auth, user_profile, market_data, vector_store, orchestrator, portfolio_impact, pdf_export)
├── data/
├── docs/ARCHITECTURE.md
└── requirements.txt
```
