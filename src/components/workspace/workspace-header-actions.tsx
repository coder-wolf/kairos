"use client";

import { FolderPlus, LayoutGrid } from "lucide-react";
import { StartPomodoroButton } from "@/components/pomodoro/start-pomodoro-button";
import { useQuickActions } from "@/components/quick-actions";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";

export function WorkspaceHeaderActions() {
  const { openNewItem } = useQuickActions();
  const { start } = useTimer();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => start()} className="gap-2">
        <LayoutGrid className="h-4 w-4" />
        Start tracking
      </Button>
      <StartPomodoroButton />
      <Button onClick={() => openNewItem()} className="gap-2">
        <FolderPlus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}
