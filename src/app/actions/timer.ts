"use server";

import type { TimerActionResult } from "@/lib/action-types";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { db } from "@/lib/db";
import { finalizeTimer, getTimer, snapshot } from "@/lib/timer-service";
import { ensureUnassignedItem } from "@/lib/system-items";

export async function startTimer(
  itemId?: string | null,
  options?: { stopExisting?: boolean; description?: string },
): Promise<TimerActionResult> {
  const { user, workspace } = await requireWorkspace();

  const item = itemId
    ? await db.item.findFirst({
        where: { id: itemId, workspaceId: workspace.id, archivedAt: null, isSystem: false },
      })
    : await ensureUnassignedItem(workspace.id);
  if (!item) return { ok: false, error: "That item is archived or no longer exists." };

  const existing = await getTimer(user.id);
  if (existing) {
    if (existing.itemId === item.id && existing.status === "RUNNING") {
      return { ok: true, timer: snapshot(existing) };
    }
    if (!options?.stopExisting) {
      return { ok: true, conflict: true, timer: snapshot(existing)! };
    }
    await finalizeTimer(existing);
  }

  const now = new Date();
  const timer = await db.timerState.create({
    data: {
      userId: user.id,
      itemId: item.id,
      status: "RUNNING",
      startedAt: now,
      sessionStartedAt: now,
      accumulatedSeconds: 0,
      description: options?.description?.trim().slice(0, 280) || null,
      source: "TIMER",
    },
    include: { item: true },
  });

  revalidateApp();
  return { ok: true, timer: snapshot(timer) };
}

export async function changeTimerItem(itemId: string | null): Promise<TimerActionResult> {
  const { user, workspace } = await requireWorkspace();

  const item = itemId
    ? await db.item.findFirst({
        where: { id: itemId, workspaceId: workspace.id, archivedAt: null, isSystem: false },
      })
    : await ensureUnassignedItem(workspace.id);
  if (!item) return { ok: false, error: "That item is archived or no longer exists." };

  const existing = await getTimer(user.id);
  if (!existing) return { ok: false, error: "There is no active timer to move." };

  const timer = await db.timerState.update({
    where: { id: existing.id },
    data: { itemId: item.id },
    include: { item: true },
  });

  revalidateApp();
  return { ok: true, timer: snapshot(timer) };
}

export async function pauseTimer(): Promise<TimerActionResult> {
  const { user } = await requireWorkspace();
  const existing = await getTimer(user.id);
  if (!existing) return { ok: true, timer: null };
  if (existing.status === "PAUSED") return { ok: true, timer: snapshot(existing) };

  const now = new Date();
  const accumulated = existing.accumulatedSeconds + (now.getTime() - existing.startedAt.getTime()) / 1000;

  const timer = await db.timerState.update({
    where: { id: existing.id },
    data: {
      status: "PAUSED",
      accumulatedSeconds: Math.round(accumulated),
      startedAt: now,
    },
    include: { item: true },
  });

  revalidateApp();
  return { ok: true, timer: snapshot(timer) };
}

export async function resumeTimer(): Promise<TimerActionResult> {
  const { user } = await requireWorkspace();
  const existing = await getTimer(user.id);
  if (!existing) return { ok: true, timer: null };
  if (existing.status === "RUNNING") return { ok: true, timer: snapshot(existing) };

  const timer = await db.timerState.update({
    where: { id: existing.id },
    data: { status: "RUNNING", startedAt: new Date() },
    include: { item: true },
  });

  revalidateApp();
  return { ok: true, timer: snapshot(timer) };
}

export async function stopTimer(): Promise<TimerActionResult> {
  const { user } = await requireWorkspace();
  const existing = await getTimer(user.id);
  if (!existing) return { ok: true, timer: null };

  await finalizeTimer(existing);
  revalidateApp();
  return { ok: true, timer: null };
}

export async function discardTimer(): Promise<TimerActionResult> {
  const { user } = await requireWorkspace();
  const existing = await getTimer(user.id);
  if (!existing) return { ok: true, timer: null };

  await db.timerState.delete({ where: { id: existing.id } });
  revalidateApp();
  return { ok: true, timer: null };
}

export async function updateTimerDescription(description: string): Promise<TimerActionResult> {
  const { user } = await requireWorkspace();
  const existing = await getTimer(user.id);
  if (!existing) return { ok: false, error: "There is no active timer." };

  const timer = await db.timerState.update({
    where: { id: existing.id },
    data: { description: description.trim().slice(0, 280) || null },
    include: { item: true },
  });

  revalidateApp();
  return { ok: true, timer: snapshot(timer) };
}
