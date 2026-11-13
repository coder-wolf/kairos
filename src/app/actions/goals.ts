"use server";

import { GoalStatus, PeriodType } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import type { ActionResult, GoalInput } from "@/lib/action-types";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPlanForUser } from "@/lib/billing";
import { FREE_GOAL_LIMIT } from "@/lib/plan";
import { goalPeriod, goalTargetRevisions } from "@/lib/goals";
import { toDateKey } from "@/lib/time";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validate(input: GoalInput) {
  if (!Number.isFinite(input.targetMinutes) || input.targetMinutes < 1) {
    return { error: "Set a target of at least 1 minute." };
  }
  if (input.targetMinutes > 24 * 60 * 31) {
    return { error: "That target is too large for a single period." };
  }
  if (!Object.values(PeriodType).includes(input.periodType)) {
    return { error: "Choose a valid period." };
  }
  if (!DATE_PATTERN.test(input.startDate)) {
    return { error: "Choose a valid start date." };
  }
  if (input.endDate && !DATE_PATTERN.test(input.endDate)) {
    return { error: "Choose a valid end date." };
  }
  if (input.periodType === "CUSTOM" && !input.endDate) {
    return { error: "Custom goals need an end date." };
  }
  if (input.endDate && input.endDate < input.startDate) {
    return { error: "The end date must be after the start date." };
  }
  return null;
}

function cleanDays(days: number[]) {
  return Array.from(new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort();
}

export async function createGoal(input: GoalInput): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid.error };

  const item = await db.item.findFirst({
    where: { id: input.itemId, workspaceId: workspace.id },
  });
  if (!item) return { ok: false, error: "Pick an item for this goal." };

  const plan = await getPlanForUser(user.id);
  if (!plan.isPro) {
    const activeCount = await db.goal.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } });
    if (activeCount >= FREE_GOAL_LIMIT) {
      return {
        ok: false,
        error: `The free plan includes ${FREE_GOAL_LIMIT} active goals. Upgrade to Pro for unlimited goals.`,
      };
    }
  }

  const startDate = fromZonedTime(`${input.startDate} 00:00:00`, user.timezone);
  const endDate = input.endDate ? fromZonedTime(`${input.endDate} 00:00:00`, user.timezone) : null;
  const targetSeconds = Math.round(input.targetMinutes * 60);

  const goal = await db.goal.create({
    data: {
      workspaceId: workspace.id,
      itemId: input.itemId,
      name: input.name?.trim() || item.name,
      targetSeconds,
      periodType: input.periodType,
      daysOfWeek: cleanDays(input.daysOfWeek),
      startDate,
      endDate,
      reminder: input.reminder ?? false,
      targetHistory: [{ from: startDate.toISOString(), targetSeconds }],
    },
  });

  revalidateApp();
  return { ok: true, id: goal.id };
}

export async function updateGoal(input: GoalInput): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  if (!input.id) return { ok: false, error: "Missing goal." };
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid.error };

  const goal = await db.goal.findFirst({
    where: { id: input.id, workspaceId: workspace.id },
  });
  if (!goal) return { ok: false, error: "Goal not found." };

  const item = await db.item.findFirst({
    where: { id: input.itemId, workspaceId: workspace.id },
  });
  if (!item) return { ok: false, error: "Pick a valid item." };

  const startDate = fromZonedTime(`${input.startDate} 00:00:00`, user.timezone);
  const endDate = input.endDate ? fromZonedTime(`${input.endDate} 00:00:00`, user.timezone) : null;
  const targetSeconds = Math.round(input.targetMinutes * 60);
  const previousTarget = goal.targetSeconds;

  let history = goalTargetRevisions(goal).map((revision) => ({ ...revision }));

  if (targetSeconds !== previousTarget) {
    if (history.length === 0) {
      history.push({
        from: fromZonedTime(`${toDateKey(goal.startDate, user.timezone)} 00:00:00`, user.timezone).toISOString(),
        targetSeconds: previousTarget,
      });
    }
    const currentPeriod = goalPeriod(goal, new Date(), user.timezone, user.weekStartsOn);
    const effectiveFrom = new Date(
      Math.max(currentPeriod.start.getTime(), goal.startDate.getTime()),
    ).toISOString();
    history = history.filter((revision) => revision.from !== effectiveFrom);
    history.push({ from: effectiveFrom, targetSeconds });
  }

  if (startDate.getTime() !== goal.startDate.getTime() || goal.periodType !== input.periodType) {
    history = [{ from: startDate.toISOString(), targetSeconds }];
  }

  history.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());

  await db.goal.update({
    where: { id: goal.id },
    data: {
      itemId: input.itemId,
      name: input.name?.trim() || item.name,
      targetSeconds,
      periodType: input.periodType,
      daysOfWeek: cleanDays(input.daysOfWeek),
      startDate,
      endDate,
      reminder: input.reminder ?? goal.reminder,
      targetHistory: history,
    },
  });

  revalidateApp();
  return { ok: true, id: goal.id };
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  if (!Object.values(GoalStatus).includes(status)) {
    return { ok: false, error: "Invalid goal status." };
  }
  const goal = await db.goal.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!goal) return { ok: false, error: "Goal not found." };

  if (status === "ACTIVE") {
    const plan = await getPlanForUser(user.id);
    if (!plan.isPro) {
      const activeCount = await db.goal.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } });
      if (activeCount >= FREE_GOAL_LIMIT) {
        return {
          ok: false,
          error: `The free plan includes ${FREE_GOAL_LIMIT} active goals. Upgrade to Pro for unlimited goals.`,
        };
      }
    }
  }

  await db.goal.update({ where: { id }, data: { status } });
  revalidateApp();
  return { ok: true, id };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const goal = await db.goal.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!goal) return { ok: false, error: "Goal not found." };

  await db.goal.delete({ where: { id } });
  revalidateApp();
  return { ok: true, id };
}
