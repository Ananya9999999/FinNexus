import type { AgentOutput, SignalLabel } from "@/lib/types";
import { clamp } from "@/lib/utils";

export function labelFromScore(score: number, conf: number): SignalLabel {
  if (conf < 0.38) return "HOLD";
  if (score >= 0.55) return "STRONG_BUY";
  if (score >= 0.22) return "BUY";
  if (score <= -0.55) return "STRONG_SELL";
  if (score <= -0.22) return "SELL";
  return "HOLD";
}

export async function withLatency<T>(min: number, max: number, fn: () => T | Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const t0 = performance.now();
  const extra = min + Math.random() * (max - min);
  const [value] = await Promise.all([Promise.resolve(fn()), new Promise((r) => setTimeout(r, extra))]);
  return { value, latencyMs: Math.round((performance.now() - t0) * 10) / 10 };
}

export function baseOutput(partial: Omit<AgentOutput, "latencyMs"> & { latencyMs?: number }): AgentOutput {
  return {
    ...partial,
    score: clamp(partial.score, -1, 1),
    confidence: clamp(partial.confidence, 0.1, 0.95),
    latencyMs: partial.latencyMs ?? 0,
  };
}
