import type { AgentOutput, MarketSnapshot } from "@/lib/types";
import { baseOutput, labelFromScore, withLatency } from "@/lib/agents/contracts";

export async function runFlowAgent(snapshot: MarketSnapshot): Promise<AgentOutput> {
  const { value, latencyMs } = await withLatency(320, 700, () => {
    const degraded = snapshot.dataQuality === "degraded";
    let score = 0;
    const factors: string[] = [];
    let trap = false;

    if (snapshot.volumeZscore > 1.8 && snapshot.changePct < 0) {
      score -= 0.35;
      factors.push("Distribution: heavy volume on a down print");
    } else if (snapshot.volumeZscore > 1.5 && snapshot.changePct > 0 && snapshot.deliveryPct < 30) {
      score -= 0.15;
      factors.push("High volume but weak delivery — short-term speculative flow");
    } else if (snapshot.volumeZscore > 1.2 && snapshot.deliveryPct > 50 && snapshot.changePct > 0) {
      score += 0.28;
      factors.push(`Delivery ${snapshot.deliveryPct.toFixed(0)}% confirms genuine buying`);
    }

    if (snapshot.fiiFlow > 1.2) {
      score += 0.18;
      factors.push(`Constructive FII-style flow +${snapshot.fiiFlow.toFixed(2)}`);
    } else if (snapshot.fiiFlow < -1.2) {
      score -= 0.22;
      factors.push(`FII-style outflow ${snapshot.fiiFlow.toFixed(2)}`);
    }

    if (snapshot.pcr < 0.7 && snapshot.ivRank > 70) {
      score -= 0.4;
      trap = true;
      factors.push(`F&O trap signature: PCR ${snapshot.pcr.toFixed(2)}, IV rank ${snapshot.ivRank}`);
    } else if (snapshot.pcr > 1.2) {
      score += 0.12;
      factors.push(`Elevated PCR ${snapshot.pcr.toFixed(2)} — hedging, not euphoria`);
    }

    if (snapshot.ivRank > 80 && snapshot.rsi14 > 68) {
      trap = true;
      score -= 0.2;
      factors.push("IV crush risk into crowded call buying");
    }

    if (snapshot.ticker === "BANKNIFTY" || snapshot.sector.includes("F&O")) {
      factors.push("Index F&O instrument — treat as leverage, not investment");
    }

    score = Math.max(-1, Math.min(1, score));
    let conf = 0.52 + 0.28 * Math.abs(score);
    if (degraded) conf *= 0.6;
    if (trap) conf = Math.min(0.9, conf + 0.08);
    conf = Math.round(Math.min(0.93, Math.max(0.28, conf)) * 100) / 100;
    const signal = trap && score < -0.15 ? "AVOID" : labelFromScore(score, conf);

    return baseOutput({
      agentId: "flow",
      agentName: "Flow",
      role: "Volume anomaly, delivery, FII proxy, options PCR / IV, F&O trap detection",
      signal,
      confidence: conf,
      score: Math.round(score * 1000) / 1000,
      reasoning: `Flow & positioning on ${snapshot.ticker}. Volume z ${snapshot.volumeZscore.toFixed(2)}, delivery ${snapshot.deliveryPct.toFixed(0)}%, PCR ${snapshot.pcr.toFixed(2)}, IV rank ${snapshot.ivRank}. ${trap ? "Retail F&O trap flags are active — this is a casino ticket, not an investment." : "No trap signature."} ${factors.join("; ")}`,
      keyFactors: factors.slice(0, 6),
      citations: [
        {
          source: "Options + cash tape (simulated NSE)",
          snippet: `VolZ ${snapshot.volumeZscore}, delivery ${snapshot.deliveryPct}%, PCR ${snapshot.pcr}, IVrank ${snapshot.ivRank}, FII ${snapshot.fiiFlow}`,
        },
      ],
      metrics: {
        volumeZscore: snapshot.volumeZscore,
        deliveryPct: snapshot.deliveryPct,
        pcr: snapshot.pcr,
        ivRank: snapshot.ivRank,
        trap: trap ? 1 : 0,
      },
      degraded,
    });
  });
  return { ...value, latencyMs };
}
