import { formatInTimeZone } from "date-fns-tz";
import type { Goal, Item } from "@prisma/client";
import type { DateRange } from "./time";
import {
  addDaysToKey,
  addMonthsToKey,
  dayKeysBetween,
  splitSessionByLocalDay,
  toDateKey,
  weekdayOfKey,
  weekStartKey,
} from "./time";
import type { SessionLike } from "./items";

export type TrendPoint = {
  key: string;
  label: string;
  shortLabel: string;
  seconds: number;
};

export function buildTrend(
  sessions: SessionLike[],
  range: DateRange,
  timezone: string,
  weekStartsOn: number,
  granularityOverride?: DateRange["granularity"],
): TrendPoint[] {
  const granularity = granularityOverride ?? range.granularity;

  if (granularity === "hour") {
    const buckets = new Map<number, number>();
    for (const session of sessions) {
      for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
        if (segment.start < range.start || segment.start >= range.end) continue;
        const hour = Number(formatInTimeZone(segment.start, timezone, "H"));
        buckets.set(hour, (buckets.get(hour) ?? 0) + segment.seconds);
      }
    }
    return Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: `${String(hour).padStart(2, "0")}:00`,
      shortLabel: hour % 6 === 0 ? `${hour}:00` : "",
      seconds: buckets.get(hour) ?? 0,
    }));
  }

  if (granularity === "month") {
    const buckets = new Map<string, number>();
    for (const session of sessions) {
      for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
        if (segment.start < range.start || segment.start >= range.end) continue;
        const key = segment.dayKey.slice(0, 7);
        buckets.set(key, (buckets.get(key) ?? 0) + segment.seconds);
      }
    }
    const keys: string[] = [];
    let key = toDateKey(range.start, timezone).slice(0, 7);
    const endKey = toDateKey(new Date(range.end.getTime() - 1000), timezone).slice(0, 7);
    let guard = 0;
    while (key <= endKey && guard < 240) {
      keys.push(key);
      key = addMonthsToKey(key, 1);
      guard++;
    }
    return keys.map((monthKey) => ({
      key: monthKey,
      label: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", year: "2-digit" }).format(
        new Date(`${monthKey}-01T12:00:00Z`),
      ),
      shortLabel: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(
        new Date(`${monthKey}-01T12:00:00Z`),
      ),
      seconds: buckets.get(monthKey) ?? 0,
    }));
  }

  const dayTotals = new Map<string, number>();
  for (const session of sessions) {
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
      if (segment.start < range.start || segment.start >= range.end) continue;
      dayTotals.set(segment.dayKey, (dayTotals.get(segment.dayKey) ?? 0) + segment.seconds);
    }
  }

  if (granularity === "week") {
    const buckets = new Map<string, number>();
    for (const [key, seconds] of dayTotals) {
      const weekKey = weekStartKey(new Date(`${key}T12:00:00Z`), "UTC", weekStartsOn);
      buckets.set(weekKey, (buckets.get(weekKey) ?? 0) + seconds);
    }
    const keys: string[] = [];
    let cursor = weekStartKey(range.start, timezone, weekStartsOn);
    const endKey = toDateKey(new Date(range.end.getTime() - 1000), timezone);
    let guard = 0;
    while (cursor <= endKey && guard < 80) {
      keys.push(cursor);
      cursor = addDaysToKey(cursor, 7);
      guard++;
    }
    return keys.map((key) => ({
      key,
      label: `Week of ${new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
        new Date(`${key}T12:00:00Z`),
      )}`,
      shortLabel: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
        new Date(`${key}T12:00:00Z`),
      ),
      seconds: buckets.get(key) ?? 0,
    }));
  }

  const keys = dayKeysBetween(range.start, new Date(range.end.getTime() - 1000), timezone);
  return keys.map((key) => ({
    key,
    label: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
      new Date(`${key}T12:00:00Z`),
    ),
    shortLabel:
      keys.length > 14
        ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
            new Date(`${key}T12:00:00Z`),
          )
        : new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(
            new Date(`${key}T12:00:00Z`),
          ),
    seconds: dayTotals.get(key) ?? 0,
  }));
}

export function totalSeconds(sessions: SessionLike[], start?: Date, end?: Date) {
  if (!start || !end) {
    return sessions.reduce((acc, session) => acc + session.durationSeconds, 0);
  }
  let total = 0;
  for (const session of sessions) {
    const overlapStart = Math.max(session.startTime.getTime(), start.getTime());
    const overlapEnd = Math.min(session.endTime.getTime(), end.getTime());
    if (overlapEnd > overlapStart) total += (overlapEnd - overlapStart) / 1000;
  }
  return total;
}

export function weekdayAverages(sessions: SessionLike[], range: DateRange, timezone: string) {
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  const keys = dayKeysBetween(range.start, new Date(range.end.getTime() - 1000), timezone);
  for (const key of keys) counts[weekdayOfKey(key)] += 1;

  for (const session of sessions) {
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
      if (segment.start < range.start || segment.start >= range.end) continue;
      totals[weekdayOfKey(segment.dayKey)] += segment.seconds;
    }
  }

  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  return order.map((day) => ({
    day,
    label: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(
      new Date(Date.UTC(2024, 0, 7 + day, 12)),
    ),
    seconds: counts[day] ? totals[day] / counts[day] : 0,
    totalSeconds: totals[day],
  }));
}

export function hourOfDayTotals(sessions: SessionLike[], range: DateRange, timezone: string) {
  const totals = new Array(24).fill(0);
  for (const session of sessions) {
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
      if (segment.start < range.start || segment.start >= range.end) continue;
      const hour = Number(formatInTimeZone(segment.start, timezone, "H"));
      totals[hour] += segment.seconds;
    }
  }
  return totals.map((seconds, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    seconds,
  }));
}

export function buildStackedSeries(
  sessions: SessionLike[],
  range: DateRange,
  timezone: string,
  groupForItem: (itemId: string) => string,
) {
  const points = buildTrend(sessions, range, timezone, 1);
  const map = new Map<string, Record<string, number>>();
  for (const point of points) map.set(point.key, {});

  const pointKeys = points.map((point) => point.key);

  for (const session of sessions) {
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
      if (segment.start < range.start || segment.start >= range.end) continue;
      let bucketKey: string | null = null;
      if (range.granularity === "hour") {
        bucketKey = String(Number(formatInTimeZone(segment.start, timezone, "H")));
      } else if (range.granularity === "month") {
        bucketKey = segment.dayKey.slice(0, 7);
      } else {
        bucketKey = segment.dayKey;
      }
      if (!bucketKey || !pointKeys.includes(bucketKey)) continue;
      const group = groupForItem(session.itemId);
      const bucket = map.get(bucketKey)!;
      bucket[group] = (bucket[group] ?? 0) + segment.seconds;
    }
  }

  return points.map((point) => ({
    ...point,
    ...(map.get(point.key) ?? {}),
  }));
}

export function goalHealthSummary(
  progresses: Array<{ status: string; percent: number }>,
) {
  const total = progresses.length;
  const completed = progresses.filter((p) => p.status === "completed" || p.status === "exceeded").length;
  const onTrack = progresses.filter((p) => p.status === "on_track" || p.status === "completed" || p.status === "exceeded").length;
  const atRisk = progresses.filter((p) => p.status === "at_risk" || p.status === "missed").length;
  const average = total > 0 ? progresses.reduce((acc, p) => acc + Math.min(p.percent, 150), 0) / total : 0;
  return {
    total,
    completed,
    onTrack,
    atRisk,
    completionRate: total > 0 ? onTrack / total : 0,
    averagePercent: average,
  };
}

export function firstDayOfRange(range: DateRange) {
  return range.start;
}

export function itemFilterForSubtree(items: Item[], itemId: string) {
  return (candidateId: string) => {
    let current: string | null | undefined = candidateId;
    let guard = 0;
    while (current && guard < 100) {
      if (current === itemId) return true;
      current = items.find((item) => item.id === current)?.parentId;
      guard++;
    }
    return false;
  };
}

export function sumGoalHistory(
  goal: Goal,
  history: Array<{ complete: boolean; percent: number; period: { startKey: string } }>,
  rangeStartKey: string,
) {
  const inRange = history.filter((entry) => entry.period.startKey >= rangeStartKey);
  return {
    scheduled: inRange.length,
    completed: inRange.filter((entry) => entry.complete).length,
    averagePercent:
      inRange.length > 0 ? inRange.reduce((acc, entry) => acc + entry.percent, 0) / inRange.length : 0,
  };
}
