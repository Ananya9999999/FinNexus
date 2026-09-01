import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { PipelineResult } from "@/lib/types";
import { callGrokApi, getGrokApiKey } from "./grok";

function formatGroundingMemo(result: PipelineResult): string {
  return [
    `=== QUORUM MULTI-AGENT SYNTHESIS MEMO ===`,
    `TICKER: ${result.market.ticker} (${result.market.name})`,
    `CURRENT PRICE: ₹${result.market.lastPrice.toLocaleString("en-IN")} (${result.market.changePct >= 0 ? "+" : ""}${result.market.changePct}%)`,
    `CHAIR VERDICT: ${result.synthesis.finalSignal} | Confidence: ${Math.round(result.synthesis.confidence * 100)}% | Score: ${result.synthesis.score >= 0 ? "+" : ""}${result.synthesis.score}`,
    `POSITION HINT: ${result.synthesis.positionHintPct >= 0 ? "+" : ""}${result.synthesis.positionHintPct}% of portfolio`,
    `SIGNAL AGREEMENT: ${Math.round(result.synthesis.agreement * 100)}%`,
    `DATA QUALITY: ${result.market.dataQuality.toUpperCase()}`,
    `THESIS: ${result.synthesis.thesis}`,
    `DISSENT: ${result.synthesis.dissent}`,
    `INVALIDATION CONDITIONS: ${result.synthesis.invalidation}`,
    `INVESTOR PROFILE: ${result.profile.displayName} | Risk: ${result.profile.riskTolerance} | Horizon: ${result.profile.investmentHorizon} | Max Pos: ${result.profile.maxPositionPct}% | Cash: ${result.profile.cashPct}%`,
    `BEHAVIORAL FLAGS: ${result.profile.behavioralFlags.join(", ") || "None"}`,
    `SPECIALIZED AGENT BREAKDOWN:`,
    ...result.agents.map(
      (a) =>
        `  • [${a.agentName}] Signal: ${a.signal} (Score: ${a.score >= 0 ? "+" : ""}${a.score}, Conf: ${Math.round(a.confidence * 100)}%) - ${a.reasoning}`
    ),
    `FILINGS & DATA CITATIONS:`,
    ...result.agents.flatMap((a) => a.citations.map((c) => `  • [${c.source}] ${c.title || ""}: ${c.snippet || ""}`)),
  ].join("\n");
}

export const askChair = createServerFn({ method: "POST" })
  .validator((input: { question: string; result: PipelineResult }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const { question, result } = data;
    const apiKey = getGrokApiKey();
    const ground = formatGroundingMemo(result);

    if (!apiKey) {
      return {
        ok: true as const,
        text: `${result.synthesis.recommendation}\n\n${result.synthesis.personalizedNote}\n\n💡 Tip: Paste your Grok API key into the .env file (GROK_API_KEY=your_key) to unlock live Grok-4.5 AI chat answers!`,
        model: "quorum-chair-rule",
        isLiveGrok: false,
      };
    }

    const grokRes = await callGrokApi({
      messages: [
        {
          role: "system",
          content:
            "You are the Chair of QUORUM / FinNexus, an institutional-grade autonomous multi-agent financial intelligence desk for Indian retail investors.\n" +
            "RULES:\n" +
            "1. Ground your answer strictly in the provided multi-agent research memo and official filings citations.\n" +
            "2. Tailor your response directly to the user's specific risk tolerance, behavioral flags, and portfolio constraints.\n" +
            "3. If the user asks about options/F&O trading or speculative leverage, firmly cite the SEBI statistic: '89% of retail F&O traders in India incur net losses'.\n" +
            "4. Be concise, direct, crisp, and objective. Never invent filings, numbers, or targets.\n" +
            "5. Always maintain the disclaimer that this analysis is educational research and not formal SEBI registered investment advice.",
        },
        {
          role: "user",
          content: `HERE IS THE SPECIALIST AGENTS' MEMO:\n\n${ground}\n\nINVESTOR'S QUESTION:\n${question}`,
        },
      ],
      temperature: 0.25,
      maxTokens: 600,
    });

    if (grokRes.ok) {
      return {
        ok: true as const,
        text: grokRes.text,
        model: grokRes.model,
        isLiveGrok: true,
      };
    }

    return {
      ok: true as const,
      text: `${result.synthesis.recommendation}\n\n(Grok API note: ${grokRes.error} — served from Quorum multi-agent synthesis)`,
      model: "quorum-chair-fallback",
      isLiveGrok: false,
    };
  });

export const generateGrokMemo = createServerFn({ method: "POST" })
  .validator((input: { result: PipelineResult }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const { result } = data;
    const apiKey = getGrokApiKey();
    const ground = formatGroundingMemo(result);

    if (!apiKey) {
      return {
        ok: false as const,
        error: "Grok API Key not found. Please paste GROK_API_KEY=... in your .env file to enable live Grok Chair memos.",
        memo: result.synthesis.recommendation,
        model: "offline",
      };
    }

    const grokRes = await callGrokApi({
      messages: [
        {
          role: "system",
          content:
            "You are the Chief Investment Officer / Chair of the QUORUM multi-agent financial desk. Synthesize the outputs of the 5 parallel agents (Momentum, Flow, Filing RAG, Sentiment Macro, Risk Behavior) into a master Executive Research Memo for the retail investor.\n" +
            "Format with sections: 1. Executive Verdict, 2. Specialist Consensus & Dissent, 3. Grounded RAG Evidence, 4. Tailored Risk & Position Sizing, 5. Invalidation Criteria.",
        },
        {
          role: "user",
          content: `Synthesize this multi-agent output into an executive memo:\n\n${ground}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 800,
    });

    if (grokRes.ok) {
      return {
        ok: true as const,
        memo: grokRes.text,
        model: grokRes.model,
      };
    }

    return {
      ok: false as const,
      error: grokRes.error,
      memo: result.synthesis.recommendation,
      model: "offline",
    };
  });
