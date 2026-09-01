import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

import {
  Briefcase,
  LayoutGrid,
  MessageSquare,
  ScrollText,
  Sunrise,
  Activity,
} from "lucide-react";

const NAV = [
  {
    to: "/desk",
    label: "Desk",
    icon: LayoutGrid,
  },
  {
    to: "/briefing",
    label: "Briefing",
    icon: Sunrise,
  },
  {
    to: "/portfolio",
    label: "Portfolio",
    icon: Briefcase,
  },
  {
    to: "/history",
    label: "History",
    icon: ScrollText,
  },
  {
    to: "/ask",
    label: "Ask",
    icon: MessageSquare,
  },
] as const;

export function AppShell() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const { user, isPending } = useCurrentUserState();

  return (
    <div className="app-shell min-h-dvh bg-bg text-fg">

      {/* =====================================================
          GLOBAL AMBIENT BACKGROUND
          ===================================================== */}

      <div className="app-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden">

        <div className="app-grid" />

        <motion.div
          className="app-glow app-glow-left"
          animate={{
            x: [0, 55, 0],
            y: [0, -30, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="app-glow app-glow-right"
          animate={{
            x: [0, -45, 0],
            y: [0, 35, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="app-orbit app-orbit-one" />
        <div className="app-orbit app-orbit-two" />

      </div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="app-header sticky top-0 z-50">

        <div className="app-header-inner mx-auto flex h-[66px] max-w-[1500px] items-center justify-between gap-4 px-4 md:px-6">

          {/* =================================================
              BRAND
              ================================================= */}

          <Link
            to="/"
            className="group flex shrink-0 items-center gap-3"
          >

            <motion.div
              whileHover={{
                scale: 1.06,
                rotate: 2,
              }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 20,
              }}
              className="brand-mark"
            >
              <span className="brand-mark-inner">
                Q
              </span>
            </motion.div>

            <div className="hidden sm:block">

              <div className="brand-name">
                QUORUM
              </div>

              <div className="brand-subtitle">
                INTELLIGENCE DESK
              </div>

            </div>

          </Link>


          {/* =================================================
              DESKTOP NAVIGATION
              ================================================= */}

          <nav className="desktop-nav hidden lg:flex">

            {NAV.map((item) => {

              const Icon = item.icon;

              const active =
                pathname === item.to ||
                pathname.startsWith(`${item.to}/`);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="relative"
                >

                  <motion.div
                    whileHover={{
                      y: -1,
                    }}
                    whileTap={{
                      scale: 0.96,
                    }}
                    className={cn(
                      "nav-item",
                      active && "nav-item-active",
                    )}
                  >

                    <Icon className="size-[15px]" />

                    <span>
                      {item.label}
                    </span>

                    {active && (
                      <motion.span
                        layoutId="active-nav"
                        className="nav-active-line"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35,
                        }}
                      />
                    )}

                  </motion.div>

                </Link>
              );
            })}

          </nav>


          {/* =================================================
              RIGHT SIDE
              ================================================= */}

          <div className="flex items-center gap-2">

            {/* LIVE STATUS */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="market-status hidden md:flex"
            >

              <span className="market-status-dot" />

              <span>
                SYSTEM ONLINE
              </span>

            </motion.div>


            {/* USER */}

            {isPending ? (

              <motion.div
                animate={{
                  opacity: [0.35, 0.7, 0.35],
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                }}
                className="user-skeleton"
              />

            ) : user ? (

              <SignedIn>

                <motion.div
                  whileHover={{
                    scale: 1.04,
                  }}
                  whileTap={{
                    scale: 0.96,
                  }}
                  className="user-button-wrap"
                >
                  <UserButton />
                </motion.div>

              </SignedIn>

            ) : (

              <SignedOut>

                <Link to="/login">

                  <motion.div
                    whileHover={{
                      y: -2,
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className="sign-in-button"
                  >
                    Sign in
                  </motion.div>

                </Link>

              </SignedOut>

            )}

          </div>

        </div>


        {/* ===================================================
            MOBILE NAVIGATION
            =================================================== */}

        <nav className="mobile-nav lg:hidden">

          <div className="mobile-nav-inner">

            {NAV.map((item) => {

              const Icon = item.icon;

              const active =
                pathname === item.to ||
                pathname.startsWith(`${item.to}/`);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="mobile-nav-link"
                >

                  <motion.div
                    whileTap={{
                      scale: 0.9,
                    }}
                    className={cn(
                      "mobile-nav-item",
                      active &&
                        "mobile-nav-item-active",
                    )}
                  >

                    <Icon className="size-[17px]" />

                    <span>
                      {item.label}
                    </span>

                    {active && (
                      <motion.span
                        layoutId="mobile-active-nav"
                        className="mobile-active-dot"
                      />
                    )}

                  </motion.div>

                </Link>
              );
            })}

          </div>

        </nav>

      </header>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="relative z-10">

        <motion.div
          key={pathname}
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
          }}
        >
          <Outlet />
        </motion.div>

      </main>


      {/* =====================================================
          BOTTOM SYSTEM LINE
          ===================================================== */}

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40">

        <div className="system-bottom-line" />

      </div>

    </div>
  );
}