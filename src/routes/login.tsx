import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoCanvas } from "@/components/three/ClientCanvas";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isPending && user) return <Navigate to="/desk" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message || "Sign up failed");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Sign in failed");
      }
      window.location.assign("/desk");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-bg md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <LogoCanvas className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-bg" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-display text-3xl leading-tight">Five agents. One cited verdict.</p>
          <p className="mt-2 text-sm text-muted">Sign in to load your risk profile and portfolio.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="font-display text-2xl">
            QUORUM
          </Link>
          <h1 className="mt-6 text-xl font-medium">Sign in to the desk</h1>
          <p className="mt-1 text-sm text-muted">Google, X, or email — your book stays yours.</p>

          {authEnabled ? (
            <div className="mt-6 space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/desk" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-faint">
            <span className="h-px flex-1 bg-border" />
            or email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onEmail} className="space-y-3">
            {mode === "up" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Nair" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            {error && <p className="text-sm text-down">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 text-sm text-muted hover:text-fg"
            onClick={() => setMode(mode === "up" ? "in" : "up")}
          >
            {mode === "up" ? "Already have an account? Sign in" : "New investor? Create an account"}
          </button>
        </motion.div>
      </div>
    </main>
  );
}
