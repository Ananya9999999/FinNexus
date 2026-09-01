import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <div className="h-10 w-40 animate-pulse rounded-full bg-surface-2" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
