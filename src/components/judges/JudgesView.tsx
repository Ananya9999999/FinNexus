export function JudgesView() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 leading-relaxed">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">HACKVERSE · PS-01</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">QUORUM — agent architecture</h1>
      <p className="mt-3 text-muted">
        Multi-agent autonomous financial intelligence for Indian retail investors. This page is the written summary
        required alongside the live demo.
      </p>

      <h2 className="mt-10 font-display text-2xl">1. Architecture</h2>
      <pre className="mt-3 overflow-x-auto rounded-[16px] bg-surface p-4 text-xs text-muted shadow-[var(--shadow-border)]">{`Market tape ──► Momentum, Flow, Filing, Sentiment, Risk  (parallel)
                                      │
                                      ▼
                               Chair (synthesis)
                                      │
                         profile + concentration + dissent
                                      ▼
              Cited memo · impact · paper log · morning briefing`}</pre>

      <h2 className="mt-10 font-display text-2xl">2. Specialists</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>
          <strong>Momentum</strong> — 5d/20d return, RSI, MACD, SMA structure. Three independent dimensions.
        </li>
        <li>
          <strong>Flow</strong> — volume z-score, delivery %, PCR, IV rank, FII proxy, F&O trap detector.
        </li>
        <li>
          <strong>Filing</strong> — TF-IDF cosine retrieval over SEBI-style filings and earnings transcripts. Every
          claim is attributed.
        </li>
        <li>
          <strong>Sentiment</strong> — regime + SEBI F&O loss note + sector outlook.
        </li>
        <li>
          <strong>Risk</strong> — the signed-in investor’s book, flags, max position, F&O suitability. Can refuse.
        </li>
      </ul>

      <h2 className="mt-10 font-display text-2xl">3. Decision logic</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        <li>Confidence-weighted average of specialist scores.</li>
        <li>Risk multiplier: conservative attenuates, aggressive modestly amplifies.</li>
        <li>Behavioral flags: FOMO softens BUY; loss-aversion softens SELL.</li>
        <li>Concentration: existing weight near max position reduces further BUY size.</li>
        <li>Agreement boosts confidence; conflict is shown as dissent, never averaged into fake certainty.</li>
        <li>Trap / AVOID from Flow or Risk can override a constructive tape.</li>
      </ol>

      <h2 className="mt-10 font-display text-2xl">4. Profiling (required differentiation)</h2>
      <p className="mt-3 text-sm">
        Identical market input, three stored personas — Riya (conservative, loss-averse, concentrated HDFC/TCS), Arjun
        (aggressive, FOMO, 40% Reliance), Priya (moderate). Load them from the desk. What-if risk re-synthesizes without
        re-running specialists.
      </p>

      <h2 className="mt-10 font-display text-2xl">5. Degraded path</h2>
      <p className="mt-3 text-sm">
        “Degraded path” forces a synthetic snapshot with <code>data_quality=degraded</code>, lowers agent confidence,
        and never emits uncited claims. Individual agent exceptions become HOLD placeholders; the pipeline continues.
      </p>

      <h2 className="mt-10 font-display text-2xl">6. Metrics logged per session</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        <li>End-to-end latency (ms) and per-agent latency</li>
        <li>Agents succeeded / 5</li>
        <li>Signal agreement</li>
        <li>Portfolio HHI (concentration)</li>
        <li>Conviction (|score|) and 30-day forward-return proxy on the simulated tape</li>
        <li>Paper action: accept / size-down / ignore, persisted per user</li>
      </ul>

      <h2 className="mt-10 font-display text-2xl">7. Additional product surfaces</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>
          <strong>Morning briefing</strong> — overnight movers, filings, traps, sector heat on *your* book.
        </li>
        <li>
          <strong>Paper desk</strong> — accept a memo into the book, or size it down. History records the choice.
        </li>
        <li>
          <strong>Compare</strong> — two tickers, two chair verdicts, same profile.
        </li>
        <li>
          <strong>Ask the chair</strong> — natural language routed through the full pipeline, then Grok if available.
        </li>
        <li>
          <strong>Live traces + 3D constellation</strong> — agents light up as they finish; sources are tappable.
        </li>
      </ul>

      <h2 className="mt-10 font-display text-2xl">8. Demo script (90 seconds)</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        <li>Sign in (Google / X / email).</li>
        <li>Load Riya → run “Demo: earnings miss” on Reliance. Read thesis, citations, impact.</li>
        <li>Load Arjun on the same ticker — size and warnings change.</li>
        <li>Run “Demo: F&O trap” — AVOID + SEBI 89% note.</li>
        <li>Run “Degraded path” — pipeline lives, confidence drops, sources still cited.</li>
        <li>Accept or size-down the paper memo. Open History, Briefing, and this page.</li>
      </ol>
      <p className="mt-8 text-xs text-faint">
        Not investment advice. Simulated tape + synthetic filings for the hackathon corpus.
      </p>
    </article>
  );
}
