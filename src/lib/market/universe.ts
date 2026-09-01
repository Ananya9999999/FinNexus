export type UniverseName = {
  ticker: string;
  name: string;
  sector: string;
  base: number;
  beta: number;
  personality:
    | "quality"
    | "cyclical"
    | "defensive"
    | "highbeta"
    | "psu"
    | "growth";
};

export const UNIVERSE: UniverseName[] = [
  { ticker: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy / Digital", base: 2948, beta: 1.05, personality: "growth" },
  { ticker: "TCS.NS", name: "Tata Consultancy Services", sector: "IT Services", base: 3924, beta: 0.72, personality: "quality" },
  { ticker: "HDFCBANK.NS", name: "HDFC Bank", sector: "Private Banks", base: 1688, beta: 0.85, personality: "quality" },
  { ticker: "INFY.NS", name: "Infosys", sector: "IT Services", base: 1512, beta: 0.88, personality: "quality" },
  { ticker: "ICICIBANK.NS", name: "ICICI Bank", sector: "Private Banks", base: 1236, beta: 0.9, personality: "quality" },
  { ticker: "SBIN.NS", name: "State Bank of India", sector: "PSU Banks", base: 812, beta: 1.15, personality: "psu" },
  { ticker: "BHARTIARTL.NS", name: "Bharti Airtel", sector: "Telecom", base: 1644, beta: 0.8, personality: "growth" },
  { ticker: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "FMCG", base: 2488, beta: 0.45, personality: "defensive" },
  { ticker: "TATAMOTORS.NS", name: "Tata Motors", sector: "Auto", base: 978, beta: 1.35, personality: "cyclical" },
  { ticker: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "NBFCs", base: 7124, beta: 1.42, personality: "highbeta" },
  { ticker: "ASIANPAINT.NS", name: "Asian Paints", sector: "Consumer", base: 2456, beta: 0.7, personality: "quality" },
  { ticker: "WIPRO.NS", name: "Wipro", sector: "IT Services", base: 488, beta: 0.95, personality: "quality" },
  { ticker: "LT.NS", name: "Larsen & Toubro", sector: "Capital Goods", base: 3560, beta: 1.1, personality: "cyclical" },
  { ticker: "ITC.NS", name: "ITC", sector: "FMCG", base: 418, beta: 0.5, personality: "defensive" },
  { ticker: "BANKNIFTY", name: "Bank Nifty", sector: "Index / F&O", base: 51240, beta: 1.2, personality: "highbeta" },
];

export const DEFAULT_WATCHLIST = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "BAJFINANCE.NS",
  "BANKNIFTY",
];

export function findName(ticker: string) {
  const t = ticker.toUpperCase();
  return (
    UNIVERSE.find((u) => u.ticker === t) ||
    UNIVERSE.find((u) => u.ticker.startsWith(t.replace(".NS", ""))) || {
      ticker: t.endsWith(".NS") ? t : `${t}.NS`,
      name: t.replace(".NS", ""),
      sector: "Equity",
      base: 1000,
      beta: 1,
      personality: "cyclical" as const,
    }
  );
}
