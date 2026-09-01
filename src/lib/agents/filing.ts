import type { AgentOutput, MarketSnapshot } from "@/lib/types";
import { baseOutput, labelFromScore, withLatency } from "@/lib/agents/contracts";
import { searchFilings, tickerFilterFromSnapshot } from "@/lib/rag/search";

function toneOf(text: string) {
  const positive = ["growth", "strong", "expansion", "improved", "confident", "record", "synergies", "optimistic", "recovery", "ahead", "stable", "robust"];
  const negative = ["pressure", "risk", "volatility", "decline", "weak", "challenge", "delay", "stress", "slowdown", "competition", "uncertainty", "loss", "revised"];
  const t = text.toLowerCase();
  const pos = positive.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const neg = negative.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  return (pos - neg) / (pos + neg + 1e-6);
}

export async function runFilingAgent(snapshot: MarketSnapshot): Promise<AgentOutput> {
  const { value, latencyMs } = await withLatency(360, 780, () => {
    const ticker = tickerFilterFromSnapshot(snapshot.ticker);
    const results = searchFilings(
      `${ticker} earnings revenue growth risks outlook guidance margin SEBI`,
      { topK: 3, tickerFilter: ticker },
    );

    if (!results.length) {
      return baseOutput({
        agentId: "filing",
        agentName: "Filing",
        role: "RAG over SEBI filings and earnings transcripts with visible attribution",
        signal: "HOLD",
        confidence: 0.3,
        score: 0,
        reasoning: `No relevant filings retrieved for ${ticker}. Unable to ground a fundamental view. Defaulting to HOLD with low confidence — no uncited claims.`,
        keyFactors: ["Retrieval miss — degraded"],
        citations: [],
        metrics: { docsRetrieved: 0 },
        degraded: true,
        error: "No documents matched",
      });
    }

    const combined = results.map((r) => r.fullContent).join(" ");
    const tone = toneOf(combined);
    const growths = [...combined.matchAll(/(\d+(?:\.\d+)?)%\s*(?:YoY|yoy|CC|cc)?/g)]
      .map((m) => parseFloat(m[1]))
      .filter((n) => n < 80);
    const avgGrowth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : null;

    let score = tone * 0.7;
    const factors: string[] = [];
    if (avgGrowth != null) {
      if (avgGrowth >= 8) {
        score += 0.25;
        factors.push(`Reported/guided growth ~${avgGrowth.toFixed(1)}% (supportive)`);
      } else if (avgGrowth <= 2) {
        score -= 0.2;
        factors.push(`Soft growth print ~${avgGrowth.toFixed(1)}%`);
      } else {
        factors.push(`Moderate growth ~${avgGrowth.toFixed(1)}%`);
      }
    }
    const riskCount = (combined.toLowerCase().match(/risk|volatility|pressure/g) || []).length;
    if (riskCount >= 4) {
      score -= 0.1;
      factors.push("Elevated risk language in filings/transcripts");
    }
    if (/margin expansion|margin.{0,20}improved/i.test(combined)) {
      score += 0.1;
      factors.push("Margin expansion commentary present");
    }
    if (/guidance revised|guidance cut|revised to/i.test(combined)) {
      score -= 0.18;
      factors.push("Guidance revised lower");
    }

    score = Math.max(-1, Math.min(1, score));
    let conf = 0.5 + 0.3 * Math.abs(tone) + 0.1 * Math.min(results.length, 3) / 3;
    conf = Math.round(Math.min(0.9, Math.max(0.35, conf)) * 100) / 100;
    const signal = labelFromScore(score, conf);

    return baseOutput({
      agentId: "filing",
      agentName: "Filing",
      role: "Retrieves SEBI filings & earnings transcripts via semantic search and grounds the view",
      signal,
      confidence: conf,
      score: Math.round(score * 1000) / 1000,
      reasoning: `RAG-grounded fundamental view for ${ticker}. Retrieved ${results.length} document(s): ${results.map((r) => r.title).slice(0, 2).join("; ")}. Tone ${tone >= 0 ? "+" : ""}${tone.toFixed(2)}. Score ${score >= 0 ? "+" : ""}${score.toFixed(2)}. ${factors.join("; ") || "Mixed fundamental signals."} All claims attributed below.`,
      keyFactors: factors.length ? factors : ["Corpus tone analysis"],
      citations: results.map((r) => ({
        source: r.title,
        date: r.date,
        type: r.type,
        snippet: r.snippet,
      })),
      metrics: {
        docsRetrieved: results.length,
        avgRetrievalScore: Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 1000) / 1000,
        tone: Math.round(tone * 1000) / 1000,
      },
      degraded: false,
    });
  });
  return { ...value, latencyMs };
}
