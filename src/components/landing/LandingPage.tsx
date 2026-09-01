import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { HeroCanvas } from "@/components/three/ClientCanvas";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { ArrowRight, Eye, Scale, Shield } from "lucide-react";

const fade = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const AGENTS = [
  { name: "Momentum", body: "RSI, MACD, SMA structure, 5d/20d trend." },
  { name: "Flow", body: "Volume, delivery, PCR, IV rank, F&O traps." },
  { name: "Filing", body: "RAG over SEBI filings and earnings transcripts." },
  { name: "Sentiment", body: "Regime, crowding, regulatory narrative." },
  { name: "Risk", body: "Your book, flags, concentration — can refuse." },
];

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div className="pointer-events-none absolute inset-0 h-[110vh]">
        <HeroCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 h-[110vh] bg-gradient-to-t from-bg via-bg/55 to-bg/20" />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-10">
        <span className="font-display text-xl tracking-tight">QUORUM</span>
        <div className="flex items-center gap-3">
          <Link to="/judges" className="text-sm text-muted hover:text-fg">
            For judges
          </Link>
          <SignedOut>
            <Link to="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/desk">
              <Button size="sm">Open desk</Button>
            </Link>
          </SignedIn>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pb-10 pt-16 text-center md:pt-24">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.p variants={fade} className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-muted">
            Multi-agent research desk
          </motion.p>
          <motion.h1
            variants={fade}
            className="font-display text-4xl leading-[1.1] tracking-tight text-fg md:text-6xl"
          >
            A hedge-fund desk
            <br />
            for India’s retail investor.
          </motion.h1>
          <motion.p variants={fade} className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Five specialists read the tape, filings, and your risk profile in parallel. One cited verdict in under 60
            seconds — including when they disagree.
          </motion.p>
          <motion.div variants={fade} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <SignedOut>
              <Link to="/login">
                <Button size="lg" className="min-h-12">
                  Enter the desk <ArrowRight className="size-4" />
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/desk">
                <Button size="lg" className="min-h-12">
                  Continue to desk <ArrowRight className="size-4" />
                </Button>
              </Link>
            </SignedIn>
            <Link to="/judges">
              <Button size="lg" variant="secondary">
                Architecture
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-16 grid w-full gap-3 sm:grid-cols-3">
          {[
            { k: "5", v: "Specialists in parallel" },
            { k: "89%", v: "Retail F&O traders lose (SEBI)" },
            { k: "<60s", v: "Cited memo, sized to you" },
          ].map((s) => (
            <div key={s.v} className="rounded-[20px] bg-surface/80 px-5 py-4 shadow-[var(--shadow-border)]">
              <div className="font-display text-2xl">{s.k}</div>
              <div className="mt-1 text-sm text-muted">{s.v}</div>
            </div>
          ))}
        </div>
      </main>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-3 text-left sm:grid-cols-3"
        >
          {[
            {
              icon: Eye,
              title: "See the reasoning",
              body: "Every claim is cited. Dissent is shown, never averaged away.",
            },
            {
              icon: Scale,
              title: "Personal, not generic",
              body: "Same stock, three investors, three different memos.",
            },
            {
              icon: Shield,
              title: "Built to refuse",
              body: "F&O traps and concentration risk can block a trade.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-[20px] bg-surface/80 p-5 shadow-[var(--shadow-border)]">
              <c.icon className="mb-3 size-4 text-accent" />
              <h3 className="text-sm font-medium">{c.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted">The desk</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">Five agents. One chair.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((a) => (
              <div key={a.name} className="rounded-[20px] bg-surface p-4 shadow-[var(--shadow-border)]">
                <h3 className="text-sm font-medium">{a.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{a.body}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 rounded-[24px] bg-surface p-6 shadow-[var(--shadow-border)] md:p-8"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted">90-second demo</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">What to click after you sign in</h2>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>Load Riya, run “Demo: earnings miss” — read thesis, citations, impact.</li>
            <li>Load Arjun on the same ticker — size and warnings change.</li>
            <li>Run “Demo: F&O trap” — AVOID plus the SEBI 89% note.</li>
            <li>Run “Degraded path” — pipeline lives, confidence drops, sources still cited.</li>
            <li>Accept or size-down the paper memo. Open History and Morning briefing.</li>
          </ol>
          <SignedOut>
            <Link to="/login" className="mt-6 inline-flex">
              <Button>
                Sign in to run it <ArrowRight className="size-4" />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/desk" className="mt-6 inline-flex">
              <Button>
                Open the desk <ArrowRight className="size-4" />
              </Button>
            </Link>
          </SignedIn>
        </motion.div>

        <p className="mt-10 text-center text-xs text-faint">
          Not investment advice. Simulated NSE tape + SEBI-style corpus.
        </p>
      </section>
    </div>
  );
}
