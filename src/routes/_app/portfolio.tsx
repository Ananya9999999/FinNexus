import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { PortfolioView } from "@/components/portfolio/PortfolioView";

export const Route = createFileRoute("/_app/portfolio")({
  component: () => (
    <AuthGate>
      <PortfolioView />
    </AuthGate>
  ),
});
