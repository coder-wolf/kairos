"use client";

import * as React from "react";
import { Timer, TrendingUp } from "lucide-react";
import { BarTrendChart } from "@/components/charts";
import { cn, formatDuration } from "@/lib/utils";

type Point = { label: string; shortLabel: string; seconds: number };

function Delta({ current, previous, period }: { current: number; previous: number; period: string }) {
  if (previous <= 0) {
    return <span className="text-[10px] font-medium text-muted-2">A fresh start</span>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-[10px] font-medium text-muted-2">Same as last {period}</span>;
  return (
    <span className={cn("text-[10px] font-semibold", change > 0 ? "text-success" : "text-warning")}>
      {change > 0 ? "↑" : "↓"} {Math.abs(change)}% vs last {period}
    </span>
  );
}

export function RhythmCard({
  weekTrend,
  monthTrend,
  weekTotal,
  monthTotal,
  previousWeekTotal,
  previousMonthTotal,
  weekLabel,
  monthLabel,
}: {
  weekTrend: Point[];
  monthTrend: Point[];
  weekTotal: number;
  monthTotal: number;
  previousWeekTotal: number;
  previousMonthTotal: number;
  weekLabel: string;
  monthLabel: string;
}) {
  const [mode, setMode] = React.useState<"week" | "month">("week");
  const monthly = mode === "month";
  const trend = monthly ? monthTrend : weekTrend;
  const total = monthly ? monthTotal : weekTotal;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">Time tracked</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {monthly ? monthLabel : weekLabel} · daily breakdown
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {(
              [
                { value: "week", label: "Weekly" },
                { value: "month", label: "Monthly" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  mode === option.value ? "bg-primary text-primary-contrast" : "text-muted hover:text-text",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold tracking-[-0.03em]">{formatDuration(total)}</p>
            <Delta
              current={total}
              previous={monthly ? previousMonthTotal : previousWeekTotal}
              period={monthly ? "month" : "week"}
            />
          </div>
        </div>
      </div>
      <div className="px-2 pb-3 pt-5 sm:px-4">
        {total > 0 ? (
          <BarTrendChart data={trend} height={220} />
        ) : (
          <div className="flex h-[220px] flex-col items-center justify-center text-center">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted">
              <Timer className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">No time tracked {monthly ? "this month" : "this week"} yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Start a timer or add time manually and this chart will fill itself in.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
