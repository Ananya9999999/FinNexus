import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Copy,
  Download,
  Loader2,
  Play,
  Printer,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, SignalBadge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import { WarRoom } from "@/components/desk/WarRoom";
import { PaperBar } from "@/components/desk/PaperBar";

import { runPipeline } from "@/lib/agents/orchestrator";
import { synthesize } from "@/lib/agents/synthesizer";
import { simulateImpact } from "@/lib/impact";
import { saveDecision } from "@/lib/server/analysis";
import { getMyProfile } from "@/lib/server/profile";
import { generateGrokMemo } from "@/lib/server/ask";

import { useDesk } from "@/store/desk";

import {
  copyMemo,
  downloadMemo,
  printMemo,
} from "@/lib/memo-export";

import {
  buildSnapshot,
} from "@/lib/market/engine";

import { UNIVERSE } from "@/lib/market/universe";

import {
  formatInr,
  formatPct,
} from "@/lib/utils";

import type {
  Citation,
  DemoScenario,
  InvestorProfile,
  PaperAction,
  PipelineResult,
  RiskTolerance,
  SignalLabel,
} from "@/lib/types";

import { labelFromScore } from "@/lib/agents/contracts";


function quickSignal(
  ticker: string,
  tick: number,
): SignalLabel {
  const s = buildSnapshot(ticker, { tick });

  let score = 0;

  if (s.momentum5d > 2) {
    score += 0.3;
  } else if (s.momentum5d < -2) {
    score -= 0.3;
  }

  if (s.rsi14 > 70) {
    score -= 0.25;
  } else if (s.rsi14 < 30) {
    score += 0.2;
  }

  if (
    s.volumeZscore > 1.5 &&
    s.changePct < 0
  ) {
    score -= 0.2;
  }

  return labelFromScore(score, 0.55);
}


export function DeskView() {
  const desk = useDesk();

  const [error, setError] =
    useState<string | null>(null);

  const [paperState, setPaperState] =
    useState<PaperAction>("pending");

  const [cite, setCite] =
    useState<Citation | null>(null);


  /* ---------------------------------------------------------
     LOAD PROFILE + LIVE TAPE
  --------------------------------------------------------- */

  useEffect(() => {
    getMyProfile()
      .then((p) => desk.setProfile(p))
      .catch(() => {});

    const id = setInterval(() => {
      desk.pulseTape();
    }, 1600);

    return () => clearInterval(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const profile = desk.profile;
  const result = desk.result;


  const risk: RiskTolerance =
    desk.whatIfRisk === "current"
      ? (profile?.riskTolerance ?? "moderate")
      : desk.whatIfRisk;


  /* ---------------------------------------------------------
     LIVE SYNTHESIS
  --------------------------------------------------------- */

  const live = useMemo(() => {
    if (!result || !profile) {
      return null;
    }

    if (desk.whatIfRisk === "current") {
      return {
        synthesis: result.synthesis,
        impact: result.impact,
      };
    }

    const overlay: InvestorProfile = {
      ...profile,
      riskTolerance: risk,
    };

    const synthesis = synthesize(
      result.agents,
      result.market,
      overlay,
      risk,
    );

    const impact = simulateImpact(
      overlay,
      result.market,
      synthesis.finalSignal,
      synthesis.positionHintPct,
    );

    return {
      synthesis,
      impact,
    };
  }, [
    result,
    profile,
    desk.whatIfRisk,
    risk,
  ]);


  /* ---------------------------------------------------------
     RUN PIPELINE
  --------------------------------------------------------- */

  async function run(
    scenario: DemoScenario = desk.scenario,
    overrideProfile?: InvestorProfile,
  ) {
    const p =
      overrideProfile ?? profile;

    if (!p) {
      return;
    }

    setError(null);
    setPaperState("pending");

    desk.setRunning(true);
    desk.setScenario(scenario);
    desk.resetLive();
    desk.setResult(null);
    desk.setCompareResult(null);

    let ticker = desk.ticker;

    if (scenario === "reliance_earnings") {
      ticker = "RELIANCE.NS";
    }

    if (scenario === "fno_trap") {
      ticker = "BANKNIFTY";
    }

    if (scenario === "quality_it") {
      ticker = "TCS.NS";
    }

    desk.setTicker(ticker);


    const last = desk.lastRuns[ticker];

    if (
      last &&
      Date.now() - last < 120_000
    ) {
      toast.message("Recent re-run", {
        description:
          "Risk may refuse to endorse a chase on the same name.",
      });
    }

    desk.markRun(ticker);


    try {
      if (desk.mode === "compare") {

        const [a, b] =
          await Promise.all([
            runPipeline({
              ticker,
              profile: p,
              scenario,
              whatIfRisk:
                desk.whatIfRisk === "current"
                  ? undefined
                  : desk.whatIfRisk,
              tick: desk.tick,
              onAgent: (agent) =>
                desk.pushAgent(agent),
            }),

            runPipeline({
              ticker:
                desk.compareTicker,
              profile: p,
              scenario: "none",
              whatIfRisk:
                desk.whatIfRisk === "current"
                  ? undefined
                  : desk.whatIfRisk,
              tick: desk.tick,
            }),
          ]);


        desk.setResult(a);
        desk.setCompareResult(b);

        saveDecision({
          data: a,
        }).catch(() => {});

        saveDecision({
          data: b,
        }).catch(() => {});

      } else {

        const next =
          await runPipeline({
            ticker,
            profile: p,
            scenario,
            whatIfRisk:
              desk.whatIfRisk === "current"
                ? undefined
                : desk.whatIfRisk,
            tick: desk.tick,
            onAgent: (agent) =>
              desk.pushAgent(agent),
          });

        desk.setResult(next);

        saveDecision({
          data: next,
        }).catch(() => {});
      }

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Pipeline failed",
      );

    } finally {
      desk.setRunning(false);
    }
  }


  const syn = live?.synthesis;
  const impact = live?.impact;


  const split = result
    ? {
        bull: result.agents.filter(
          (a) => a.score > 0.15,
        ),
        bear: result.agents.filter(
          (a) => a.score < -0.15,
        ),
      }
    : null;


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div
      className="
        relative
        mx-auto
        min-h-[calc(100vh-56px)]
        max-w-[1480px]
        px-3
        py-5
        md:px-6
      "
    >


      {/* =====================================================
          HEADER
      ===================================================== */}

      <motion.div
        className="
          mb-5
          flex
          flex-wrap
          items-end
          justify-between
          gap-4
        "
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.65,
        }}
      >

        <div>

          <div className="flex items-center gap-2">

            <span
              className="
                relative
                inline-block
                size-2
                rounded-full
                bg-accent
              "
            />

            <p
              className="
                text-xs
                uppercase
                tracking-[0.2em]
                text-muted
              "
            >
              War room
            </p>

          </div>


          <h1
            className="
              mt-1
              font-display
              text-3xl
              tracking-tight
              md:text-4xl
            "
          >
            {profile
              ? `${profile.displayName}'s desk`
              : "Loading desk"}
          </h1>


          <p className="mt-1 text-sm text-muted">

            {profile
              ? `${profile.riskTolerance} · ${profile.investmentHorizon} horizon · cash ${profile.cashPct}%`
              : "Fetching profile…"}

          </p>

        </div>

      </motion.div>


      {/* =====================================================
          EMPTY BOOK NOTICE
      ===================================================== */}

      {profile &&
        profile.holdings.length === 0 && (

          <motion.div
            className="
              mb-4
              rounded-[18px]
              border
              border-border/60
              bg-surface
              px-4
              py-3
              text-sm
              text-muted
              shadow-[var(--shadow-border)]
            "
            initial={{
              opacity: 0,
              y: -8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            No holdings loaded yet. Add positions
            from Portfolio, then run a scenario here.
          </motion.div>

        )}


      {/* =====================================================
          DESK GRID

          LEFT  = STATIC TAPE
          CENTER = SCROLLING WORKSPACE
          RIGHT = STATIC WAR ROOM
      ===================================================== */}

      <div
        className="
          grid
          items-start
          gap-4
          lg:grid-cols-[240px_minmax(0,1fr)_320px]
        "
      >


        {/* ===================================================
            LEFT STATIC SIDEBAR
        =================================================== */}

        <div
          className="
            lg:sticky
            lg:top-[76px]
            lg:self-start
            lg:max-h-[calc(100vh-92px)]
            lg:overflow-y-auto
            lg:pr-1
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >

          <motion.aside
            className="
              rounded-[20px]
              border
              border-border/60
              bg-surface
              p-3
              shadow-[var(--shadow-border)]
            "
            initial={{
              opacity: 0,
              x: -18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.65,
              delay: 0.1,
            }}
          >

            <div
              className="
                mb-3
                flex
                items-center
                justify-between
                px-1
              "
            >

              <p
                className="
                  text-xs
                  uppercase
                  tracking-[0.18em]
                  text-muted
                "
              >
                Market tape
              </p>

              <span
                className="
                  flex
                  items-center
                  gap-1.5
                  text-[10px]
                  uppercase
                  tracking-wider
                  text-faint
                "
              >

                <span
                  className="
                    size-1.5
                    animate-pulse
                    rounded-full
                    bg-accent
                  "
                />

                Live

              </span>

            </div>


            <div className="space-y-1">

              {desk.quotes.map(
                (q, index) => {

                  const sig =
                    quickSignal(
                      q.ticker,
                      desk.tick,
                    );

                  const active =
                    desk.ticker === q.ticker;


                  return (
                    <motion.button
                      key={q.ticker}
                      type="button"
                      onClick={() =>
                        desk.setTicker(
                          q.ticker,
                        )
                      }
                      className={`
                        group
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-[13px]
                        px-2.5
                        py-2.5
                        text-left
                        transition-all
                        duration-200
                        ${
                          active
                            ? "bg-surface-2 shadow-[inset_0_0_0_1px_var(--color-border)]"
                            : "hover:bg-surface-2/70"
                        }
                      `}
                      initial={{
                        opacity: 0,
                        x: -8,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.045,
                      }}
                      whileHover={{
                        x: 3,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                    >

                      <div>

                        <div className="text-sm font-medium">
                          {q.ticker.replace(
                            ".NS",
                            "",
                          )}
                        </div>

                        <div
                          className="
                            mt-0.5
                            text-[11px]
                            text-faint
                          "
                        >
                          {q.name}
                        </div>

                      </div>


                      <div className="text-right">

                        <div
                          className={`
                            tabular
                            text-sm
                            ${
                              q.changePct >= 0
                                ? "text-up"
                                : "text-down"
                            }
                          `}
                        >
                          {formatPct(
                            q.changePct,
                            2,
                          )}
                        </div>

                        <div className="mt-1">
                          <SignalBadge
                            signal={sig}
                          />
                        </div>

                      </div>

                    </motion.button>
                  );
                },
              )}

            </div>

          </motion.aside>

        </div>


        {/* ===================================================
            CENTER WORKSPACE
        =================================================== */}

        <main className="min-w-0">

          <section className="space-y-4">


            {/* =================================================
                COMMAND CENTER
            ================================================= */}

            <motion.div
              className="
                relative
                overflow-hidden
                rounded-[22px]
                border
                border-border/60
                bg-surface
                p-4
                shadow-[var(--shadow-border)]
              "
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.65,
                delay: 0.08,
              }}
            >

              {/* subtle animated glow */}

              <motion.div
                className="
                  pointer-events-none
                  absolute
                  -right-24
                  -top-24
                  size-48
                  rounded-full
                  bg-accent/5
                  blur-3xl
                "
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [
                    0.25,
                    0.5,
                    0.25,
                  ],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />


              <div
                className="
                  relative
                  flex
                  flex-col
                  gap-3
                  md:flex-row
                  md:items-end
                "
              >

                {/* TICKER */}

                <div className="min-w-0 flex-1 space-y-1.5">

                  <Label htmlFor="ticker">
                    Ticker
                  </Label>

                  <Input
                    id="ticker"
                    list="tickers"
                    value={desk.ticker}
                    onChange={(e) =>
                      desk.setTicker(
                        e.target.value.toUpperCase(),
                      )
                    }
                    placeholder="RELIANCE.NS"
                    className="h-11"
                  />

                  <datalist id="tickers">

                    {UNIVERSE.map((u) => (
                      <option
                        key={u.ticker}
                        value={u.ticker}
                      >
                        {u.name}
                      </option>
                    ))}

                  </datalist>

                </div>


                {/* COMPARE */}

                {desk.mode === "compare" && (

                  <motion.div
                    className="
                      min-w-0
                      flex-1
                      space-y-1.5
                    "
                    initial={{
                      opacity: 0,
                      width: 0,
                    }}
                    animate={{
                      opacity: 1,
                      width: "auto",
                    }}
                  >

                    <Label htmlFor="compare">
                      Compare
                    </Label>

                    <Input
                      id="compare"
                      list="tickers"
                      value={
                        desk.compareTicker
                      }
                      onChange={(e) =>
                        desk.setCompareTicker(
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="TCS.NS"
                      className="h-11"
                    />

                  </motion.div>

                )}


                {/* RUN */}

                <Button
                  onClick={() =>
                    run("none")
                  }
                  disabled={
                    desk.running ||
                    !profile
                  }
                  className="
                    h-11
                    min-w-[140px]
                    shrink-0
                  "
                >

                  {desk.running ? (
                    <Loader2
                      className="
                        size-4
                        animate-spin
                      "
                    />
                  ) : (
                    <Play className="size-4" />
                  )}

                  {desk.mode === "compare"
                    ? "Run both"
                    : "Run desk"}

                </Button>

              </div>


              {/* =================================================
                  SCENARIOS
              ================================================= */}

              <div
                className="
                  relative
                  mt-4
                  flex
                  flex-wrap
                  gap-2
                "
              >

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    run(
                      "reliance_earnings",
                    )
                  }
                  disabled={
                    desk.running
                  }
                >
                  Demo: earnings miss
                </Button>


                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    run("fno_trap")
                  }
                  disabled={
                    desk.running
                  }
                >
                  Demo: F&O trap
                </Button>


                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    run("quality_it")
                  }
                  disabled={
                    desk.running
                  }
                >
                  Demo: quality IT
                </Button>


                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    run("degraded")
                  }
                  disabled={
                    desk.running
                  }
                >
                  Degraded path
                </Button>

              </div>


              {/* =================================================
                  CONTROLS
              ================================================= */}

              <div
                className="
                  relative
                  mt-4
                  flex
                  flex-wrap
                  items-center
                  gap-3
                  border-t
                  border-border/50
                  pt-3
                "
              >

                <label
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    text-muted
                  "
                >

                  What-if risk

                  <select
                    className="
                      h-9
                      rounded-[10px]
                      border
                      border-border/60
                      bg-surface-2
                      px-2.5
                      text-fg
                      outline-none
                    "
                    value={
                      desk.whatIfRisk
                    }
                    onChange={(e) =>
                      desk.setWhatIf(
                        e.target
                          .value as typeof desk.whatIfRisk,
                      )
                    }
                  >

                    <option value="current">
                      Current profile
                    </option>

                    <option value="conservative">
                      Conservative
                    </option>

                    <option value="moderate">
                      Moderate
                    </option>

                    <option value="aggressive">
                      Aggressive
                    </option>

                  </select>

                </label>


                <label
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    text-muted
                  "
                >

                  Mode

                  <select
                    className="
                      h-9
                      rounded-[10px]
                      border
                      border-border/60
                      bg-surface-2
                      px-2.5
                      text-fg
                      outline-none
                    "
                    value={desk.mode}
                    onChange={(e) =>
                      desk.setMode(
                        e.target
                          .value as typeof desk.mode,
                      )
                    }
                  >

                    <option value="research">
                      Research
                    </option>

                    <option value="compare">
                      Compare two
                    </option>

                  </select>

                </label>


                <label
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    text-muted
                  "
                >

                  <input
                    type="checkbox"
                    checked={
                      desk.plainLanguage
                    }
                    onChange={(e) =>
                      desk.setPlain(
                        e.target.checked,
                      )
                    }
                  />

                  Explain like I’m 22

                </label>

              </div>


              {/* ERROR */}

              <AnimatePresence>

                {error && (

                  <motion.p
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    className="
                      mt-3
                      text-sm
                      text-down
                    "
                  >
                    {error}
                  </motion.p>

                )}

              </AnimatePresence>

            </motion.div>


            {/* =================================================
                RESULTS
            ================================================= */}

            <AnimatePresence mode="wait">

              {syn &&
              result &&
              impact ? (

                <motion.div
                  key={
                    result.sessionId +
                    syn.finalSignal +
                    risk
                  }
                  initial={{
                    opacity: 0,
                    y: 18,
                    filter:
                      "blur(6px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter:
                      "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    y: -10,
                  }}
                  transition={{
                    duration: 0.65,
                  }}
                  className="space-y-4"
                >

                  <MemoCard
                    result={result}
                    syn={syn}
                    impact={impact}
                    split={split}
                    plainLanguage={
                      desk.plainLanguage
                    }
                    paperState={
                      paperState
                    }
                    onPaperDone={(a) =>
                      setPaperState(a)
                    }
                    onCite={setCite}
                  />


                  {/* COMPARE */}

                  {desk.compareResult && (

                    <motion.div
                      className="
                        rounded-[20px]
                        border
                        border-border/60
                        bg-surface
                        p-4
                        shadow-[var(--shadow-border)]
                      "
                      initial={{
                        opacity: 0,
                        y: 12,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                    >

                      <p
                        className="
                          text-xs
                          uppercase
                          tracking-wider
                          text-muted
                        "
                      >
                        Compare
                      </p>


                      <div
                        className="
                          mt-1
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >

                        <h3
                          className="
                            font-display
                            text-xl
                          "
                        >
                          {
                            desk.compareResult
                              .market.name
                          }
                        </h3>

                        <SignalBadge
                          signal={
                            desk
                              .compareResult
                              .synthesis
                              .finalSignal
                          }
                        />

                      </div>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-relaxed
                        "
                      >
                        {
                          desk
                            .compareResult
                            .synthesis
                            .recommendation
                        }
                      </p>


                      <p
                        className="
                          mt-1
                          text-xs
                          text-muted
                        "
                      >
                        {
                          desk
                            .compareResult
                            .synthesis
                            .dissent
                        }
                      </p>

                    </motion.div>

                  )}

                </motion.div>

              ) : (

                <motion.div
                  className="
                    flex
                    min-h-[280px]
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-border/60
                    bg-surface
                    p-8
                    text-center
                    text-muted
                    shadow-[var(--shadow-border)]
                  "
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                >

                  <div>

                    <div
                      className="
                        mx-auto
                        mb-4
                        flex
                        size-14
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-border
                        bg-surface-2
                      "
                    >

                      <Play className="size-5 text-accent" />

                    </div>


                    <p className="text-base">

                      {desk.running
                        ? "Dispatching Momentum, Flow, Filing, Sentiment, and Risk in parallel…"
                        : "Pick a ticker or a demo scenario."}

                    </p>


                    <p className="mt-1 text-sm text-faint">

                      {desk.running
                        ? "Agents are analysing the market."
                        : "The desk will show the full reasoning chain here."}

                    </p>

                  </div>

                </motion.div>

              )}

            </AnimatePresence>

          </section>

        </main>


        {/* ===================================================
            RIGHT STATIC WAR ROOM
        =================================================== */}

        <div
          className="
            lg:sticky
            lg:top-[76px]
            lg:self-start
            lg:max-h-[calc(100vh-92px)]
            lg:overflow-y-auto
            lg:pr-1
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >

          <motion.div
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.65,
              delay: 0.18,
            }}
          >

            <WarRoom
              running={desk.running}
              result={result}
              liveAgents={
                desk.liveAgents
              }
              onCite={(
                source,
                snippet,
                date,
              ) =>
                setCite({
                  source,
                  snippet,
                  date,
                })
              }
            />

          </motion.div>

        </div>

      </div>


      {/* =====================================================
          CITATION MODAL
      ===================================================== */}

      <AnimatePresence>

        {cite && (

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="
              fixed
              inset-0
              z-50
              grid
              place-items-center
              bg-bg/70
              p-4
              backdrop-blur-md
            "
            onClick={() =>
              setCite(null)
            }
          >

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.97,
              }}
              transition={{
                duration: 0.35,
              }}
              className="
                w-full
                max-w-lg
                rounded-[22px]
                border
                border-border
                bg-surface
                p-5
                shadow-[var(--shadow-border)]
              "
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <p
                className="
                  text-xs
                  uppercase
                  tracking-wider
                  text-faint
                "
              >
                Source
              </p>


              <h3
                className="
                  mt-1
                  font-display
                  text-xl
                "
              >
                {cite.source}
              </h3>


              {cite.date && (
                <p className="text-xs text-muted">
                  {cite.date}
                </p>
              )}


              <p
                className="
                  mt-3
                  text-sm
                  leading-relaxed
                "
              >
                {cite.snippet}
              </p>


              <Button
                className="mt-4"
                variant="secondary"
                onClick={() =>
                  setCite(null)
                }
              >
                Close
              </Button>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}


/* =============================================================
   MEMO CARD
============================================================= */

function MemoCard({
  result,
  syn,
  impact,
  split,
  plainLanguage,
  paperState,
  onPaperDone,
  onCite,
}: {
  result: PipelineResult;
  syn: PipelineResult["synthesis"];
  impact: PipelineResult["impact"];
  split:
    | {
        bull: PipelineResult["agents"];
        bear: PipelineResult["agents"];
      }
    | null;
  plainLanguage: boolean;
  paperState: PaperAction;
  onPaperDone: (
    action: PaperAction,
  ) => void;
  onCite: (c: Citation) => void;
}) {
  const [grokMemo, setGrokMemo] = useState<string | null>(null);
  const [isGeneratingGrok, setIsGeneratingGrok] = useState(false);

  return (

    <div className="space-y-4">


      {/* =======================================================
          VERDICT CARD
      ======================================================= */}

      <motion.div
        className="
          overflow-hidden
          rounded-[24px]
          border
          border-border/60
          bg-surface
          p-5
          shadow-[var(--shadow-border)]
        "
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >

        <div
          className="
            flex
            flex-wrap
            items-start
            justify-between
            gap-4
          "
        >

          <div>

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >

              <h2
                className="
                  font-display
                  text-2xl
                "
              >
                {result.market.name}
              </h2>


              <SignalBadge
                signal={
                  syn.finalSignal
                }
              />


              {result.market
                .dataQuality ===
                "degraded" && (

                <Badge tone="warn">
                  Degraded feed
                </Badge>

              )}


              {split &&
                split.bull.length >
                  0 &&
                split.bear.length >
                  0 && (

                  <Badge tone="warn">
                    Split verdict
                  </Badge>

                )}

            </div>


            <p
              className="
                mt-1
                tabular
                text-sm
                text-muted
              "
            >
              {formatInr(
                result.market.lastPrice,
              )}{" "}
              ·{" "}
              {formatPct(
                result.market.changePct,
              )}{" "}
              ·{" "}
              {result.market.sector}
            </p>

          </div>


          {/* ACTIONS */}

          <div className="flex gap-2">

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void copyMemo(
                  result,
                ).then(() =>
                  toast.success(
                    "Memo copied",
                  ),
                );
              }}
            >
              <Copy className="size-4" />
            </Button>


            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadMemo(result)
              }
            >
              <Download className="size-4" />
              Memo
            </Button>


            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                printMemo(result)
              }
            >
              <Printer className="size-4" />
            </Button>

          </div>

        </div>


        {/* RECOMMENDATION */}

        <div
          className="
            mt-4
            rounded-[17px]
            border
            border-border/50
            bg-surface-2
            p-4
          "
        >

          <p
            className="
              text-base
              leading-relaxed
            "
          >
            {plainLanguage
              ? plain(
                  syn.recommendation,
                  syn.finalSignal,
                )
              : syn.recommendation}
          </p>


          <p
            className="
              mt-2
              text-sm
              text-muted
            "
          >
            {syn.personalizedNote}
          </p>

        </div>


        {/* WARNING */}

        {syn.trapWarning && (

          <motion.div
            className="
              mt-3
              flex
              gap-2
              rounded-[14px]
              bg-down/10
              px-3
              py-2
              text-sm
              text-down
            "
            initial={{
              opacity: 0,
              x: -8,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
          >

            <AlertTriangle
              className="
                mt-0.5
                size-4
                shrink-0
              "
            />

            <span>
              {syn.trapWarning} SEBI:
              89% of retail F&O traders
              lose money.
            </span>

          </motion.div>

        )}


        {/* DISAGREEMENT */}

        {split &&
          split.bull.length > 0 &&
          split.bear.length > 0 && (

            <div
              className="
                mt-3
                rounded-[14px]
                bg-surface-2
                p-3
                text-sm
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wider
                  text-faint
                "
              >
                Disagreement
              </p>


              <p
                className="
                  mt-1
                  text-muted
                "
              >

                {split.bull
                  .map(
                    (a) =>
                      a.agentName,
                  )
                  .join(", ")}{" "}

                constructive ·{" "}

                {split.bear
                  .map(
                    (a) =>
                      a.agentName,
                  )
                  .join(", ")}{" "}

                dissent.

                Chair did not average
                this away.

              </p>


              <div
                className="
                  mt-2
                  flex
                  h-1.5
                  overflow-hidden
                  rounded-full
                "
              >

                <motion.div
                  className="bg-up"
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${
                      (split.bull.length /
                        5) *
                      100
                    }%`,
                  }}
                  transition={{
                    duration: 0.8,
                  }}
                />


                <motion.div
                  className="bg-down"
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${
                      (split.bear.length /
                        5) *
                      100
                    }%`,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1,
                  }}
                />

              </div>

            </div>

          )}


        {/* STATS */}

        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-2
            md:grid-cols-4
          "
        >

          <Stat
            label="Conviction"
            value={`${Math.round(
              syn.confidence * 100,
            )}%`}
          />

          <Stat
            label="Score"
            value={`${
              syn.score >= 0
                ? "+"
                : ""
            }${syn.score.toFixed(2)}`}
          />

          <Stat
            label="Size hint"
            value={`${
              syn.positionHintPct >=
              0
                ? "+"
                : ""
            }${syn.positionHintPct}%`}
          />

          <Stat
            label="Agreement"
            value={`${Math.round(
              syn.agreement * 100,
            )}%`}
          />

        </div>


        {/* THESIS */}

        <div
          className="
            mt-5
            grid
            gap-3
            md:grid-cols-3
          "
        >

          <MemoBlock
            title="Thesis"
            body={syn.thesis}
          />

          <MemoBlock
            title="Dissent"
            body={syn.dissent}
          />

          <MemoBlock
            title="Invalidation"
            body={syn.invalidation}
          />

        </div>


        {/* PAPER */}

        <div className="mt-4">

          <PaperBar
            sessionId={
              result.sessionId
            }
            current={paperState}
            sizeHintPct={
              syn.positionHintPct
            }
            onDone={onPaperDone}
          />

        </div>

      </motion.div>


      {/* =======================================================
          CHARTS
      ======================================================= */}

      <div
        className="
          grid
          gap-4
          md:grid-cols-2
        "
      >


        {/* PRICE */}

        <motion.div
          className="
            rounded-[20px]
            border
            border-border/60
            bg-surface
            p-4
            shadow-[var(--shadow-border)]
          "
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
          }}
        >

          <p
            className="
              mb-2
              text-xs
              uppercase
              tracking-wider
              text-muted
            "
          >
            90-day tape
          </p>


          <div className="h-44">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={result.market.series.slice(
                  -60,
                )}
              >

                <defs>

                  <linearGradient
                    id="px"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="0%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="100%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />

                  </linearGradient>

                </defs>


                <CartesianGrid
                  stroke="var(--color-border)"
                  vertical={false}
                />


                <XAxis
                  dataKey="t"
                  hide
                />


                <YAxis
                  hide
                  domain={[
                    "auto",
                    "auto",
                  ]}
                />


                <Tooltip
                  contentStyle={{
                    background:
                      "var(--color-surface)",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                  labelStyle={{
                    color:
                      "var(--color-muted)",
                  }}
                />


                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="var(--color-accent)"
                  fill="url(#px)"
                  strokeWidth={1.5}
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </motion.div>


        {/* AGENT SCORES */}

        <motion.div
          className="
            rounded-[20px]
            border
            border-border/60
            bg-surface
            p-4
            shadow-[var(--shadow-border)]
          "
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.18,
          }}
        >

          <p
            className="
              mb-2
              text-xs
              uppercase
              tracking-wider
              text-muted
            "
          >
            Agent scores
          </p>


          <div className="h-44">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={result.agents.map(
                  (a) => ({
                    name: a.agentName,
                    score: a.score,
                  }),
                )}
              >

                <CartesianGrid
                  stroke="var(--color-border)"
                  vertical={false}
                />


                <XAxis
                  dataKey="name"
                  tick={{
                    fill:
                      "var(--color-muted)",
                    fontSize: 11,
                  }}
                />


                <YAxis
                  domain={[
                    -1,
                    1,
                  ]}
                  tick={{
                    fill:
                      "var(--color-muted)",
                    fontSize: 11,
                  }}
                />


                <Tooltip
                  contentStyle={{
                    background:
                      "var(--color-surface)",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />


                <Bar
                  dataKey="score"
                  fill="var(--color-accent)"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </motion.div>

      </div>


      {/* =======================================================
          PORTFOLIO IMPACT
      ======================================================= */}

      <motion.div
        className="
          rounded-[20px]
          border
          border-border/60
          bg-surface
          p-4
          shadow-[var(--shadow-border)]
        "
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.25,
        }}
      >

        <p
          className="
            mb-3
            text-xs
            uppercase
            tracking-wider
            text-muted
          "
        >
          Portfolio impact
        </p>


        <div
          className="
            grid
            grid-cols-2
            gap-2
            md:grid-cols-4
          "
        >

          <Stat
            label="Weight"
            value={`${impact.currentWeightPct}% → ${impact.proposedWeightPct}%`}
          />

          <Stat
            label="Cash"
            value={`${impact.cashBefore}% → ${impact.cashAfter}%`}
          />

          <Stat
            label="HHI"
            value={`${impact.hhiBefore} → ${impact.hhiAfter}`}
          />

          <Stat
            label="Risk score"
            value={`${impact.riskScoreBefore} → ${impact.riskScoreAfter}`}
          />

        </div>


        <p
          className="
            mt-3
            text-sm
            text-muted
          "
        >
          {impact.action}.{" "}
          {impact.diversificationNote}.{" "}
          {impact.withinLimits
            ? "Within max position."
            : "Exceeds max position."}
        </p>


        {impact.currentWeightPct >=
          20 && (

          <p
            className="
              mt-2
              text-sm
              text-warn
            "
          >
            A 6% drop here is a ~
            {(
              (impact.currentWeightPct /
                100) *
              6
            ).toFixed(1)}
            % portfolio hit.
          </p>

        )}

      </motion.div>


      {/* =======================================================
          SESSION METRICS
      ======================================================= */}

      <motion.div
        className="
          rounded-[20px]
          border
          border-border/60
          bg-surface
          p-4
          shadow-[var(--shadow-border)]
        "
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.3,
        }}
      >

        <p
          className="
            mb-3
            text-xs
            uppercase
            tracking-wider
            text-muted
          "
        >
          Session metrics
        </p>


        <div
          className="
            grid
            grid-cols-2
            gap-2
            md:grid-cols-4
          "
        >

          <Stat
            label="Latency"
            value={`${Math.round(
              result.metrics
                .totalLatencyMs,
            )} ms`}
          />

          <Stat
            label="Agents"
            value={`${result.metrics.numAgentsSucceeded}/5`}
          />

          <Stat
            label="HHI"
            value={`${result.metrics.portfolioHhi}`}
          />

          <Stat
            label="30d proxy"
            value={`${result.metrics.forwardReturnProxy}%`}
          />

        </div>

      </motion.div>


      {/* =======================================================
          REASONING
      ======================================================= */}

      <motion.div
        className="
          rounded-[20px]
          border
          border-border/60
          bg-surface
          p-4
          shadow-[var(--shadow-border)]
        "
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.35,
        }}
      >

        <p
          className="
            mb-3
            text-xs
            uppercase
            tracking-wider
            text-muted
          "
        >
          Reasoning chain
        </p>


        <ol className="space-y-2">

          {syn.reasoningChain.map(
            (step, index) => (

              <motion.li
                key={step}
                className="
                  flex
                  gap-3
                  rounded-[12px]
                  bg-surface-2
                  px-3
                  py-2
                  text-sm
                  leading-relaxed
                  text-fg/90
                "
                initial={{
                  opacity: 0,
                  x: -8,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay:
                    0.4 +
                    index * 0.05,
                }}
              >

                <span
                  className="
                    shrink-0
                    text-xs
                    font-medium
                    text-accent
                  "
                >
                  {String(
                    index + 1,
                  ).padStart(2, "0")}
                </span>

                <span>
                  {step}
                </span>

              </motion.li>

            ),
          )}

        </ol>

      </motion.div>


      {/* =======================================================
          CITATIONS
      ======================================================= */}

      <motion.div
        className="
          rounded-[20px]
          border
          border-border/60
          bg-surface
          p-4
          shadow-[var(--shadow-border)]
        "
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.4,
        }}
      >

        <p
          className="
            mb-3
            text-xs
            uppercase
            tracking-wider
            text-muted
          "
        >
          Citations
        </p>


        <div className="flex flex-wrap gap-2">

          {result.agents.flatMap(
            (a) =>
              a.citations.map(
                (c) => (

                  <motion.button
                    key={
                      a.agentName +
                      c.source +
                      c.snippet
                    }
                    type="button"
                    className="
                      rounded-full
                      border
                      border-border/60
                      bg-surface-2
                      px-3
                      py-1.5
                      text-[11px]
                      text-muted
                      transition-colors
                      hover:text-fg
                    "
                    onClick={() =>
                      onCite(c)
                    }
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.95,
                    }}
                  >
                    {c.source}
                  </motion.button>

                ),
              ),
          )}

        </div>

      </motion.div>

    </div>
  );
}


/* =============================================================
   STAT
============================================================= */

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (

    <motion.div
      className="
        rounded-[14px]
        border
        border-border/40
        bg-surface-2
        px-3
        py-2.5
      "
      whileHover={{
        y: -2,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >

      <div
        className="
          text-[10px]
          uppercase
          tracking-wider
          text-faint
        "
      >
        {label}
      </div>


      <div
        className="
          mt-0.5
          tabular
          text-sm
          font-medium
        "
      >
        {value}
      </div>

    </motion.div>

  );
}


/* =============================================================
   MEMO BLOCK
============================================================= */

function MemoBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (

    <motion.div
      className="
        rounded-[16px]
        border
        border-border/40
        bg-surface-2
        p-3.5
      "
      whileHover={{
        y: -3,
      }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 25,
      }}
    >

      <p
        className="
          text-[10px]
          uppercase
          tracking-wider
          text-faint
        "
      >
        {title}
      </p>


      <p
        className="
          mt-1.5
          text-sm
          leading-relaxed
        "
      >
        {body}
      </p>

    </motion.div>

  );
}


/* =============================================================
   PLAIN LANGUAGE
============================================================= */

function plain(
  rec: string,
  signal: SignalLabel,
) {

  const map: Record<
    SignalLabel,
    string
  > = {

    STRONG_BUY:
      "The desk is clearly constructive. Size it, don’t go all-in.",

    BUY:
      "The setup looks okay for a measured buy — not a jackpot.",

    HOLD:
      "Nothing here is a free lunch. Sitting on your hands is a decision.",

    SELL:
      "This is a trim, not a tweet. Reduce, don’t revenge-trade.",

    STRONG_SELL:
      "Get smaller. The evidence is not on your side.",

    AVOID:
      "Walk away. This is how retail accounts get emptied.",

  };


  return `${map[signal]} ${rec}`;
}