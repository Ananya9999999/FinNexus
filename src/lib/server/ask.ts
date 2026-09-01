import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { PipelineResult } from "@/lib/types";

export const askChair = createServerFn({ method: "POST" })
  .validator((input: { question: string; result: PipelineResult }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    const { question, result } = data;
    const ground = [
      `Ticker ${result.market.ticker} ${result.market.name} last ₹${result.market.lastPrice} (${result.market.changePct}%).`,
      `Chair verdict ${result.synthesis.finalSignal} conf ${result.synthesis.confidence}.`,
      `Thesis: ${result.synthesis.thesis}`,
      `Dissent: ${result.synthesis.dissent}`,
      `Invalidation: ${result.synthesis.invalidation}`,
      `Profile: ${result.profile.displayName}, ${result.profile.riskTolerance}.`,
      `Agents: ${result.agents.map((a) => `${a.agentName}=${a.signal} ${a.score}`).join("; ")}`,
      `Citations: ${result.agents.flatMap((a) => a.citations.map((c) => c.source)).join("; ")}`,
    ].join("\n");

    if (!apiKey) {
      return {
        ok: true as const,
        text: `${result.synthesis.recommendation}\n\n${result.synthesis.personalizedNote}\n\n(Live Grok chair is unavailable in this environment — this answer is the synthesized memo, still fully cited.)`,
        model: "quorum-chair",
      };
    }

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 420,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are the Chair of QUORUM, a multi-agent research desk for Indian retail investors. Answer ONLY from the provided agent memo and citations. Never invent filings or prices. Be plain, specific, and cautious. Not investment advice. If the user asks to buy F&O, remind them that 89% of retail F&O traders lose money (SEBI).",
            },
            {
              role: "user",
              content: `MEMO:\n${ground}\n\nINVESTOR QUESTION:\n${question}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        return {
          ok: true as const,
          text: result.synthesis.recommendation,
          model: "quorum-chair",
        };
      }
      const body = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      return {
        ok: true as const,
        text: body.choices[0]?.message.content ?? result.synthesis.recommendation,
        model: "grok-4.5",
      };
    } catch {
      return {
        ok: true as const,
        text: result.synthesis.recommendation,
        model: "quorum-chair",
      };
    }
  });
