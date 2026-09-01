import { useCallback, useEffect, useState } from "react";
import { listDecisions } from "@/lib/server/analysis";
import type { DecisionRow } from "@/lib/types";
import { SignalBadge } from "@/components/ui/badge";
import { PaperBar } from "@/components/desk/PaperBar";

export function HistoryView() {
  const [rows, setRows] = useState<DecisionRow[] | null>(null);

  const reload = useCallback(() => {
    listDecisions()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!rows) return <div className="p-10 text-muted">Loading history…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="font-display text-3xl">Decision history</h1>
      <p className="mt-1 text-sm text-muted">
        Every run is stored against your account — latency, HHI, agreement, paper action.
      </p>
      <div className="mt-6 space-y-2">
        {rows.map((r) => (
          <article key={r.id} className="rounded-[16px] bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.ticker}</span>
                <SignalBadge signal={r.signal} />
              </div>
              <span className="text-xs tabular text-faint">{r.createdAt.slice(0, 16).replace("T", " ")}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{r.recommendation}</p>
            <p className="mt-2 text-xs tabular text-faint">
              conf {Math.round(r.confidence * 100)}% · score {r.score.toFixed(2)} · {Math.round(r.latencyMs)} ms · HHI{" "}
              {r.hhi} · {r.dataQuality}
            </p>
            <div className="mt-3">
              <PaperBar sessionId={r.sessionId} current={r.paperAction} sizeHintPct={4} onDone={reload} />
            </div>
          </article>
        ))}
        {!rows.length && (
          <p className="rounded-[16px] bg-surface p-8 text-center text-muted shadow-[var(--shadow-border)]">
            No memos yet. Run the desk once.
          </p>
        )}
      </div>
    </div>
  );
}
