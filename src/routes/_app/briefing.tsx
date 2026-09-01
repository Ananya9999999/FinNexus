import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { BriefingView } from "@/components/briefing/BriefingView";

export const Route = createFileRoute("/_app/briefing")({
  component: () => (
    <AuthGate>
      <BriefingView />
    </AuthGate>
  ),
});
