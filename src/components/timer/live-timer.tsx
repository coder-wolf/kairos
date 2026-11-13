"use client";

import * as React from "react";
import { useTimer } from "@/components/timer/timer-provider";
import { cn, formatClock } from "@/lib/utils";

type LiveTimerVariant = "pill" | "compact" | "row" | "tiny" | "button";

const layout: Record<LiveTimerVariant, string> = {
  pill: "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[10px] font-bold",
  compact: "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[9px] font-bold",
  row: "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-bold",
  tiny: "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-1 text-[8px] font-bold",
  button:
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors",
};

/**
 * The live replacement for a project's "start timer" control. Renders nothing
 * unless this item is the one currently attached to the running timer.
 */
export function LiveTimer({
  itemId,
  name,
  variant = "pill",
  showLabel = false,
  className,
}: {
  itemId: string;
  name?: string;
  variant?: LiveTimerVariant;
  showLabel?: boolean;
  className?: string;
}) {
  const { timer, elapsed, openWindow } = useTimer();
  if (!timer || timer.itemId !== itemId) return null;

  const paused = timer.status === "PAUSED";
  const label = name ?? timer.itemName ?? "this project";

  return (
    <button
      type="button"
      onClick={openWindow}
      title={`${paused ? "Paused" : "Tracking"} ${label} — open the timer`}
      aria-label={`${paused ? "Paused" : "Tracking"} ${label}. Open timer.`}
      className={cn(
        layout[variant],
        paused
          ? "border-warning/30 bg-warning-soft text-warning hover:bg-warning/15"
          : "border-success/25 bg-success-soft text-success hover:bg-success/15",
        "transition-colors",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          paused ? "bg-warning" : "animate-pulse-soft bg-success",
        )}
      />
      {showLabel ? <span>{paused ? "Paused" : "Tracking"}</span> : null}
      <span suppressHydrationWarning className="font-mono tabular-nums">
        {formatClock(elapsed)}
      </span>
    </button>
  );
}
