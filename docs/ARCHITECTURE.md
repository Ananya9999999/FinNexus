# FinAgentVerse – Agent Architecture & Decision Logic

**Hackathon:** HACKVERSE: INTO THE WEB · Sprint 1 · PS-01  
**Team deliverable for judges**

## 1. High-Level Architecture

```
┌──────────────────┐     ┌─────────────────────────────────────────────┐
│  Market Data     │     │              User Profile Store             │
│  (yfinance /     │     │  risk_tolerance, holdings, behavioral flags │
│   synthetic)     │     └──────────────────┬──────────────────────────┘
└────────┬─────────┘                        │
         │                                  │
         ▼                                  │
┌──────────────────────────────────────────┴──────────────────────────┐
│                     Orchestrator (parallel dispatch)                 │
│  ThreadPoolExecutor → 3 specialized agents concurrently              │
└──────┬──────────────────────┬──────────────────────┬────────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐    ┌────────────────────┐   ┌────────────────────┐
│ Technical    │    │ FundamentalRAG     │   │ SentimentMacro     │
│ Signal Agent │    │ Agent              │   │ Agent              │
│              │    │                    │   │                    │
│ • Momentum   │    │ • FAISS + MiniLM   │   │ • Regime proxy     │
│ • Volume Z   │    │ • SEBI / earnings  │   │ • Macro docs       │
│ • RSI/MACD   │    │ • Cited grounding  │   │ • Participation    │
└──────┬───────┘    └─────────┬──────────┘   └─────────┬──────────┘
       │                      │                        │
       └──────────────────────┼────────────────────────┘
                              ▼
                 ┌────────────────────────────┐
                 │     Synthesis Layer        │
                 │  • Confidence-weighted     │
                 │    score fusion            │
                 │  • Risk multiplier         │
                 │  • Behavioral dampening    │
                 │  • Concentration check     │
                 │  • Full reasoning chain    │
                 └────────────┬───────────────┘
                              ▼
                 ┌────────────────────────────┐
                 │  Live UI + Session Logs    │
                 │  (Streamlit + JSON)        │
                 └────────────────────────────┘
```

## 2. Specialized Agents (Minimum 3, Parallel)

| Agent | Role | Dimensions / Method | Output Contract |
|-------|------|---------------------|-----------------|
| **TechnicalSignalAgent** | Price/volume technical classification | 1. Momentum (5d/20d) 2. Volume anomaly (z-score) 3. Oscillators (RSI + MACD) + SMA structure | `signal`, `confidence`, `score ∈ [-1,1]`, `key_factors`, `citations` (data feed), `metrics` |
| **FundamentalRAGAgent** | Grounded fundamental view | Semantic retrieval (sentence-transformers + FAISS) over synthetic SEBI filings & earnings transcripts; lexicon + growth extraction | Same contract + explicit source attribution |
| **SentimentMacroAgent** | Market regime + regulatory context | Participation signals + macro document retrieval (SEBI F&O loss stats, sector notes) | Same contract |

All three execute **in parallel** via `ThreadPoolExecutor`. Structured outputs are consumed by the synthesis layer.

## 3. Decision Logic (Synthesis)

1. **Base score** = confidence-weighted average of agent scores.
2. **Risk multiplier** by profile:
   - Conservative → attenuate magnitude (×0.7) + extra dampening on high vol.
   - Aggressive → modest amplification (×1.15).
   - Moderate → identity.
3. **Behavioral flags**:
   - `fomo_prone` softens strong BUY.
   - `loss_averse` softens strong SELL.
4. **Portfolio concentration**: if existing weight near `max_position_pct`, reduce further BUY size.
5. **Agreement boost**: higher consensus among agents raises final confidence.
6. Final label derived from adjusted score + confidence threshold (HOLD if low conviction).

The **entire chain is logged and displayed** so any human observer can audit why a recommendation was produced.

## 4. RAG Component

- Corpus: 8 synthetic but realistic documents (earnings call excerpts + SEBI-style disclosures) covering RELIANCE, TCS, HDFCBANK, INFY + macro.
- Embedding: `all-MiniLM-L6-v2` + FAISS IndexFlatIP (cosine).
- Fallback: keyword overlap if embeddings unavailable.
- Attribution: every FundamentalRAG output surfaces `title`, `date`, `type`, and snippet to the user.

## 5. User Profiling Differentiation

Identical market input + different profiles demonstrably yield different:
- Final score magnitude
- Position size hints
- Presence of concentration / FOMO / loss-aversion notes

Demo profiles: Riya (Conservative), Arjun (Aggressive), Priya (Moderate).

## 6. Degraded-Data Handling

- Market data fetch failure → deterministic synthetic snapshot with `data_quality="degraded"` and lowered agent confidence.
- Explicit “Demo Degraded Data Path” button forces this path.
- Individual agent exceptions → placeholder HOLD with error note; pipeline continues.
- No uncited outputs are emitted.

## 7. Performance Metrics Logged (per session)

1. Total end-to-end latency (ms)
2. Per-agent latency
3. Number of agents succeeded
4. Signal agreement score
5. Portfolio risk concentration (HHI)
6. Final confidence & conviction (|score|)

Logs written to `logs/<session_id>_<ticker>.json`.

## 8. Tech Stack (Rapid Vibe)

- Python 3.12, Streamlit, yfinance, pandas, numpy, plotly
- sentence-transformers + FAISS for local RAG
- Concurrent futures for true parallel agent execution
- Zero external LLM API required for core demo (rule + retrieval grounded); architecture ready for LLM upgrade inside each agent.

## 9. How to Run

```bash
cd finagent
streamlit run app.py
```

Select profile → enter ticker → Run. Use “Demo Degraded Data Path” to satisfy the graceful-degradation requirement in one click.
