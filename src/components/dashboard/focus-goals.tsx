"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Flame, Play, Target } from "lucide-react";
import { LiveTimer } from "@/components/timer/live-timer";
import { useTimer } from "@/components/timer/timer-provider";
import { Progress } from "@/components/ui/progress";
import { GOAL_STATUS_META } from "@/lib/goals";
import type { GoalSummary } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export type FocusGoalItem = {
  goal: GoalSummary;
  actualSeconds: number;
  targetSeconds: number;
  percent: number;
  status: string;
  streak?: { current: number };
};

const INITIAL_VISIBLE = 4;

const STATUS_COLOR: Record<string, string> = {
  not_started: "var(--muted-2)",
  in_progress: "var(--info)",
  on_track: "var(--success)",
  at_risk: "var(--warning)",
  completed: "var(--success)",
  exceeded: "var(--accent)",
  missed: "var(--danger)",
  paused: "var(--muted-2)",
};

function periodUnit(type: string) {
  if (type === "DAILY") return "day";
  if (type === "WEEKLY") return "wk";
  if (type === "MONTHLY") return "mo";
  return "range";
}

export function FocusGoals({ items }: { items: FocusGoalItem[] }) {
  const router = useRouter();
  const { start, timer } = useTimer();
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);

  if (items.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <Target className="mx-auto h-6 w-6 text-muted-2" />
        <p className="mt-2 text-[13px] font-semibold">No active goals yet</p>
        <p className="mt-1 text-[11px] text-muted">Attach a time target to any item to start measuring consistency.</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[430px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">
              <th className="px-2 py-2 text-left">Goal</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">Target</th>
              <th className="px-2 py-2 text-left">Progress</th>
              <th className="hidden px-2 py-2 text-center sm:table-cell">Streak</th>
              <th className="w-8 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const color = STATUS_COLOR[item.status] ?? "var(--primary)";
              const meta = GOAL_STATUS_META[item.status as keyof typeof GOAL_STATUS_META];
              return (
                <tr
                  key={item.goal.id}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("a, button")) return;
                    router.push(`/goals/${item.goal.id}`);
                  }}
                  className="group cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-surface-2/40"
                >
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                        style={{ background: `${item.goal.color ?? "#6366f1"}14`, color: item.goal.color ?? "#6366f1" }}
                      >
                        <Target className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/goals/${item.goal.id}`} className="block max-w-[150px] truncate font-semibold hover:text-primary">
                          {item.goal.name}
                        </Link>
                        <span className="block max-w-[160px] truncate text-[9px] text-muted-2">{item.goal.itemName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-right text-muted sm:table-cell">
                    <span className="font-semibold text-text">{formatDuration(item.targetSeconds)}</span>
                    <span className="ml-0.5 text-[9px]">/{periodUnit(item.goal.periodType)}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Progress value={item.percent} height={4} color={color} className="w-[64px] min-w-[40px] flex-1" />
                      <span className="w-8 shrink-0 text-right text-[10px] font-bold tabular-nums" style={{ color }}>
                        {Math.round(item.percent)}%
                      </span>
                    </div>
                    <span className="mt-0.5 block truncate text-[8px] font-medium text-muted-2" title={meta?.label}>
                      {meta?.label ?? ""}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2 text-center sm:table-cell">
                    {item.streak ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warning">
                        <Flame className="h-2.5 w-2.5" /> {item.streak.current}
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-1 py-2 text-right">
                    {timer?.itemId === item.goal.itemId ? (
                      <LiveTimer itemId={item.goal.itemId} name={item.goal.name} variant="tiny" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => start(item.goal.itemId)}
                        className="grid h-6 w-6 place-items-center rounded-md text-muted-2 opacity-100 hover:bg-primary-soft hover:text-primary md:opacity-0 md:group-hover:opacity-100"
                        aria-label={`Start timer for ${item.goal.name}`}
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length > INITIAL_VISIBLE ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2/50 text-[10px] font-bold text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show fewer goals
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show all {items.length} goals
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
