import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";
import { BarTrendChart } from "@/components/charts";
import { GoalDetailActions } from "@/components/goals/goal-detail-actions";
import { SessionTable } from "@/components/sessions/session-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAppContext, toSessionRows } from "@/lib/dal";
import {
  GOAL_STATUS_META,
  actualSecondsInPeriod,
  computeGoalProgress,
  computeHabitDays,
  computeStreaks,
  dailyTotalsForGoal,
  goalItemIds,
  goalPeriods,
  goalSubtreeIds,
  periodLabelShort,
  periodNoun,
  targetForPeriod,
} from "@/lib/goals";
import { getAncestorPath, getSubtreeIds } from "@/lib/items";
import { getSessionsWindow } from "@/lib/queries";
import { overlapSeconds } from "@/lib/time";
import { cn, formatDuration, pluralize } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { goals } = await getAppContext();
  const goal = goals.find((candidate) => candidate.id === id);
  return {
    title: goal?.name ?? "Goal",
    description: goal ? `Progress, streaks, and analytics for ${goal.name}.` : "Goal analytics in Kairos.",
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function habitCellStyle(day: { complete: boolean; percent: number; inactive: boolean }) {
  if (day.inactive) {
    return {
      backgroundColor: "var(--surface)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--border) 70%, transparent)",
    };
  }
  if (day.complete) {
    const green = day.percent >= 150 ? 100 : day.percent >= 125 ? 84 : day.percent >= 110 ? 70 : 56;
    return {
      backgroundColor: `color-mix(in srgb, var(--success) ${green}%, var(--surface))`,
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--success) 22%, transparent)",
    };
  }
  const grey = day.percent <= 0 ? 16 : day.percent < 34 ? 30 : day.percent < 67 ? 46 : 62;
  return {
    backgroundColor: `color-mix(in srgb, var(--muted) ${grey}%, var(--surface-2))`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--muted) ${Math.max(24, grey)}%, transparent)`,
  };
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">{label}</p>
        <span className="text-muted-2">{icon}</span>
      </div>
      <p className="mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em]">{value}</p>
      {detail ? <div className="mt-2 text-[11px] text-muted">{detail}</div> : null}
    </div>
  );
}

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, items, goals } = await getAppContext();
  const goal = goals.find((candidate) => candidate.id === id);
  if (!goal) notFound();

  const now = new Date();
  const tz = user.timezone;
  const lookback = new Date(Math.max(goal.startDate.getTime(), now.getTime() - 400 * 86_400_000));
  const sessions = await getSessionsWindow(user.workspace.id, lookback, new Date(now.getTime() + 86_400_000));

  const progress = computeGoalProgress(goal, items, sessions, tz, user.weekStartsOn, now);
  const streak = computeStreaks(goal, items, sessions, tz, user.weekStartsOn, now);
  const dailyTotals = dailyTotalsForGoal(goal, items, sessions, tz);
  const habitDays = computeHabitDays(goal, items, sessions, tz, user.weekStartsOn, now, 30);
  const meta = GOAL_STATUS_META[progress.status];
  const color = goal.item?.color ?? "var(--primary)";

  const windowStart = new Date(Math.max(now.getTime() - 30 * 86_400_000, goal.startDate.getTime()));
  const last30Seconds = (() => {
    const subtree = goalSubtreeIds(goal, items);
    let total = 0;
    for (const session of sessions) {
      if (!subtree.has(session.itemId)) continue;
      total += overlapSeconds(session.startTime, session.endTime, windowStart, now);
    }
    return total;
  })();
  const activeDays = habitDays.filter((day) => !day.inactive && day.percent > 0).length;

  const periods =
    goal.periodType === "CUSTOM" ? [] : goalPeriods(goal, tz, user.weekStartsOn, { now, count: 10 });
  const currentTarget = targetForPeriod(goal, progress.period.start);
  const periodData = periods.map((period) => {
    const actual = actualSecondsInPeriod(dailyTotals, period);
    const shortLabel =
      goal.periodType === "MONTHLY"
        ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(
            new Date(`${period.startKey}T12:00:00Z`),
          )
        : new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
            new Date(`${period.startKey}T12:00:00Z`),
          );
    return { label: period.label, shortLabel, seconds: actual };
  });

  const linked = goalItemIds(goal);
  const linkedSubtrees = linked.map((itemId) => ({ itemId, subtree: getSubtreeIds(items, itemId) }));
  const projectTotals = new Map<string, number>();
  for (const session of sessions) {
    if (session.endTime <= windowStart || session.startTime >= now) continue;
    const match = linkedSubtrees.find((entry) => entry.subtree.has(session.itemId));
    if (!match) continue;
    const seconds = overlapSeconds(session.startTime, session.endTime, windowStart, now);
    projectTotals.set(match.itemId, (projectTotals.get(match.itemId) ?? 0) + seconds);
  }
  const projectRows = linked
    .map((itemId) => {
      const item = items.find((candidate) => candidate.id === itemId);
      return {
        id: itemId,
        name: getAncestorPath(items, itemId).map((entry) => entry.name).join(" / ") || "Unknown project",
        color: item?.color ?? "var(--primary)",
        seconds: projectTotals.get(itemId) ?? 0,
      };
    })
    .sort((a, b) => b.seconds - a.seconds);
  const projectMax = Math.max(1, ...projectRows.map((row) => row.seconds));

  const subtree = goalSubtreeIds(goal, items);
  const recentRows = toSessionRows(
    sessions
      .filter((session) => subtree.has(session.itemId) && session.startTime >= windowStart)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 6),
    items,
  );

  const projectPath =
    linked
      .map((itemId) => getAncestorPath(items, itemId).map((entry) => entry.name).join(" / "))
      .filter(Boolean)
      .join(" · ") || "No project linked";
  const schedule = goal.daysOfWeek.length > 0 ? goal.daysOfWeek.map((day) => DAY_NAMES[day]) : [];
  const startLabel = formatInTimeZone(goal.startDate, tz, "MMM d, yyyy");
  const endLabel = goal.endDate ? formatInTimeZone(goal.endDate, tz, "MMM d, yyyy") : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/goals" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> All goals
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            <Target className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-extrabold tracking-[-0.04em] md:text-[32px]">{goal.name}</h1>
              <Badge tone={meta.tone as "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "primary"}>
                {goal.status === "PAUSED" ? "Paused" : meta.label}
              </Badge>
            </div>
            <p className="mt-1 text-[12px] text-muted">
              {projectPath} · {formatDuration(currentTarget)} {periodLabelShort(goal)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-2">
              Started {startLabel}
              {endLabel ? ` · Ends ${endLabel}` : ""}
              {schedule.length > 0 ? ` · ${schedule.join(", ")}` : ""}
            </p>
          </div>
        </div>
        <GoalDetailActions goalId={goal.id} />
      </header>

      <section className="card p-5" aria-label="Current period progress">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">
              Current {periodNoun(goal)} · {progress.periodLabel}
            </p>
            <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em]">
              {formatDuration(progress.actualSeconds)}{" "}
              <span className="text-[13px] font-semibold text-muted">of {formatDuration(progress.targetSeconds)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[24px] font-extrabold tracking-[-0.04em]" style={{ color }}>
              {Math.round(progress.percent)}%
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">{meta.label}</p>
          </div>
        </div>
        <Progress value={progress.percent} color={color} height={10} className="mt-3" />
        <p className="mt-2 text-[11px] text-muted">
          {progress.remainingSeconds > 0
            ? `${formatDuration(progress.remainingSeconds)} remaining`
            : `${formatDuration(progress.actualSeconds - progress.targetSeconds)} over target`}
          {" · "}
          Pace {Math.round(progress.pace * 100)}% of elapsed {periodNoun(goal)}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Clock3 className="h-4 w-4" />}
          label={`This ${periodNoun(goal)}`}
          value={formatDuration(progress.actualSeconds)}
          detail={`Target ${formatDuration(progress.targetSeconds)}`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Remaining"
          value={progress.remainingSeconds > 0 ? formatDuration(progress.remainingSeconds) : "Done"}
          detail={`${Math.round(progress.percent)}% complete`}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={`${streak.current} ${pluralize(streak.current, periodNoun(goal))}`}
          detail={`Longest ${streak.longest} · ${Math.round(streak.consistency * 100)}% consistency`}
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Last 30 days"
          value={formatDuration(last30Seconds)}
          detail={`${activeDays} active ${pluralize(activeDays, "day")}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden" aria-label="Progress by period">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Progress by {periodNoun(goal)}</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {goal.periodType === "CUSTOM"
                ? "Custom goals report on their full window."
                : `Last ${periodData.length} ${pluralize(periodData.length, periodNoun(goal))} · dashed line is the target`}
            </p>
          </div>
          <div className="px-2 pb-3 pt-5 sm:px-4">
            {periodData.length > 1 ? (
              <BarTrendChart
                data={periodData}
                height={240}
                color={color}
                referenceY={currentTarget}
                referenceLabel={formatDuration(currentTarget)}
              />
            ) : (
              <div className="flex h-[240px] flex-col items-center justify-center px-6 text-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <p className="mt-2 text-sm font-semibold">{formatDuration(progress.actualSeconds)} tracked</p>
                <p className="mt-1 max-w-xs text-[11px] text-muted">
                  This custom goal runs until {endLabel ?? "you end it"}. Progress updates as any linked project records time.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden" aria-label="Recent daily history">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-bold tracking-tight">Recent days</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">Last 30 days · darker green means further past target</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-10 gap-1.5">
              {habitDays.map((day) => (
                <span
                  key={day.dayKey}
                  title={`${day.label}${day.inactive ? " · outside goal" : ` · ${Math.round(day.percent)}%`}`}
                  className={cn("aspect-square rounded-[3px]", day.isCurrent && "ring-1 ring-primary ring-offset-1 ring-offset-surface")}
                  style={habitCellStyle(day)}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-2">
              <span>30 days ago</span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--muted) 16%, var(--surface-2))" }} />
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--muted) 46%, var(--surface-2))" }} />
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--success) 56%, var(--surface))" }} />
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--success) 84%, var(--surface))" }} />
              </span>
              <span>Today</span>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Current</dt>
                <dd className="mt-1 text-[18px] font-extrabold">{streak.current}</dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Longest</dt>
                <dd className="mt-1 text-[18px] font-extrabold">{streak.longest}</dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Hit rate</dt>
                <dd className="mt-1 text-[18px] font-extrabold">{Math.round(streak.consistency * 100)}%</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card overflow-hidden" aria-label="Time by project">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold tracking-tight">Where the time comes from</h2>
            <p className="mt-0.5 text-[11px] text-muted">Linked projects · last 30 days</p>
          </div>
          <div className="space-y-3 p-5">
            {projectRows.map((row) => (
              <div key={row.id}>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate font-semibold">{row.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-muted">{formatDuration(row.seconds)}</span>
                </div>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(2, (row.seconds / projectMax) * 100)}%`, background: row.color }}
                  />
                </span>
              </div>
            ))}
            {projectRows.every((row) => row.seconds === 0) ? (
              <p className="text-[11px] text-muted">No time tracked in the linked projects in the last 30 days.</p>
            ) : null}
          </div>
        </section>

        <section className="card overflow-hidden" aria-label="Recent sessions">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Recent sessions</h2>
              <p className="mt-0.5 text-[11px] text-muted">Latest entries that count toward this goal</p>
            </div>
            <Link href={`/items/${goal.itemId}`} className="text-[11px] font-bold text-muted hover:text-primary">
              Open project
            </Link>
          </div>
          <SessionTable
            sessions={recentRows}
            timezone={tz}
            compact
            emptyState={<p className="px-5 py-10 text-center text-xs text-muted">No sessions in the last 30 days.</p>}
          />
        </section>
      </div>
    </div>
  );
}
