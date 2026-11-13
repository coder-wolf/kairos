"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import type { Goal, Item } from "@prisma/client";
import type { StreakSummary } from "@/lib/goals";
import { cn, pluralize } from "@/lib/utils";

type HabitEntry = {
  goal: Goal & { item: Item };
  streak: StreakSummary;
};

type HistoryCell = StreakSummary["history"][number];
const HISTORY_BOXES = 24;

function cellStyle(entry: StreakSummary["history"][number]): React.CSSProperties {
  if (entry.complete) {
    const green = entry.percent >= 150 ? 100 : entry.percent >= 125 ? 84 : entry.percent >= 110 ? 70 : 56;
    return {
      backgroundColor: `color-mix(in srgb, var(--success) ${green}%, var(--surface))`,
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--success) 22%, transparent)",
    };
  }

  // Incomplete periods are deliberately grey — never green — with the shade
  // reflecting how much of the target was reached.
  const grey = entry.percent <= 0 ? 16 : entry.percent < 34 ? 30 : entry.percent < 67 ? 46 : 62;
  return {
    backgroundColor: `color-mix(in srgb, var(--muted) ${grey}%, var(--surface-2))`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--muted) ${Math.max(24, grey)}%, transparent)`,
  };
}

const INITIAL_VISIBLE = 5;

export function HabitHistoryGrid({ entries }: { entries: HabitEntry[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? entries : entries.slice(0, INITIAL_VISIBLE);

  if (entries.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-muted">
        Daily and weekly goals build streaks here once you have a few.
      </p>
    );
  }

  return (
    <div className="p-3 pt-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">
          Recent period history · last 24 days/weeks
        </span>
        <span className="flex items-center gap-1 text-[8px] font-medium text-muted-2">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--muted) 16%, var(--surface-2))", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--muted) 24%, transparent)" }} />
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--muted) 46%, var(--surface-2))" }} />
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--success) 56%, var(--surface))" }} />
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--success) 84%, var(--surface))" }} />
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--success)" }} />
          <span className="ml-0.5">missed → reached</span>
        </span>
      </div>
      <div className="space-y-2.5">
        {visible.map(({ goal, streak }) => {
          const recent = streak.history.slice(-HISTORY_BOXES);
          const cells: Array<HistoryCell | null> = [
            ...Array.from({ length: Math.max(0, HISTORY_BOXES - recent.length) }, () => null),
            ...recent,
          ];
          const firstCell = cells.find((cell): cell is HistoryCell => Boolean(cell));
          const lastCell = [...cells].reverse().find((cell): cell is HistoryCell => Boolean(cell));
          return (
            <div key={goal.id} className="group">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/items/${goal.itemId}`}
                  className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold hover:text-primary"
                >
                  <span className="truncate">{goal.name}</span>
                  <span className="shrink-0 text-[9px] font-medium text-muted-2">
                    {Math.round(streak.consistency * 100)}%
                  </span>
                </Link>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-warning">
                  <Flame className="h-2.5 w-2.5" />
                  {streak.current}
                  <span className="text-[8px] font-medium uppercase tracking-wide text-muted-2">
                    {pluralize(streak.current, goal.periodType === "DAILY" ? "day" : "week")}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
                {cells.map((cell, index) =>
                  cell ? (
                    <span
                      key={`${goal.id}-${cell.period.startKey}-${index}`}
                      title={`${cell.period.label} · ${Math.round(cell.percent)}%${cell.isCurrent ? " · current" : ""}`}
                      className={cn(
                        "aspect-square w-full rounded-[3px] transition-transform hover:scale-110",
                        cell.isCurrent && "ring-2 ring-primary/50 ring-offset-1 ring-offset-surface",
                      )}
                      style={cellStyle(cell)}
                    />
                  ) : (
                    <span
                      key={`${goal.id}-pad-${index}`}
                      title="No data for this period"
                      className="aspect-square w-full rounded-[3px]"
                      style={{
                        backgroundColor: "var(--surface-2)",
                        boxShadow: "inset 0 0 0 1px var(--border)",
                        opacity: 0.45,
                      }}
                    />
                  ),
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 px-0.5 text-[8px] font-medium text-muted-2">
                <span className="shrink-0">{firstCell?.period.label ?? ""}</span>
                <span className="truncate text-center text-muted">
                  {streak.completed} complete · {streak.longest} best
                </span>
                <span className="shrink-0">{lastCell?.period.label ?? ""}</span>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > INITIAL_VISIBLE ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2/50 text-[10px] font-bold text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show fewer habits
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show all {entries.length} habits
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
