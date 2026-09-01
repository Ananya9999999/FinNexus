import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { DecisionRow, PaperAction, PipelineResult } from "@/lib/types";
import { normalizeTicker } from "@/lib/utils";

export const saveDecision = createServerFn({ method: "POST" })
  .validator((input: PipelineResult) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into decisions (
        user_id, session_id, ticker, signal, confidence, score, recommendation,
        latency_ms, agreement, hhi, data_quality, result_json, paper_action
      ) values (
        ${context.userId},
        ${data.sessionId},
        ${data.ticker},
        ${data.synthesis.finalSignal},
        ${data.synthesis.confidence},
        ${data.synthesis.score},
        ${data.synthesis.recommendation},
        ${data.metrics.totalLatencyMs},
        ${data.metrics.signalAgreement},
        ${data.metrics.portfolioHhi},
        ${data.metrics.dataQuality},
        ${JSON.stringify({
          synthesis: data.synthesis,
          agents: data.agents.map((a) => ({
            agentName: a.agentName,
            signal: a.signal,
            score: a.score,
            confidence: a.confidence,
            degraded: a.degraded,
          })),
          impact: data.impact,
          metrics: data.metrics,
          market: { lastPrice: data.market.lastPrice, name: data.market.name },
        })},
        ${"pending"}
      )
    `;
    return { ok: true as const, sessionId: data.sessionId };
  });

export const applyPaperDecision = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string; action: PaperAction; sizePct?: number }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      ticker: string;
      result_json: string;
    }>`
      select ticker, result_json from decisions
      where user_id = ${context.userId} and session_id = ${data.sessionId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Decision not found");

    const size = data.sizePct ?? null;
    await sql`
      update decisions
      set paper_action = ${data.action}, paper_size_pct = ${size}
      where user_id = ${context.userId} and session_id = ${data.sessionId}
    `;

    if (data.action !== "accepted" && data.action !== "sized_down") {
      return { ok: true as const };
    }

    type Stored = {
      impact?: { proposedWeightPct?: number; cashAfter?: number };
      market?: { lastPrice?: number };
    };
    let parsed: Stored = {};
    try {
      parsed = JSON.parse(row.result_json) as Stored;
    } catch {
      parsed = {};
    }

    const ticker = normalizeTicker(row.ticker);
    const hold = await sql<{ weight_pct: number; quantity: number; avg_price: number }>`
      select weight_pct, quantity, avg_price from holdings
      where user_id = ${context.userId} and ticker = ${ticker} limit 1
    `;
    const prof = await sql<{ cash_pct: number }>`
      select cash_pct from investor_profiles where user_id = ${context.userId} limit 1
    `;
    const currentW = hold[0] ? Number(hold[0].weight_pct) : 0;
    const currentCash = prof[0] ? Number(prof[0].cash_pct) : 0;
    const targetW =
      data.action === "sized_down"
        ? Math.max(0, data.sizePct ?? currentW * 0.5)
        : Math.max(0, parsed.impact?.proposedWeightPct ?? currentW);
    const delta = targetW - currentW;
    const newCash = Math.max(0, Math.min(100, currentCash - delta));
    const lastPrice = parsed.market?.lastPrice ?? (hold[0] ? Number(hold[0].avg_price) : 0);

    if (targetW <= 0.05) {
      await sql`delete from holdings where user_id = ${context.userId} and ticker = ${ticker}`;
    } else if (hold[0]) {
      await sql`
        update holdings
        set weight_pct = ${targetW}
        where user_id = ${context.userId} and ticker = ${ticker}
      `;
    } else {
      await sql`
        insert into holdings (user_id, ticker, quantity, avg_price, weight_pct)
        values (${context.userId}, ${ticker}, ${10}, ${lastPrice}, ${targetW})
      `;
    }
    await sql`
      update investor_profiles
      set cash_pct = ${newCash}, updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const, weightPct: targetW, cashPct: newCash };
  });

export const listDecisions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      session_id: string;
      ticker: string;
      signal: string;
      confidence: number;
      score: number;
      recommendation: string;
      latency_ms: number;
      agreement: number;
      hhi: number;
      data_quality: string;
      paper_action: string | null;
      paper_size_pct: number | null;
      created_at: string;
    }>`
      select id, session_id, ticker, signal, confidence, score, recommendation,
             latency_ms, agreement, hhi, data_quality, paper_action, paper_size_pct, created_at
      from decisions
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    const out: DecisionRow[] = rows.map((r) => ({
      id: Number(r.id),
      sessionId: r.session_id,
      ticker: r.ticker,
      signal: r.signal,
      confidence: Number(r.confidence),
      score: Number(r.score),
      recommendation: r.recommendation,
      latencyMs: Number(r.latency_ms),
      agreement: Number(r.agreement),
      hhi: Number(r.hhi),
      dataQuality: r.data_quality,
      paperAction: (r.paper_action as PaperAction) || "pending",
      paperSizePct: r.paper_size_pct == null ? null : Number(r.paper_size_pct),
      createdAt: String(r.created_at),
    }));
    return out;
  });
