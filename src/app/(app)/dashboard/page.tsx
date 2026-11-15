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
import { EmptyWorkspace } from "@/components/dashboard/empty-workspace";
import { SessionTable } from "@/components/sessions/session-table";
import { buildTrend, totalSeconds } from "@/lib/analytics";
import { getAppContext, toGoalSummaries, toSessionRows } from "@/lib/dal";
import { aggregateByItem, getSubtreeIds } from "@/lib/items";
import { computeGoalProgress, computeHabitDays, computeStreaks } from "@/lib/goals";
import { getRecentSessions, getSessionsWindow } from "@/lib/queries";
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
    getRecentSessions(user.workspace.id, 6),
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

  const periodOrder: Record<string, number> = { DAILY: 0, WEEKLY: 1, MONTHLY: 2, CUSTOM: 3 };
  const focusGoalItems = [...progresses]
    .sort(
      (a, b) =>
        (periodOrder[a.goal.periodType] ?? 9) - (periodOrder[b.goal.periodType] ?? 9) ||
        b.percent - a.percent,
    )
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

  const goalItemIds = new Set<string>();
  for (const goal of activeGoals) {
    for (const id of getSubtreeIds(items, goal.itemId)) goalItemIds.add(id);
  }
  const goalDirectedSeconds = totalSeconds(
    weekSessions.filter((session) => goalItemIds.has(session.itemId)),
    week.start,
    week.end,
  );
  const goalDirectedPercent = weekSeconds > 0 ? Math.round((goalDirectedSeconds / weekSeconds) * 100) : 0;
  const onTrackCount = progresses.filter((progress) =>
    ["on_track", "completed", "exceeded"].includes(progress.status),
  ).length;

  const weekTrend = buildTrend(sessions, week, tz, weekStartsOn).map((point) => ({
    label: point.label,
    shortLabel: point.shortLabel || point.label,
    seconds: point.seconds,
  }));
  const monthTrend = buildTrend(sessions, month, tz, weekStartsOn).map((point) => {
    const day = Number(point.key.slice(8));
    return {
      label: point.label,
      shortLabel: day === 1 || day % 5 === 0 ? String(day) : "",
      seconds: point.seconds,
    };
  });

  const totals = aggregateByItem(activeItems, weekSessions);
  const goalSubtreeCache = new Map(activeItems.map((item) => [item.id, getSubtreeIds(items, item.id)]));
  const areaNodes = activeItems.map((item) => ({
    id: item.id,
    name: item.name,
    parentId: item.parentId,
    type: item.type,
    icon: item.icon,
    color: item.color,
    seconds: totals.get(item.id) ?? 0,
    goalCount: activeGoals.filter((goal) => goalSubtreeCache.get(item.id)?.has(goal.itemId)).length,
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
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="min-w-0 xl:col-span-2">
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

            <div className="min-w-0">
              <RhythmCard
                weekTrend={weekTrend}
                monthTrend={monthTrend}
                weekTotal={weekSeconds}
                monthTotal={monthSeconds}
                previousWeekTotal={previousWeekSeconds}
                previousMonthTotal={previousMonthSeconds}
                weekLabel={week.label}
                monthLabel={month.label}
              />
            </div>

            <div className="min-w-0">
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold tracking-tight">Areas & projects</h2>
                  </div>
                  <Link href="/workspace" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary">
                    Open projects <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <DashboardAreas nodes={areaNodes} />
              </section>
            </div>
            <div className="min-w-0">
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
            <div className="min-w-0">
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
            <div className="min-w-0">
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-sm font-bold tracking-tight">Recent sessions</h2>
                  <Link href="/history" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary">
                    All history <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <SessionTable
                  sessions={recentRows}
                  timezone={tz}
                  compact
                  emptyState={
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold">Your history starts with one session</p>
                      <p className="mt-1 text-xs text-muted">Start a timer from the header, or add time retrospectively.</p>
                    </div>
                  }
                />
              </section>
            </div>
            <div className="min-w-0">
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

        </>
      )}
    </div>
  );
}

