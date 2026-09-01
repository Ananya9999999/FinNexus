import { motion, AnimatePresence } from "motion/react";
import { WarRoomCanvas } from "@/components/three/ClientCanvas";
import { SignalBadge } from "@/components/ui/badge";
import type { AgentOutput, PipelineResult } from "@/lib/types";

const IDLE = [
  "Momentum",
  "Flow",
  "Filing",
  "Sentiment",
  "Risk",
] as const;

const AGENT_ICONS: Record<string, string> = {
  Momentum: "◈",
  Flow: "◉",
  Filing: "◇",
  Sentiment: "✦",
  Risk: "△",
};

const AGENT_COLORS: Record<string, string> = {
  Momentum: "var(--theme-primary)",
  Flow: "#8ab4ff",
  Filing: "#d8d7c4",
  Sentiment: "#d5c77a",
  Risk: "#a6a98c",
};

export function WarRoom({
  running,
  result,
  liveAgents,
  onCite,
}: {
  running: boolean;
  result: PipelineResult | null;
  liveAgents: AgentOutput[];
  onCite?: (source: string, snippet: string, date?: string) => void;
}) {
  const source =
    running || liveAgents.length
      ? liveAgents
      : (result?.agents ?? []);

  const agents = IDLE.map(
    (name) =>
      source.find((a) => a.agentName === name) ?? {
        agentName: name,
      },
  );

  const liveFull = source.filter(
    (a): a is AgentOutput =>
      Boolean(a.agentId && a.signal),
  );

  const completed = liveFull.length;

  const statusText = running
    ? completed === 0
      ? "INITIALIZING COMMITTEE"
      : completed < IDLE.length
        ? `ANALYZING · ${completed}/${IDLE.length} AGENTS`
        : "SYNTHESIZING DECISION"
    : liveFull.length
      ? "COMMITTEE SETTLED"
      : "SYSTEM READY";

  return (
    <aside className="space-y-3">

      {/* =====================================================
          AI WAR ROOM
          ===================================================== */}

      <motion.div
        layout
        className="relative overflow-hidden rounded-[22px] bg-surface shadow-[var(--shadow-border)]"
      >

        {/* Ambient glow */}
        <motion.div
          className="pointer-events-none absolute -left-20 -top-20 size-52 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--theme-glow), transparent 70%)",
          }}
          animate={{
            scale: running ? [1, 1.35, 1] : [1, 1.08, 1],
            opacity: running ? [0.25, 0.65, 0.25] : [0.18, 0.3, 0.18],
          }}
          transition={{
            duration: running ? 2.2 : 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="pointer-events-none absolute -bottom-20 -right-20 size-60 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(90,120,180,.16), transparent 70%)",
          }}
          animate={{
            scale: running ? [1, 1.25, 1] : 1,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-border/60 px-4 py-3">

          <div>
            <div className="flex items-center gap-2">
              <motion.span
                className="size-2 rounded-full"
                style={{
                  background: running
                    ? "var(--theme-primary)"
                    : "#8c9565",
                }}
                animate={
                  running
                    ? {
                        scale: [1, 1.8, 1],
                        opacity: [0.5, 1, 0.5],
                      }
                    : {
                        opacity: [0.6, 1, 0.6],
                      }
                }
                transition={{
                  duration: running ? 0.9 : 2,
                  repeat: Infinity,
                }}
              />

              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                AI WAR ROOM
              </span>
            </div>

            <p className="mt-1 text-[11px] text-faint">
              Autonomous investment committee
            </p>
          </div>

          <motion.div
            key={statusText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[9px] uppercase tracking-wider text-muted"
          >
            {statusText}
          </motion.div>
        </div>

        {/* 3D Scene */}
        <div className="relative h-56">

          <WarRoomCanvas
            className="absolute inset-0 h-full w-full"
            running={running}
            agents={liveFull}
          />

          {/* Scanline */}
          {running && (
            <motion.div
              className="pointer-events-none absolute left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--theme-primary), transparent)",
                boxShadow:
                  "0 0 14px var(--theme-primary)",
              }}
              animate={{
                top: ["5%", "95%"],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}

          {/* Center status */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

            <motion.div
              animate={
                running
                  ? {
                      scale: [1, 1.08, 1],
                      opacity: [0.65, 1, 0.65],
                    }
                  : {
                      scale: 1,
                      opacity: 0.75,
                    }
              }
              transition={{
                duration: 1.8,
                repeat: running ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="rounded-full border border-[var(--theme-border-bright)] bg-bg/60 px-4 py-2 backdrop-blur-md"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                {running
                  ? "NEURAL SYNTHESIS"
                  : liveFull.length
                    ? "DECISION LOCKED"
                    : "AWAITING SIGNAL"}
              </span>
            </motion.div>

          </div>
        </div>

        {/* Progress */}
        <div className="relative z-10 px-4 pb-4">

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-faint">
              Committee activity
            </span>

            <span className="font-mono text-[10px] text-muted">
              {completed}/{IDLE.length}
            </span>
          </div>

          <div className="h-1 overflow-hidden rounded-full bg-surface-2">

            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--theme-primary), #8ab4ff)",
                boxShadow:
                  "0 0 12px var(--theme-glow)",
              }}
              animate={{
                width: `${(completed / IDLE.length) * 100}%`,
              }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
              }}
            />

          </div>
        </div>
      </motion.div>

      {/* =====================================================
          AGENT TRACES
          ===================================================== */}

      <div className="rounded-[22px] bg-surface p-3 shadow-[var(--shadow-border)]">

        <div className="mb-3 flex items-center justify-between px-1">

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Agent traces
            </p>

            <p className="mt-0.5 text-[10px] text-faint">
              Independent signals → CIO synthesis
            </p>
          </div>

          {running && (
            <motion.span
              className="font-mono text-[9px] text-[var(--theme-primary)]"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            >
              LIVE
            </motion.span>
          )}

        </div>

        <div className="space-y-2">

          {agents.map((a, index) => {

            const isLive =
              "signal" in a && Boolean(a.signal);

            const color =
              AGENT_COLORS[a.agentName] ??
              "var(--theme-primary)";

            return (
              <motion.div
                key={a.agentName}
                layout
                initial={{
                  opacity: 0,
                  x: -15,
                  filter: "blur(5px)",
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  filter: "blur(0px)",
                }}
                transition={{
                  delay: index * 0.07,
                  duration: 0.35,
                }}
                whileHover={{
                  x: 4,
                }}
                className="group relative overflow-hidden rounded-[16px] bg-surface-2 p-3"
              >

                {/* Active glow */}
                {running && !isLive && (
                  <motion.div
                    className="absolute inset-y-0 left-0 w-1"
                    style={{
                      background: color,
                      boxShadow: `0 0 18px ${color}`,
                    }}
                    animate={{
                      opacity: [0.25, 1, 0.25],
                    }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                    }}
                  />
                )}

                {isLive && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{
                      background: color,
                      boxShadow: `0 0 14px ${color}`,
                    }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      duration: 0.4,
                    }}
                  />
                )}

                <div className="flex items-center justify-between gap-2">

                  <div className="flex items-center gap-2">

                    <motion.span
                      className="flex size-7 items-center justify-center rounded-full border text-xs"
                      style={{
                        color,
                        borderColor: `${color}55`,
                        background: `${color}10`,
                      }}
                      animate={
                        running && !isLive
                          ? {
                              scale: [1, 1.12, 1],
                              boxShadow: [
                                `0 0 0px ${color}`,
                                `0 0 18px ${color}`,
                                `0 0 0px ${color}`,
                              ],
                            }
                          : {}
                      }
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                    >
                      {AGENT_ICONS[a.agentName] ?? "◉"}
                    </motion.span>

                    <div>
                      <span className="text-sm font-medium">
                        {a.agentName}
                      </span>

                      <div className="text-[9px] uppercase tracking-wider text-faint">
                        {isLive
                          ? "signal received"
                          : running
                            ? "processing"
                            : "standby"}
                      </div>
                    </div>

                  </div>

                  {"signal" in a && a.signal ? (
                    <SignalBadge signal={a.signal} />
                  ) : (
                    <motion.span
                      className="font-mono text-[10px] text-faint"
                      animate={
                        running
                          ? {
                              opacity: [0.35, 1, 0.35],
                            }
                          : {}
                      }
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                      }}
                    >
                      {running ? "thinking…" : "idle"}
                    </motion.span>
                  )}

                </div>

                {"reasoning" in a && a.reasoning && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted"
                  >
                    {a.reasoning}
                  </motion.p>
                )}

                {"citations" in a &&
                  a.citations?.slice(0, 2).map((c) => (
                    <motion.button
                      key={c.source + c.snippet}
                      type="button"
                      whileHover={{ x: 3 }}
                      className="mt-1 block text-left text-[11px] text-faint transition-colors hover:text-muted"
                      onClick={() =>
                        onCite?.(
                          c.source,
                          c.snippet,
                          c.date,
                        )
                      }
                    >
                      <span
                        style={{
                          color,
                        }}
                      >
                        ↗
                      </span>{" "}
                      {c.source}
                      {c.date ? ` · ${c.date}` : ""} —{" "}
                      {c.snippet}
                    </motion.button>
                  ))}

                {"latencyMs" in a &&
                  typeof a.latencyMs === "number" &&
                  "signal" in a &&
                  a.signal && (
                    <div className="mt-2 flex items-center justify-between">

                      <span className="font-mono text-[9px] text-faint">
                        COMPUTE COMPLETE
                      </span>

                      <span className="font-mono text-[10px] text-faint">
                        {a.latencyMs} ms
                      </span>

                    </div>
                  )}

              </motion.div>
            );
          })}

        </div>
      </div>

      {/* =====================================================
          FINAL SYNTHESIS
          ===================================================== */}

      <AnimatePresence>
        {result?.synthesis && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
            className="relative overflow-hidden rounded-[22px] border border-[var(--theme-border-bright)] bg-surface p-4"
          >

            <motion.div
              className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, var(--theme-glow), transparent 70%)",
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.15, 0.35, 0.15],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
            />

            <div className="relative z-10">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-[10px] uppercase tracking-[0.18em] text-faint">
                  Chair synthesis
                </span>

                <span className="live-indicator">
                  Decision ready
                </span>

              </div>

              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="font-display text-2xl tracking-tight">
                    {result.synthesis.finalSignal}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {result.synthesis.recommendation}
                  </p>
                </div>

                <motion.div
                  initial={{
                    scale: 0.7,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    delay: 0.25,
                    type: "spring",
                    stiffness: 180,
                  }}
                  className="text-right"
                >
                  <div className="font-mono text-2xl font-semibold text-[var(--theme-primary-bright)]">
                    {Math.round(
                      result.synthesis.confidence * 100,
                    )}
                    %
                  </div>

                  <div className="text-[9px] uppercase tracking-wider text-faint">
                    confidence
                  </div>
                </motion.div>

              </div>

              {/* Confidence bar */}
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">

                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--theme-primary), #d0d69a)",
                    boxShadow:
                      "0 0 14px var(--theme-glow)",
                  }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${result.synthesis.confidence * 100}%`,
                  }}
                  transition={{
                    duration: 1,
                    delay: 0.2,
                    ease: "easeOut",
                  }}
                />

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </aside>
  );
}