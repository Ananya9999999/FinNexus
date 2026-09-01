import { createFileRoute } from "@tanstack/react-router";
import { JudgesView } from "@/components/judges/JudgesView";

export const Route = createFileRoute("/_app/judges")({
  component: JudgesView,
});
