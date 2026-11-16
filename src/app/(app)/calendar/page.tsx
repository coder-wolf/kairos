import type { Metadata } from "next";
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


export const metadata: Metadata = { title: "Calendar" };

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
    <div className="h-[calc(100dvh-7rem)] animate-fade-in md:h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-9rem)]">
      <TimezoneSync week={startKey} timezone={tz} />
      <WeekCalendar
        sessions={rows}
        days={days}
        timezone={tz}
        weekLabel={weekLabel(startKey, addDaysToKey(startKey, 6))}
        weekOfLabel={`Week of ${new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          month: "short",
          day: "numeric",
        }).format(new Date(`${startKey}T12:00:00Z`))}`}
        prevHref={`/calendar?week=${prevWeek}&${tzQuery}`}
        nextHref={`/calendar?week=${nextWeek}&${tzQuery}`}
        todayHref={`/calendar?${tzQuery}`}
        isCurrentWeek={isCurrentWeek}
        weekTotal={weekTotal}
        sessionCount={sessions.length}
        timezoneLabel={tzShort}
      />
    </div>
  );
}
