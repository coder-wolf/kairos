import type { Metadata } from "next";
import { Archive, FolderKanban, Layers, Target, Timer } from "lucide-react";
import { UpgradeBanner } from "@/components/billing/upgrade-banner";
import { WorkspaceHeaderActions } from "@/components/workspace/workspace-header-actions";
import { WorkspaceTree } from "@/components/workspace/workspace-tree";
import { getAppContext } from "@/lib/dal";
import { totalSeconds } from "@/lib/analytics";
import { aggregateByItem, getSubtreeIds } from "@/lib/items";
import { getSessionsWindow } from "@/lib/queries";
import { getDateRange, overlapSeconds } from "@/lib/time";
import { goalTouchesSubtree } from "@/lib/goals";
import type { WorkspaceItem } from "@/lib/types";
import { FREE_ITEM_LIMIT } from "@/lib/plan";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };

export default async function WorkspacePage() {
  const { user, items, goals } = await getAppContext();
  const tz = user.timezone;
  const now = new Date();
  const week = getDateRange("week", tz, user.weekStartsOn, { now });
  const sessions = await getSessionsWindow(user.workspace.id, week.start, week.end);
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  const visibleItems = items.filter((item) => !item.isSystem);

  const totals = aggregateByItem(items, sessions, { start: week.start, end: week.end });
  const direct = new Map<string, number>();
  for (const session of sessions) {
    const seconds = overlapSeconds(session.startTime, session.endTime, week.start, week.end);
    if (seconds > 0) direct.set(session.itemId, (direct.get(session.itemId) ?? 0) + seconds);
  }

  const workspaceItems: WorkspaceItem[] = visibleItems.map((item) => {
    const subtree = getSubtreeIds(items, item.id);
    return {
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      type: item.type,
      description: item.description,
      icon: item.icon,
      color: item.color,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      archivedAt: item.archivedAt ? item.archivedAt.toISOString() : null,
      seconds: totals.get(item.id) ?? 0,
      directSeconds: direct.get(item.id) ?? 0,
      goalCount: activeGoals.filter((goal) => goalTouchesSubtree(goal, subtree)).length,
      childCount: visibleItems.filter((candidate) => candidate.parentId === item.id).length,
    };
  });

  const totalWeek = totalSeconds(sessions, week.start, week.end);
  const activeItems = visibleItems.filter((item) => !item.archivedAt);
  const archivedCount = visibleItems.length - activeItems.length;
  const projectCount = activeItems.filter((item) => item.type === "PROJECT").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">Structure</p>
          <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
            Projects<span className="text-primary">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
            Any structure you can imagine, as deep as you need. Every item can hold time, goals, and history.
          </p>
        </div>
        <WorkspaceHeaderActions />
      </header>

      {!user.isPro && activeItems.length >= FREE_ITEM_LIMIT ? (
        <UpgradeBanner
          message={`You've reached the free plan limit of ${FREE_ITEM_LIMIT} active items. Upgrade to Pro for unlimited projects and goals.`}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
      <WorkspaceTree items={workspaceItems} weekLabel={week.label} />

      <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3 text-[11px] text-muted">
        <Layers className="h-4 w-4 shrink-0 text-primary" />
        Parent totals always include everything beneath them. A session is still only counted once.
      </div>
        </div>

      <aside className="order-first grid grid-cols-2 gap-3 sm:grid-cols-4 xl:order-none xl:sticky xl:top-24 xl:grid-cols-1 xl:self-start">
        {[
          { label: "Items", value: `${activeItems.length}`, sub: `${projectCount} projects`, icon: FolderKanban },
          { label: "Tracked this week", value: formatDuration(totalWeek, { zero: "0m" }), sub: week.label, icon: Timer },
          { label: "Active goals", value: `${activeGoals.length}`, sub: "across the hierarchy", icon: Target },
          { label: "Archived", value: `${archivedCount}`, sub: "history preserved", icon: Archive },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">{stat.label}</p>
              <stat.icon className="h-3.5 w-3.5 text-muted-2" />
            </div>
            <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em]">{stat.value}</p>
            <p className="text-[10px] font-medium text-muted-2">{stat.sub}</p>
          </div>
        ))}
      </aside>
      </div>
    </div>
  );
}
