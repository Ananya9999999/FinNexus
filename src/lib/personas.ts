import type { InvestorProfile } from "@/lib/types";

export const PERSONAS: Record<string, Omit<InvestorProfile, "userId">> = {
  riya: {
    displayName: "Riya Sharma",
    riskTolerance: "conservative",
    investmentHorizon: "long",
    maxPositionPct: 8,
    preferredSectors: ["Private Banks", "IT Services", "FMCG"],
    avoidSectors: ["F&O", "NBFCs"],
    behavioralFlags: ["loss_averse", "prefers_dividends"],
    cashPct: 25,
    watchlist: ["HDFCBANK.NS", "TCS.NS", "INFY.NS", "RELIANCE.NS", "HINDUNILVR.NS"],
    notes: "Capital preservation first. No F&O.",
    holdings: [
      { ticker: "HDFCBANK.NS", quantity: 50, avgPrice: 1650, weightPct: 35 },
      { ticker: "TCS.NS", quantity: 20, avgPrice: 3800, weightPct: 25 },
      { ticker: "RELIANCE.NS", quantity: 15, avgPrice: 2800, weightPct: 15 },
    ],
  },
  arjun: {
    displayName: "Arjun Mehta",
    riskTolerance: "aggressive",
    investmentHorizon: "short",
    maxPositionPct: 20,
    preferredSectors: ["IT Services", "Energy / Digital", "NBFCs"],
    avoidSectors: [],
    behavioralFlags: ["fomo_prone", "momentum_chaser"],
    cashPct: 5,
    watchlist: ["RELIANCE.NS", "BAJFINANCE.NS", "BANKNIFTY", "INFY.NS", "TATAMOTORS.NS"],
    notes: "High turnover, chase momentum, small cash buffer.",
    holdings: [
      { ticker: "RELIANCE.NS", quantity: 40, avgPrice: 2700, weightPct: 40 },
      { ticker: "INFY.NS", quantity: 30, avgPrice: 1700, weightPct: 20 },
      { ticker: "BAJFINANCE.NS", quantity: 8, avgPrice: 6900, weightPct: 25 },
    ],
  },
  priya: {
    displayName: "Priya Nair",
    riskTolerance: "moderate",
    investmentHorizon: "medium",
    maxPositionPct: 12,
    preferredSectors: ["Private Banks", "IT Services"],
    avoidSectors: [],
    behavioralFlags: ["balanced"],
    cashPct: 15,
    watchlist: ["HDFCBANK.NS", "RELIANCE.NS", "TCS.NS", "INFY.NS", "ICICIBANK.NS"],
    notes: "SIP investor, hates unexplained drawdowns.",
    holdings: [
      { ticker: "HDFCBANK.NS", quantity: 25, avgPrice: 1600, weightPct: 20 },
      { ticker: "RELIANCE.NS", quantity: 20, avgPrice: 2750, weightPct: 20 },
      { ticker: "TCS.NS", quantity: 10, avgPrice: 3900, weightPct: 15 },
    ],
  },
};

export function emptyProfile(userId: string, displayName: string): InvestorProfile {
  return {
    userId,
    displayName,
    riskTolerance: "moderate",
    investmentHorizon: "medium",
    maxPositionPct: 12,
    preferredSectors: [],
    avoidSectors: [],
    behavioralFlags: ["balanced"],
    cashPct: 40,
    watchlist: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
    notes: "",
    holdings: [],
  };
}
