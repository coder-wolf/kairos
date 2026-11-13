import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock3, Globe2, Layers } from "lucide-react";
import { TimerPageActions } from "@/components/timer/timer-page-actions";
import { TimezoneSync } from "@/components/timer/timezone-sync";
import { WeekCalendar, type CalendarDay } from "@/components/timer/week-calendar";
import { totalSeconds } from "@/lib/analytics";
import { getAppContext, toSessionRows } from "@/lib/dal";
import { getSessionsWindow } from "@/lib/queries";
import {
  addDaysToKey,
  startOfDayKey,
  toDateKey,
  weekdayOfKey,
  weekStartKey,
} from "@/lib/time";
import { cn, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Timer" };

function weekLabel(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T12:00:00Z`);
  const end = new Date(`${endKey}T12:00:00Z`);
  const sameMonth = startKey.slice(0, 7) === endKey.slice(0, 7);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(start);
  const endLabel = sameMonth
    ? `${end.getUTCDate()}, ${end.getUTCFullYear()}`
    : new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tz?: string }>;
}) {
  const params = await searchParams;
  const { user, items } = await getAppContext();
  const savedTz = user.timezone;
  let tz = savedTz;
  if (params.tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: params.tz });
      tz = params.tz;
    } catch {
      tz = savedTz;
    }
  }
  const now = new Date();
  const todayKey = toDateKey(now, tz);
  const currentWeekStart = weekStartKey(now, tz, user.weekStartsOn);
  const requested =
    params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
      ? weekStartKey(startOfDayKey(params.week, tz), tz, user.weekStartsOn)
      : currentWeekStart;
  const startKey = requested;
  const endKeyExclusive = addDaysToKey(startKey, 7);
  const start = startOfDayKey(startKey, tz);
  const end = startOfDayKey(endKeyExclusive, tz);
  const sessions = await getSessionsWindow(user.workspace.id, start, end);
  const rows = toSessionRows(sessions, items);

  const dayKeys = Array.from({ length: 7 }, (_, index) => addDaysToKey(startKey, index));
  const days: CalendarDay[] = dayKeys.map((key) => ({
    key,
    label: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(
      new Date(`${key}T12:00:00Z`),
    ),
    dayNumber: Number(key.slice(8)),
    isToday: key === todayKey,
    isWeekend: [0, 6].includes(weekdayOfKey(key)),
  }));

  const weekTotal = totalSeconds(sessions, start, end);
  const prevWeek = addDaysToKey(startKey, -7);
  const nextWeek = addDaysToKey(startKey, 7);
  const isCurrentWeek = startKey === currentWeekStart;
  const tzShort =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value ?? tz;
  const tzQuery = `tz=${encodeURIComponent(tz)}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <TimezoneSync week={startKey} timezone={tz} />
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">Time, mapped</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
            Timer<span className="text-primary">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
            A weekly time-blocking view of everything you tracked. Click any block to edit the entry.
          </p>
        </div>
        <TimerPageActions />
      </header>

      <div className="card flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/timer?week=${prevWeek}&${tzQuery}`}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-[170px] px-1 text-center">
            <p className="text-[14px] font-extrabold tracking-[-0.02em]">{weekLabel(startKey, addDaysToKey(startKey, 6))}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-2">
              Week of {new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${startKey}T12:00:00Z`))}
            </p>
          </div>
          <Link
            href={`/timer?week=${nextWeek}&${tzQuery}`}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/timer?${tzQuery}`}
            className={cn(
              "ml-1.5 inline-flex h-8 items-center rounded-full border px-3 text-[10px] font-bold transition-colors",
              isCurrentWeek
                ? "border-transparent bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            Today
          </Link>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <Clock3 className="h-3 w-3 text-primary" />
            <strong className="font-semibold text-text">{formatDuration(weekTotal, { zero: "0m" })}</strong> tracked
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <Layers className="h-3 w-3 text-primary" />
            <strong className="font-semibold text-text">{sessions.length}</strong> sessions
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1"
            title={tz}
          >
            <Globe2 className="h-3 w-3 text-primary" />
            <strong className="font-semibold text-text">{tzShort}</strong>
          </span>
        </div>
      </div>

      <WeekCalendar sessions={rows} days={days} timezone={tz} />
    </div>
  );
}
