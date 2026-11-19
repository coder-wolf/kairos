"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClockPlus,
  Flame,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteGoal, setGoalStatus } from "@/app/actions/goals";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useQuickActions } from "@/components/quick-actions";
import { useTimer } from "@/components/timer/timer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Select } from "@/components/ui/input";
import { GOAL_STATUS_META } from "@/lib/goals";
import { addMonthsToKey } from "@/lib/time";
import type { GoalSummary } from "@/lib/types";
import { cn, formatDuration, pluralize } from "@/lib/utils";

export type SpreadsheetDay = {
  key: string;
  day: number;
  weekday: number;
  isToday: boolean;
  isWeekend: boolean;
  isFuture: boolean;
};

export type GoalsSpreadsheetRow = {
  goal: GoalSummary;
  itemPath: string;
  progress: {
    actualSeconds: number;
    targetSeconds: number;
    percent: number;
    status: string;
    periodLabel: string;
  };
  streak?: { current: number; longest: number; consistency: number };
  cells: Record<string, { seconds: number; scheduled: boolean; active: boolean }>;
  expectedDailySeconds: number;
  monthSeconds: number;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "DAILY", label: "Daily" },
  { key: "WEEKLY", label: "Weekly" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "CUSTOM", label: "Custom" },
  { key: "paused", label: "Paused" },
] as const;

const TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "primary"> = {
  not_started: "neutral",
  in_progress: "info",
  on_track: "success",
  at_risk: "warning",
  completed: "success",
  exceeded: "accent",
  missed: "danger",
  paused: "neutral",
};

function periodLabel(period: string) {
  if (period === "DAILY") return "Day";
  if (period === "WEEKLY") return "Week";
  if (period === "MONTHLY") return "Month";
  return "Custom";
}

function cellMinutes(seconds: number) {
  if (seconds <= 0) return "";
  const minutes = Math.round(seconds / 60);
  return minutes < 1 ? "<1" : String(minutes);
}

function cellTone(seconds: number, expected: number) {
  if (seconds <= 0) return { background: "var(--surface)", color: "var(--muted-2)" };
  const ratio = expected > 0 ? seconds / expected : 1;
  if (ratio >= 1) return { background: "color-mix(in srgb, var(--success) 22%, var(--surface))", color: "var(--success)" };
  if (ratio >= 0.5) return { background: "color-mix(in srgb, var(--warning) 20%, var(--surface))", color: "var(--warning)" };
  return { background: "color-mix(in srgb, var(--primary) 12%, var(--surface))", color: "var(--primary)" };
}

export function GoalsSpreadsheet({
  rows,
  days,
  month,
  monthLabel,
  todayKey,
}: {
  rows: GoalsSpreadsheetRow[];
  days: SpreadsheetDay[];
  month: string;
  monthLabel: string;
  todayKey: string;
}) {
  const router = useRouter();
  const { start } = useTimer();
  const { openEditGoal, openManualTime, openNewGoal } = useQuickActions();
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"priority" | "progress" | "streak">("priority");
  const [toDelete, setToDelete] = React.useState<GoalSummary | null>(null);
  const [pending, startTransition] = React.useTransition();

  const counts = React.useMemo(() => {
    const result: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      result[row.goal.periodType] = (result[row.goal.periodType] ?? 0) + 1;
      if (row.goal.status === "PAUSED") result.paused = (result.paused ?? 0) + 1;
    }
    return result;
  }, [rows]);

  const filtered = React.useMemo(() => {
    let list = [...rows];
    if (filter === "paused") list = list.filter((row) => row.goal.status === "PAUSED");
    else if (filter !== "all") list = list.filter((row) => row.goal.periodType === filter);
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((row) =>
        `${row.goal.name} ${row.goal.itemName} ${row.itemPath}`.toLowerCase().includes(needle),
      );
    }
    const risk: Record<string, number> = {
      at_risk: 0,
      missed: 1,
      not_started: 2,
      in_progress: 3,
      on_track: 4,
      completed: 5,
      exceeded: 6,
      paused: 7,
    };
    list.sort((a, b) => {
      if (sort === "progress") return b.progress.percent - a.progress.percent;
      if (sort === "streak") return (b.streak?.current ?? 0) - (a.streak?.current ?? 0);
      return (risk[a.progress.status] ?? 99) - (risk[b.progress.status] ?? 99) || b.progress.percent - a.progress.percent;
    });
    return list;
  }, [rows, filter, query, sort]);

  const goMonth = (next: string) => {
    startTransition(() => router.push(`/goals?month=${next}`));
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goMonth(addMonthsToKey(month, -1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-[150px] items-center justify-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] font-bold">{monthLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => goMonth(addMonthsToKey(month, 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {month !== todayKey.slice(0, 7) ? (
                <Button variant="ghost" size="sm" className="ml-1 h-8" onClick={() => goMonth(todayKey.slice(0, 7))}>
                  This month
                </Button>
              ) : null}
              {pending ? <span className="ml-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search goals…"
                  className="h-8 w-[160px] pl-8 text-[12px]"
                />
              </div>
              <div className="relative">
                <ArrowDownWideNarrow className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
                <Select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as typeof sort)}
                  className="h-8 w-[150px] py-0 pl-8 text-[11px]"
                >
                  <option value="priority">Needs attention</option>
                  <option value="progress">Highest progress</option>
                  <option value="streak">Longest streak</option>
                </Select>
              </div>
              <Button size="sm" onClick={() => openNewGoal()} className="h-8 gap-1.5">
                <Target className="h-3.5 w-3.5" /> New goal
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={cn(
                    "flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors",
                    filter === option.key ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {option.label}
                  <span className={cn("text-[9px]", filter === option.key ? "text-primary/70" : "text-muted-2")}>
                    {counts[option.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[9px] font-medium text-muted-2">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-surface-3" /> no time
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--primary) 12%, var(--surface))" }} />
                below pace
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--warning) 20%, var(--surface))" }} />
                half pace
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--success) 22%, var(--surface))" }} />
                pace met
              </span>
              <span className="text-muted-2">minutes per day</span>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Target className="mx-auto h-6 w-6 text-muted-2" />
            <p className="mt-2 text-sm font-semibold">{rows.length === 0 ? "No goals yet" : "No goals match this view"}</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              {rows.length === 0
                ? "Attach a time target to any item and its daily records will fill this grid."
                : "Try another filter, month, or search term."}
            </p>
            <Button className="mt-4 gap-1.5" size="sm" onClick={() => (rows.length === 0 ? openNewGoal() : setFilter("all"))}>
              <Target className="h-3.5 w-3.5" /> {rows.length === 0 ? "Create your first goal" : "Clear filters"}
            </Button>
          </div>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[11px]">
              <thead>
                <tr className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-2">
                  <th className="sticky left-0 z-20 min-w-[230px] border-b border-border bg-surface-2/80 px-3 py-2 text-left backdrop-blur">
                    Goal
                  </th>
                  <th className="border-b border-border bg-surface-2/80 px-2 py-2 text-left">Period</th>
                  <th className="border-b border-border bg-surface-2/80 px-2 py-2 text-right">Target</th>
                  <th className="border-b border-border bg-surface-2/80 px-3 py-2 text-left">Progress</th>
                  <th className="border-b border-border bg-surface-2/80 px-2 py-2 text-center">Streak</th>
                  {days.map((day) => {
                    const letter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "narrow" }).format(
                      new Date(`${day.key}T12:00:00Z`),
                    );
                    return (
                      <th
                        key={day.key}
                        className={cn(
                          "min-w-[44px] border-b border-l border-border bg-surface-2/80 px-1 py-1.5 text-center",
                          day.isWeekend && "text-muted-2/70",
                          day.isToday && "bg-primary-soft text-primary",
                          day.isFuture && "opacity-50",
                        )}
                        title={day.key}
                      >
                        <span className="block text-[8px] font-semibold">{letter}</span>
                        <span className={cn("block text-[10px] font-bold", day.isToday && "text-primary")}>{day.day}</span>
                      </th>
                    );
                  })}
                  <th className="sticky right-0 z-20 min-w-[76px] border-b border-l border-border bg-surface-2/80 px-2 py-2 text-right backdrop-blur">
                    Month
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = GOAL_STATUS_META[row.progress.status as keyof typeof GOAL_STATUS_META] ?? GOAL_STATUS_META.in_progress;
                  const isPaused = row.goal.status === "PAUSED";
                  return (
                    <ContextMenu key={row.goal.id}>
                    <ContextMenuTrigger asChild>
                    <tr className="group">
                      <td
                        className={cn(
                          "sticky left-0 z-10 border-b border-border bg-surface px-3 py-2.5 group-hover:bg-surface-2/60",
                          isPaused && "opacity-70",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                            style={{
                              background: `${row.goal.color ?? "#6366f1"}14`,
                              color: row.goal.color ?? "#6366f1",
                            }}
                          >
                            <Target className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link href={`/goals/${row.goal.id}`} className="block truncate text-[12px] font-bold hover:text-primary">
                              {row.goal.name}
                            </Link>
                            <p className="truncate text-[9px] text-muted">{row.itemPath}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-2 opacity-0 hover:bg-surface-3 hover:text-text group-hover:opacity-100 data-[state=open]:opacity-100"
                                aria-label="Goal options"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => openEditGoal(row.goal.id)}>
                                <Pencil className="h-4 w-4" /> Edit goal
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => start(row.goal.itemId)}>
                                <Play className="h-4 w-4" /> Start timer
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openManualTime({ itemId: row.goal.itemId })}>
                                <ClockPlus className="h-4 w-4" /> Add time
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  startTransition(async () => {
                                    const result = await setGoalStatus(row.goal.id, isPaused ? "ACTIVE" : "PAUSED");
                                    if (!result.ok) toast.error(result.error);
                                    else {
                                      toast.success(isPaused ? "Goal resumed" : "Goal paused");
                                      router.refresh();
                                    }
                                  });
                                }}
                              >
                                {isPaused ? <RotateCcw className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                {isPaused ? "Resume goal" : "Pause goal"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem destructive onSelect={() => setToDelete(row.goal)}>
                                <Trash2 className="h-4 w-4" /> Delete goal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                      <td className="border-b border-border px-2 py-2.5">
                        <span className="text-[10px] font-semibold text-muted">{periodLabel(row.goal.periodType)}</span>
                      </td>
                      <td className="border-b border-border px-2 py-2.5 text-right">
                        <span className="text-[11px] font-semibold tabular-nums">{formatDuration(row.goal.targetSeconds)}</span>
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, row.progress.percent)}%`,
                                background:
                                  row.progress.status === "at_risk"
                                    ? "var(--warning)"
                                    : row.progress.status === "missed"
                                      ? "var(--danger)"
                                      : "var(--success)",
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums">{Math.round(row.progress.percent)}%</span>
                          <Badge tone={TONE[row.progress.status] ?? "neutral"} className="hidden 2xl:inline-flex">
                            {meta.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="border-b border-border px-2 py-2.5 text-center">
                        {row.streak ? (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-warning">
                            <Flame className="h-3 w-3" /> {row.streak.current}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-2">—</span>
                        )}
                      </td>
                      {days.map((day) => {
                        const cell = row.cells[day.key];
                        const active = cell?.active ?? false;
                        const scheduled = cell?.scheduled ?? true;
                        const seconds = cell?.seconds ?? 0;
                        const tone = cellTone(seconds, row.expectedDailySeconds);
                        return (
                          <td
                            key={day.key}
                            className={cn(
                              "border-b border-l border-border/50 p-0 text-center align-middle",
                              day.isToday && "ring-1 ring-inset ring-primary/30",
                              day.isWeekend && "bg-surface-2/20",
                            )}
                          >
                            <div
                              title={active ? `${day.key} · ${formatDuration(seconds)}` : `${day.key} · no time`}
                              className={cn(
                                "flex h-9 items-center justify-center font-semibold tabular-nums",
                                !active && "opacity-40",
                                day.isFuture && "opacity-25",
                              )}
                              style={{
                                background: active ? tone.background : "transparent",
                                color: active ? tone.color : "var(--muted-2)",
                                backgroundImage:
                                  !active && !scheduled
                                    ? "repeating-linear-gradient(135deg, transparent 0 4px, var(--surface-3) 4px 5px)"
                                    : undefined,
                              }}
                            >
                              {active ? cellMinutes(seconds) : ""}
                            </div>
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-10 border-b border-l border-border bg-surface px-2 py-2.5 text-right group-hover:bg-surface-2/60">
                        <span className="text-[11px] font-semibold tabular-nums">{formatDuration(row.monthSeconds)}</span>
                      </td>
                    </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuLabel>{row.goal.name}</ContextMenuLabel>
                      <ContextMenuItem onSelect={() => openEditGoal(row.goal.id)}>
                        <Pencil className="h-4 w-4" /> Edit goal
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => start(row.goal.itemId)}>
                        <Play className="h-4 w-4" /> Start timer
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => openManualTime({ itemId: row.goal.itemId })}>
                        <ClockPlus className="h-4 w-4" /> Add time
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={() => {
                          startTransition(async () => {
                            const result = await setGoalStatus(row.goal.id, isPaused ? "ACTIVE" : "PAUSED");
                            if (!result.ok) toast.error(result.error);
                            else {
                              toast.success(isPaused ? "Goal resumed" : "Goal paused");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        {isPaused ? <RotateCcw className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        {isPaused ? "Resume goal" : "Pause goal"}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem destructive onSelect={() => setToDelete(row.goal)}>
                        <Trash2 className="h-4 w-4" /> Delete goal
                      </ContextMenuItem>
                    </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-[10px] text-muted">
          <span>
            {filtered.length} {pluralize(filtered.length, "goal")} · days show tracked minutes · pace is the daily share
            of each target
          </span>
          <span className="text-muted-2">Scroll sideways to see the whole month</span>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this goal?"
        description="The goal disappears, but every tracked session stays in your history. You can always create a new target later."
        confirmLabel="Delete goal"
        destructive
        onConfirm={async () => {
          if (!toDelete) return { ok: false, error: "Nothing selected." };
          const result = await deleteGoal(toDelete.id);
          if (result.ok) {
            toast.success("Goal deleted");
            setToDelete(null);
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />
    </>
  );
}
