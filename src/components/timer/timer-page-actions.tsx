"use client";

import { ClockPlus, Play } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";

export function TimerPageActions() {
  const { start } = useTimer();
  const { openManualTime } = useQuickActions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => start()} className="gap-2">
        <Play className="h-3.5 w-3.5 fill-current" /> Start timer
      </Button>
      <Button variant="outline" onClick={() => openManualTime()} className="gap-2">
        <ClockPlus className="h-4 w-4" /> Add time
      </Button>
    </div>
  );
}
