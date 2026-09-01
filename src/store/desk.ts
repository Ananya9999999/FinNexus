import { create } from "zustand";
import type { AgentOutput, DemoScenario, InvestorProfile, LiveQuote, PipelineResult, RiskTolerance } from "@/lib/types";
import { DEFAULT_WATCHLIST } from "@/lib/market/universe";
import { buildSnapshot, liveQuoteFromSnapshot } from "@/lib/market/engine";
import { emptyProfile } from "@/lib/personas";

type DeskState = {
  profile: InvestorProfile | null;
  ticker: string;
  compareTicker: string;
  compareResult: PipelineResult | null;
  mode: "research" | "compare";
  running: boolean;
  result: PipelineResult | null;
  liveAgents: AgentOutput[];
  whatIfRisk: "current" | RiskTolerance;
  plainLanguage: boolean;
  scenario: DemoScenario;
  tick: number;
  quotes: LiveQuote[];
  lastRuns: Record<string, number>;
  paperBusy: boolean;
  setProfile: (p: InvestorProfile) => void;
  setTicker: (t: string) => void;
  setCompareTicker: (t: string) => void;
  setCompareResult: (r: PipelineResult | null) => void;
  setMode: (m: DeskState["mode"]) => void;
  setRunning: (v: boolean) => void;
  setResult: (r: PipelineResult | null) => void;
  setWhatIf: (v: DeskState["whatIfRisk"]) => void;
  setPlain: (v: boolean) => void;
  setScenario: (s: DemoScenario) => void;
  resetLive: () => void;
  pushAgent: (a: AgentOutput) => void;
  markRun: (ticker: string) => void;
  setPaperBusy: (v: boolean) => void;
  pulseTape: () => void;
};

function seedQuotes(tick: number, tickers: string[] = DEFAULT_WATCHLIST): LiveQuote[] {
  const list = tickers.length ? tickers : DEFAULT_WATCHLIST;
  return list.slice(0, 8).map((t) => liveQuoteFromSnapshot(buildSnapshot(t, { tick })));
}

export const useDesk = create<DeskState>((set, get) => ({
  profile: null,
  ticker: "RELIANCE.NS",
  compareTicker: "TCS.NS",
  compareResult: null,
  mode: "research",
  running: false,
  result: null,
  liveAgents: [],
  whatIfRisk: "current",
  plainLanguage: false,
  scenario: "none",
  tick: 0,
  quotes: seedQuotes(0),
  lastRuns: {},
  paperBusy: false,
  setProfile: (p) =>
    set((s) => ({
      profile: p,
      quotes: seedQuotes(s.tick, p.watchlist.length ? p.watchlist : DEFAULT_WATCHLIST),
    })),
  setTicker: (t) => set({ ticker: t }),
  setCompareTicker: (t) => set({ compareTicker: t }),
  setCompareResult: (r) => set({ compareResult: r }),
  setMode: (m) => set({ mode: m }),
  setRunning: (v) => set({ running: v }),
  setResult: (r) => set({ result: r }),
  setWhatIf: (v) => set({ whatIfRisk: v }),
  setPlain: (v) => set({ plainLanguage: v }),
  setScenario: (s) => set({ scenario: s }),
  resetLive: () => set({ liveAgents: [] }),
  pushAgent: (a) =>
    set((s) => ({
      liveAgents: [...s.liveAgents.filter((x) => x.agentName !== a.agentName), a],
    })),
  markRun: (ticker) =>
    set((s) => ({ lastRuns: { ...s.lastRuns, [ticker]: Date.now() } })),
  setPaperBusy: (v) => set({ paperBusy: v }),
  pulseTape: () => {
    const tick = get().tick + 1;
    const p = get().profile;
    const list = p?.watchlist?.length ? p.watchlist : DEFAULT_WATCHLIST;
    set({ tick, quotes: seedQuotes(tick, list) });
  },
}));

export function profileOrEmpty(p: InvestorProfile | null, userId = "anon", name = "Investor") {
  return p ?? emptyProfile(userId, name);
}
