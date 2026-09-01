import type { AgentOutput, MarketSnapshot } from "@/lib/types";
import { baseOutput, labelFromScore, withLatency } from "@/lib/agents/contracts";
import { searchFilings } from "@/lib/rag/search";
import { tickerFilterFromSnapshot } from "@/lib/rag/search";

export async function runSentimentAgent(snapshot: MarketSnapshot): Promise<AgentOutput> {
  const { value, latencyMs } = await withLatency(300, 680, () => {
    const ticker = tickerFilterFromSnapshot(snapshot.ticker);
    const macro = searchFilings(
      `market outlook sector risks FII retail F&O SEBI ${ticker}`,
      { topK: 2, tickerFilter: "MACRO" },
    );
    const extra = searchFilings(`${ticker} outlook crowding`, { topK: 1, tickerFilter: ticker });

    let regime = 0;
    const factors: string[] = [];
    if (snapshot.momentum20d > 3 && snapshot.rsi14 < 65) {
      regime += 0.3;
      factors.push("Constructive intermediate trend with non-overbought RSI");
    } else if (snapshot.momentum20d < -3) {
      regime -= 0.3;
      factors.push("Negative intermediate momentum regime");
    }
    if (snapshot.volumeZscore > 1.2 && snapshot.changePct > 0) {
      regime += 0.2;
      factors.push("Positive price action on elevated volume");
    } else if (snapshot.volumeZscore > 1.2 && snapshot.changePct < 0) {
      regime -= 0.25;
      factors.push("Selling on high volume — bearish participation");
    }

    let macroTone = 0;
    const citations = [...macro, ...extra].map((d) => ({
      source: d.title,
      date: d.date,
      type: d.type,
      snippet: d.snippet,
    }));
    for (const d of macro) {
      const t = d.fullContent.toLowerCase();
      if (t.includes("record") || t.includes("positive") || t.includes("recovery")) macroTone += 0.12;
      if (t.includes("89%") || t.includes("lose money")) {
        macroTone -= 0.12;
        factors.push("SEBI: 89% of retail F&O traders lost money — caution on leverage");
      }
      if (t.includes("elevated valuations") || t.includes("midcap")) {
        factors.push("Macro note flags elevated midcap valuations; prefer quality largecaps");
      }
    }

    const score = Math.max(-1, Math.min(1, regime + macroTone));
    let conf = 0.5 + 0.2 * Math.abs(score) + (macro.length ? 0.1 : 0);
    if (snapshot.dataQuality === "degraded") conf *= 0.7;
    conf = Math.round(Math.min(0.85, Math.max(0.3, conf)) * 100) / 100;
    const signal = labelFromScore(score, conf);

    return baseOutput({
      agentId: "sentiment",
      agentName: "Sentiment",
      role: "Market regime, participation, and macro/regulatory narrative",
      signal,
      confidence: conf,
      score: Math.round(score * 1000) / 1000,
      reasoning: `Sentiment & macro for ${snapshot.ticker}. Regime from price/volume plus retrieved SEBI/sector notes. Score ${score >= 0 ? "+" : ""}${score.toFixed(2)}. ${factors.join("; ") || "Neutral market tone."}`,
      keyFactors: factors.slice(0, 5),
      citations,
      metrics: {
        regimeScore: Math.round(regime * 1000) / 1000,
        macroDocs: macro.length,
        volumeParticipation: snapshot.volumeZscore,
      },
      degraded: snapshot.dataQuality === "degraded",
    });
  });
  return { ...value, latencyMs };
}
