"use client";

import { Pencil } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";

export function GoalDetailActions({ goalId }: { goalId: string }) {
  const { openEditGoal } = useQuickActions();
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditGoal(goalId)}>
      <Pencil className="h-3.5 w-3.5" /> Edit goal
    </Button>
  );
}
