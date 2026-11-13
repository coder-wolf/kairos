"use client";

import { Flame } from "lucide-react";
import { usePomodoro } from "@/components/pomodoro/pomodoro-provider";
import { cn } from "@/lib/utils";

export function StartPomodoroButton({
  className,
  label = "Start Pomodoro",
}: {
  className?: string;
  label?: string;
}) {
  const { status, startFocus, openWindow } = usePomodoro();

  return (
    <button
      type="button"
      onClick={() => {
        if (status === "idle") startFocus();
        else openWindow();
      }}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-danger/15 bg-danger-soft px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10",
        className,
      )}
    >
      <Flame className="h-4 w-4" />
      {label}
    </button>
  );
}
