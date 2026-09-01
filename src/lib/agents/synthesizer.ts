import type {
  AgentOutput,
  InvestorProfile,
  MarketSnapshot,
  RiskTolerance,
  SignalLabel,
  Synthesis,
} from "@/lib/types";
import { labelFromScore } from "@/lib/agents/contracts";
import { bareTicker } from "@/lib/utils";

function holdingWeight(profile: InvestorProfile, ticker: string) {
  const bare = bareTicker(ticker);
  const h = profile.holdings.find((x) => x.ticker === ticker || bareTicker(x.ticker) === bare);
  return h?.weightPct ?? 0;
}

const ACTION: Record<SignalLabel, string> = {
  STRONG_BUY: "Consider initiating or adding a high-conviction position",
  BUY: "Favorable setup for a measured long allocation",
  HOLD: "No strong edge — maintain current exposure or stay in cash",
  SELL: "Consider reducing exposure",
  STRONG_SELL: "Strong case to exit or significantly reduce",
  AVOID: "Do not add. This setup is outside your risk budget",
};

export function synthesize(
  agents: AgentOutput[],
  snapshot: MarketSnapshot,
  profile: InvestorProfile,
  whatIfRisk?: RiskTolerance,
): Synthesis {
  const t0 = performance.now();
  const risk = whatIfRisk ?? profile.riskTolerance;
  const valid = agents.filter((a) => !a.error);
  if (!valid.length) {
    return {
      finalSignal: "HOLD",
      confidence: 0.2,
      score: 0,
      recommendation: "Insufficient agent outputs — HOLD. System in degraded mode.",
      thesis: "No reliable signals available.",
      dissent: "All specialists failed or returned errors.",
      invalidation: "Restore a live data feed before acting.",
      personalizedNote: "No reliable signals available.",
      positionHintPct: 0,
      agentWeights: {},
      reasoningChain: ["All agents failed or returned errors."],
      riskAdjustment: "N/A",
      agreement: 0,
      latencyMs: Math.round(performance.now() - t0),
      degraded: true,
      currentHoldingPct: holdingWeight(profile, snapshot.ticker),
    };
  }

  const totalW = valid.reduce((s, a) => s + a.confidence, 0) || 1e-9;
  const base = valid.reduce((s, a) => s + a.score * a.confidence, 0) / totalW;

  let adj = base;
  let riskNote = "Moderate profile — neutral weighting";
  if (risk === "conservative") {
    adj = base * 0.7;
    if (Math.abs(snapshot.momentum5d) > 3 || snapshot.volumeZscore > 1.8) {
      adj *= 0.8;
      riskNote = "Volatility dampening applied for conservative profile";
    } else {
      riskNote = "Conservative risk multiplier applied (signals attenuated)";
    }
  } else if (risk === "aggressive") {
    adj = base * 1.15;
    riskNote = "Aggressive profile — signals amplified modestly";
  }

  const behavioral: string[] = [];
  if (profile.behavioralFlags.includes("fomo_prone") && adj > 0.4) {
    adj *= 0.85;
    behavioral.push("FOMO-prone: conviction reduced to avoid a chase");
  }
  if (profile.behavioralFlags.includes("loss_averse") && adj < -0.3) {
    adj *= 0.75;
    behavioral.push("Loss-averse: SELL signal softened");
  }

  const currentWeight = holdingWeight(profile, snapshot.ticker);
  let concentrationWarning = "";
  if (currentWeight > profile.maxPositionPct * 0.8 && adj > 0) {
    adj *= 0.7;
    concentrationWarning = `Already ${currentWeight.toFixed(0)}% of portfolio (near max ${profile.maxPositionPct}%) — reduced BUY size`;
    behavioral.push(concentrationWarning);
  }

  const trapAgent = valid.find((a) => a.agentId === "flow" && (a.metrics.trap === 1 || a.signal === "AVOID"));
  const riskAgent = valid.find((a) => a.agentId === "risk");
  let trapWarning: string | undefined;
  if (trapAgent) {
    trapWarning = "F&O / crowding trap detected. Leverage is not the same as investing.";
    if (risk !== "aggressive") adj = Math.min(adj, -0.15);
  }
  if (riskAgent?.signal === "AVOID") {
    adj = Math.min(adj, -0.2);
  }

  adj = Math.max(-1, Math.min(1, adj));

  let conf = valid.reduce((s, a) => s + a.confidence, 0) / valid.length;
  const signs = valid.map((a) => (a.score > 0.15 ? 1 : a.score < -0.15 ? -1 : 0));
  const agreement = Math.abs(signs.reduce((s: number, x: number) => s + x, 0)) / (signs.length || 1);
  conf = Math.min(0.92, conf * (0.85 + 0.15 * agreement));
  conf = Math.round(conf * 100) / 100;

  let finalSignal = labelFromScore(adj, conf);
  if (trapWarning && risk === "conservative") finalSignal = "AVOID";
  if (riskAgent?.signal === "AVOID" && risk !== "aggressive") finalSignal = "AVOID";

  let posHint = 0;
  if (finalSignal === "BUY" || finalSignal === "STRONG_BUY") {
    posHint = Math.min(profile.maxPositionPct * (0.5 + 0.5 * Math.abs(adj)), profile.maxPositionPct);
  } else if ((finalSignal === "SELL" || finalSignal === "STRONG_SELL") && currentWeight > 0) {
    posHint = -Math.min(currentWeight, profile.maxPositionPct * 0.5);
  }

  const bull = valid.filter((a) => a.score > 0.15);
  const bear = valid.filter((a) => a.score < -0.15);
  const dissent =
    bull.length && bear.length
      ? `${bull.map((a) => a.agentName).join(", ")} lean constructive; ${bear.map((a) => a.agentName).join(", ")} dissent. Chair did not average this into fake certainty.`
      : "No material dissent among specialists.";

  const thesis = `${ACTION[finalSignal]} in ${snapshot.name} (${snapshot.ticker}) at ~₹${snapshot.lastPrice.toLocaleString("en-IN")}. Personalized conviction ${Math.round(conf * 100)}%. ${concentrationWarning} Suggested size ${Math.abs(posHint).toFixed(1)}% of book.`;

  const invalidation =
    adj >= 0
      ? `Thesis dies if RSI > 75 with falling delivery, a filing that cuts guidance, or a close below SMA50 (₹${snapshot.sma50.toLocaleString("en-IN")}).`
      : `Thesis dies if delivery confirms a reversal, RSI exits oversold with rising volume, or a constructive filing update.`;

  const chain = [
    `1. Parallel specialists: ${agents.map((a) => a.agentName).join(", ")}`,
    `2. Valid outputs ${valid.length}/${agents.length}. Confidence-weighted base score = ${base >= 0 ? "+" : ""}${base.toFixed(3)}`,
    `3. Profile '${profile.displayName}' (risk=${risk}, horizon=${profile.investmentHorizon}) → ${riskNote}`,
    `4. Behavioral adjustments: ${behavioral.join("; ") || "none"}`,
    `5. Final adjusted score = ${adj >= 0 ? "+" : ""}${adj.toFixed(3)} → ${finalSignal} (conf ${conf})`,
    ...valid.map(
      (a) =>
        `   • ${a.agentName}: ${a.signal} (score ${a.score >= 0 ? "+" : ""}${a.score.toFixed(2)}, conf ${a.confidence}) — ${a.keyFactors[0] ?? a.reasoning.slice(0, 80)}`,
    ),
  ];

  const rec = `For ${profile.displayName}: ${thesis}`;

  return {
    finalSignal,
    confidence: conf,
    score: Math.round(adj * 1000) / 1000,
    recommendation: rec,
    thesis,
    dissent,
    invalidation,
    personalizedNote: `Risk tolerance '${risk}' and flags [${profile.behavioralFlags.join(", ") || "none"}] materially shaped this memo.`,
    positionHintPct: Math.round(posHint * 10) / 10,
    agentWeights: Object.fromEntries(valid.map((a) => [a.agentName, Math.round((a.confidence / totalW) * 1000) / 1000])),
    reasoningChain: chain,
    riskAdjustment: riskNote,
    agreement: Math.round(agreement * 100) / 100,
    latencyMs: Math.round((performance.now() - t0) * 10) / 10,
    degraded: agents.some((a) => a.degraded) || valid.length < agents.length,
    currentHoldingPct: currentWeight,
    trapWarning,
  };
}
