import type { InvestorProfile, MarketSnapshot, PortfolioImpact, SignalLabel } from "@/lib/types";
import { bareTicker } from "@/lib/utils";

function weightOf(profile: InvestorProfile, ticker: string) {
  const bare = bareTicker(ticker);
  return profile.holdings.find((h) => h.ticker === ticker || bareTicker(h.ticker) === bare)?.weightPct ?? 0;
}

function hhiFrom(weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0) || 1e-9;
  const shares = weights.map((w) => w / total);
  return Math.round(shares.reduce((s, x) => s + x * x, 0) * 1000) / 1000;
}

export function simulateImpact(
  profile: InvestorProfile,
  snapshot: MarketSnapshot,
  signal: SignalLabel,
  positionHintPct: number,
): PortfolioImpact {
  const ticker = snapshot.ticker;
  const current = weightOf(profile, ticker);
  const cash = profile.cashPct;
  const others = profile.holdings
    .filter((h) => h.ticker !== ticker && bareTicker(h.ticker) !== bareTicker(ticker))
    .map((h) => h.weightPct);
  const hhiBefore = hhiFrom(profile.holdings.map((h) => h.weightPct));

  let newWeight = current;
  let newCash = cash;
  let action = "No change recommended";
  if (signal === "BUY" || signal === "STRONG_BUY") {
    const delta = Math.min(Math.abs(positionHintPct), cash * 0.8);
    newWeight = current + delta;
    newCash = Math.max(0, cash - delta);
    action = `Add ~${delta.toFixed(1)}% allocation`;
  } else if (signal === "SELL" || signal === "STRONG_SELL") {
    const delta = Math.min(Math.abs(positionHintPct), current);
    newWeight = Math.max(0, current - delta);
    newCash = cash + delta;
    action = `Reduce by ~${delta.toFixed(1)}%`;
  } else if (signal === "AVOID") {
    action = "Do not add — risk overlay blocked the trade";
  }

  const allNew = [...others, ...(newWeight > 0 ? [newWeight] : [])];
  const hhiAfter = hhiFrom(allNew);
  const riskBefore = Math.min(100, hhiBefore * 80 + (100 - cash) * 0.3);
  const riskAfter = Math.min(100, hhiAfter * 80 + (100 - newCash) * 0.3);

  let diversificationNote = "Neutral impact on concentration";
  if (hhiAfter < hhiBefore - 0.05) diversificationNote = "Improves diversification";
  else if (hhiAfter > hhiBefore + 0.05) diversificationNote = "Increases concentration risk";

  return {
    action,
    currentWeightPct: Math.round(current * 10) / 10,
    proposedWeightPct: Math.round(newWeight * 10) / 10,
    deltaPct: Math.round((newWeight - current) * 10) / 10,
    cashBefore: Math.round(cash * 10) / 10,
    cashAfter: Math.round(newCash * 10) / 10,
    hhiBefore,
    hhiAfter,
    riskScoreBefore: Math.round(riskBefore * 10) / 10,
    riskScoreAfter: Math.round(riskAfter * 10) / 10,
    diversificationNote,
    withinLimits: newWeight <= profile.maxPositionPct + 0.5,
    maxPositionLimit: profile.maxPositionPct,
  };
}
