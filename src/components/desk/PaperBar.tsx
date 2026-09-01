import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applyPaperDecision } from "@/lib/server/analysis";
import { getMyProfile } from "@/lib/server/profile";
import { useDesk } from "@/store/desk";
import type { PaperAction } from "@/lib/types";

export function PaperBar({
  sessionId,
  current,
  sizeHintPct,
  onDone,
}: {
  sessionId: string;
  current: PaperAction;
  sizeHintPct?: number;
  onDone?: (action: PaperAction) => void;
}) {
  const desk = useDesk();

  async function act(action: PaperAction, sizePct?: number) {
    desk.setPaperBusy(true);
    try {
      await applyPaperDecision({ data: { sessionId, action, sizePct } });
      const p = await getMyProfile();
      desk.setProfile(p);
      if (action === "accepted") toast.success("Paper book updated");
      else if (action === "sized_down") toast.success("Sized down on the paper book");
      else toast.message("Logged as ignored");
      onDone?.(action);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that");
    } finally {
      desk.setPaperBusy(false);
    }
  }

  if (current !== "pending") {
    const tone = current === "accepted" ? "up" : current === "ignored" ? "neutral" : "warn";
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        Paper:
        <Badge tone={tone}>{current.replace("_", " ")}</Badge>
      </div>
    );
  }

  const downSize = Math.max(1, Math.round((Math.abs(sizeHintPct ?? 4) / 2) * 10) / 10);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-faint">Paper decision</span>
      <Button size="sm" disabled={desk.paperBusy} onClick={() => act("accepted", sizeHintPct)}>
        Accept
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={desk.paperBusy}
        onClick={() => act("sized_down", downSize)}
      >
        Size down ({downSize}%)
      </Button>
      <Button size="sm" variant="ghost" disabled={desk.paperBusy} onClick={() => act("ignored")}>
        Ignore
      </Button>
    </div>
  );
}
