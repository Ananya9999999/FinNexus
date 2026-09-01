import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalBadge } from "@/components/ui/badge";
import { buildMorningBriefing } from "@/lib/briefing";
import { getMyProfile } from "@/lib/server/profile";
import { useDesk } from "@/store/desk";
import { formatInr, formatPct } from "@/lib/utils";
import type { InvestorProfile } from "@/lib/types";

export function BriefingView() {
  const desk = useDesk();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InvestorProfile | null>(desk.profile);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        desk.setProfile(p);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brief = useMemo(() => {
    if (!profile) return null;
    return buildMorningBriefing(profile, desk.tick);
  }, [profile, desk.tick]);

  function openTicker(ticker: string) {
    desk.setTicker(ticker);
    void navigate({ to: "/desk" });
  }

  if (!profile || !brief) {
    return <div className="p-10 text-muted">Loading briefing…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Overnight</p>
      <h1 className="font-display text-3xl tracking-tight">Morning briefing</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{brief.marketTone}</p>

      {brief.alerts.length > 0 && (
        <div className="mt-5 space-y-2">
          {brief.alerts.map((a) => (
            <div
              key={a}
              className="flex gap-2 rounded-[16px] bg-warn/10 px-3 py-2 text-sm text-warn shadow-[var(--shadow-border)]"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {brief.heat.length > 0 && (
        <div className="mt-6 rounded-[20px] bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted">Sector heat on your book</p>
          <div className="space-y-2">
            {brief.heat.map((h) => (
              <div key={h.sector} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-muted">{h.sector}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${h.changePct >= 0 ? "bg-up" : "bg-down"}`}
                    style={{ width: `${Math.min(100, 40 + Math.abs(h.changePct) * 12)}%` }}
                  />
                </div>
                <span className={`w-16 text-right tabular ${h.changePct >= 0 ? "text-up" : "text-down"}`}>
                  {formatPct(h.changePct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {brief.items.map((item, i) => (
          <motion.article
            key={item.ticker}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: i * 0.04 }}
            className="rounded-[20px] bg-surface p-4 shadow-[var(--shadow-border)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{item.name}</h2>
                  <SignalBadge signal={item.signal} />
                </div>
                <p className="text-xs text-faint">
                  {item.kind === "holding" ? "Holding" : "Watch"} · {item.sector}
                  {item.weightPct > 0 ? ` · ${item.weightPct}%` : ""}
                </p>
              </div>
              <div className="text-right">
                <div className="tabular text-sm">{formatInr(item.price, 0)}</div>
                <div className={`tabular text-xs ${item.changePct >= 0 ? "text-up" : "text-down"}`}>
                  {formatPct(item.changePct)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{item.headline}</p>
            <p className="mt-1 text-xs text-muted">{item.overnightNote}</p>
            {item.filing && (
              <p className="mt-2 text-xs text-faint">
                {item.filing.title}
                {item.filing.date ? ` · ${item.filing.date}` : ""} — {item.filing.snippet}
              </p>
            )}
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => openTicker(item.ticker)}>
              Run memo <ArrowRight className="size-3.5" />
            </Button>
          </motion.article>
        ))}
      </div>

      {!brief.items.length && (
        <div className="mt-8 rounded-[20px] bg-surface p-8 text-center text-muted shadow-[var(--shadow-border)]">
          Add holdings or a watchlist on{" "}
          <Link to="/portfolio" className="text-fg underline">
            Portfolio
          </Link>{" "}
          to get a briefing.
        </div>
      )}
    </div>
  );
}
