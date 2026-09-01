import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInr(n: number, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function normalizeTicker(raw: string) {
  const t = raw.toUpperCase().trim().replace(/\s+/g, "");
  if (!t) return "RELIANCE.NS";
  if (t.endsWith(".NS") || t.endsWith(".BO")) return t;
  if (t === "BANKNIFTY" || t === "NIFTY") return t;
  return `${t}.NS`;
}

export function bareTicker(ticker: string) {
  return ticker.replace(/\.(NS|BO)$/i, "");
}
