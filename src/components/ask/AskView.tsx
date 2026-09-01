import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runPipeline } from "@/lib/agents/orchestrator";
import { askChair } from "@/lib/server/ask";
import { getMyProfile } from "@/lib/server/profile";
import { saveDecision } from "@/lib/server/analysis";
import { useDesk } from "@/store/desk";
import { SignalBadge } from "@/components/ui/badge";
import { UNIVERSE } from "@/lib/market/universe";
import type { PipelineResult } from "@/lib/types";

function guessTicker(q: string) {
  const u = q.toUpperCase();
  for (const row of UNIVERSE) {
    const bare = row.ticker.replace(".NS", "");
    if (u.includes(bare) || u.includes(row.name.toUpperCase())) return row.ticker;
  }
  return "RELIANCE.NS";
}

type Chat = { role: "user" | "chair"; text: string };

const PROMPTS = [
  "Should I add more TCS given my conservative profile?",
  "Is BANKNIFTY a trap for me right now?",
  "What happens to my book if Reliance drops 6%?",
];

export function AskView() {
  const desk = useDesk();
  const [q, setQ] = useState(PROMPTS[0]);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<Chat[]>([]);
  const [last, setLast] = useState<PipelineResult | null>(desk.result);

  useEffect(() => {
    if (!desk.profile) {
      getMyProfile()
        .then((p) => desk.setProfile(p))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    if (!desk.profile || !q.trim()) return;
    setBusy(true);
    setChat((c) => [...c, { role: "user", text: q.trim() }]);
    try {
      const ticker = guessTicker(q);
      const result = await runPipeline({ ticker, profile: desk.profile, tick: desk.tick });
      setLast(result);
      desk.setResult(result);
      saveDecision({ data: result }).catch(() => {});
      const ans = await askChair({ data: { question: q.trim(), result } });
      setChat((c) => [...c, { role: "chair", text: ans.text }]);
    } catch (err) {
      setChat((c) => [
        ...c,
        { role: "chair", text: err instanceof Error ? err.message : "The desk could not answer." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-3xl">Ask the chair</h1>
      <p className="mt-1 text-sm text-muted">
        Natural language is routed through the full five-agent pipeline, then answered from the cited memo.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-muted hover:text-fg"
            onClick={() => setQ(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {chat.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            className={`rounded-[16px] p-4 text-sm leading-relaxed ${
              m.role === "user" ? "bg-surface-2" : "bg-surface shadow-[var(--shadow-border)]"
            }`}
          >
            <p className="mb-1 text-[11px] uppercase tracking-wider text-faint">
              {m.role === "user" ? "You" : "Chair"}
            </p>
            <p className="whitespace-pre-wrap">{m.text}</p>
          </motion.div>
        ))}
        {last && (
          <div className="flex items-center gap-2 text-xs text-muted">
            Last routed analysis: {last.ticker} <SignalBadge signal={last.synthesis.finalSignal} />
          </div>
        )}
      </div>

      <form onSubmit={onAsk} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a holding…" />
        <Button type="submit" disabled={busy || !desk.profile} className="sm:w-40">
          {busy ? "Running…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
