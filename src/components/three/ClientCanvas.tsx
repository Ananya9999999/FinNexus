import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { AgentOutput } from "@/lib/types";

const HeroScene = lazy(() => import("./HeroScene").then((m) => ({ default: m.HeroScene })));
const LogoMark = lazy(() => import("./LogoMark").then((m) => ({ default: m.LogoMark })));
const WarRoomScene = lazy(() => import("./WarRoomScene").then((m) => ({ default: m.WarRoomScene })));

function Mount({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  if (!ok) return <>{fallback}</>;
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function HeroCanvas() {
  return (
    <Mount fallback={<div className="h-full w-full bg-bg" />}>
      <HeroScene />
    </Mount>
  );
}

export function LogoCanvas({ className }: { className?: string }) {
  return (
    <Mount fallback={<div className={className} />}>
      <LogoMark className={className} />
    </Mount>
  );
}

export function WarRoomCanvas({
  className,
  running,
  agents,
}: {
  className?: string;
  running: boolean;
  agents: AgentOutput[];
}) {
  return (
    <Mount fallback={<div className={className} />}>
      <div className={className}>
        <WarRoomScene running={running} agents={agents} />
      </div>
    </Mount>
  );
}
