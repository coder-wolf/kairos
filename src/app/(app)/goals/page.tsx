import type { Metadata } from "next";
import { CheckCircle2, Flame, Target, TrendingUp } from "lucide-react";
import { GoalsSpreadsheet, type GoalsSpreadsheetRow, type SpreadsheetDay } from "@/components/goals/goals-spreadsheet";
import { NewGoalButton } from "@/components/goals/new-goal-button";
import { getAppContext, toGoalSummaries } from "@/lib/dal";
import { computeGoalProgress, computeStreaks, dailyTotalsForGoal } from "@/lib/goals";
import { getSessionsWindow } from "@/lib/queries";
import { getAncestorPath } from "@/lib/items";
import { getDateRange, startOfDayKey, toDateKey, weekdayOfKey } from "@/lib/time";

export const metadata: Metadata = { title: "Goals & Habits" };

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const { user, items, goals } = await getAppContext();
  const tz = user.timezone;
  const now = new Date();
  const today = getDateRange("today", tz, user.weekStartsOn, { now });
  const todayKey = toDateKey(now, tz);
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : todayKey.slice(0, 7);
  const [monthYear, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate();
  const monthStartKey = `${month}-01`;
  const nextMonthKey = `${monthNumber === 12 ? monthYear + 1 : monthYear}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, "0")}`;
  const monthStart = startOfDayKey(monthStartKey, tz);
  const monthEnd = startOfDayKey(`${nextMonthKey}-01`, tz);
  const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );
  const days: SpreadsheetDay[] = Array.from({ length: daysInMonth }, (_, index) => {
    const key = `${month}-${String(index + 1).padStart(2, "0")}`;
    const weekday = weekdayOfKey(key);
    return {
      key,
      day: index + 1,
      weekday,
      isToday: key === todayKey,
      isWeekend: weekday === 0 || weekday === 6,
      isFuture: key > todayKey,
    };
  });
  const monthSessions = await getSessionsWindow(user.workspace.id, monthStart, monthEnd);
  const relevantGoals = goals.filter((goal) => goal.status !== "ARCHIVED");

  const earliest = relevantGoals.length
    ? new Date(Math.min(...relevantGoals.map((goal) => goal.startDate.getTime())))
    : new Date(now.getTime() - 120 * 86_400_000);
  const since = new Date(Math.max(earliest.getTime(), now.getTime() - 420 * 86_400_000));

  const sessions = await getSessionsWindow(user.workspace.id, since, today.end);

  const spreadsheetRows: GoalsSpreadsheetRow[] = relevantGoals.map((goal) => {
    const progress = computeGoalProgress(goal, items, sessions, tz, user.weekStartsOn, now);
    const habit = goal.periodType === "DAILY" || goal.periodType === "WEEKLY";
    const streak = habit ? computeStreaks(goal, items, sessions, tz, user.weekStartsOn, now) : undefined;
    const dailyTotals = dailyTotalsForGoal(goal, items, monthSessions, tz);
    const goalStartKey = toDateKey(goal.startDate, tz);
    const goalEndKey = goal.endDate ? toDateKey(goal.endDate, tz) : null;
    const scheduledDays = new Set(goal.daysOfWeek);

    const cells: GoalsSpreadsheetRow["cells"] = {};
    let monthSeconds = 0;
    for (const day of days) {
      const scheduled = scheduledDays.size === 0 || scheduledDays.has(day.weekday);
      const active =
        scheduled &&
        !day.isFuture &&
        day.key >= goalStartKey &&
        (!goalEndKey || day.key <= goalEndKey);
      const seconds = active ? (dailyTotals.get(day.key) ?? 0) : 0;
      if (active) monthSeconds += seconds;
      cells[day.key] = { seconds, scheduled, active };
    }

    const periodDays =
      goal.periodType === "DAILY"
        ? 1
        : goal.periodType === "WEEKLY"
          ? 7
          : goal.periodType === "MONTHLY"
            ? daysInMonth
            : Math.max(
                1,
                Math.round(
                  (new Date(`${goalEndKey ?? todayKey}T12:00:00Z`).getTime() - new Date(`${goalStartKey}T12:00:00Z`).getTime()) /
                    86_400_000,
                ) + 1,
              );
    const scheduledCount = goal.daysOfWeek.length > 0 ? goal.daysOfWeek.length : periodDays;
    const expectedDailySeconds = goal.periodType === "DAILY" ? goal.targetSeconds : goal.targetSeconds / Math.max(1, scheduledCount);

    return {
      goal: toGoalSummaries([goal])[0],
      itemPath: getAncestorPath(items, goal.itemId)
        .map((item) => item.name)
        .join(" / "),
      progress: {
        actualSeconds: progress.actualSeconds,
        targetSeconds: progress.targetSeconds,
        percent: progress.percent,
        status: progress.status,
        periodLabel: progress.periodLabel,
      },
      streak: streak
        ? { current: streak.current, longest: streak.longest, consistency: streak.consistency }
        : undefined,
      cells,
      expectedDailySeconds,
      monthSeconds,
    };
  });

  const active = spreadsheetRows.filter((row) => row.goal.status === "ACTIVE");
  const onTrack = active.filter((item) => ["on_track", "completed", "exceeded"].includes(item.progress.status)).length;
  const attention = active.filter((item) => ["at_risk", "missed"].includes(item.progress.status)).length;
  const average =
    active.length > 0
      ? Math.round(active.reduce((acc, item) => acc + Math.min(item.progress.percent, 150), 0) / active.length)
      : 0;
  const bestStreak = spreadsheetRows.reduce((acc, row) => Math.max(acc, row.streak?.longest ?? 0), 0);
  const paused = spreadsheetRows.filter((row) => row.goal.status === "PAUSED").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">Intentions, measured</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
            Goals & Habits<span className="text-primary">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
            Every target is independent. Parents include their descendants, children include theirs, and the same
            session can legitimately feed both.
          </p>
        </div>
        <NewGoalButton />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Active goals",
            value: String(active.length),
            sub: paused > 0 ? `${paused} paused` : "all running",
            icon: Target,
            color: "var(--primary)",
          },
          {
            label: "On track",
            value: String(onTrack),
            sub: `${active.length > 0 ? Math.round((onTrack / active.length) * 100) : 0}% of active goals`,
            icon: CheckCircle2,
            color: "var(--success)",
          },
          {
            label: "Average progress",
            value: `${average}%`,
            sub: attention > 0 ? `${attention} need attention` : "nothing urgent",
            icon: TrendingUp,
            color: "var(--info)",
          },
          {
            label: "Best streak",
            value: String(bestStreak),
            sub: "consecutive periods",
            icon: Flame,
            color: "var(--warning)",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">{stat.label}</p>
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{ background: `${stat.color}14`, color: stat.color }}
              >
                <stat.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em]">{stat.value}</p>
            <p className="text-[10px] font-medium text-muted-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      <GoalsSpreadsheet
        rows={spreadsheetRows}
        days={days}
        month={month}
        monthLabel={monthLabel}
        todayKey={todayKey}
      />
    </div>
  );
}
