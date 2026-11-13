"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Flame,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteGoal, setGoalStatus } from "@/app/actions/goals";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useQuickActions } from "@/components/quick-actions";
import { LiveTimer } from "@/components/timer/live-timer";
import { useTimer } from "@/components/timer/timer-provider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { GOAL_STATUS_META } from "@/lib/goals";
import type { GoalSummary } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export type GoalCardProgress = {
  actualSeconds: number;
  targetSeconds: number;
  percent: number;
  remainingSeconds: number;
  status: string;
  periodLabel: string;
  timeRemainingSeconds: number;
};

export type GoalHistoryCell = {
  label: string;
  complete: boolean;
  partial: boolean;
  percent: number;
  isCurrent: boolean;
};

const toneByStatus: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "primary"> = {
  not_started: "neutral",
  in_progress: "info",
  on_track: "success",
  at_risk: "warning",
  completed: "success",
  exceeded: "accent",
  missed: "danger",
  paused: "neutral",
};

const colorByStatus: Record<string, string> = {
  not_started: "var(--muted-2)",
  in_progress: "var(--info)",
  on_track: "var(--success)",
  at_risk: "var(--warning)",
  completed: "var(--success)",
  exceeded: "var(--accent)",
  missed: "var(--danger)",
  paused: "var(--muted-2)",
};

export function GoalCard({
  goal,
  progress,
  streak,
  history,
  compact = false,
}: {
  goal: GoalSummary;
  progress: GoalCardProgress;
  streak?: { current: number; longest: number; consistency: number };
  history?: GoalHistoryCell[];
  compact?: boolean;
}) {
  const router = useRouter();
  const { openEditGoal, openManualTime } = useQuickActions();
  const { start, timer } = useTimer();
  const [toDelete, setToDelete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const meta = GOAL_STATUS_META[progress.status as keyof typeof GOAL_STATUS_META] ?? GOAL_STATUS_META.in_progress;
  const isPaused = goal.status === "PAUSED";

  return (
    <>
      <article
        className={cn(
          "group relative rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong/70",
          compact ? "p-3.5" : "md:p-5",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
            style={{
              background: `${goal.color ?? "#6366f1"}14`,
              color: goal.color ?? "#6366f1",
            }}
          >
            <Target className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/items/${goal.itemId}`}
                className="truncate text-[13px] font-bold tracking-tight hover:text-primary"
              >
                {goal.name}
              </Link>
              <Badge tone={toneByStatus[progress.status] ?? "neutral"}>{meta.label}</Badge>
              {streak && streak.current > 1 ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">
                  <Flame className="h-2.5 w-2.5" /> {streak.current}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {goal.itemName} · {formatDuration(progress.actualSeconds)} of {formatDuration(progress.targetSeconds)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {timer?.itemId === goal.itemId ? (
              <LiveTimer itemId={goal.itemId} name={goal.itemName} variant="compact" />
            ) : (
              <button
                type="button"
                onClick={() => start(goal.itemId)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-2 transition-colors hover:bg-primary-soft hover:text-primary"
                title="Start timer"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
                  aria-label="Goal options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => openEditGoal(goal.id)}>
                  <Pencil className="h-4 w-4" /> Edit goal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    startTransition(async () => {
                      const result = await setGoalStatus(goal.id, isPaused ? "ACTIVE" : "PAUSED");
                      if (!result.ok) toast.error(result.error);
                      else {
                        toast.success(isPaused ? "Goal resumed" : "Goal paused");
                        router.refresh();
                      }
                    });
                  }}
                  disabled={pending}
                >
                  {isPaused ? <RotateCcw className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? "Resume goal" : "Pause goal"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openManualTime({ itemId: goal.itemId })}>
                  <CalendarClock className="h-4 w-4" /> Add time
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setToDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-medium text-muted">
              {progress.remainingSeconds > 0
                ? `${formatDuration(progress.remainingSeconds)} to go`
                : `${formatDuration(progress.actualSeconds - progress.targetSeconds)} over target`}
            </p>
            <p className="text-[13px] font-extrabold tabular-nums">{Math.round(progress.percent)}%</p>
          </div>
          <Progress
            value={progress.percent}
            color={colorByStatus[progress.status] ?? "var(--primary)"}
            height={7}
            className="mt-1.5"
          />
        </div>

        {!compact ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-muted-2">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> {progress.periodLabel}
            </span>
            {progress.status !== "paused" ? (
              <span>
                {progress.timeRemainingSeconds > 0
                  ? `${formatDuration(progress.timeRemainingSeconds)} left in this period`
                  : "Period finished"}
              </span>
            ) : (
              <span>Progress is frozen while paused</span>
            )}
            {streak ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3 w-3" /> {streak.current} current · {streak.longest} best
              </span>
            ) : null}
          </div>
        ) : null}

        {!compact && history && history.length > 0 ? (
          <div className="mt-3 flex items-end gap-1">
            {history.map((cell, index) => (
              <span
                key={`${cell.label}-${index}`}
                title={`${cell.label}: ${Math.round(cell.percent)}%`}
                className={cn(
                  "h-4 flex-1 rounded-[3px] transition-colors",
                  cell.complete
                    ? "bg-success"
                    : cell.partial
                      ? "bg-warning/70"
                      : "bg-surface-3",
                  cell.isCurrent && "ring-1 ring-primary ring-offset-1 ring-offset-surface",
                )}
              />
            ))}
          </div>
        ) : null}
      </article>

      <ConfirmDialog
        open={toDelete}
        onOpenChange={setToDelete}
        title="Delete this goal?"
        description="The goal disappears, but every tracked session stays in your history. You can always create a new target later."
        confirmLabel="Delete goal"
        destructive
        onConfirm={async () => {
          const result = await deleteGoal(goal.id);
          if (result.ok) {
            toast.success("Goal deleted");
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />
    </>
  );
}
