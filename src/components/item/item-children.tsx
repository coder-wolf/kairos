"use client";

import Link from "next/link";
import { ChevronRight, FolderPlus, Play, Target } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { LiveTimer } from "@/components/timer/live-timer";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";
import { cn, formatDuration } from "@/lib/utils";

export type ChildRow = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string | null;
  seconds: number;
  goalCount: number;
  descendantCount: number;
};

export function ItemChildren({ itemId, rows }: { itemId: string; rows: ChildRow[] }) {
  const { start, timer } = useTimer();
  const { openNewItem } = useQuickActions();
  const max = Math.max(1, ...rows.map((row) => row.seconds));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-10 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted">
          <FolderPlus className="h-4 w-4" />
        </div>
        <p className="mt-3 text-[13px] font-semibold">No child projects</p>
        <p className="mt-1 max-w-xs text-[11px] leading-5 text-muted">
          Break this work into projects, areas, or anything else that helps you see it clearly.
        </p>
        <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => openNewItem(itemId)}>
          <FolderPlus className="h-3.5 w-3.5" /> Add child project
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.id} className="group flex items-center gap-3 px-4 py-3">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
            style={{ background: `${row.color ?? "#6366f1"}14`, color: row.color ?? "#6366f1" }}
          >
            {row.icon ?? "•"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/items/${row.id}`} className="truncate text-[13px] font-semibold hover:text-primary">
                {row.name}
              </Link>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                {row.seconds > 0 ? formatDuration(row.seconds) : "—"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.seconds > 0 ? Math.max(5, (row.seconds / max) * 100) : 0}%`,
                    background: row.color ?? "var(--primary)",
                  }}
                />
              </div>
              <span className="shrink-0 text-[10px] text-muted-2">
                {row.goalCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Target className="h-2.5 w-2.5" />
                    {row.goalCount}
                  </span>
                ) : null}
                {row.descendantCount > 0 ? (
                  <span className={cn(row.goalCount > 0 && "ml-1.5")}>{row.descendantCount} sub</span>
                ) : null}
              </span>
            </div>
          </div>
          {timer?.itemId === row.id ? (
            <LiveTimer itemId={row.id} name={row.name} variant="row" />
          ) : (
            <button
              type="button"
              onClick={() => start(row.id)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-2 opacity-0 transition-all hover:bg-primary-soft hover:text-primary group-hover:opacity-100"
              aria-label={`Start timer for ${row.name}`}
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href={`/items/${row.id}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
            aria-label={`Open ${row.name}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ))}
    </div>
  );
}
