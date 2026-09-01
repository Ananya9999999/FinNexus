import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { BehavioralFlag, Holding, Horizon, InvestorProfile, RiskTolerance } from "@/lib/types";
import { emptyProfile, PERSONAS } from "@/lib/personas";
import { normalizeTicker } from "@/lib/utils";

function parseList(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

type ProfileRow = {
  user_id: string;
  display_name: string;
  risk_tolerance: string;
  investment_horizon: string;
  max_position_pct: number;
  preferred_sectors: string;
  avoid_sectors: string;
  behavioral_flags: string;
  cash_pct: number;
  watchlist: string;
  notes: string;
};

type HoldingRow = {
  ticker: string;
  quantity: number;
  avg_price: number;
  weight_pct: number;
};

function toProfile(row: ProfileRow, holdings: HoldingRow[], userId: string): InvestorProfile {
  return {
    userId,
    displayName: row.display_name,
    riskTolerance: row.risk_tolerance as RiskTolerance,
    investmentHorizon: row.investment_horizon as Horizon,
    maxPositionPct: Number(row.max_position_pct),
    preferredSectors: parseList(row.preferred_sectors),
    avoidSectors: parseList(row.avoid_sectors),
    behavioralFlags: parseList(row.behavioral_flags) as BehavioralFlag[],
    cashPct: Number(row.cash_pct),
    watchlist: parseList(row.watchlist),
    notes: row.notes ?? "",
    holdings: holdings.map((h) => ({
      ticker: h.ticker,
      quantity: Number(h.quantity),
      avgPrice: Number(h.avg_price),
      weightPct: Number(h.weight_pct),
    })),
  };
}

async function seedIfMissing(userId: string, fallbackName: string) {
  const sql = await getSql();
  const existing = await sql<ProfileRow>`select * from investor_profiles where user_id = ${userId} limit 1`;
  if (existing[0]) return;
  const seed = emptyProfile(userId, fallbackName || "Investor");
  await sql`
    insert into investor_profiles (
      user_id, display_name, risk_tolerance, investment_horizon, max_position_pct,
      preferred_sectors, avoid_sectors, behavioral_flags, cash_pct, watchlist, notes
    ) values (
      ${userId}, ${seed.displayName}, ${seed.riskTolerance}, ${seed.investmentHorizon}, ${seed.maxPositionPct},
      ${JSON.stringify(seed.preferredSectors)}, ${JSON.stringify(seed.avoidSectors)},
      ${JSON.stringify(seed.behavioralFlags)}, ${seed.cashPct}, ${JSON.stringify(seed.watchlist)}, ${seed.notes}
    )
  `;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await seedIfMissing(context.userId, "Investor");
    const rows = await sql<ProfileRow>`select * from investor_profiles where user_id = ${context.userId} limit 1`;
    const holdings = await sql<HoldingRow>`
      select ticker, quantity, avg_price, weight_pct from holdings where user_id = ${context.userId} order by weight_pct desc
    `;
    return toProfile(rows[0], holdings, context.userId);
  });

export type ProfilePatch = {
  displayName?: string;
  riskTolerance?: RiskTolerance;
  investmentHorizon?: Horizon;
  maxPositionPct?: number;
  preferredSectors?: string[];
  avoidSectors?: string[];
  behavioralFlags?: BehavioralFlag[];
  cashPct?: number;
  watchlist?: string[];
  notes?: string;
};

export const saveMyProfile = createServerFn({ method: "POST" })
  .validator((input: ProfilePatch) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await seedIfMissing(context.userId, data.displayName || "Investor");
    const current = await sql<ProfileRow>`select * from investor_profiles where user_id = ${context.userId} limit 1`;
    const c = current[0];
    const displayName = data.displayName ?? c.display_name;
    const risk = data.riskTolerance ?? c.risk_tolerance;
    const horizon = data.investmentHorizon ?? c.investment_horizon;
    const maxPos = data.maxPositionPct ?? Number(c.max_position_pct);
    const preferred = JSON.stringify(data.preferredSectors ?? parseList(c.preferred_sectors));
    const avoid = JSON.stringify(data.avoidSectors ?? parseList(c.avoid_sectors));
    const flags = JSON.stringify(data.behavioralFlags ?? parseList(c.behavioral_flags));
    const cash = data.cashPct ?? Number(c.cash_pct);
    const watch = JSON.stringify(data.watchlist ?? parseList(c.watchlist));
    const notes = data.notes ?? c.notes;
    await sql`
      update investor_profiles set
        display_name = ${displayName},
        risk_tolerance = ${risk},
        investment_horizon = ${horizon},
        max_position_pct = ${maxPos},
        preferred_sectors = ${preferred},
        avoid_sectors = ${avoid},
        behavioral_flags = ${flags},
        cash_pct = ${cash},
        watchlist = ${watch},
        notes = ${notes},
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const upsertHolding = createServerFn({ method: "POST" })
  .validator((input: Holding) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const ticker = normalizeTicker(data.ticker);
    const existing = await sql<{ id: number }>`
      select id from holdings where user_id = ${context.userId} and ticker = ${ticker} limit 1
    `;
    if (existing[0]) {
      await sql`
        update holdings set quantity = ${data.quantity}, avg_price = ${data.avgPrice}, weight_pct = ${data.weightPct}
        where user_id = ${context.userId} and ticker = ${ticker}
      `;
    } else {
      await sql`
        insert into holdings (user_id, ticker, quantity, avg_price, weight_pct)
        values (${context.userId}, ${ticker}, ${data.quantity}, ${data.avgPrice}, ${data.weightPct})
      `;
    }
    const prof = await sql<ProfileRow>`select watchlist from investor_profiles where user_id = ${context.userId} limit 1`;
    if (prof[0]) {
      const wl = parseList(prof[0].watchlist);
      if (!wl.includes(ticker)) {
        wl.push(ticker);
        await sql`update investor_profiles set watchlist = ${JSON.stringify(wl)}, updated_at = now() where user_id = ${context.userId}`;
      }
    }
    return { ok: true as const, ticker };
  });

export const removeHolding = createServerFn({ method: "POST" })
  .validator((input: { ticker: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const ticker = normalizeTicker(data.ticker);
    await sql`delete from holdings where user_id = ${context.userId} and ticker = ${ticker}`;
    return { ok: true as const };
  });

export const applyPersona = createServerFn({ method: "POST" })
  .validator((input: { persona: "riya" | "arjun" | "priya" }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const p = PERSONAS[data.persona];
    if (!p) throw new Error("Unknown persona");
    await seedIfMissing(context.userId, p.displayName);
    await sql`
      update investor_profiles set
        display_name = ${p.displayName},
        risk_tolerance = ${p.riskTolerance},
        investment_horizon = ${p.investmentHorizon},
        max_position_pct = ${p.maxPositionPct},
        preferred_sectors = ${JSON.stringify(p.preferredSectors)},
        avoid_sectors = ${JSON.stringify(p.avoidSectors)},
        behavioral_flags = ${JSON.stringify(p.behavioralFlags)},
        cash_pct = ${p.cashPct},
        watchlist = ${JSON.stringify(p.watchlist)},
        notes = ${p.notes},
        updated_at = now()
      where user_id = ${context.userId}
    `;
    await sql`delete from holdings where user_id = ${context.userId}`;
    for (const h of p.holdings) {
      await sql`
        insert into holdings (user_id, ticker, quantity, avg_price, weight_pct)
        values (${context.userId}, ${h.ticker}, ${h.quantity}, ${h.avgPrice}, ${h.weightPct})
      `;
    }
    return { ok: true as const };
  });
