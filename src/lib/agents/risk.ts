import type { AgentOutput, InvestorProfile, MarketSnapshot } from "@/lib/types";
import { baseOutput, labelFromScore, withLatency } from "@/lib/agents/contracts";
import { bareTicker } from "@/lib/utils";

function holdingWeight(profile: InvestorProfile, ticker: string) {
  const bare = bareTicker(ticker);
  const h = profile.holdings.find(
    (x) => x.ticker === ticker || bareTicker(x.ticker) === bare,
  );
  return h?.weightPct ?? 0;
}

function hhi(profile: InvestorProfile) {
  const w = profile.holdings.map((h) => h.weightPct);
  const t = w.reduce((a, b) => a + b, 0) || 1;
  return w.reduce((s, x) => s + (x / t) ** 2, 0);
}

export async function runRiskAgent(snapshot: MarketSnapshot, profile: InvestorProfile): Promise<AgentOutput> {
  const { value, latencyMs } = await withLatency(240, 520, () => {
    const w = holdingWeight(profile, snapshot.ticker);
    const conc = hhi(profile);
    const factors: string[] = [];
    let score = 0;

    if (profile.riskTolerance === "conservative") {
      score -= 0.08;
      factors.push("Conservative mandate — require a higher bar for new risk");
    } else if (profile.riskTolerance === "aggressive") {
      score += 0.08;
      factors.push("Aggressive mandate — can warehouse more volatility");
    }

    if (w > profile.maxPositionPct * 0.8) {
      score -= 0.35;
      factors.push(`Already ${w.toFixed(0)}% of book (max ${profile.maxPositionPct}%) — concentration brake`);
    } else if (w > 0) {
      factors.push(`Existing weight ${w.toFixed(1)}%`);
    }

    if (conc > 0.28) {
      score -= 0.2;
      factors.push(`Portfolio HHI ${conc.toFixed(2)} — concentrated`);
    }

    if (profile.behavioralFlags.includes("fomo_prone") && snapshot.momentum5d > 3) {
      score -= 0.25;
      factors.push("FOMO-prone + 5d spike — refuse to endorse a chase");
    }
    if (profile.behavioralFlags.includes("loss_averse") && snapshot.changePct < -2) {
      factors.push("Loss-averse: do not panic-sell a quality name on a single print");
      score += 0.08;
    }
    if (profile.behavioralFlags.includes("momentum_chaser") && snapshot.rsi14 > 70) {
      score -= 0.22;
      factors.push("Momentum-chaser + overbought RSI — behavioral override");
    }

    const isFno = snapshot.ticker === "BANKNIFTY" || snapshot.sector.includes("F&O");
    if (isFno && profile.riskTolerance !== "aggressive") {
      score -= 0.45;
      factors.push("F&O product is outside this investor's risk budget");
    }
    if (profile.avoidSectors.some((s) => snapshot.sector.toLowerCase().includes(s.toLowerCase()))) {
      score -= 0.2;
      factors.push(`Sector ${snapshot.sector} is on the avoid list`);
    }
    if (profile.cashPct < 8 && profile.riskTolerance !== "aggressive") {
      score -= 0.1;
      factors.push(`Cash only ${profile.cashPct.toFixed(0)}% — limited dry powder`);
    }

    const portHit = (w / 100) * 6;
    if (w >= 20) {
      factors.push(`A 6% drop in ${bareTicker(snapshot.ticker)} is a ~${portHit.toFixed(1)}% book hit`);
    }

    score = Math.max(-1, Math.min(1, score));
    const conf = Math.round(Math.min(0.88, 0.62 + 0.2 * Math.abs(score)) * 100) / 100;
    const signal = isFno && profile.riskTolerance === "conservative" ? "AVOID" : labelFromScore(score, conf);

    return baseOutput({
      agentId: "risk",
      agentName: "Risk",
      role: "Investor profile, concentration, behavioral guardrails, F&O suitability",
      signal,
      confidence: conf,
      score: Math.round(score * 1000) / 1000,
      reasoning: `Risk overlay for ${profile.displayName} (${profile.riskTolerance}, horizon ${profile.investmentHorizon}). ${factors.join("; ") || "No material profile conflicts."} This agent can downgrade or refuse a trade even when others are constructive.`,
      keyFactors: factors.slice(0, 6),
      citations: [
        {
          source: "Investor profile store",
          snippet: `Risk ${profile.riskTolerance}, max pos ${profile.maxPositionPct}%, cash ${profile.cashPct}%, flags ${profile.behavioralFlags.join(", ") || "none"}, HHI ${conc.toFixed(3)}`,
        },
      ],
      metrics: {
        holdingWeight: w,
        hhi: Math.round(conc * 1000) / 1000,
        cashPct: profile.cashPct,
        maxPositionPct: profile.maxPositionPct,
      },
      degraded: false,
    });
  });
  return { ...value, latencyMs };
}
