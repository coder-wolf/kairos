import { formatInTimeZone } from "date-fns-tz";
import { fromZonedTime } from "date-fns-tz";

export type RangePreset =
  | "today"
  | "yesterday"
  | "week"
  | "last_week"
  | "month"
  | "last_month"
  | "year"
  | "last_year"
  | "all"
  | "custom";

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
  preset: RangePreset;
  prevStart: Date;
  prevEnd: Date;
  granularity: "hour" | "day" | "week" | "month";
};

const DAY_MS = 86_400_000;

export function toDateKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function toMonthKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM");
}

export function dateKeyToUtcNoon(key: string) {
  return new Date(`${key}T12:00:00.000Z`);
}

export function addDaysToKey(key: string, days: number) {
  return new Date(dateKeyToUtcNoon(key).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function addMonthsToKey(key: string, months: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  return date.toISOString().slice(0, 7);
}

export function startOfDayKey(key: string, timezone: string) {
  return fromZonedTime(`${key} 00:00:00`, timezone);
}

export function endOfDayKey(key: string, timezone: string) {
  return startOfDayKey(addDaysToKey(key, 1), timezone);
}

export function weekdayOfKey(key: string) {
  // 0 = Sunday ... 6 = Saturday
  return new Date(`${key}T12:00:00.000Z`).getUTCDay();
}

export function weekStartKey(date: Date, timezone: string, weekStartsOn: number) {
  const key = toDateKey(date, timezone);
  const weekday = weekdayOfKey(key);
  const diff = (weekday - weekStartsOn + 7) % 7;
  return addDaysToKey(key, -diff);
}

export function monthStartKey(date: Date, timezone: string) {
  return `${toMonthKey(date, timezone)}-01`;
}

export function dayKeysBetween(start: Date, end: Date, timezone: string) {
  const keys: string[] = [];
  let key = toDateKey(start, timezone);
  const endKey = toDateKey(end, timezone);
  let guard = 0;
  while (key <= endKey && guard < 5000) {
    keys.push(key);
    key = addDaysToKey(key, 1);
    guard++;
  }
  return keys;
}

export function overlapSeconds(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, (end - start) / 1000);
}

export type DaySegment = {
  dayKey: string;
  seconds: number;
  start: Date;
  end: Date;
};

/** Splits a session across local-midnight boundaries so analytics never lose or double-count time. */
export function splitSessionByLocalDay(start: Date, end: Date, timezone: string): DaySegment[] {
  const segments: DaySegment[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor < end && guard < 20) {
    const dayKey = toDateKey(cursor, timezone);
    const dayEnd = endOfDayKey(dayKey, timezone);
    const segmentEnd = dayEnd < end ? dayEnd : end;
    segments.push({
      dayKey,
      seconds: (segmentEnd.getTime() - cursor.getTime()) / 1000,
      start: cursor,
      end: segmentEnd,
    });
    cursor = segmentEnd;
    guard++;
  }
  return segments;
}

export function localDayRange(key: string, timezone: string) {
  return { start: startOfDayKey(key, timezone), end: endOfDayKey(key, timezone) };
}

export function humanDate(date: Date, timezone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function humanTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function dayLabel(key: string, timezone: string, now = new Date()) {
  const todayKey = toDateKey(now, timezone);
  if (key === todayKey) return "Today";
  if (key === addDaysToKey(todayKey, -1)) return "Yesterday";
  const date = dateKeyToUtcNoon(key);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function shortDayLabel(key: string) {
  const date = dateKeyToUtcNoon(key);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);
}

export function getDateRange(
  preset: RangePreset,
  timezone: string,
  weekStartsOn: number,
  options?: { now?: Date; from?: string; to?: string; earliest?: Date },
): DateRange {
  const now = options?.now ?? new Date();
  const todayKey = toDateKey(now, timezone);
  const thisWeekStart = weekStartKey(now, timezone, weekStartsOn);
  const thisMonthStart = monthStartKey(now, timezone);
  const thisYearStart = `${todayKey.slice(0, 4)}-01-01`;

  const build = (
    startKey: string,
    endKeyExclusive: string,
    label: string,
    granularity: DateRange["granularity"],
    prevStartKey: string,
    prevEndKeyExclusive: string,
  ): DateRange => ({
    start: startOfDayKey(startKey, timezone),
    end: startOfDayKey(endKeyExclusive, timezone),
    label,
    preset,
    prevStart: startOfDayKey(prevStartKey, timezone),
    prevEnd: startOfDayKey(prevEndKeyExclusive, timezone),
    granularity,
  });

  switch (preset) {
    case "today":
      return build(todayKey, addDaysToKey(todayKey, 1), "Today", "hour", addDaysToKey(todayKey, -1), todayKey);
    case "yesterday": {
      const key = addDaysToKey(todayKey, -1);
      return build(key, todayKey, "Yesterday", "hour", addDaysToKey(key, -1), key);
    }
    case "week":
      return build(
        thisWeekStart,
        addDaysToKey(thisWeekStart, 7),
        "This week",
        "day",
        addDaysToKey(thisWeekStart, -7),
        thisWeekStart,
      );
    case "last_week":
      return build(
        addDaysToKey(thisWeekStart, -7),
        thisWeekStart,
        "Last week",
        "day",
        addDaysToKey(thisWeekStart, -14),
        addDaysToKey(thisWeekStart, -7),
      );
    case "month":
      return build(
        thisMonthStart,
        `${addMonthsToKey(thisMonthStart.slice(0, 7), 1)}-01`,
        "This month",
        "day",
        `${addMonthsToKey(thisMonthStart.slice(0, 7), -1)}-01`,
        thisMonthStart,
      );
    case "last_month": {
      const lastMonthStart = `${addMonthsToKey(thisMonthStart.slice(0, 7), -1)}-01`;
      return build(
        lastMonthStart,
        thisMonthStart,
        "Last month",
        "day",
        `${addMonthsToKey(thisMonthStart.slice(0, 7), -2)}-01`,
        lastMonthStart,
      );
    }
    case "year":
      return build(
        thisYearStart,
        `${Number(todayKey.slice(0, 4)) + 1}-01-01`,
        "This year",
        "month",
        `${Number(todayKey.slice(0, 4)) - 1}-01-01`,
        thisYearStart,
      );
    case "last_year": {
      const year = Number(todayKey.slice(0, 4)) - 1;
      return build(
        `${year}-01-01`,
        `${year + 1}-01-01`,
        "Last year",
        "month",
        `${year - 1}-01-01`,
        `${year}-01-01`,
      );
    }
    case "custom": {
      const from = options?.from ?? thisWeekStart;
      const to = options?.to ?? todayKey;
      const startKey = from <= to ? from : to;
      const endKey = addDaysToKey(from <= to ? to : from, 1);
      const spanDays = Math.max(
        1,
        Math.round((startOfDayKey(endKey, timezone).getTime() - startOfDayKey(startKey, timezone).getTime()) / DAY_MS),
      );
      return {
        start: startOfDayKey(startKey, timezone),
        end: startOfDayKey(endKey, timezone),
        label: "Custom range",
        preset,
        prevStart: startOfDayKey(addDaysToKey(startKey, -spanDays), timezone),
        prevEnd: startOfDayKey(startKey, timezone),
        granularity: spanDays <= 2 ? "hour" : spanDays <= 70 ? "day" : "month",
      };
    }
    case "all":
    default: {
      const earliest = options?.earliest ?? new Date(now.getTime() - 365 * DAY_MS);
      const startKey = toDateKey(earliest, timezone) < thisYearStart ? toDateKey(earliest, timezone) : thisYearStart;
      return {
        start: startOfDayKey(startKey, timezone),
        end: startOfDayKey(addDaysToKey(todayKey, 1), timezone),
        label: "All time",
        preset: "all",
        prevStart: startOfDayKey(addDaysToKey(startKey, -365), timezone),
        prevEnd: startOfDayKey(startKey, timezone),
        granularity: "month",
      };
    }
  }
}
