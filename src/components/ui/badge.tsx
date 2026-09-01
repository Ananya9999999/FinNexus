import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SignalLabel } from "@/lib/types";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "up" | "down" | "warn";
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    up: "bg-up/12 text-up",
    down: "bg-down/12 text-down",
    warn: "bg-warn/12 text-warn",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function signalTone(s: SignalLabel): "up" | "down" | "warn" {
  if (s === "BUY" || s === "STRONG_BUY") return "up";
  if (s === "SELL" || s === "STRONG_SELL" || s === "AVOID") return "down";
  return "warn";
}

export function SignalBadge({ signal }: { signal: SignalLabel | string }) {
  const s = signal as SignalLabel;
  return <Badge tone={signalTone(s)}>{String(signal).replace("_", " ")}</Badge>;
}
