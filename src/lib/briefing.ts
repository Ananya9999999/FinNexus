import type { BriefingItem, InvestorProfile, SectorHeat, SignalLabel } from "@/lib/types";
import { buildSnapshot } from "@/lib/market/engine";
import { findName } from "@/lib/market/universe";
import { searchFilings, tickerFilterFromSnapshot } from "@/lib/rag/search";
import { labelFromScore } from "@/lib/agents/contracts";
import { bareTicker } from "@/lib/utils";

function scoreSnapshot(ticker: string, tick: number) {
  const s = buildSnapshot(ticker, { tick });
  let score = 0;
  if (s.momentum5d > 2) score += 0.3;
  else if (s.momentum5d < -2) score -= 0.3;
  if (s.momentum20d > 5) score += 0.2;
  else if (s.momentum20d < -5) score -= 0.2;
  if (s.rsi14 > 70) score -= 0.25;
  else if (s.rsi14 < 30) score += 0.2;
  if (s.volumeZscore > 1.5 && s.changePct < 0) score -= 0.2;
  if (s.pcr < 0.7 && s.ivRank > 70) score -= 0.4;
  if (s.deliveryPct > 50 && s.changePct > 0) score += 0.12;
  const trap = (s.pcr < 0.7 && s.ivRank > 70) || (s.ivRank > 80 && s.rsi14 > 68);
  return { s, score, trap, signal: trap && score < -0.1 ? ("AVOID" as SignalLabel) : labelFromScore(score, 0.58) };
}

export function buildMorningBriefing(profile: InvestorProfile, tick: number) {
  const seen = new Set<string>();
  const items: BriefingItem[] = [];
  const alerts: string[] = [];

  const holdings = profile.holdings;
  const watch = profile.watchlist.filter(
    (t) => !holdings.some((h) => bareTicker(h.ticker) === bareTicker(t)),
  );

  for (const h of holdings) {
    const key = h.ticker.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(itemFrom(h.ticker, "holding", h.weightPct, profile, tick));
  }
  for (const t of watch) {
    const key = t.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(itemFrom(t, "watch", 0, profile, tick));
  }

  const concentrated = holdings.filter((h) => h.weightPct >= profile.maxPositionPct * 0.8);
  if (concentrated.length) {
    alerts.push(
      `Concentration: ${concentrated.map((h) => `${bareTicker(h.ticker)} ${h.weightPct}%`).join(", ")} near your ${profile.maxPositionPct}% cap.`,
    );
  }
  const traps = items.filter((i) => i.trap);
  if (traps.length) {
    alerts.push(`F&O / crowding trap on ${traps.map((t) => bareTicker(t.ticker)).join(", ")}. SEBI: 89% of retail F&O traders lose money.`);
  }
  const movers = items.filter((i) => Math.abs(i.changePct) >= 1.5);
  if (movers.length) {
    alerts.push(
      `Overnight movers: ${movers.map((m) => `${bareTicker(m.ticker)} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`).join(", ")}.`,
    );
  }
  if (profile.behavioralFlags.includes("fomo_prone")) {
    alerts.push("FOMO flag is on — the desk will refuse to endorse a chase after a spike.");
  }
  if (profile.cashPct < 8 && profile.riskTolerance !== "aggressive") {
    alerts.push(`Cash is only ${profile.cashPct}% — limited dry powder if a quality name goes on sale.`);
  }

  const bySector = new Map<string, { sum: number; n: number }>();
  for (const i of items) {
    const cur = bySector.get(i.sector) ?? { sum: 0, n: 0 };
    cur.sum += i.changePct;
    cur.n += 1;
    bySector.set(i.sector, cur);
  }
  const heat: SectorHeat[] = [...bySector.entries()]
    .map(([sector, v]) => ({ sector, changePct: Math.round((v.sum / v.n) * 100) / 100, count: v.n }))
    .sort((a, b) => b.changePct - a.changePct);

  const avg = items.length ? items.reduce((s, i) => s + i.changePct, 0) / items.length : 0;
  const marketTone =
    avg > 0.6
      ? "Your book opened constructive. Do not chase strength."
      : avg < -0.6
        ? "Soft open across the book. This is a research morning, not a panic morning."
        : "Quiet tape on your names. Use it to re-read filings, not to invent a trade.";

  return { items, alerts, heat, marketTone, asOf: new Date().toISOString() };
}

function itemFrom(
  ticker: string,
  kind: "holding" | "watch",
  weightPct: number,
  profile: InvestorProfile,
  tick: number,
): BriefingItem {
  const { s, trap, signal } = scoreSnapshot(ticker, tick);
  const meta = findName(ticker);
  const docs = searchFilings(`${tickerFilterFromSnapshot(ticker)} earnings outlook guidance`, {
    topK: 1,
    tickerFilter: tickerFilterFromSnapshot(ticker),
  });
  const filing = docs[0]
    ? { title: docs[0].title, snippet: docs[0].snippet, date: docs[0].date }
    : undefined;
  const concentration = weightPct >= profile.maxPositionPct * 0.8;
  const overnightNote =
    Math.abs(s.changePct) >= 1.2
      ? `${s.changePct >= 0 ? "Gap up" : "Gap down"} ${Math.abs(s.changePct).toFixed(2)}% vs prior close.`
      : "In-range overnight.";
  const headline = trap
    ? "Trap signature — do not add leverage."
    : concentration && (signal === "BUY" || signal === "STRONG_BUY")
      ? "Constructive tape, but you are already at max size."
      : signal === "AVOID" || signal === "STRONG_SELL"
        ? "Desk is defensive on this name this morning."
        : signal === "BUY" || signal === "STRONG_BUY"
          ? "Constructive setup worth a full memo."
          : filing
            ? "Quiet tape — a filing is the thing to read."
            : "No edge from the overnight print.";

  return {
    ticker: s.ticker,
    name: meta.name,
    sector: s.sector,
    kind,
    price: s.lastPrice,
    changePct: s.changePct,
    weightPct,
    signal,
    headline,
    filing,
    trap,
    concentration,
    overnightNote,
  };
}
