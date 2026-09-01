import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { HistoryView } from "@/components/history/HistoryView";

export const Route = createFileRoute("/_app/history")({
  component: () => (
    <AuthGate>
      <HistoryView />
    </AuthGate>
  ),
});
