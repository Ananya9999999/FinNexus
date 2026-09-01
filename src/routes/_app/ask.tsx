import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { AskView } from "@/components/ask/AskView";

export const Route = createFileRoute("/_app/ask")({
  component: () => (
    <AuthGate>
      <AskView />
    </AuthGate>
  ),
});
