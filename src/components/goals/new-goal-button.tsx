"use client";

import { Target } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewGoalButton({
  itemId,
  label = "New goal",
  size,
  className,
}: {
  itemId?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { openNewGoal } = useQuickActions();
  return (
    <Button onClick={() => openNewGoal(itemId)} size={size} className={cn("gap-1.5", className)}>
      <Target className="h-4 w-4" />
      {label}
    </Button>
  );
}
