import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  History,
  Layers,
  Target,
  TrendingUp,
} from "lucide-react";
import { AreaTrendChart, DistributionDonut } from "@/components/charts";
import { GoalCard } from "@/components/goals/goal-card";
import { NewGoalButton } from "@/components/goals/new-goal-button";
import { ItemActions } from "@/components/item/item-actions";
import { ItemChildren, type ChildRow } from "@/components/item/item-children";
import { SessionList } from "@/components/sessions/session-list";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buildTrend, totalSeconds } from "@/lib/analytics";
import { getAppContext, toGoalSummaries, toItemOptions, toSessionRows } from "@/lib/dal";
import { db } from "@/lib/db";
import { aggregateByItem, getAncestorPath, getSubtreeIds } from "@/lib/items";
import { computeGoalProgress, computeStreaks, goalItemIds } from "@/lib/goals";
import { getSessionsWindow } from "@/lib/queries";
import { addDaysToKey, getDateRange, overlapSeconds, toDateKey } from "@/lib/time";
import { formatDuration, paletteColor, pluralize } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { items } = await getAppContext();
  const item = items.find((candidate) => candidate.id === id);
  return { title: item ? item.name : "Item" };
}

function typeLabel(type: string | null) {
  if (type === "AREA") return "Area";
  if (type === "PROJECT") return "Project";
  if (type === "CUSTOM") return "Custom";
  return "Unclassified";
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, items, goals } = await getAppContext();
  const item = items.find((candidate) => candidate.id === id);
  if (!item) notFound();

  const tz = user.timezone;
  const now = new Date();
  const today = getDateRange("today", tz, user.weekStartsOn, { now });
  const week = getDateRange("week", tz, user.weekStartsOn, { now });
  const todayKey = toDateKey(now, tz);
  const range30 = getDateRange("custom", tz, user.weekStartsOn, {
    from: addDaysToKey(todayKey, -29),
    to: todayKey,
    now,
  });

  const path = getAncestorPath(items, item.id);
  const ancestors = path.slice(0, -1);
  const ancestorIds = new Set(ancestors.map((ancestor) => ancestor.id));
  const subtree = getSubtreeIds(items, item.id);

  const directGoals = goals.filter((goal) => goalItemIds(goal).includes(item.id) && goal.status !== "ARCHIVED");
  const inheritedGoals = goals.filter(
    (goal) => goal.status === "ACTIVE" && goalItemIds(goal).some((id) => ancestorIds.has(id)),
  );

  const relevantGoals = [...directGoals, ...inheritedGoals];
  const lookbackStart = relevantGoals.length
    ? new Date(Math.min(...relevantGoals.map((goal) => goal.startDate.getTime())))
    : new Date(now.getTime() - 120 * 86_400_000);

  const queryStart = new Date(
    Math.min(week.prevStart.getTime(), range30.start.getTime(), lookbackStart.getTime()),
  );

  const [sessions, recent, allTime] = await Promise.all([
    getSessionsWindow(user.workspace.id, queryStart, today.end),
    db.timeSession.findMany({
      where: { workspaceId: user.workspace.id, itemId: { in: Array.from(subtree) } },
      orderBy: { startTime: "desc" },
      take: 8,
      include: { item: true },
    }),
    db.timeSession.aggregate({
      where: { workspaceId: user.workspace.id, itemId: { in: Array.from(subtree) } },
      _sum: { durationSeconds: true },
    }),
  ]);

  const totalsWeek = aggregateByItem(items, sessions, { start: week.start, end: week.end });
  const totals30 = aggregateByItem(items, sessions, { start: range30.start, end: range30.end });
  const todaySeconds = totalSeconds(sessions, today.start, today.end);
  const weekSeconds = totalsWeek.get(item.id) ?? 0;
  const allTimeSeconds = allTime._sum.durationSeconds ?? 0;

  const direct30 = sessions.reduce((acc, session) => {
    if (session.itemId !== item.id) return acc;
    return acc + overlapSeconds(session.startTime, session.endTime, range30.start, range30.end);
  }, 0);

  const children = items
    .filter((candidate) => candidate.parentId === item.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  const childRows: ChildRow[] = children.map((child) => {
    const childSubtree = getSubtreeIds(items, child.id);
    return {
      id: child.id,
      name: child.name,
      icon: child.icon,
      color: child.color,
      type: child.type,
      seconds: totalsWeek.get(child.id) ?? 0,
      goalCount: activeGoals.filter((goal) => goalItemIds(goal).some((id) => childSubtree.has(id))).length,
      descendantCount: childSubtree.size - 1,
    };
  });

  const distribution = [
    ...children.map((child, index) => ({
      name: child.name,
      value: totals30.get(child.id) ?? 0,
      color: child.color ?? paletteColor(index),
      href: `/items/${child.id}`,
    })),
    ...(direct30 > 0
      ? [{ name: `Direct on ${item.name}`, value: direct30, color: "var(--muted-2)", href: null }]
      : []),
  ].filter((entry) => entry.value > 0);

  const distributionTotal = distribution.reduce((acc, entry) => acc + entry.value, 0);
  const trend = buildTrend(sessions, range30, tz, user.weekStartsOn);
  const recentRows = toSessionRows(recent, items);
  const itemOptions = toItemOptions(items);

  const goalsWithProgress = directGoals.map((goal) => ({
    goal,
    progress: computeGoalProgress(goal, items, sessions, tz, user.weekStartsOn, now),
  }));

  const inheritedWithProgress = inheritedGoals.map((goal) => ({
    goal,
    progress: computeGoalProgress(goal, items, sessions, tz, user.weekStartsOn, now),
  }));

  const streakByGoal = new Map(
    directGoals
      .filter((goal) => goal.periodType === "DAILY" || goal.periodType === "WEEKLY")
      .map((goal) => [goal.id, computeStreaks(goal, items, sessions, tz, user.weekStartsOn, now)]),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <nav className="flex flex-wrap items-center gap-1 text-[11px] font-medium text-muted">
        <Link href="/workspace" className="hover:text-primary">
          Projects
        </Link>
        {ancestors.map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-2" />
            <Link href={`/items/${ancestor.id}`} className="hover:text-primary">
              {ancestor.name}
            </Link>
          </span>
        ))}
        <ChevronRight className="h-3 w-3 text-muted-2" />
        <span className="font-semibold text-text">{item.name}</span>
      </nav>

      <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl"
            style={{ background: `${item.color ?? "#6366f1"}14`, color: item.color ?? "#6366f1" }}
          >
            {item.icon ?? "•"}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.type === "AREA" ? "primary" : item.type === "PROJECT" ? "info" : "neutral"}>
                {typeLabel(item.type)}
              </Badge>
              {item.archivedAt ? <Badge tone="warning">Archived</Badge> : null}
              {directGoals.length > 0 ? <Badge tone="accent">{directGoals.length} goals</Badge> : null}
            </div>
            <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
              {item.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              {item.description || "No description yet. Add one to remember what this item is really for."}
            </p>
          </div>
        </div>
        <ItemActions item={toItemOptions([item])[0]} items={itemOptions} />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Today", value: formatDuration(todaySeconds, { zero: "0m" }), icon: Clock3 },
          { label: "This week", value: formatDuration(weekSeconds, { zero: "0m" }), icon: CalendarDays },
          { label: "All time", value: formatDuration(allTimeSeconds, { zero: "0m" }), icon: History },
          {
            label: "Sub-items",
            value: String(Math.max(0, subtree.size - 1)),
            icon: Layers,
            sub: `${activeGoals.filter((goal) => goalItemIds(goal).some((id) => subtree.has(id))).length} goals inside`,
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">{stat.label}</p>
              <stat.icon className="h-3.5 w-3.5 text-muted-2" />
            </div>
            <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em]">{stat.value}</p>
            {stat.sub ? <p className="text-[10px] font-medium text-muted-2">{stat.sub}</p> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold tracking-tight">Goals</h2>
                </div>
                <p className="text-[11px] text-muted">
                  Independent targets attached directly to this item.
                </p>
              </div>
              <NewGoalButton itemId={item.id} label="Add goal" size="sm" className="h-8" />
            </div>
            <div className="space-y-3 p-3">
              {goalsWithProgress.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Target className="mx-auto h-6 w-6 text-muted-2" />
                  <p className="mt-2 text-[13px] font-semibold">No goals on this item yet</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Add a target to turn intention into something measurable.
                  </p>
                </div>
              ) : (
                goalsWithProgress.map(({ goal, progress }) => (
                  <GoalCard
                    key={goal.id}
                    goal={toGoalSummaries([goal])[0]}
                    progress={{
                      actualSeconds: progress.actualSeconds,
                      targetSeconds: progress.targetSeconds,
                      percent: progress.percent,
                      remainingSeconds: progress.remainingSeconds,
                      status: progress.status,
                      periodLabel: progress.periodLabel,
                      timeRemainingSeconds: progress.timeRemainingSeconds,
                    }}
                    streak={streakByGoal.get(goal.id)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold tracking-tight">Last 30 days</h2>
                </div>
                <p className="text-[11px] text-muted">Daily time attributed to this item and its descendants.</p>
              </div>
              <p className="text-lg font-extrabold tracking-[-0.03em]">
                {formatDuration(totals30.get(item.id) ?? 0)}
              </p>
            </div>
            <div className="px-2 pb-3 pt-4 sm:px-4">
              <AreaTrendChart data={trend} height={200} />
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold tracking-tight">Child items</h2>
              <span className="text-[11px] text-muted">{childRows.length} direct</span>
            </div>
            <ItemChildren itemId={item.id} rows={childRows} />
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight">Recent sessions</h2>
                <p className="text-[11px] text-muted">Across this item and everything inside it.</p>
              </div>
              <Link href="/history" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary">
                All history <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <SessionList
              sessions={recentRows}
              items={itemOptions}
              timezone={tz}
              todayKey={todayKey}
              showPath
              emptyState={
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-semibold">No sessions yet</p>
                  <p className="mt-1 text-xs text-muted">Start a timer or add time manually to build this item&apos;s history.</p>
                </div>
              }
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold tracking-tight">Distribution</h2>
              <p className="text-[11px] text-muted">Last 30 days · {formatDuration(distributionTotal)} total</p>
            </div>
            {distribution.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-muted">No time in the last 30 days.</p>
            ) : (
              <>
                <DistributionDonut
                  data={distribution.map(({ name, value, color }) => ({ name, value, color }))}
                  centerValue={formatDuration(distributionTotal)}
                  centerLabel="30 days"
                />
                <div className="space-y-2 border-t border-border p-4">
                  {distribution.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
                      {entry.href ? (
                        <Link href={entry.href} className="min-w-0 flex-1 truncate text-[11px] font-semibold hover:text-primary">
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

          {inheritedWithProgress.length > 0 ? (
            <section className="card overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-bold tracking-tight">This time also counts toward</h2>
                <p className="text-[11px] text-muted">Parent goals are independent, but they include descendants.</p>
              </div>
              <div className="space-y-4 p-4">
                {inheritedWithProgress.map(({ goal, progress }) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/items/${goal.itemId}`} className="truncate text-[12px] font-semibold hover:text-primary">
                        {goal.name}
                      </Link>
                      <span className="text-[11px] font-bold tabular-nums">{Math.round(progress.percent)}%</span>
                    </div>
                    <Progress
                      value={progress.percent}
                      height={5}
                      className="mt-1.5"
                      color={progress.status === "at_risk" ? "var(--warning)" : "var(--success)"}
                    />
                    <p className="mt-1 text-[10px] text-muted-2">
                      {formatDuration(progress.actualSeconds)} of {formatDuration(progress.targetSeconds)} ·{" "}
                      {progress.periodLabel}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold tracking-tight">Details</h2>
            </div>
            <dl className="divide-y divide-border text-[12px]">
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Parent</dt>
                <dd className="font-semibold">
                  {item.parentId ? (
                    <Link href={`/items/${item.parentId}`} className="hover:text-primary">
                      {ancestors[ancestors.length - 1]?.name ?? "Parent"}
                    </Link>
                  ) : (
                    "Top level"
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Type</dt>
                <dd className="font-semibold">{typeLabel(item.type)}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Descendants</dt>
                <dd className="font-semibold">{Math.max(0, subtree.size - 1)}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Active goals inside</dt>
                <dd className="font-semibold">{activeGoals.filter((goal) => goalItemIds(goal).some((id) => subtree.has(id))).length}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Created</dt>
                <dd className="font-semibold">
                  {new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(item.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Sessions</dt>
                <dd className="font-semibold">{recentRows.length >= 8 ? "8+" : recentRows.length}</dd>
              </div>
            </dl>
            <div className="border-t border-border p-4">
              <Link
                href={`/analytics?item=${item.id}`}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-[12px] font-semibold transition-colors hover:bg-surface-3"
              >
                Open item analytics
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          {directGoals.some((goal) => goal.periodType === "DAILY" || goal.periodType === "WEEKLY") ? (
            <section className="card p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-bold tracking-tight">Consistency</h2>
              </div>
              <div className="mt-3 space-y-3">
                {directGoals
                  .filter((goal) => goal.periodType === "DAILY" || goal.periodType === "WEEKLY")
                  .map((goal) => {
                    const streak = streakByGoal.get(goal.id);
                    if (!streak) return null;
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between">
                          <p className="truncate text-[11px] font-semibold">{goal.name}</p>
                          <p className="text-[11px] font-bold text-warning">{streak.current} current</p>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {streak.longest} best · {Math.round(streak.consistency * 100)}% consistency ·{" "}
                          {streak.completed} {pluralize(streak.completed, "period")} completed
                        </p>
                      </div>
                    );
                  })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
