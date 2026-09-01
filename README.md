# FinNexus

**Multi-Agent Autonomous Financial Intelligence for Retail Investors**

HACKVERSE 2026 · PS-01

## Agent Desk

| Agent | Role |
|-------|------|
| Momentum | Technicals — trend, RSI, DMA, breakouts |
| Flow | Volume & money — spikes, retail-trap detection |
| Filing | Fundamentals + RAG — SEBI filings, earnings, citations |
| Sentiment | Narrative — tone, crowding, hype vs substance |
| Risk & Behavior | Your profile — FOMO, concentration, F&O guardrails |
| Chair (Quorum) | Synthesis — agreement, dissent, memo. No fake certainty |

## Run (Windows PowerShell)

```powershell
cd D:\FinNexus
pip install -r requirements.txt
$env:PYTHONPATH = "."
streamlit run app.py
```

## Demo accounts

| User | Pass | Style |
|------|------|-------|
| riya | demo123 | Conservative |
| arjun | demo123 | Aggressive |
| priya | demo123 | Moderate |
| judge | hackverse | Fresh |

## Features

- 5 parallel agents + Chair synthesis
- Personal portfolio editor + impact simulator
- Multi-ticker comparison
- What-if risk toggle
- Full transparent reasoning chain
- PDF research memo
- Degraded-data path
- Zero artificial lag on analysis
