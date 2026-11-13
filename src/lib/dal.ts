import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Goal, Item, TimerState } from "@prisma/client";
import { db } from "./db";
import { getSession } from "./session";
import type { GoalSummary, ItemOption, SessionRow, TimerSnapshot, UserSummary } from "./types";
import { getAncestorPath } from "./items";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  return { userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { workspace: true },
  });
  if (!user?.workspace) redirect("/login");
  return user;
});

export type AppContext = {
  user: UserSummary;
  items: Item[];
  goals: Array<Goal & { item: Item }>;
  timer: TimerSnapshot | null;
};

export function toUserSummary(user: {
  id: string;
  name: string;
  email: string;
  timezone: string;
  weekStartsOn: number;
  theme: string;
  workspace: { id: string; name: string; icon: string | null };
}): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    weekStartsOn: user.weekStartsOn,
    theme: user.theme,
    workspace: {
      id: user.workspace.id,
      name: user.workspace.name,
      icon: user.workspace.icon,
    },
  };
}

export function toTimerSnapshot(
  timer: (TimerState & { item: Item }) | null,
  now = new Date(),
): TimerSnapshot | null {
  if (!timer) return null;
  const runningSeconds =
    timer.status === "RUNNING" ? Math.max(0, (now.getTime() - timer.startedAt.getTime()) / 1000) : 0;
  return {
    id: timer.id,
    itemId: timer.itemId,
    itemName: timer.item.isSystem ? "Unassigned" : timer.item.name,
    itemColor: timer.item.color,
    isUnassigned: timer.item.isSystem,
    status: timer.status,
    startedAt: timer.startedAt.toISOString(),
    accumulatedSeconds: timer.accumulatedSeconds,
    elapsedSeconds: Math.round(timer.accumulatedSeconds + runningSeconds),
    description: timer.description,
    source: timer.source,
  };
}

export const getAppContext = cache(async (): Promise<AppContext> => {
  const user = await getCurrentUser();
  const workspace = user.workspace!;

  const [items, goals, timer] = await Promise.all([
    db.item.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.goal.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }],
      include: { item: true },
    }),
    db.timerState.findUnique({
      where: { userId: user.id },
      include: { item: true },
    }),
  ]);

  return {
    user: toUserSummary({ ...user, workspace }),
    items,
    goals,
    timer: toTimerSnapshot(timer),
  };
});

export function toItemOptions(items: Item[]): ItemOption[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    parentId: item.parentId,
    type: item.type,
    color: item.color,
    description: item.description,
    icon: item.icon,
    isSystem: item.isSystem,
    archivedAt: item.archivedAt ? item.archivedAt.toISOString() : null,
  }));
}

export function toGoalSummaries(goals: (Goal & { item: Item })[]): GoalSummary[] {
  return goals.map((goal) => ({
    id: goal.id,
    itemId: goal.itemId,
    itemName: goal.item.name,
    name: goal.name,
    targetSeconds: goal.targetSeconds,
    periodType: goal.periodType,
    daysOfWeek: goal.daysOfWeek,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate ? goal.endDate.toISOString() : null,
    status: goal.status,
    reminder: goal.reminder,
    color: goal.item.color,
  }));
}

export function toSessionRows(sessions: Array<{
  id: string;
  itemId: string;
  item: Item;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  description: string | null;
  source: SessionRow["source"];
}>, items: Item[]): SessionRow[] {
  return sessions.map((session) => ({
    id: session.id,
    itemId: session.itemId,
    itemName: session.item.name,
    itemColor: session.item.color,
    itemPath: getAncestorPath(items, session.itemId)
      .map((item) => item.name)
      .join(" / "),
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    durationSeconds: session.durationSeconds,
    description: session.description,
    source: session.source,
  }));
}
