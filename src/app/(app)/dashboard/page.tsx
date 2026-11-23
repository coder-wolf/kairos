import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  Plus,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { DashboardAreas } from "@/components/dashboard/dashboard-areas";
import { FocusGoals } from "@/components/dashboard/focus-goals";
import { HabitHistoryGrid } from "@/components/dashboard/habit-history-grid";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { RhythmCard } from "@/components/dashboard/rhythm-card";
import { RecentSessionsCard } from "@/components/dashboard/recent-sessions-card";
import { EmptyWorkspace } from "@/components/dashboard/empty-workspace";
import { buildStackedSeries, totalSeconds } from "@/lib/analytics";
import { getAppContext, toGoalSummaries, toSessionRows } from "@/lib/dal";
import { aggregateDirectByItem, getSubtreeIds } from "@/lib/items";
import { computeGoalProgress, computeHabitDays, computeStreaks, goalItemIds, goalTouchesSubtree } from "@/lib/goals";
import { getRecentSessions, getSessionsWindow } from "@/lib/queries";
import { db } from "@/lib/db";
import { getDateRange } from "@/lib/time";
import { formatDuration, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) {
    return <span className="text-[11px] font-medium text-muted-2">A fresh start</span>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-[11px] font-medium text-muted-2">Same as before</span>;
  const up = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${up ? "text-success" : "text-warning"}`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change)}% vs previous
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  children,
  accent = "var(--primary)",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-(--shadow-card)">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">{label}</p>
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: `${accent}14`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em]">{value}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const { user, items, goals: contextGoals, timer } = await getAppContext();
  const tz = user.timezone;
  const weekStartsOn = user.weekStartsOn;
  const now = new Date();

  const today = getDateRange("today", tz, weekStartsOn, { now });
  const yesterday = getDateRange("yesterday", tz, weekStartsOn, { now });
  const week = getDateRange("week", tz, weekStartsOn, { now });
  const month = getDateRange("month", tz, weekStartsOn, { now });
  const activeItems = items.filter((item) => !item.archivedAt && !item.isSystem);
  const activeGoals = contextGoals.filter((goal) => goal.status === "ACTIVE");

  const earliestGoal = activeGoals.length
    ? new Date(Math.min(...activeGoals.map((goal) => goal.startDate.getTime())))
    : week.prevStart;
  const lookbackStart = new Date(Math.max(earliestGoal.getTime(), now.getTime() - 400 * 86_400_000));

  const [sessions, recent] = await Promise.all([
    getSessionsWindow(
      user.workspace.id,
      new Date(Math.min(week.prevStart.getTime(), month.prevStart.getTime(), lookbackStart.getTime())),
      today.end,
    ),
    getRecentSessions(user.workspace.id, 20),
  ]);

  const todaySeconds = totalSeconds(sessions, today.start, today.end);
  const yesterdaySeconds = totalSeconds(sessions, yesterday.start, yesterday.end);
  const weekSeconds = totalSeconds(sessions, week.start, week.end);
  const previousWeekSeconds = totalSeconds(sessions, week.prevStart, week.prevEnd);
  const monthSeconds = totalSeconds(sessions, month.start, month.end);
  const previousMonthSeconds = totalSeconds(sessions, month.prevStart, month.prevEnd);

  const weekSessions = sessions.filter(
    (session) => session.startTime < week.end && session.endTime > week.start,
  );

  const progresses = activeGoals.map((goal) =>
    computeGoalProgress(goal, items, sessions, tz, weekStartsOn, now),
  );

  const habitGoals = activeGoals
    .filter((goal) => goal.periodType === "DAILY" || goal.periodType === "WEEKLY")
    .map((goal) => ({
      goal,
      streak: computeStreaks(goal, items, sessions, tz, weekStartsOn, now),
      days: computeHabitDays(goal, items, sessions, tz, weekStartsOn, now, 24),
    }))
    .sort((a, b) => b.streak.current - a.streak.current || b.streak.consistency - a.streak.consistency);

  const focusGoalItems = [...progresses]
    .sort((a, b) => a.goal.name.localeCompare(b.goal.name, undefined, { sensitivity: "base" }))
    .map((progress) => ({
      goal: toGoalSummaries([progress.goal])[0],
      actualSeconds: progress.actualSeconds,
      targetSeconds: progress.targetSeconds,
      percent: progress.percent,
      status: progress.status,
      streak: habitGoals.find((entry) => entry.goal.id === progress.goal.id)?.streak,
    }));

  const topStreak = habitGoals[0]?.streak.current ?? 0;
  const bestStreak = habitGoals.reduce((acc, entry) => Math.max(acc, entry.streak.longest), 0);

  const goalItemIdSet = new Set<string>();
  for (const goal of activeGoals) {
    for (const goalItemId of goalItemIds(goal)) {
      for (const id of getSubtreeIds(items, goalItemId)) goalItemIdSet.add(id);
    }
  }
  const goalDirectedSeconds = totalSeconds(
    weekSessions.filter((session) => goalItemIdSet.has(session.itemId)),
    week.start,
    week.end,
  );
  const goalDirectedPercent = weekSeconds > 0 ? Math.round((goalDirectedSeconds / weekSeconds) * 100) : 0;
  const onTrackCount = progresses.filter((progress) =>
    ["on_track", "completed", "exceeded"].includes(progress.status),
  ).length;

  const breakdownPalette = [
    "var(--primary)",
    "var(--accent)",
    "var(--success)",
    "var(--warning)",
    "var(--info)",
    "var(--danger)",
  ];
  const itemById = new Map(items.map((item) => [item.id, item] as const));
  const buildBreakdown = (
    range: typeof week,
    shortLabelFor: (point: { key: string; label: string; shortLabel?: string }) => string,
  ) => {
    const stacked = buildStackedSeries(sessions, range, tz, (itemId) => itemId);
    const totals = new Map<string, number>();
    for (const point of stacked) {
      for (const [key, value] of Object.entries(point)) {
        if (key === "seconds" || typeof value !== "number") continue;
        totals.set(key, (totals.get(key) ?? 0) + value);
      }
    }
    const isSystemGroup = (id: string) => itemById.get(id)?.isSystem === true;
    const ranked = [...totals.entries()]
      .filter(([, seconds]) => seconds > 0)
      .sort((a, b) => Number(isSystemGroup(a[0])) - Number(isSystemGroup(b[0])) || b[1] - a[1]);
    const visible = ranked.slice(0, 6);
    const series = visible.map(([id, total], index) => {
      const item = itemById.get(id);
      return {
        id,
        name: item ? (item.isSystem ? "No project" : item.name) : "Untitled",
        color: item?.color ?? breakdownPalette[index % breakdownPalette.length],
        total,
      };
    });
    if (ranked.length > visible.length) {
      series.push({
        id: "__other__",
        name: "Other",
        color: "var(--muted)",
        total: ranked.slice(visible.length).reduce((sum, [, seconds]) => sum + seconds, 0),
      });
    }
    const allowed = new Set(series.map((entry) => entry.id));
    const points = stacked.map((point) => {
      const segments: Record<string, number> = {};
      for (const entry of series) segments[entry.id] = 0;
      for (const [key, value] of Object.entries(point)) {
        if (key === "seconds" || typeof value !== "number") continue;
        const id = allowed.has(key) ? key : "__other__";
        segments[id] = (segments[id] ?? 0) + value;
      }
      return {
        label: point.label,
        shortLabel: shortLabelFor(point),
        seconds: point.seconds,
        segments,
      };
    });
    return { points, series };
  };

  const weekBreakdown = buildBreakdown(week, (point) => point.shortLabel || point.label);
  const monthBreakdown = buildBreakdown(month, (point) => {
    const day = Number(point.key.slice(8));
    return day === 1 || day % 5 === 0 ? String(day) : "";
  });

  const lifetimeTotals = await db.timeSession.groupBy({
    by: ["itemId"],
    where: { workspaceId: user.workspace.id },
    _sum: { durationSeconds: true },
  });
  const totals = aggregateDirectByItem(
    items,
    new Map(lifetimeTotals.map((row) => [row.itemId, row._sum.durationSeconds ?? 0])),
  );
  const goalSubtreeCache = new Map(activeItems.map((item) => [item.id, getSubtreeIds(items, item.id)]));
  const areaNodes = activeItems.map((item) => ({
    id: item.id,
    name: item.name,
    parentId: item.parentId,
    type: item.type,
    icon: item.icon,
    color: item.color,
    sortOrder: item.sortOrder,
    seconds: totals.get(item.id) ?? 0,
    goalCount: activeGoals.filter((goal) => goalTouchesSubtree(goal, goalSubtreeCache.get(item.id) ?? new Set())).length,
    childCount: activeItems.filter((candidate) => candidate.parentId === item.id).length,
  }));

  const recentRows = toSessionRows(recent, items);
  const hour = Number(formatInTimeZone(now, tz, "H"));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">{dateLabel}</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
            {greeting}, {user.name.split(" ")[0]}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {timer
              ? `You're tracking ${timer.itemName} right now. Everything else can wait.`
              : "A quiet look at where your time is going."}
          </p>
        </div>
        <DashboardQuickActions />
      </header>

      {activeItems.length === 0 ? (
        <>
          <EmptyWorkspace />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Timer,
                title: "Track without friction",
                body: "One timer, anywhere. Pause, switch, and come back hours later — the backend keeps the truth.",
              },
              {
                icon: Target,
                title: "Goals with depth",
                body: "Attach daily, weekly, or custom targets to any item. Parent and child goals never fight each other.",
              },
              {
                icon: BarChart3,
                title: "See the shape of it",
                body: "Distribution, trends, streaks, and weekday patterns that help you protect what matters.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border bg-surface p-5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <feature.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold">{feature.title}</h3>
                <p className="mt-1 text-[12px] leading-5 text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-5 xl:grid xl:grid-cols-2 xl:items-start">
            <div className="hidden min-w-0 xl:col-span-2 xl:block">
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <StatCard label="Today" value={formatDuration(todaySeconds, { zero: "0m" })} icon={<Clock3 className="h-4 w-4" />}>
              <Delta current={todaySeconds} previous={yesterdaySeconds} />
            </StatCard>
            <StatCard
              label="This week"
              value={formatDuration(weekSeconds, { zero: "0m" })}
              icon={<CalendarDays className="h-4 w-4" />}
              accent="var(--accent)"
            >
              <Delta current={weekSeconds} previous={previousWeekSeconds} />
            </StatCard>
            <StatCard
              label="Goal-directed"
              value={`${goalDirectedPercent}%`}
              icon={<Target className="h-4 w-4" />}
              accent="var(--success)"
            >
              <span className="text-[11px] font-medium text-muted">
                {formatDuration(goalDirectedSeconds)} this week · {onTrackCount}/{activeGoals.length} on track
              </span>
            </StatCard>
            <StatCard
              label="Best streak"
              value={`${bestStreak}`}
              icon={<Flame className="h-4 w-4" />}
              accent="var(--warning)"
            >
              <span className="text-[11px] font-medium text-muted">
                {topStreak > 0 ? `${topStreak} ${pluralize(topStreak, "period")} current run` : "Start one today"}
              </span>
            </StatCard>
          </div>
            </div>

            <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
            <div className="order-1 min-w-0 xl:order-none">
              <RhythmCard
                weekTrend={weekBreakdown.points}
                monthTrend={monthBreakdown.points}
                weekSeries={weekBreakdown.series}
                monthSeries={monthBreakdown.series}
                weekTotal={weekSeconds}
                monthTotal={monthSeconds}
                previousWeekTotal={previousWeekSeconds}
                previousMonthTotal={previousMonthSeconds}
                weekLabel={week.label}
                monthLabel={month.label}
              />
            </div>
            <div className="order-3 min-w-0 xl:order-none">
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">Today&apos;s focus</h2>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-2">
                      {activeGoals.length} active · {onTrackCount} on track
                    </p>
                  </div>
                  <Link href="/goals" className="text-[11px] font-bold text-muted hover:text-primary">
                    All goals
                  </Link>
                </div>
                <FocusGoals items={focusGoalItems} />
              </section>
            </div>
            <div className="order-5 min-w-0 xl:order-none">
              <RecentSessionsCard sessions={recentRows} timezone={tz} />
            </div>
            </div>

            <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
            <div className="order-2 min-w-0 xl:order-none">
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">Areas & projects</h2>
                      <p className="text-[10px] text-muted-2">All-time tracked per area</p>
                    </div>
                  </div>
                  <Link href="/workspace" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary">
                    Open projects <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <DashboardAreas nodes={areaNodes} />
              </section>
            </div>
            <div className="order-4 min-w-0 xl:order-none">
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-warning" />
                    <h2 className="text-sm font-bold tracking-tight">Habit streaks</h2>
                  </div>
                  <Link href="/goals" className="text-[11px] font-bold text-muted hover:text-primary">
                    Review
                  </Link>
                </div>
                <HabitHistoryGrid entries={habitGoals} />
              </section>
            </div>
            <div className="order-6 min-w-0 xl:order-none">
              <section className="card p-4">
                <h2 className="text-sm font-bold tracking-tight">Quick actions</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/workspace"
                    className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[12px] font-semibold text-text transition-colors hover:bg-surface-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Projects
                  </Link>
                  <Link
                    href="/analytics"
                    className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[12px] font-semibold text-text transition-colors hover:bg-surface-2"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Analytics
                  </Link>
                  <Link
                    href="/goals"
                    className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[12px] font-semibold text-text transition-colors hover:bg-surface-2"
                  >
                    <Target className="h-3.5 w-3.5" /> Goals
                  </Link>
                  <Link
                    href="/history"
                    className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-[12px] font-semibold text-text transition-colors hover:bg-surface-2"
                  >
                    <Clock3 className="h-3.5 w-3.5" /> History
                  </Link>
                </div>
              </section>
            </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

