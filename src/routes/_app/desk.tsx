import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { DeskView } from "@/components/desk/DeskView";

export const Route = createFileRoute("/_app/desk")({
  component: () => (
    <AuthGate>
      <DeskView />
    </AuthGate>
  ),
});
