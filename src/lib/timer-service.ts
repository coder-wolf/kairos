import "server-only";

import type { Item, TimerState } from "@prisma/client";
import { db } from "./db";
import { toTimerSnapshot } from "./dal";
import type { TimerSnapshot } from "./types";

export type TimerWithItem = TimerState & { item: Item };

export function elapsedSeconds(timer: TimerWithItem, now = new Date()) {
  const running = timer.status === "RUNNING" ? Math.max(0, (now.getTime() - timer.startedAt.getTime()) / 1000) : 0;
  return timer.accumulatedSeconds + running;
}

export function snapshot(timer: TimerWithItem | null, now = new Date()): TimerSnapshot | null {
  return toTimerSnapshot(timer, now);
}

export async function getTimer(userId: string) {
  return db.timerState.findUnique({
    where: { userId },
    include: { item: true },
  });
}

export async function finalizeTimer(timer: TimerWithItem, now = new Date()) {
  const total = Math.round(elapsedSeconds(timer, now));
  const startTime = timer.sessionStartedAt;
  const durationSeconds = Math.max(1, total);

  if (total < 5) {
    await db.timerState.delete({ where: { id: timer.id } });
    return null;
  }

  const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

  const [, session] = await db.$transaction([
    db.timerState.delete({ where: { id: timer.id } }),
    db.timeSession.create({
      data: {
        userId: timer.userId,
        workspaceId: timer.item.workspaceId,
        itemId: timer.itemId,
        startTime,
        endTime,
        durationSeconds,
        description: timer.description,
        source: timer.source,
      },
    }),
  ]);

  return session;
}

export async function stopTimerForUser(userId: string, now = new Date()) {
  const timer = await getTimer(userId);
  if (!timer) return null;
  return finalizeTimer(timer, now);
}
