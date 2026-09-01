import type { DataQuality, DemoScenario, MarketSnapshot } from "@/lib/types";
import { findName } from "@/lib/market/universe";
import { clamp, hashSeed, mulberry32, normalizeTicker } from "@/lib/utils";

function rsi(closes: number[], period = 14) {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  const ag = gain / period;
  const al = loss / period;
  if (al === 0) return 100;
  const rs = ag / al;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function macdHist(closes: number[]) {
  if (closes.length < 35) return 0;
  const macd = ema(closes, 12) - ema(closes, 26);
  const signalSeries: number[] = [];
  const k12 = 2 / 13;
  const k26 = 2 / 27;
  let e12 = closes[0];
  let e26 = closes[0];
  for (let i = 1; i < closes.length; i++) {
    e12 = closes[i] * k12 + e12 * (1 - k12);
    e26 = closes[i] * k26 + e26 * (1 - k26);
    signalSeries.push(e12 - e26);
  }
  const signal = ema(signalSeries, 9);
  return macd - signal;
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function stdev(xs: number[]) {
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v) || 1e-9;
}

export type ScenarioOverride = {
  rsi?: number;
  momentum5d?: number;
  momentum20d?: number;
  volumeZ?: number;
  changePct?: number;
  macd?: number;
  pcr?: number;
  ivRank?: number;
  fiiFlow?: number;
  quality?: DataQuality;
  note?: string;
};

export function scenarioOverrides(scenario: DemoScenario, ticker: string): ScenarioOverride | null {
  if (scenario === "degraded") {
    return { quality: "degraded", note: "Forced degraded path — feed unavailable, synthetic snapshot." };
  }
  if (scenario === "reliance_earnings" && ticker.startsWith("RELIANCE")) {
    return {
      rsi: 46,
      momentum5d: -3.4,
      momentum20d: -1.2,
      volumeZ: 1.9,
      changePct: -1.8,
      macd: -2.4,
      pcr: 1.15,
      note: "Scenario: Q1 earnings — O2C margin pressure, digital still growing.",
    };
  }
  if (scenario === "fno_trap") {
    return {
      rsi: 78,
      momentum5d: 6.8,
      momentum20d: 4.1,
      volumeZ: 2.6,
      changePct: 3.4,
      macd: 4.8,
      pcr: 0.62,
      ivRank: 86,
      fiiFlow: -1.4,
      note: "Scenario: retail-crowded F&O chase — elevated IV, put-call skew, distribution in cash.",
    };
  }
  if (scenario === "quality_it" && (ticker.startsWith("TCS") || ticker.startsWith("INFY"))) {
    return {
      rsi: 54,
      momentum5d: 0.8,
      momentum20d: 3.6,
      volumeZ: 0.4,
      changePct: 0.35,
      macd: 0.6,
      note: "Scenario: quality IT — constructive but not overheated.",
    };
  }
  return null;
}

export function buildSnapshot(
  rawTicker: string,
  opts: { scenario?: DemoScenario; tick?: number } = {},
): MarketSnapshot {
  const ticker = normalizeTicker(rawTicker);
  const meta = findName(ticker);
  const scenario = opts.scenario ?? "none";
  const override = scenarioOverrides(scenario, ticker);
  const seed = hashSeed(ticker + "|quorum");
  const rand = mulberry32(seed);
  const tick = opts.tick ?? 0;

  const n = 90;
  const series: { t: string; close: number; volume: number }[] = [];
  let px = meta.base;
  const start = Date.now() - n * 86400000;
  for (let i = 0; i < n; i++) {
    const drift = (0.00018 - meta.beta * 0.00004) + (rand() - 0.48) * 0.012 * meta.beta;
    px = Math.max(8, px * (1 + drift));
    const vol = Math.round(800_000 * meta.beta * (0.7 + rand()));
    const d = new Date(start + i * 86400000);
    series.push({
      t: d.toISOString().slice(0, 10),
      close: Math.round(px * 100) / 100,
      volume: vol,
    });
  }

  // Live-feeling last print
  const liveJitter = Math.sin(tick / 7 + seed) * 0.0018 * meta.beta + Math.cos(tick / 13) * 0.0007;
  series[series.length - 1].close = Math.round(series[series.length - 1].close * (1 + liveJitter) * 100) / 100;

  const closes = series.map((s) => s.close);
  const vols = series.map((s) => s.volume);
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  let changePct = ((last - prev) / prev) * 100;
  const sma20 = mean(closes.slice(-20));
  const sma50 = mean(closes.slice(-50));
  let r = rsi(closes);
  let mom5 = ((last / closes[closes.length - 6]) - 1) * 100;
  let mom20 = ((last / closes[closes.length - 21]) - 1) * 100;
  let vz = (vols[vols.length - 1] - mean(vols.slice(-20))) / stdev(vols.slice(-20));
  let macd = macdHist(closes);

  let delivery = clamp(38 + (1 - meta.beta) * 18 + (rand() - 0.5) * 8, 18, 72);
  let pcr = clamp(0.92 + (rand() - 0.5) * 0.5, 0.55, 1.45);
  let ivRank = clamp(32 + meta.beta * 18 + (rand() - 0.5) * 20, 12, 92);
  let fii = (rand() - 0.46) * 3.2;

  let quality: DataQuality = override?.quality ?? "full";
  let note = override?.note ?? "Simulated NSE near-real-time tape with technicals from 90-day history.";

  if (override) {
    if (override.rsi != null) r = override.rsi;
    if (override.momentum5d != null) mom5 = override.momentum5d;
    if (override.momentum20d != null) mom20 = override.momentum20d;
    if (override.volumeZ != null) vz = override.volumeZ;
    if (override.changePct != null) changePct = override.changePct;
    if (override.macd != null) macd = override.macd;
    if (override.pcr != null) pcr = override.pcr;
    if (override.ivRank != null) ivRank = override.ivRank;
    if (override.fiiFlow != null) fii = override.fiiFlow;
  }

  if (quality === "degraded") {
    r = 40 + (seed % 40);
    mom5 = (rand() - 0.5) * 6;
    mom20 = (rand() - 0.5) * 10;
    vz = (rand() - 0.4) * 2;
    macd = (rand() - 0.5) * 4;
  }

  const high52 = Math.max(...closes) * 1.04;
  const low52 = Math.min(...closes) * 0.96;

  return {
    ticker,
    name: meta.name,
    sector: meta.sector,
    lastPrice: Math.round(last * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    volume: vols[vols.length - 1],
    avgVolume20: Math.round(mean(vols.slice(-20))),
    high52w: Math.round(high52 * 100) / 100,
    low52w: Math.round(low52 * 100) / 100,
    rsi14: Math.round(r * 10) / 10,
    momentum5d: Math.round(mom5 * 100) / 100,
    momentum20d: Math.round(mom20 * 100) / 100,
    volumeZscore: Math.round(vz * 100) / 100,
    macdHist: Math.round(macd * 1000) / 1000,
    sma20: Math.round(sma20 * 100) / 100,
    sma50: Math.round(sma50 * 100) / 100,
    deliveryPct: Math.round(delivery * 10) / 10,
    pcr: Math.round(pcr * 100) / 100,
    ivRank: Math.round(ivRank),
    fiiFlow: Math.round(fii * 100) / 100,
    dataQuality: quality,
    asOf: series[series.length - 1].t,
    note,
    series,
  };
}

export function liveQuoteFromSnapshot(s: MarketSnapshot) {
  return {
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    price: s.lastPrice,
    changePct: s.changePct,
    volume: s.volume,
  };
}
