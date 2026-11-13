"use client";

import { ClockPlus, FolderPlus, Target } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";

export function DashboardQuickActions() {
  const { openManualTime, openNewGoal, openNewItem } = useQuickActions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => openManualTime()} className="gap-2">
        <ClockPlus className="h-4 w-4" />
        Add time
      </Button>
      <Button variant="ghost" onClick={() => openNewGoal()} className="gap-2">
        <Target className="h-4 w-4" />
        New goal
      </Button>
      <Button variant="ghost" onClick={() => openNewItem()} className="gap-2">
        <FolderPlus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}
