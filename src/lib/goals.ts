import type { Goal, Item, TimeSession } from "@prisma/client";
import {
  addDaysToKey,
  addMonthsToKey,
  dateKeyToUtcNoon,
  endOfDayKey,
  splitSessionByLocalDay,
  startOfDayKey,
  toDateKey,
  weekdayOfKey,
  weekStartKey,
  overlapSeconds,
} from "./time";
import { getSubtreeIds } from "./items";

export type GoalWithItem = Goal & { item: Item };

type TargetRevision = { from: string; targetSeconds: number };

export function goalTargetRevisions(goal: Pick<Goal, "targetHistory">): TargetRevision[] {
  const raw = goal.targetHistory;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is TargetRevision => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const candidate = entry as Record<string, unknown>;
      return typeof candidate.from === "string" && typeof candidate.targetSeconds === "number";
    })
    .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
}

/** Historical periods keep the target that was in effect when they began. */
export function targetForPeriod(goal: Goal, periodStart: Date) {
  const revisions = goalTargetRevisions(goal);
  if (revisions.length === 0) return goal.targetSeconds;
  let target = revisions[0].targetSeconds;
  for (const revision of revisions) {
    if (new Date(revision.from).getTime() <= periodStart.getTime()) {
      target = revision.targetSeconds;
    }
  }
  return target;
}

export type GoalPeriod = {
  startKey: string;
  endKey: string;
  start: Date;
  end: Date;
  label: string;
  index: number;
};

export type GoalStatus =
  | "not_started"
  | "in_progress"
  | "on_track"
  | "at_risk"
  | "completed"
  | "exceeded"
  | "missed"
  | "paused";

export type GoalProgress = {
  goal: GoalWithItem;
  actualSeconds: number;
  targetSeconds: number;
  percent: number;
  remainingSeconds: number;
  status: GoalStatus;
  period: GoalPeriod;
  periodLabel: string;
  timeRemainingSeconds: number;
  timeRatio: number;
  pace: number;
  isHabit: boolean;
};

type SessionInput = Pick<TimeSession, "itemId" | "startTime" | "endTime" | "durationSeconds">;

function periodLabel(type: Goal["periodType"], startKey: string, endKey: string) {
  const endInclusive = addDaysToKey(endKey, -1);
  if (type === "DAILY") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(dateKeyToUtcNoon(startKey));
  }
  if (type === "WEEKLY") {
    const start = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
      dateKeyToUtcNoon(startKey),
    );
    const end = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
      dateKeyToUtcNoon(endInclusive),
    );
    return `${start} – ${end}`;
  }
  if (type === "MONTHLY") {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
      dateKeyToUtcNoon(startKey),
    );
  }
  const start = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(
    dateKeyToUtcNoon(startKey),
  );
  const end = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(
    dateKeyToUtcNoon(endInclusive),
  );
  return `${start} – ${end}`;
}

function basePeriodKeys(goal: Goal, reference: Date, timezone: string, weekStartsOn: number) {
  if (goal.periodType === "DAILY") {
    const key = toDateKey(reference, timezone);
    return { startKey: key, endKey: addDaysToKey(key, 1) };
  }
  if (goal.periodType === "WEEKLY") {
    const startKey = weekStartKey(reference, timezone, weekStartsOn);
    return { startKey, endKey: addDaysToKey(startKey, 7) };
  }
  if (goal.periodType === "MONTHLY") {
    const startKey = `${toDateKey(reference, timezone).slice(0, 7)}-01`;
    return { startKey, endKey: `${addMonthsToKey(startKey.slice(0, 7), 1)}-01` };
  }
  const startKey = toDateKey(goal.startDate, timezone);
  const endKey = goal.endDate ? addDaysToKey(toDateKey(goal.endDate, timezone), 1) : addDaysToKey(toDateKey(reference, timezone), 1);
  return { startKey, endKey };
}

export function goalPeriod(
  goal: Goal,
  reference: Date,
  timezone: string,
  weekStartsOn: number,
  offset = 0,
): GoalPeriod {
  let adjusted = reference;
  if (goal.periodType === "DAILY") adjusted = new Date(reference.getTime() + offset * 86_400_000);
  if (goal.periodType === "WEEKLY") adjusted = new Date(reference.getTime() + offset * 7 * 86_400_000);
  if (goal.periodType === "MONTHLY") {
    const monthKey = addMonthsToKey(toDateKey(reference, timezone).slice(0, 7), offset);
    adjusted = startOfDayKey(`${monthKey}-01`, timezone);
  }

  const { startKey, endKey } = basePeriodKeys(goal, adjusted, timezone, weekStartsOn);
  return {
    startKey,
    endKey,
    start: startOfDayKey(startKey, timezone),
    end: startOfDayKey(endKey, timezone),
    label: periodLabel(goal.periodType, startKey, endKey),
    index: offset,
  };
}

export function goalPeriods(
  goal: Goal,
  timezone: string,
  weekStartsOn: number,
  options?: { now?: Date; count?: number },
): GoalPeriod[] {
  const now = options?.now ?? new Date();
  const count = options?.count ?? 1;

  if (goal.periodType === "CUSTOM") {
    return [goalPeriod(goal, now, timezone, weekStartsOn)];
  }

  const periods: GoalPeriod[] = [];
  for (let i = count - 1; i >= 0; i--) {
    periods.push(goalPeriod(goal, now, timezone, weekStartsOn, -i));
  }

  const goalStartKey = toDateKey(goal.startDate, timezone);
  const goalEndKey = goal.endDate ? toDateKey(goal.endDate, timezone) : null;
  return periods.filter((period) => {
    if (period.startKey < goalStartKey) return false;
    if (goalEndKey && period.startKey > goalEndKey) return false;
    return true;
  });
}

export function dailyTotalsForGoal(
  goal: GoalWithItem,
  items: Item[],
  sessions: SessionInput[],
  timezone: string,
) {
  const subtree = getSubtreeIds(items, goal.itemId);
  const scheduled = new Set(goal.daysOfWeek);
  const totals = new Map<string, number>();

  for (const session of sessions) {
    if (!subtree.has(session.itemId)) continue;
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
      if (scheduled.size > 0 && !scheduled.has(weekdayOfKey(segment.dayKey))) continue;
      totals.set(segment.dayKey, (totals.get(segment.dayKey) ?? 0) + segment.seconds);
    }
  }
  return totals;
}

export function actualSecondsInPeriod(
  dailyTotals: Map<string, number>,
  period: Pick<GoalPeriod, "startKey" | "endKey">,
) {
  let total = 0;
  for (const [key, seconds] of dailyTotals) {
    if (key >= period.startKey && key < period.endKey) total += seconds;
  }
  return total;
}

export function computeGoalProgress(
  goal: GoalWithItem,
  items: Item[],
  sessions: SessionInput[],
  timezone: string,
  weekStartsOn: number,
  now = new Date(),
): GoalProgress {
  const period = goalPeriod(goal, now, timezone, weekStartsOn);
  const subtree = getSubtreeIds(items, goal.itemId);
  const scheduled = new Set(goal.daysOfWeek);

  let actualSeconds = 0;
  for (const session of sessions) {
    if (!subtree.has(session.itemId)) continue;
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, timezone)) {
      if (segment.dayKey < period.startKey || segment.dayKey >= period.endKey) continue;
      if (scheduled.size > 0 && !scheduled.has(weekdayOfKey(segment.dayKey))) continue;
      actualSeconds += segment.seconds;
    }
  }

  const targetSeconds = targetForPeriod(goal, period.start);
  const percent = targetSeconds > 0 ? (actualSeconds / targetSeconds) * 100 : 0;
  const remainingSeconds = Math.max(0, targetSeconds - actualSeconds);
  const duration = Math.max(1, period.end.getTime() - period.start.getTime());
  const elapsed = Math.min(duration, Math.max(0, now.getTime() - period.start.getTime()));
  const timeRatio = elapsed / duration;
  const timeRemainingSeconds = Math.max(0, (period.end.getTime() - now.getTime()) / 1000);

  let status: GoalStatus;
  if (goal.status !== "ACTIVE") {
    status = "paused";
  } else if (now.getTime() >= period.end.getTime()) {
    status = actualSeconds >= targetSeconds ? "completed" : "missed";
  } else if (percent >= 110) {
    status = "exceeded";
  } else if (percent >= 100) {
    status = "completed";
  } else if (timeRatio < 0.1) {
    status = actualSeconds > 0 ? "in_progress" : "not_started";
  } else if (percent / 100 >= timeRatio - 0.07) {
    status = "on_track";
  } else {
    status = "at_risk";
  }

  return {
    goal,
    actualSeconds,
    targetSeconds,
    percent,
    remainingSeconds,
    status,
    period,
    periodLabel: period.label,
    timeRemainingSeconds,
    timeRatio,
    pace: percent / 100 - timeRatio,
    isHabit: goal.periodType === "DAILY" || goal.periodType === "WEEKLY",
  };
}

export type StreakSummary = {
  current: number;
  longest: number;
  completed: number;
  missed: number;
  scheduled: number;
  consistency: number;
  history: Array<{
    period: GoalPeriod;
    complete: boolean;
    partial: boolean;
    percent: number;
    isCurrent: boolean;
  }>;
};

export function computeStreaks(
  goal: GoalWithItem,
  items: Item[],
  sessions: SessionInput[],
  timezone: string,
  weekStartsOn: number,
  now = new Date(),
  maxPeriods = 120,
): StreakSummary {
  if (goal.periodType === "CUSTOM") {
    const progress = computeGoalProgress(goal, items, sessions, timezone, weekStartsOn, now);
    return {
      current: progress.percent >= 100 ? 1 : 0,
      longest: progress.percent >= 100 ? 1 : 0,
      completed: progress.percent >= 100 ? 1 : 0,
      missed: 0,
      scheduled: 1,
      consistency: Math.min(1, progress.percent / 100),
      history: [
        {
          period: progress.period,
          complete: progress.percent >= 100,
          partial: progress.percent > 0 && progress.percent < 100,
          percent: progress.percent,
          isCurrent: true,
        },
      ],
    };
  }

  const dailyTotals = dailyTotalsForGoal(goal, items, sessions, timezone);
  const startKey = toDateKey(goal.startDate, timezone);
  const current = goalPeriod(goal, now, timezone, weekStartsOn);

  const periods: GoalPeriod[] = [];
  const cursorPeriods =
    goal.periodType === "DAILY"
      ? Math.min(maxPeriods, Math.max(1, Math.round((startOfDayKey(current.startKey, timezone).getTime() - startOfDayKey(startKey, timezone).getTime()) / 86_400_000) + 1))
      : goal.periodType === "WEEKLY"
        ? Math.min(maxPeriods, Math.max(1, Math.round((startOfDayKey(current.startKey, timezone).getTime() - startOfDayKey(startKey, timezone).getTime()) / (7 * 86_400_000)) + 1))
        : Math.min(36, Math.max(1, Math.abs(
            (Number(current.startKey.slice(0, 4)) - Number(startKey.slice(0, 4))) * 12 +
              (Number(current.startKey.slice(5, 7)) - Number(startKey.slice(5, 7))) + 1,
          )));

  for (let i = cursorPeriods - 1; i >= 0; i--) {
    const period = goalPeriod(goal, now, timezone, weekStartsOn, -i);
    if (period.startKey < startKey) continue;
    if (period.startKey > current.startKey) continue;
    periods.push(period);
  }

  const history = periods.map((period) => {
    const actual = actualSecondsInPeriod(dailyTotals, period);
    const target = targetForPeriod(goal, period.start);
    const percent = target > 0 ? (actual / target) * 100 : 0;
    return {
      period,
      complete: percent >= 100,
      partial: percent > 0 && percent < 100,
      percent,
      isCurrent: period.startKey === current.startKey,
    };
  });

  let longest = 0;
  let run = 0;
  for (const entry of history) {
    if (entry.complete) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let currentStreak = 0;
  let index = history.length - 1;
  if (index >= 0 && !history[index].complete) index--;
  while (index >= 0 && history[index].complete) {
    currentStreak++;
    index--;
  }

  const past = history.filter((entry) => !entry.isCurrent);
  const completed = history.filter((entry) => entry.complete).length;
  const missed = past.filter((entry) => !entry.complete).length;

  return {
    current: currentStreak,
    longest: Math.max(longest, currentStreak),
    completed,
    missed,
    scheduled: history.length,
    consistency: past.length > 0 ? past.filter((entry) => entry.complete).length / past.length : 0,
    history,
  };
}

export function goalActualInRange(
  goal: GoalWithItem,
  items: Item[],
  sessions: SessionInput[],
  start: Date,
  end: Date,
) {
  const subtree = getSubtreeIds(items, goal.itemId);
  let total = 0;
  for (const session of sessions) {
    if (!subtree.has(session.itemId)) continue;
    total += overlapSeconds(session.startTime, session.endTime, start, end);
  }
  return total;
}

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; tone: string }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  on_track: { label: "On track", tone: "success" },
  at_risk: { label: "At risk", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  exceeded: { label: "Exceeded", tone: "accent" },
  missed: { label: "Missed", tone: "danger" },
  paused: { label: "Paused", tone: "neutral" },
};

export function periodLabelShort(goal: Goal) {
  switch (goal.periodType) {
    case "DAILY":
      return "per day";
    case "WEEKLY":
      return "per week";
    case "MONTHLY":
      return "per month";
    default:
      return "custom period";
  }
}

export function periodNoun(goal: Goal) {
  switch (goal.periodType) {
    case "DAILY":
      return "day";
    case "WEEKLY":
      return "week";
    case "MONTHLY":
      return "month";
    default:
      return "period";
  }
}

export { endOfDayKey };

export type HabitDay = {
  dayKey: string;
  label: string;
  periodLabel: string;
  complete: boolean;
  partial: boolean;
  percent: number;
  isCurrent: boolean;
  inactive: boolean;
};

/**
 * A fixed calendar window of recent days for the habit heatmap. Daily goals
 * are compared against their daily target; weekly goals are compared against
 * their share of the weekly target for each scheduled day.
 */
export function computeHabitDays(
  goal: GoalWithItem,
  items: Item[],
  sessions: SessionInput[],
  timezone: string,
  weekStartsOn: number,
  now = new Date(),
  count = 24,
): HabitDay[] {
  const dailyTotals = dailyTotalsForGoal(goal, items, sessions, timezone);
  const todayKey = toDateKey(now, timezone);
  const startKey = toDateKey(goal.startDate, timezone);
  const endKey = goal.endDate ? toDateKey(goal.endDate, timezone) : null;
  const scheduledDays = goal.daysOfWeek.length > 0 ? goal.daysOfWeek.length : 7;

  return Array.from({ length: count }, (_, index) => {
    const dayKey = addDaysToKey(todayKey, index - (count - 1));
    const dayStart = startOfDayKey(dayKey, timezone);
    const period = goalPeriod(goal, dayStart, timezone, weekStartsOn);
    const inactive = dayKey < startKey || Boolean(endKey && dayKey > endKey);
    const actual = dailyTotals.get(dayKey) ?? 0;

    const target =
      goal.periodType === "WEEKLY"
        ? targetForPeriod(goal, period.start) / scheduledDays
        : targetForPeriod(goal, dayStart);
    const percent = inactive || target <= 0 ? 0 : (actual / target) * 100;

    return {
      dayKey,
      label: new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(dateKeyToUtcNoon(dayKey)),
      periodLabel: period.label,
      complete: !inactive && percent >= 100,
      partial: !inactive && percent > 0 && percent < 100,
      percent,
      isCurrent: dayKey === todayKey,
      inactive,
    };
  });
}
