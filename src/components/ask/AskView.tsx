import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runPipeline } from "@/lib/agents/orchestrator";
import { askChair } from "@/lib/server/ask";
import { getMyProfile } from "@/lib/server/profile";
import { checkGrokStatus } from "@/lib/server/grok";
import { saveDecision } from "@/lib/server/analysis";
import { useDesk } from "@/store/desk";
import { SignalBadge } from "@/components/ui/badge";
import { UNIVERSE } from "@/lib/market/universe";
import type { PipelineResult } from "@/lib/types";
import { Sparkles, Bot, AlertCircle, CheckCircle2, Key, Loader2, ArrowRight } from "lucide-react";

function guessTicker(q: string) {
  const u = q.toUpperCase();
  for (const row of UNIVERSE) {
    const bare = row.ticker.replace(".NS", "");
    if (u.includes(bare) || u.includes(row.name.toUpperCase())) return row.ticker;
  }
  return "RELIANCE.NS";
}

type Chat = {
  role: "user" | "chair";
  text: string;
  model?: string;
  isLiveGrok?: boolean;
  ticker?: string;
};

const PROMPTS = [
  "Should I add more TCS given my conservative profile?",
  "Is BANKNIFTY a trap for me right now?",
  "What happens to my book if Reliance drops 6%?",
  "Synthesize the SEBI filings and momentum for HDFCBANK",
];

export function AskView() {
  const desk = useDesk();
  const [q, setQ] = useState(PROMPTS[0]);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<Chat[]>([]);
  const [last, setLast] = useState<PipelineResult | null>(desk.result);
  const [grokStatus, setGrokStatus] = useState<{
    configured: boolean;
    maskedKey: string | null;
    model: string;
  } | null>(null);

  useEffect(() => {
    if (!desk.profile) {
      getMyProfile()
        .then((p) => desk.setProfile(p))
        .catch(() => {});
    }
    checkGrokStatus()
      .then((s) => setGrokStatus(s))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    if (!desk.profile || !q.trim()) return;
    const userQuery = q.trim();
    setBusy(true);
    setChat((c) => [...c, { role: "user", text: userQuery }]);

    try {
      const ticker = guessTicker(userQuery);
      const result = await runPipeline({ ticker, profile: desk.profile, tick: desk.tick });
      setLast(result);
      desk.setResult(result);
      saveDecision({ data: result }).catch(() => {});
      const ans = await askChair({ data: { question: userQuery, result } });

      setChat((c) => [
        ...c,
        {
          role: "chair",
          text: ans.text,
          model: ans.model,
          isLiveGrok: ans.isLiveGrok,
          ticker: result.ticker,
        },
      ]);
      // Refresh status in case user just added key
      checkGrokStatus().then((s) => setGrokStatus(s)).catch(() => {});
    } catch (err) {
      setChat((c) => [
        ...c,
        {
          role: "chair",
          text: err instanceof Error ? err.message : "The desk could not answer.",
          model: "error",
          isLiveGrok: false,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <Sparkles className="size-6 text-accent" />
            Ask the Chair
          </h1>
          <p className="mt-1 text-sm text-muted">
            Natural language routed through 5 parallel specialist agents & synthesized with Grok AI.
          </p>
        </div>

        {/* Grok Connection Badge */}
        {grokStatus && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
              grokStatus.configured
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
            }`}
          >
            {grokStatus.configured ? (
              <>
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Grok 4.5 Connected</span>
              </>
            ) : (
              <>
                <Key className="size-3 text-amber-400" />
                <span>Add GROK_API_KEY in .env</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Grok Key Setup Banner (if unconfigured) */}
      {grokStatus && !grokStatus.configured && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-200/90"
        >
          <div className="flex items-start gap-2.5">
            <Bot className="size-4 shrink-0 text-indigo-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-fg">Using Local Multi-Agent Fallback</p>
              <p className="text-muted leading-relaxed">
                To unlock full conversational Grok-4.5 reasoning, paste your key into the{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-indigo-300">.env</code> file:{" "}
                <code className="text-indigo-400 font-mono">GROK_API_KEY=your_key_here</code>. The server auto-detects it without restarting!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Suggestion Prompts */}
      <div className="mt-5 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className="rounded-full border border-border/60 bg-surface-2/60 px-3.5 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:bg-surface-2 hover:text-fg"
            onClick={() => setQ(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Transcript */}
      <div className="mt-6 space-y-4 min-h-[160px]">
        {chat.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-8 text-center backdrop-blur-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3">
              <Bot className="size-6" />
            </div>
            <h3 className="font-semibold text-fg">Quorum Chair Ready</h3>
            <p className="mt-1 text-xs text-muted max-w-md mx-auto">
              Ask any question about your holdings, portfolio risk, market momentum, or SEBI filings. The Chair synthesizes all 5 specialist agents in real-time.
            </p>
          </div>
        ) : (
          chat.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className={`rounded-2xl p-4 text-sm leading-relaxed border transition-all ${
                m.role === "user"
                  ? "bg-surface-2/80 border-border/80 ml-8"
                  : "bg-surface border-border shadow-[var(--shadow-border)] mr-4"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                  {m.role === "user" ? (
                    "You"
                  ) : (
                    <>
                      <Sparkles className="size-3 text-accent" />
                      Chair Response
                      {m.isLiveGrok && (
                        <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                          {m.model || "grok-4.5"}
                        </span>
                      )}
                    </>
                  )}
                </span>
                {m.ticker && (
                  <span className="text-[11px] font-mono text-muted/80">
                    Routed: {m.ticker}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-fg leading-relaxed">{m.text}</p>
            </motion.div>
          ))
        )}

        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted p-3 bg-surface/40 rounded-xl border border-border/40"
          >
            <Loader2 className="size-4 animate-spin text-accent" />
            <span>Routing through Momentum, Flow, Filing, Sentiment & Risk agents...</span>
          </motion.div>
        )}

        {last && !busy && (
          <div className="flex items-center gap-2 text-xs text-muted px-1 pt-1">
            <span>Last grounded target:</span>
            <span className="font-mono text-fg">{last.ticker}</span>
            <SignalBadge signal={last.synthesis.finalSignal} />
            <span className="text-muted/60">({Math.round(last.synthesis.confidence * 100)}% conf)</span>
          </div>
        )}
      </div>

      {/* Query Form */}
      <form onSubmit={onAsk} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about a stock, your portfolio, or market condition..."
          className="bg-surface-2/80 border-border h-11"
        />
        <Button
          type="submit"
          disabled={busy || !desk.profile || !q.trim()}
          className="sm:w-36 h-11 gap-1.5"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Analyzing</span>
            </>
          ) : (
            <>
              <span>Ask Chair</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
