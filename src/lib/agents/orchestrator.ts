import type { AgentOutput, DemoScenario, InvestorProfile, PipelineResult, RiskTolerance, SignalLabel } from "@/lib/types";
import { runTechnicalAgent } from "@/lib/agents/technical";
import { runFlowAgent } from "@/lib/agents/flow";
import { runFilingAgent } from "@/lib/agents/filing";
import { runSentimentAgent } from "@/lib/agents/sentiment";
import { runRiskAgent } from "@/lib/agents/risk";
import { synthesize } from "@/lib/agents/synthesizer";
import { simulateImpact } from "@/lib/impact";
import { buildSnapshot } from "@/lib/market/engine";
import { labelFromScore } from "@/lib/agents/contracts";
import { normalizeTicker } from "@/lib/utils";

function hhi(profile: InvestorProfile) {
  const w = profile.holdings.map((h) => h.weightPct);
  const t = w.reduce((a, b) => a + b, 0) || 1;
  return Math.round(w.reduce((s, x) => s + (x / t) ** 2, 0) * 1000) / 1000;
}

const NAMES = ["Momentum", "Flow", "Filing", "Sentiment", "Risk"] as const;

function failedAgent(i: number, reason: unknown): AgentOutput {
  return {
    agentId: NAMES[i].toLowerCase(),
    agentName: NAMES[i],
    role: "failed",
    signal: "HOLD",
    confidence: 0.1,
    score: 0,
    reasoning: `Agent failed: ${reason instanceof Error ? reason.message : String(reason)}`,
    keyFactors: ["Exception — pipeline continued"],
    citations: [],
    metrics: {},
    latencyMs: 0,
    degraded: true,
    error: String(reason),
  };
}

export async function runPipeline(opts: {
  ticker: string;
  profile: InvestorProfile;
  scenario?: DemoScenario;
  whatIfRisk?: RiskTolerance;
  tick?: number;
  onAgent?: (agent: AgentOutput) => void;
}): Promise<PipelineResult> {
  const t0 = performance.now();
  const ticker = normalizeTicker(opts.ticker);
  const scenario: DemoScenario = opts.scenario === "degraded" ? "degraded" : (opts.scenario ?? "none");
  const market = buildSnapshot(ticker, { scenario, tick: opts.tick });

  const wrap = async (p: Promise<AgentOutput>, i: number) => {
    try {
      const v = await p;
      opts.onAgent?.(v);
      return v;
    } catch (reason) {
      const failed = failedAgent(i, reason);
      opts.onAgent?.(failed);
      return failed;
    }
  };

  const agents = await Promise.all([
    wrap(runTechnicalAgent(market), 0),
    wrap(runFlowAgent(market), 1),
    wrap(runFilingAgent(market), 2),
    wrap(runSentimentAgent(market), 3),
    wrap(runRiskAgent(market, opts.profile), 4),
  ]);

  const synthesis = synthesize(agents, market, opts.profile, opts.whatIfRisk);
  const impact = simulateImpact(opts.profile, market, synthesis.finalSignal, synthesis.positionHintPct);
  const totalLatencyMs = Math.round((performance.now() - t0) * 10) / 10;
  const sessionId = `Q-${Date.now().toString(36).toUpperCase()}`;

  const series = market.series;
  const fwd =
    series.length > 21 ? (series[series.length - 1].close / series[series.length - 22].close - 1) * 100 : 0;
  const signedFwd =
    synthesis.score === 0 ? 0 : Math.sign(synthesis.score) === Math.sign(fwd) ? Math.abs(fwd) : -Math.abs(fwd);

  return {
    sessionId,
    timestamp: new Date().toISOString(),
    ticker: market.ticker,
    market,
    profile: {
      displayName: opts.profile.displayName,
      riskTolerance: opts.whatIfRisk ?? opts.profile.riskTolerance,
      investmentHorizon: opts.profile.investmentHorizon,
      behavioralFlags: opts.profile.behavioralFlags,
      maxPositionPct: opts.profile.maxPositionPct,
      cashPct: opts.profile.cashPct,
    },
    agents,
    synthesis,
    impact,
    metrics: {
      sessionId,
      ticker: market.ticker,
      totalLatencyMs,
      agentLatencies: Object.fromEntries(agents.map((a) => [a.agentName, a.latencyMs])),
      dataQuality: market.dataQuality,
      numAgentsSucceeded: agents.filter((a) => !a.error).length,
      signalAgreement: synthesis.agreement,
      portfolioHhi: hhi(opts.profile),
      finalConfidence: synthesis.confidence,
      convictionScore: Math.abs(synthesis.score),
      forwardReturnProxy: Math.round(signedFwd * 100) / 100,
    },
  };
}

export function quickSignal(ticker: string, tick: number): SignalLabel {
  const s = buildSnapshot(ticker, { tick });
  let score = 0;
  if (s.momentum5d > 2) score += 0.3;
  else if (s.momentum5d < -2) score -= 0.3;
  if (s.rsi14 > 70) score -= 0.25;
  else if (s.rsi14 < 30) score += 0.2;
  if (s.volumeZscore > 1.5 && s.changePct < 0) score -= 0.2;
  if (s.pcr < 0.7 && s.ivRank > 70) score -= 0.35;
  return labelFromScore(score, 0.55);
}
