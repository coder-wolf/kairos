"use client";

import { Target } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";

export function NewGoalButton() {
  const { openNewGoal } = useQuickActions();
  return (
    <Button onClick={() => openNewGoal()} className="gap-2">
      <Target className="h-4 w-4" />
      New goal
    </Button>
  );
}
