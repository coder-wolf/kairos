"use server";

import { fromZonedTime } from "date-fns-tz";
import type { ActionResult, SessionInput } from "@/lib/action-types";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { db } from "@/lib/db";
import { ensureUnassignedItem } from "@/lib/system-items";
import { getPlanForUser } from "@/lib/billing";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseSessionTimes(input: SessionInput, timezone: string) {
  if (!DATE_PATTERN.test(input.date)) {
    throw new Error("Choose a valid date.");
  }
  const minutes = Math.round(Number(input.durationMinutes));
  if (!Number.isFinite(minutes) || minutes < 1) {
    throw new Error("Duration must be at least 1 minute.");
  }
  if (minutes > 24 * 60) {
    throw new Error("A single entry can't be longer than 24 hours.");
  }

  let time = "12:00";
  if (input.startTime) {
    if (!TIME_PATTERN.test(input.startTime)) throw new Error("Enter a valid start time.");
    time = input.startTime;
  }

  const startTime = fromZonedTime(`${input.date} ${time}:00`, timezone);
  const endTime = new Date(startTime.getTime() + minutes * 60_000);

  return { startTime, endTime, durationSeconds: minutes * 60 };
}

export async function createSession(input: SessionInput): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();

  const item = await db.item.findFirst({
    where: { id: input.itemId, workspaceId: workspace.id },
  });
  if (!item) return { ok: false, error: "Pick an item to track time against." };

  try {
    const times = parseSessionTimes(input, user.timezone);
    const session = await db.timeSession.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        itemId: input.itemId,
        startTime: times.startTime,
        endTime: times.endTime,
        durationSeconds: times.durationSeconds,
        description: input.description?.trim().slice(0, 280) || null,
        source: "MANUAL",
      },
    });

    revalidateApp();
    return { ok: true, id: session.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save this entry." };
  }
}

export async function updateSession(input: SessionInput): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  if (!input.id) return { ok: false, error: "Missing entry." };

  const existing = await db.timeSession.findFirst({
    where: { id: input.id, workspaceId: workspace.id },
  });
  if (!existing) return { ok: false, error: "Entry not found." };

  const item = await db.item.findFirst({
    where: { id: input.itemId, workspaceId: workspace.id },
  });
  if (!item) return { ok: false, error: "Pick a valid item." };

  try {
    const times = parseSessionTimes(input, user.timezone);
    await db.timeSession.update({
      where: { id: existing.id },
      data: {
        itemId: input.itemId,
        startTime: times.startTime,
        endTime: times.endTime,
        durationSeconds: times.durationSeconds,
        description: input.description?.trim().slice(0, 280) || null,
      },
    });

    revalidateApp();
    return { ok: true, id: existing.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update this entry." };
  }
}

export async function createPomodoroSession(input: {
  itemId: string | null;
  startTime: string;
  endTime: string;
  description?: string;
}): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();

  const plan = await getPlanForUser(user.id);
  if (!plan.isPro) return { ok: false, error: "Pomodoro sessions are a Pro feature." };

  const item = input.itemId
    ? await db.item.findFirst({
        where: { id: input.itemId, workspaceId: workspace.id },
      })
    : await ensureUnassignedItem(workspace.id);
  if (!item) return { ok: false, error: "Pick an item for this pomodoro." };

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  if (!Number.isFinite(durationSeconds) || durationSeconds < 1) {
    return { ok: false, error: "That focus block was too short to save." };
  }
  if (durationSeconds > 4 * 3600) {
    return { ok: false, error: "Focus blocks are limited to four hours." };
  }

  const session = await db.timeSession.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      itemId: item.id,
      startTime,
      endTime,
      durationSeconds,
      description: input.description?.trim().slice(0, 280) || "Pomodoro focus",
      source: "POMODORO",
    },
  });

  revalidateApp();
  return { ok: true, id: session.id };
}

export async function deleteSession(id: string): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const existing = await db.timeSession.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!existing) return { ok: false, error: "Entry not found." };

  await db.timeSession.delete({ where: { id } });
  revalidateApp();
  return { ok: true, id };
}
