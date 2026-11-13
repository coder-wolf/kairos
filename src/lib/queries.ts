import "server-only";

import { db } from "./db";

export async function getSessionsWindow(workspaceId: string, start: Date, end: Date) {
  return db.timeSession.findMany({
    where: {
      workspaceId,
      startTime: { lt: end },
      endTime: { gt: start },
    },
    orderBy: { startTime: "desc" },
    include: { item: true },
  });
}

export async function getRecentSessions(workspaceId: string, take = 6) {
  return db.timeSession.findMany({
    where: { workspaceId },
    orderBy: { startTime: "desc" },
    take,
    include: { item: true },
  });
}

export async function getSessionsSince(workspaceId: string, since: Date) {
  return db.timeSession.findMany({
    where: { workspaceId, startTime: { gte: since } },
    orderBy: { startTime: "desc" },
    include: { item: true },
  });
}

export async function getEarliestSession(workspaceId: string) {
  return db.timeSession.findFirst({
    where: { workspaceId },
    orderBy: { startTime: "asc" },
    select: { startTime: true },
  });
}
