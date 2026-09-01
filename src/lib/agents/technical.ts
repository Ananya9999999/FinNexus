import type { AgentOutput, MarketSnapshot } from "@/lib/types";
import { baseOutput, labelFromScore, withLatency } from "@/lib/agents/contracts";

export async function runTechnicalAgent(snapshot: MarketSnapshot): Promise<AgentOutput> {
  const { value, latencyMs } = await withLatency(280, 620, () => {
    const degraded = snapshot.dataQuality === "degraded";
    let score = 0;
    const factors: string[] = [];

    if (snapshot.momentum5d > 2) {
      score += 0.35;
      factors.push(`Strong 5d momentum ${snapshot.momentum5d > 0 ? "+" : ""}${snapshot.momentum5d.toFixed(1)}%`);
    } else if (snapshot.momentum5d > 0.5) {
      score += 0.15;
      factors.push(`Positive 5d momentum +${snapshot.momentum5d.toFixed(1)}%`);
    } else if (snapshot.momentum5d < -2) {
      score -= 0.35;
      factors.push(`Weak 5d momentum ${snapshot.momentum5d.toFixed(1)}%`);
    } else if (snapshot.momentum5d < -0.5) {
      score -= 0.15;
      factors.push(`Negative 5d momentum ${snapshot.momentum5d.toFixed(1)}%`);
    }

    if (snapshot.momentum20d > 5) {
      score += 0.25;
      factors.push(`Strong 20d trend +${snapshot.momentum20d.toFixed(1)}%`);
    } else if (snapshot.momentum20d < -5) {
      score -= 0.25;
      factors.push(`Weak 20d trend ${snapshot.momentum20d.toFixed(1)}%`);
    }

    if (snapshot.volumeZscore > 1.5) {
      score += snapshot.changePct > 0 ? 0.3 : -0.2;
      factors.push(
        snapshot.changePct > 0
          ? `Volume spike z=${snapshot.volumeZscore.toFixed(2)} confirming the move`
          : `High volume on a down day z=${snapshot.volumeZscore.toFixed(2)}`,
      );
    } else if (snapshot.volumeZscore < -1) {
      score -= 0.1;
      factors.push(`Below-average volume z=${snapshot.volumeZscore.toFixed(2)}`);
    }

    if (snapshot.rsi14 > 70) {
      score -= 0.35;
      factors.push(`RSI overbought at ${snapshot.rsi14.toFixed(0)}`);
    } else if (snapshot.rsi14 > 60) {
      score -= 0.1;
      factors.push(`RSI elevated ${snapshot.rsi14.toFixed(0)}`);
    } else if (snapshot.rsi14 < 30) {
      score += 0.35;
      factors.push(`RSI oversold at ${snapshot.rsi14.toFixed(0)}`);
    } else if (snapshot.rsi14 < 40) {
      score += 0.15;
      factors.push(`RSI low ${snapshot.rsi14.toFixed(0)}`);
    }

    if (snapshot.macdHist > 1) {
      score += 0.15;
      factors.push(`MACD histogram positive ${snapshot.macdHist.toFixed(2)}`);
    } else if (snapshot.macdHist < -1) {
      score -= 0.15;
      factors.push(`MACD histogram negative ${snapshot.macdHist.toFixed(2)}`);
    }

    if (snapshot.lastPrice > snapshot.sma20 && snapshot.sma20 > snapshot.sma50) {
      score += 0.2;
      factors.push("Price > SMA20 > SMA50 (uptrend structure)");
    } else if (snapshot.lastPrice < snapshot.sma20 && snapshot.sma20 < snapshot.sma50) {
      score -= 0.2;
      factors.push("Price < SMA20 < SMA50 (downtrend structure)");
    }

    score = Math.max(-1, Math.min(1, score));
    let conf = 0.55 + 0.25 * Math.abs(score);
    if (degraded) conf *= 0.65;
    if (Math.abs(snapshot.volumeZscore) > 2) conf = Math.min(0.92, conf + 0.08);
    conf = Math.round(Math.min(0.95, Math.max(0.25, conf)) * 100) / 100;
    const signal = labelFromScore(score, conf);

    return baseOutput({
      agentId: "momentum",
      agentName: "Momentum",
      role: "Price momentum, RSI/MACD oscillators, and SMA structure",
      signal,
      confidence: conf,
      score: Math.round(score * 1000) / 1000,
      reasoning: `Technical read on ${snapshot.ticker} as of ${snapshot.asOf} (quality=${snapshot.dataQuality}). Composite score ${score >= 0 ? "+" : ""}${score.toFixed(2)}. Drivers: ${factors.slice(0, 5).join("; ") || "mixed indicators"}. Last ₹${snapshot.lastPrice} (${snapshot.changePct >= 0 ? "+" : ""}${snapshot.changePct.toFixed(2)}%).${degraded ? " Using degraded/synthetic data — treat with lower confidence." : ""}`,
      keyFactors: factors.slice(0, 6),
      citations: [
        {
          source: `Market tape (${snapshot.dataQuality})`,
          snippet: `Last ₹${snapshot.lastPrice}, RSI=${snapshot.rsi14}, VolZ=${snapshot.volumeZscore}, Mom5d=${snapshot.momentum5d}%`,
        },
      ],
      metrics: {
        rsi14: snapshot.rsi14,
        momentum5d: snapshot.momentum5d,
        momentum20d: snapshot.momentum20d,
        volumeZscore: snapshot.volumeZscore,
        macdHist: snapshot.macdHist,
        dimensions: 3,
      },
      degraded,
    });
  });
  return { ...value, latencyMs };
}
