import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  Layers,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { AnalyticsControls } from "@/components/analytics/analytics-controls";
import { AreaTrendChart, DistributionDonut } from "@/components/charts";
import { Progress, RingProgress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { buildTrend, hourOfDayTotals, totalSeconds, weekdayAverages } from "@/lib/analytics";
import { getAppContext, toItemOptions } from "@/lib/dal";
import { aggregateByItem, getSubtreeIds } from "@/lib/items";
import { computeGoalProgress, computeStreaks } from "@/lib/goals";
import { getEarliestSession, getSessionsWindow } from "@/lib/queries";
import {
  dayKeysBetween,
  getDateRange,
  overlapSeconds,
  splitSessionByLocalDay,
  toDateKey,
  type RangePreset,
} from "@/lib/time";
import { cn, formatDuration, paletteColor, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const VALID_PRESETS: RangePreset[] = [
  "today",
  "yesterday",
  "week",
  "last_week",
  "month",
  "last_month",
  "year",
  "last_year",
  "all",
  "custom",
];

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; item?: string; from?: string; to?: string; by?: string }>;
}) {
  const params = await searchParams;
  const { user, items, goals } = await getAppContext();
  const tz = user.timezone;
  const weekStartsOn = user.weekStartsOn;
  const now = new Date();
  const today = getDateRange("today", tz, weekStartsOn, { now });
  const todayKey = toDateKey(now, tz);
  const preset: RangePreset = VALID_PRESETS.includes(params.range as RangePreset)
    ? (params.range as RangePreset)
    : "week";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const from = params.from && datePattern.test(params.from) ? params.from : undefined;
  const to = params.to && datePattern.test(params.to) ? params.to : undefined;

  const earliest = await getEarliestSession(user.workspace.id);
  const range = getDateRange(preset, tz, weekStartsOn, {
    now,
    from,
    to,
    earliest: earliest?.startTime,
  });

  const selectedItem = params.item ? items.find((item) => item.id === params.item) : null;
  const subtree = selectedItem ? getSubtreeIds(items, selectedItem.id) : null;

  const by: "day" | "week" | "month" =
    params.by === "week" || params.by === "month" || params.by === "day"
      ? params.by
      : range.granularity === "month"
        ? "month"
        : "day";

  const queryStart = new Date(Math.min(range.prevStart.getTime(), range.start.getTime()));
  const sessions = await getSessionsWindow(user.workspace.id, queryStart, range.end);
  const inRange = (start: Date, end: Date) =>
    sessions.filter((session) => session.startTime < end && session.endTime > start && (!subtree || subtree.has(session.itemId)));

  const currentSessions = inRange(range.start, range.end);
  const previousSessions = inRange(range.prevStart, range.prevEnd);
  const currentTotal = totalSeconds(currentSessions, range.start, range.end);
  const previousTotal = totalSeconds(previousSessions, range.prevStart, range.prevEnd);
  const change = percentChange(currentTotal, previousTotal);

  const cappedEnd = new Date(Math.min(range.end.getTime(), today.end.getTime()));
  const cappedRange = { ...range, end: cappedEnd > range.start ? cappedEnd : range.end };
  const dayKeys = dayKeysBetween(cappedRange.start, new Date(cappedRange.end.getTime() - 1000), tz);
  const dailyAverage = dayKeys.length > 0 ? currentTotal / dayKeys.length : 0;

  const dailyTotals = new Map<string, number>();
  for (const session of currentSessions) {
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, tz)) {
      if (segment.start < range.start || segment.start >= range.end) continue;
      dailyTotals.set(segment.dayKey, (dailyTotals.get(segment.dayKey) ?? 0) + segment.seconds);
    }
  }
  const activeDays = Array.from(dailyTotals.values()).filter((seconds) => seconds > 0).length;
  const bestDayKey = Array.from(dailyTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestDayLabel = bestDayKey
    ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(new Date(`${bestDayKey}T12:00:00Z`))
    : null;

  const trend = buildTrend(currentSessions, range, tz, weekStartsOn, by);

  const rangeTotals = aggregateByItem(items, currentSessions, { start: range.start, end: range.end });
  const roots = items.filter(
    (item) => !item.parentId || !items.some((candidate) => candidate.id === item.parentId),
  );

  let distribution: Array<{ id: string | null; name: string; value: number; color: string }> = [];
  if (selectedItem) {
    const children = items
      .filter((item) => item.parentId === selectedItem.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const direct = currentSessions.reduce((acc, session) => {
      if (session.itemId !== selectedItem.id) return acc;
      return acc + overlapSeconds(session.startTime, session.endTime, range.start, range.end);
    }, 0);
    distribution = [
      ...children.map((child, index) => ({
        id: child.id,
        name: child.name,
        value: rangeTotals.get(child.id) ?? 0,
        color: child.color ?? paletteColor(index),
      })),
      ...(direct > 0
        ? [{ id: null, name: `Direct on ${selectedItem.name}`, value: direct, color: "var(--muted-2)" }]
        : []),
    ].filter((entry) => entry.value > 0);
  } else {
    distribution = roots
      .map((item, index) => ({
        id: item.id,
        name: item.name,
        value: rangeTotals.get(item.id) ?? 0,
        color: item.color ?? paletteColor(index),
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
  }
  const distributionTotal = distribution.reduce((acc, entry) => acc + entry.value, 0);

  const weekdays = weekdayAverages(currentSessions, cappedRange, tz);
  const hours = hourOfDayTotals(currentSessions, cappedRange, tz);
  const maxWeekday = Math.max(1, ...weekdays.map((day) => day.seconds));
  const bestWeekday = weekdays.reduce((best, day) => (day.seconds > best.seconds ? day : best), weekdays[0]);
  const maxHour = Math.max(1, ...hours.map((hour) => hour.seconds));

  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  let goalRows: Array<{
    id: string;
    name: string;
    itemId: string;
    color: string | null;
    percent: number;
    status: string;
    actualSeconds: number;
    targetSeconds: number;
    periodLabel: string;
    consistency: number;
    streak: number;
    pastCompleted: number;
    pastScheduled: number;
  }> = [];

  if (activeGoals.length > 0) {
    const goalStart = new Date(
      Math.max(
        Math.min(...activeGoals.map((goal) => goal.startDate.getTime())),
        now.getTime() - 420 * 86_400_000,
      ),
    );
    const goalSessions = await getSessionsWindow(user.workspace.id, goalStart, today.end);
    goalRows = activeGoals.map((goal) => {
      const progress = computeGoalProgress(goal, items, goalSessions, tz, weekStartsOn, now);
      const streak = computeStreaks(goal, items, goalSessions, tz, weekStartsOn, now);
      const past = streak.history.filter((entry) => !entry.isCurrent);
      return {
        id: goal.id,
        name: goal.name,
        itemId: goal.itemId,
        color: goal.item.color,
        percent: progress.percent,
        status: progress.status,
        actualSeconds: progress.actualSeconds,
        targetSeconds: progress.targetSeconds,
        periodLabel: progress.periodLabel,
        consistency: streak.consistency,
        streak: streak.current,
        pastCompleted: past.filter((entry) => entry.complete).length,
        pastScheduled: past.length,
      };
    });
  }

  const pastScheduled = goalRows.reduce((acc, goal) => acc + goal.pastScheduled, 0);
  const pastCompleted = goalRows.reduce((acc, goal) => acc + goal.pastCompleted, 0);
  const goalCompletionRate = pastScheduled > 0 ? pastCompleted / pastScheduled : 0;
  const averageGoalProgress =
    goalRows.length > 0 ? goalRows.reduce((acc, goal) => acc + Math.min(goal.percent, 150), 0) / goalRows.length : 0;
  const goalsNeedingAttention = [...goalRows]
    .filter((goal) => ["at_risk", "missed", "not_started"].includes(goal.status))
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 4);
  const trendUrl = (nextBy: string) => {
    const search = new URLSearchParams({ range: preset, by: nextBy });
    if (selectedItem) search.set("item", selectedItem.id);
    if (preset === "custom") {
      if (from) search.set("from", from);
      if (to) search.set("to", to);
    }
    return `/analytics?${search.toString()}`;
  };

  const habitRows = [...goalRows]
    .filter((goal) => goal.status !== "paused")
    .sort((a, b) => b.consistency - a.consistency)
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">Signal, not noise</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
            Analytics<span className="text-primary">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
            {selectedItem ? (
              <>
                Looking at <strong className="font-semibold text-text">{selectedItem.name}</strong> and everything inside
                it.
              </>
            ) : (
              "Where your hours actually went — and whether that matches what you meant to do."
            )}
          </p>
        </div>
        {selectedItem ? (
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-muted hover:bg-surface-2 hover:text-text"
          >
            Clear item filter <ChevronRight className="h-3 w-3" />
          </Link>
        ) : null}
      </header>

      <AnalyticsControls
        preset={preset}
        itemId={selectedItem?.id}
        from={from}
        to={to}
        items={toItemOptions(items)}
        todayKey={todayKey}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Tracked",
            value: formatDuration(currentTotal, { zero: "0m" }),
            sub: range.label,
            icon: Timer,
            color: "var(--primary)",
          },
          {
            label: "Daily average",
            value: formatDuration(dailyAverage, { zero: "0m" }),
            sub: `${dayKeys.length} ${pluralize(dayKeys.length, "day")} in range`,
            icon: TrendingUp,
            color: "var(--accent)",
          },
          {
            label: "Active days",
            value: String(activeDays),
            sub: bestDayLabel ? `${bestDayLabel} was strongest` : "no sessions yet",
            icon: CalendarDays,
            color: "var(--success)",
          },
          {
            label: "vs previous",
            value: change === null ? "New" : change === 0 ? "0%" : `${change > 0 ? "+" : ""}${change}%`,
            sub: `${formatDuration(previousTotal)} before`,
            icon: change !== null && change < 0 ? ArrowDownRight : ArrowUpRight,
            color: change !== null && change < 0 ? "var(--warning)" : "var(--success)",
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
            <p className="truncate text-[10px] font-medium text-muted-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight">Time trend</h2>
              </div>
              <p className="text-[11px] text-muted">
                {range.label}
                {selectedItem ? ` · ${selectedItem.name}` : " · whole workspace"}
              </p>
            </div>
            <div className="flex rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  { value: "day", label: "Daily" },
                  { value: "week", label: "Weekly" },
                  { value: "month", label: "Monthly" },
                ] as const
              ).map((option) => (
                <Link
                  key={option.value}
                  href={trendUrl(option.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                    by === option.value ? "bg-primary text-primary-contrast" : "text-muted hover:text-text",
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="px-2 pb-3 pt-4 sm:px-4">
            {currentTotal > 0 ? (
              <AreaTrendChart data={trend} height={250} />
            ) : (
              <div className="flex h-[250px] flex-col items-center justify-center text-center">
                <BarChart3 className="h-6 w-6 text-muted-2" />
                <p className="mt-2 text-sm font-semibold">No time in this range</p>
                <p className="mt-1 max-w-xs text-xs text-muted">
                  Try a wider range, or start tracking to give this chart something to say.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold tracking-tight">Distribution</h2>
            <p className="text-[11px] text-muted">
              {selectedItem ? "Children of the selected item" : "Top-level areas"} · {range.label.toLowerCase()}
            </p>
          </div>
          {distribution.length === 0 ? (
            <p className="px-5 py-12 text-center text-xs text-muted">No time to distribute in this range.</p>
          ) : (
            <>
              <DistributionDonut
                data={distribution.map((entry) => ({ name: entry.name, value: entry.value, color: entry.color }))}
                centerValue={formatDuration(distributionTotal)}
                centerLabel="tracked"
                height={220}
              />
              <div className="space-y-2 border-t border-border p-4">
                {distribution.map((entry) => (
                  <div key={entry.id ?? entry.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
                    {entry.id ? (
                      <Link
                        href={`/analytics?range=${preset}&item=${entry.id}`}
                        className="min-w-0 flex-1 truncate text-[11px] font-semibold hover:text-primary"
                      >
                        {entry.name}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{entry.name}</span>
                    )}
                    <span className="text-[10px] tabular-nums text-muted">
                      {Math.round((entry.value / distributionTotal) * 100)}%
                    </span>
                    <span className="w-12 text-right text-[10px] font-semibold tabular-nums">
                      {formatDuration(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Weekday rhythm</h2>
              <p className="text-[11px] text-muted">Average tracked time per weekday.</p>
            </div>
            {bestWeekday && bestWeekday.seconds > 0 ? (
              <Badge tone="success">{bestWeekday.label} strongest</Badge>
            ) : null}
          </div>
          <div className="mt-5 space-y-2.5">
            {weekdays.map((day) => (
              <div key={day.day} className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-8 text-[10px] font-bold uppercase tracking-wide",
                    day.day === bestWeekday?.day && day.seconds > 0 ? "text-primary" : "text-muted",
                  )}
                >
                  {day.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      day.day === bestWeekday?.day ? "bg-primary" : "bg-primary/45",
                    )}
                    style={{ width: `${(day.seconds / maxWeekday) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right text-[10px] font-semibold tabular-nums text-muted">
                  {formatDuration(day.seconds, { zero: "—" })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Time of day</h2>
            <p className="text-[11px] text-muted">When the work actually happens.</p>
          </div>
          <div className="mt-6 flex h-[130px] items-end gap-[3px]">
            {hours.map((hour) => (
              <div key={hour.hour} className="group relative flex h-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-colors",
                    hour.seconds > 0 ? "bg-accent/60 group-hover:bg-accent" : "bg-surface-3",
                  )}
                  style={{ height: `${Math.max(2, (hour.seconds / maxHour) * 100)}%` }}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold shadow-(--shadow-card) group-hover:block">
                  {hour.label} · {formatDuration(hour.seconds, { zero: "0m" })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-medium text-muted-2">
            <span>12a</span>
            <span>6a</span>
            <span>12p</span>
            <span>6p</span>
            <span>11p</span>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight">Goal health</h2>
              </div>
              <p className="text-[11px] text-muted">All-time completion across every active goal.</p>
            </div>
            <Link href="/goals" className="text-[11px] font-bold text-muted hover:text-primary">
              Open goals
            </Link>
          </div>
          <div className="flex items-center gap-5 p-5">
            <RingProgress value={goalCompletionRate * 100} size={92} stroke={7} color="var(--success)">
              <div className="text-center">
                <p className="text-[20px] font-extrabold leading-none tracking-[-0.03em]">
                  {Math.round(goalCompletionRate * 100)}%
                </p>
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-2">completed</p>
              </div>
            </RingProgress>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] text-muted">Periods completed</p>
                <p className="text-[15px] font-bold">
                  {pastCompleted} <span className="text-[11px] font-medium text-muted-2">of {pastScheduled}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Average progress</p>
                <p className="text-[15px] font-bold">{Math.round(averageGoalProgress)}%</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Active goals</p>
                <p className="text-[15px] font-bold">{activeGoals.length}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">
              {goalsNeedingAttention.length > 0 ? "Needs attention" : "All clear"}
            </p>
            {goalsNeedingAttention.length === 0 ? (
              <p className="px-1 pb-2 text-[11px] text-muted">Nothing is at risk right now. Protect the streak.</p>
            ) : (
              <div className="space-y-3">
                {goalsNeedingAttention.map((goal) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/items/${goal.itemId}`} className="truncate text-[11px] font-semibold hover:text-primary">
                        {goal.name}
                      </Link>
                      <span className="text-[10px] font-semibold text-muted">
                        {formatDuration(goal.actualSeconds)} / {formatDuration(goal.targetSeconds)}
                      </span>
                    </div>
                    <Progress value={goal.percent} height={4} className="mt-1" color="var(--warning)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-bold tracking-tight">Habit consistency</h2>
              </div>
              <p className="text-[11px] text-muted">Daily and weekly goals, measured by completed periods.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {habitRows.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-muted">No habit-style goals yet.</p>
            ) : (
              habitRows.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-warning-soft text-warning">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/items/${goal.itemId}`} className="block truncate text-[12px] font-semibold hover:text-primary">
                      {goal.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-warning" style={{ width: `${goal.consistency * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted">{Math.round(goal.consistency * 100)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-extrabold leading-none text-warning">{goal.streak}</p>
                    <p className="text-[9px] uppercase tracking-wide text-muted-2">streak</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Where the time went</h2>
            <p className="text-[11px] text-muted">Drill into any area, then compare children.</p>
          </div>
          <Link href="/history" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary">
            Session history <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {distribution.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Layers className="mx-auto h-6 w-6 text-muted-2" />
            <p className="mt-2 text-sm font-semibold">Nothing to break down yet</p>
            <p className="mt-1 text-xs text-muted">Track some time and this becomes a map of your attention.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {distribution.map((entry) => (
              <div key={entry.id ?? entry.name} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    {entry.id ? (
                      <Link href={`/analytics?range=${preset}&item=${entry.id}`} className="truncate text-[12px] font-semibold hover:text-primary">
                        {entry.name}
                      </Link>
                    ) : (
                      <span className="truncate text-[12px] font-semibold">{entry.name}</span>
                    )}
                    <span className="text-[11px] font-semibold tabular-nums">{formatDuration(entry.value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (entry.value / distributionTotal) * 100)}%`,
                        background: entry.color,
                      }}
                    />
                  </div>
                </div>
                <span className="w-9 text-right text-[10px] font-semibold tabular-nums text-muted">
                  {Math.round((entry.value / distributionTotal) * 100)}%
                </span>
                {entry.id ? (
                  <Link
                    href={`/analytics?range=${preset}&item=${entry.id}`}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-2 hover:bg-surface-2 hover:text-text"
                    aria-label={`Drill into ${entry.name}`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="w-7" />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-[11px] leading-5 text-muted">
          <strong className="font-semibold text-text">A note on attribution:</strong> every session counts once in an
          aggregate, but a session on a child contributes to every parent above it — and to every goal attached at any
          of those levels. That is intentional inheritance, not double counting.
        </p>
      </div>
    </div>
  );
}
