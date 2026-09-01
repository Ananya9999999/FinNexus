import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Check, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  getMyProfile,
  removeHolding,
  saveMyProfile,
  upsertHolding,
} from "@/lib/server/profile";

import { useDesk } from "@/store/desk";

import type {
  BehavioralFlag,
  Horizon,
  InvestorProfile,
  RiskTolerance,
} from "@/lib/types";

import { formatInr, normalizeTicker } from "@/lib/utils";
import { UNIVERSE } from "@/lib/market/universe";

const FLAGS: BehavioralFlag[] = [
  "loss_averse",
  "fomo_prone",
  "momentum_chaser",
  "prefers_dividends",
  "balanced",
];

export function PortfolioView() {
  const desk = useDesk();

  const [p, setP] = useState<InvestorProfile | null>(desk.profile);

  const [ticker, setTicker] = useState("ITC.NS");
  const [qty, setQty] = useState(10);
  const [avg, setAvg] = useState(400);
  const [w, setW] = useState(8);

  const [watchAdd, setWatchAdd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((row) => {
        setP(row);
        desk.setProfile(row);
      })
      .catch(() => {
        toast.error("Could not load portfolio");
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings() {
    if (!p || saving) return;

    setSaving(true);

    try {
      await saveMyProfile({
        data: {
          displayName: p.displayName,
          riskTolerance: p.riskTolerance,
          investmentHorizon: p.investmentHorizon,
          maxPositionPct: p.maxPositionPct,
          behavioralFlags: p.behavioralFlags,
          cashPct: p.cashPct,
          watchlist: p.watchlist,
          notes: p.notes,
        },
      });

      const next = await getMyProfile();

      setP(next);
      desk.setProfile(next);

      setMsg("Profile saved");
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    if (!ticker.trim() || adding) return;

    setAdding(true);

    try {
      await upsertHolding({
        data: {
          ticker: normalizeTicker(ticker),
          quantity: qty,
          avgPrice: avg,
          weightPct: w,
        },
      });

      const next = await getMyProfile();

      setP(next);
      desk.setProfile(next);

      setMsg(`Updated ${ticker}`);
      toast.success(`${ticker} added to portfolio`);
    } catch {
      toast.error("Could not update holding");
    } finally {
      setAdding(false);
    }
  }

  async function remove(t: string) {
    try {
      await removeHolding({
        data: {
          ticker: t,
        },
      });

      const next = await getMyProfile();

      setP(next);
      desk.setProfile(next);

      toast.success(`${t} removed`);
    } catch {
      toast.error(`Could not remove ${t}`);
    }
  }

  async function addWatch() {
    if (!p || !watchAdd.trim()) return;

    const t = normalizeTicker(watchAdd);

    const nextList = p.watchlist.includes(t)
      ? p.watchlist
      : [...p.watchlist, t];

    try {
      await saveMyProfile({
        data: {
          watchlist: nextList,
        },
      });

      const next = await getMyProfile();

      setP(next);
      desk.setProfile(next);

      setWatchAdd("");

      toast.success(`${t} added to watchlist`);
    } catch {
      toast.error("Could not update watchlist");
    }
  }

  async function removeWatch(t: string) {
    if (!p) return;

    const nextList = p.watchlist.filter((x) => x !== t);

    try {
      await saveMyProfile({
        data: {
          watchlist: nextList,
        },
      });

      const next = await getMyProfile();

      setP(next);
      desk.setProfile(next);

      toast.success(`${t} removed`);
    } catch {
      toast.error("Could not update watchlist");
    }
  }

  /*
   * IMPORTANT:
   * p is checked BEFORE anything accesses p.
   * This fixes the TypeScript null errors.
   */

  if (!p) {
    return (
      <div className="portfolio-page flex min-h-[70vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="portfolio-loading"
        >
          <div className="loading-ring" />
          <p>Loading portfolio intelligence…</p>
        </motion.div>
      </div>
    );
  }

  /*
   * Portfolio allocation data
   */

  const pie = [
    ...p.holdings.map((h) => ({
      name: h.ticker.replace(".NS", ""),
      value: h.weightPct,
    })),

    ...(p.cashPct > 0
      ? [
          {
            name: "Cash",
            value: p.cashPct,
          },
        ]
      : []),
  ];

  const colors = [
    "#b7c96b",
    "#d8e79a",
    "#899a51",
    "#e0b95b",
    "#c96f6f",
    "#8790a0",
    "#f0f1e8",
  ];

  const totalInvested = useMemo(() => {
    return p.holdings.reduce(
      (sum, h) => sum + h.quantity * h.avgPrice,
      0,
    );
  }, [p.holdings]);

  const holdingsCount = p.holdings.length;

  const topHolding = useMemo(() => {
    if (!p.holdings.length) return null;

    return [...p.holdings].sort(
      (a, b) => b.weightPct - a.weightPct,
    )[0];
  }, [p.holdings]);

  return (
    <div className="portfolio-page relative min-h-screen overflow-hidden">
      {/* =====================================================
          PREMIUM ANIMATED BACKGROUND
          ===================================================== */}

      <div className="portfolio-background pointer-events-none fixed inset-0 overflow-hidden">
        <div className="portfolio-noise" />

        <div className="portfolio-grid" />

        <motion.div
          className="bg-glow bg-glow-one"
          animate={{
            x: [0, 80, 0],
            y: [0, -50, 0],
            scale: [1, 1.12, 1],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="bg-glow bg-glow-two"
          animate={{
            x: [0, -70, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="bg-glow bg-glow-three"
          animate={{
            y: [0, 80, 0],
            opacity: [0.25, 0.5, 0.25],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />

        <div className="orbital-dot dot-one" />
        <div className="orbital-dot dot-two" />
        <div className="orbital-dot dot-three" />

        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="floating-particle"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 19) % 90}%`,
            }}
            animate={{
              y: [0, -15 - (i % 4) * 5, 0],
              opacity: [0.1, 0.7, 0.1],
              scale: [0.7, 1.2, 0.7],
            }}
            transition={{
              duration: 4 + (i % 5),
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6">

        {/* ===================================================
            HEADER
            =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.65,
          }}
          className="mb-8"
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="live-dot" />

                <span className="eyebrow">
                  PORTFOLIO INTELLIGENCE
                </span>
              </div>

              <h1 className="portfolio-title">
                Portfolio & risk
              </h1>

              <p className="portfolio-subtitle">
                A living view of your holdings, risk mandate,
                behavioural signals and liquidity.
              </p>
            </div>

            <motion.div
              whileHover={{
                y: -4,
                scale: 1.02,
              }}
              className="mandate-card"
            >
              <span className="eyebrow">
                CURRENT MANDATE
              </span>

              <strong>
                {p.riskTolerance}
              </strong>

              <span>
                {p.investmentHorizon} horizon · {p.cashPct}% cash
              </span>
            </motion.div>
          </div>
        </motion.section>

        {/* ===================================================
            KPI STRIP
            =================================================== */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <MetricCard
            label="Active holdings"
            value={String(holdingsCount)}
            detail="positions"
            icon={<TrendingUp />}
            delay={0}
          />

          <MetricCard
            label="Invested capital"
            value={formatInr(totalInvested, 0)}
            detail="estimated cost basis"
            icon={<Wallet />}
            delay={0.06}
          />

          <MetricCard
            label="Cash reserve"
            value={`${p.cashPct}%`}
            detail="available liquidity"
            icon={<div className="metric-symbol">₹</div>}
            delay={0.12}
          />

          <MetricCard
            label="Top exposure"
            value={
              topHolding
                ? `${topHolding.weightPct}%`
                : "—"
            }
            detail={
              topHolding
                ? topHolding.ticker
                : "no positions"
            }
            icon={<div className="metric-symbol">%</div>}
            delay={0.18}
          />

        </div>

        {/* ===================================================
            PROFILE
            =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.15,
            duration: 0.65,
          }}
          className="premium-card mt-5"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                INVESTOR PROFILE
              </span>

              <h2>
                Your mandate
              </h2>

              <p>
                These parameters are read by the Risk agent and Chair.
              </p>
            </div>

            <div className="status-pill">
              <span className="live-dot" />
              AI-readable
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            <Field label="Display name">
              <Input
                value={p.displayName}
                onChange={(e) =>
                  setP({
                    ...p,
                    displayName: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Risk tolerance">
              <select
                className="premium-select"
                value={p.riskTolerance}
                onChange={(e) =>
                  setP({
                    ...p,
                    riskTolerance:
                      e.target.value as RiskTolerance,
                  })
                }
              >
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
            </Field>

            <Field label="Investment horizon">
              <select
                className="premium-select"
                value={p.investmentHorizon}
                onChange={(e) =>
                  setP({
                    ...p,
                    investmentHorizon:
                      e.target.value as Horizon,
                  })
                }
              >
                <option value="short">
                  Short
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="long">
                  Long
                </option>
              </select>
            </Field>

            <Field label="Maximum position %">
              <Input
                type="number"
                value={p.maxPositionPct}
                onChange={(e) =>
                  setP({
                    ...p,
                    maxPositionPct:
                      Number(e.target.value),
                  })
                }
              />
            </Field>

            <Field label="Cash allocation %">
              <Input
                type="number"
                value={p.cashPct}
                onChange={(e) =>
                  setP({
                    ...p,
                    cashPct:
                      Number(e.target.value),
                  })
                }
              />
            </Field>

            <Field label="Notes">
              <Input
                value={p.notes}
                onChange={(e) =>
                  setP({
                    ...p,
                    notes: e.target.value,
                  })
                }
                placeholder="Add mandate notes"
              />
            </Field>

          </div>

          {/* Behaviour */}

          <div className="mt-7">
            <Label>
              Behavioural signals
            </Label>

            <div className="mt-3 flex flex-wrap gap-2">
              {FLAGS.map((f, index) => {
                const active =
                  p.behavioralFlags.includes(f);

                return (
                  <motion.button
                    key={f}
                    type="button"
                    whileHover={{
                      y: -3,
                      scale: 1.025,
                    }}
                    whileTap={{
                      scale: 0.95,
                    }}
                    transition={{
                      duration: 0.15,
                    }}
                    onClick={() =>
                      setP({
                        ...p,
                        behavioralFlags: active
                          ? p.behavioralFlags.filter(
                              (x) => x !== f,
                            )
                          : [
                              ...p.behavioralFlags,
                              f,
                            ],
                      })
                    }
                    className={`behavior-pill ${
                      active
                        ? "behavior-active"
                        : ""
                    }`}
                    style={{
                      animationDelay: `${index * 80}ms`,
                    }}
                  >
                    {active && (
                      <Check className="size-3.5" />
                    )}

                    {f.replace("_", " ")}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">

            <motion.div
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.97,
              }}
            >
              <Button
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Save profile
                  </>
                )}
              </Button>
            </motion.div>

            <AnimatePresence>
              {msg && (
                <motion.div
                  initial={{
                    opacity: 0,
                    x: -10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="save-message"
                >
                  <Check className="size-3.5" />
                  {msg}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.section>

        {/* ===================================================
            HOLDINGS
            =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.15,
          }}
          transition={{
            duration: 0.6,
          }}
          className="mt-14"
        >
          <div className="section-title-row">

            <div>
              <span className="eyebrow">
                ALLOCATION INTELLIGENCE
              </span>

              <h2 className="big-section-title">
                Holdings
              </h2>

              <p className="portfolio-subtitle">
                Your portfolio at a glance.
              </p>
            </div>

            <div className="allocation-total">
              {pie.reduce(
                (sum, item) => sum + item.value,
                0,
              ).toFixed(0)}
              %
              <span>allocated</span>
            </div>

          </div>

          {/* DONUT */}

          {pie.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.97,
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.7,
              }}
              className="allocation-card mt-4"
            >
              <div className="allocation-glow" />

              <div className="h-[320px] w-full md:h-[360px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>

                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={88}
                      outerRadius={128}
                      paddingAngle={3}
                      stroke="#080906"
                      strokeWidth={4}
                      isAnimationActive
                      animationDuration={1200}
                      animationBegin={150}
                    >
                      {pie.map((_, i) => (
                        <Cell
                          key={`portfolio-cell-${i}`}
                          fill={
                            colors[
                              i % colors.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        background: "#171b12",
                        border:
                          "1px solid rgba(190,210,120,.32)",
                        borderRadius: 14,
                        color: "#f5f6ec",
                        boxShadow:
                          "0 20px 60px rgba(0,0,0,.55)",
                        padding:
                          "12px 16px",
                      }}
                      labelStyle={{
                        color: "#f5f6ec",
                        fontWeight: 600,
                      }}
                      itemStyle={{
                        color: "#f5f6ec",
                      }}
                      formatter={(value) => [
                        `${value}%`,
                        "Allocation",
                      ]}
                    />

                  </PieChart>
                </ResponsiveContainer>

                {/* DONUT CENTER */}

                <div className="donut-center">
                  <span>
                    PORTFOLIO
                  </span>

                  <strong>
                    {holdingsCount}
                  </strong>

                  <small>
                    positions
                  </small>
                </div>

              </div>

              {/* Legend */}

              <div className="allocation-legend">
                {pie.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{
                      opacity: 0,
                      x: -10,
                    }}
                    whileInView={{
                      opacity: 1,
                      x: 0,
                    }}
                    viewport={{
                      once: true,
                    }}
                    transition={{
                      delay: i * 0.05,
                    }}
                    className="legend-item"
                  >
                    <span
                      className="legend-dot"
                      style={{
                        background:
                          colors[
                            i % colors.length
                          ],
                      }}
                    />

                    <span>
                      {item.name}
                    </span>

                    <strong>
                      {item.value}%
                    </strong>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TABLE */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            className="holdings-card mt-4"
          >
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Quantity</th>
                    <th>Avg price</th>
                    <th>Weight</th>
                    <th />
                  </tr>
                </thead>

                <tbody>

                  {p.holdings.map((h, index) => (
                    <motion.tr
                      key={h.ticker}
                      initial={{
                        opacity: 0,
                        x: -15,
                      }}
                      whileInView={{
                        opacity: 1,
                        x: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay: index * 0.06,
                      }}
                    >

                      <td>
                        <div className="ticker-cell">
                          <div className="ticker-icon">
                            {h.ticker
                              .replace(".NS", "")
                              .slice(0, 2)}
                          </div>

                          <div>
                            <strong>
                              {h.ticker}
                            </strong>

                            <span>
                              NSE Equity
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="tabular">
                        {h.quantity}
                      </td>

                      <td className="tabular">
                        {formatInr(
                          h.avgPrice,
                          0,
                        )}
                      </td>

                      <td>
                        <div className="weight-cell">

                          <div className="weight-bar">
                            <motion.div
                              initial={{
                                width: 0,
                              }}
                              whileInView={{
                                width: `${Math.min(
                                  h.weightPct,
                                  100,
                                )}%`,
                              }}
                              viewport={{
                                once: true,
                              }}
                              transition={{
                                duration: 0.8,
                                delay:
                                  index * 0.05,
                              }}
                            />
                          </div>

                          <span>
                            {h.weightPct}%
                          </span>

                        </div>
                      </td>

                      <td className="text-right">

                        <motion.button
                          type="button"
                          whileHover={{
                            scale: 1.08,
                          }}
                          whileTap={{
                            scale: 0.9,
                          }}
                          onClick={() =>
                            remove(h.ticker)
                          }
                          className="remove-button"
                        >
                          <Trash2 className="size-4" />
                          <span>Remove</span>
                        </motion.button>

                      </td>

                    </motion.tr>
                  ))}

                  {!p.holdings.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="empty-holdings"
                      >
                        <div>
                          <div className="empty-icon">
                            <TrendingUp />
                          </div>

                          <strong>
                            No holdings yet
                          </strong>

                          <p>
                            Add your first position
                            below to start building
                            your portfolio.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>
            </div>
          </motion.div>
        </motion.section>

        {/* ===================================================
            ADD HOLDING
            =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="premium-card mt-6"
        >

          <div className="section-heading">
            <div>
              <span className="eyebrow">
                PORTFOLIO BUILDER
              </span>

              <h2>
                Add / update holding
              </h2>

              <p>
                Add a position to your live portfolio.
              </p>
            </div>

            <div className="add-icon">
              <Plus />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <Input
              list="tickers"
              value={ticker}
              onChange={(e) =>
                setTicker(e.target.value.toUpperCase())
              }
              placeholder="Ticker"
            />

            <Input
              type="number"
              value={qty}
              onChange={(e) =>
                setQty(
                  Number(e.target.value),
                )
              }
              placeholder="Quantity"
            />

            <Input
              type="number"
              value={avg}
              onChange={(e) =>
                setAvg(
                  Number(e.target.value),
                )
              }
              placeholder="Average price"
            />

            <Input
              type="number"
              value={w}
              onChange={(e) =>
                setW(
                  Number(e.target.value),
                )
              }
              placeholder="Weight %"
            />

          </div>

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

          <motion.div
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
            className="mt-4 inline-block"
          >
            <Button
              variant="secondary"
              onClick={add}
              disabled={adding}
            >
              {adding ? (
                <>
                  <span className="button-spinner" />
                  Updating…
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Add / update position
                </>
              )}
            </Button>
          </motion.div>

        </motion.section>

        {/* ===================================================
            WATCHLIST
            =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="premium-card mt-6"
        >

          <div className="section-heading">

            <div>
              <span className="eyebrow">
                MARKET RADAR
              </span>

              <h2>
                Watchlist
              </h2>

              <p>
                Drives the tape and morning briefing.
              </p>
            </div>

          </div>

          <div className="watchlist">

            <AnimatePresence>
              {p.watchlist.map((t) => (
                <motion.button
                  key={t}
                  type="button"
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  whileHover={{
                    y: -3,
                    scale: 1.03,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  onClick={() =>
                    removeWatch(t)
                  }
                  className="watch-chip"
                >
                  <span className="live-dot" />
                  {t}
                  <span className="watch-remove">
                    ×
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>

            {!p.watchlist.length && (
              <p className="text-sm text-muted">
                Nothing on radar yet.
              </p>
            )}

          </div>

          <div className="mt-4 flex max-w-md gap-2">

            <Input
              list="tickers"
              value={watchAdd}
              onChange={(e) =>
                setWatchAdd(
                  e.target.value.toUpperCase(),
                )
              }
              placeholder="Add ticker to radar"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void addWatch();
                }
              }}
            />

            <motion.div
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.96,
              }}
            >
              <Button
                variant="secondary"
                onClick={addWatch}
              >
                Add
              </Button>
            </motion.div>

          </div>
        </motion.section>

        {/* ===================================================
            FOOTER
            =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          whileInView={{
            opacity: 1,
          }}
          viewport={{
            once: true,
          }}
          className="portfolio-footer"
        >
          <span className="live-dot" />
          QUORUM · PORTFOLIO INTELLIGENCE ONLINE
        </motion.div>

      </main>
    </div>
  );
}

/* ============================================================
   METRIC CARD
   ============================================================ */

function MetricCard({
  label,
  value,
  detail,
  icon,
  delay,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay,
        duration: 0.5,
      }}
      whileHover={{
        y: -5,
      }}
      className="metric-card group"
    >
      <div className="metric-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {detail}
        </small>
      </div>
    </motion.div>
  );
}

/* ============================================================
   FIELD
   ============================================================ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <Label>
        {label}
      </Label>

      {children}
    </div>
  );
}