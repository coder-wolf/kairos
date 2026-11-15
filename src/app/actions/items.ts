"use server";

import { ItemType } from "@prisma/client";
import type { ActionResult, ItemInput } from "@/lib/action-types";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPlanForUser } from "@/lib/billing";
import { FREE_ITEM_LIMIT } from "@/lib/plan";
import { getSubtreeIds } from "@/lib/items";
import { stopTimerForUser } from "@/lib/timer-service";
import { ITEM_PALETTE, randomItemEmoji } from "@/lib/utils";

export async function createItem(input: ItemInput): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  const name = input.name.trim();

  if (!name) return { ok: false, error: "Give this item a name." };
  if (name.length > 80) return { ok: false, error: "Keep names under 80 characters." };

  const plan = await getPlanForUser(user.id);
  if (!plan.isPro) {
    const count = await db.item.count({
      where: { workspaceId: workspace.id, archivedAt: null, isSystem: false },
    });
    if (count >= FREE_ITEM_LIMIT) {
      return {
        ok: false,
        error: `The free plan includes ${FREE_ITEM_LIMIT} active items. Upgrade to Pro for unlimited projects.`,
      };
    }
  }

  if (input.parentId) {
    const parent = await db.item.findFirst({ where: { id: input.parentId, workspaceId: workspace.id } });
    if (!parent) return { ok: false, error: "That parent item no longer exists." };
  }

  const siblings = await db.item.count({
    where: { workspaceId: workspace.id, parentId: input.parentId },
  });

  const item = await db.item.create({
    data: {
      workspaceId: workspace.id,
      parentId: input.parentId,
      name,
      type: input.type && Object.values(ItemType).includes(input.type) ? input.type : null,
      description: input.description?.trim().slice(0, 1000) || null,
      color: input.color ?? ITEM_PALETTE[siblings % ITEM_PALETTE.length],
      icon: input.icon?.trim().slice(0, 4) || randomItemEmoji(),
      sortOrder: siblings,
    },
  });

  revalidateApp();
  return { ok: true, id: item.id };
}

export async function updateItem(input: ItemInput): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  if (!input.id) return { ok: false, error: "Missing item." };

  const existing = await db.item.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
  if (!existing) return { ok: false, error: "Item not found." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give this item a name." };

  await db.item.update({
    where: { id: existing.id },
    data: {
      name,
      type: input.type && Object.values(ItemType).includes(input.type) ? input.type : null,
      description: input.description?.trim().slice(0, 1000) || null,
      color: input.color ?? existing.color,
      icon: input.icon?.trim().slice(0, 4) || null,
    },
  });

  revalidateApp();
  return { ok: true, id: existing.id };
}

export async function moveItem(
  id: string,
  parentId: string | null,
  anchor?: { id: string; placement: "before" | "after" },
): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();

  const items = await db.item.findMany({ where: { workspaceId: workspace.id } });
  const item = items.find((candidate) => candidate.id === id);
  if (!item) return { ok: false, error: "Item not found." };

  if (parentId) {
    if (parentId === id) return { ok: false, error: "An item cannot be its own parent." };
    const subtree = getSubtreeIds(items, id);
    if (subtree.has(parentId)) {
      return { ok: false, error: "You can't move an item inside one of its own descendants." };
    }
    if (!items.some((candidate) => candidate.id === parentId)) {
      return { ok: false, error: "Destination not found." };
    }
  }

  const siblings = await db.item.findMany({
    where: { workspaceId: workspace.id, parentId, id: { not: id } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });

  let index = siblings.length;
  if (anchor) {
    const anchorIndex = siblings.findIndex((sibling) => sibling.id === anchor.id);
    if (anchorIndex === -1) return { ok: false, error: "That destination no longer exists." };
    index = anchor.placement === "before" ? anchorIndex : anchorIndex + 1;
  }

  const ordered = [...siblings];
  ordered.splice(index, 0, { id });

  await db.$transaction(
    ordered.map((sibling, position) =>
      db.item.update({
        where: { id: sibling.id },
        data: { sortOrder: position, ...(sibling.id === id ? { parentId } : {}) },
      }),
    ),
  );

  revalidateApp();
  return { ok: true, id };
}

export async function archiveItem(id: string): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  const item = await db.item.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!item) return { ok: false, error: "Item not found." };

  const items = await db.item.findMany({ where: { workspaceId: workspace.id } });
  const subtree = getSubtreeIds(items, id);
  const timer = await db.timerState.findUnique({ where: { userId: user.id } });
  if (timer && subtree.has(timer.itemId)) {
    await stopTimerForUser(user.id);
  }

  await db.item.update({ where: { id }, data: { archivedAt: new Date() } });
  revalidateApp();
  return { ok: true, id };
}

export async function restoreItem(id: string): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspace();
  const item = await db.item.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!item) return { ok: false, error: "Item not found." };

  const plan = await getPlanForUser(user.id);
  if (!plan.isPro) {
    const count = await db.item.count({
      where: { workspaceId: workspace.id, archivedAt: null, isSystem: false },
    });
    if (count >= FREE_ITEM_LIMIT) {
      return {
        ok: false,
        error: `The free plan includes ${FREE_ITEM_LIMIT} active items. Archive another item or upgrade to Pro.`,
      };
    }
  }

  await db.item.update({ where: { id }, data: { archivedAt: null } });
  revalidateApp();
  return { ok: true, id };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const item = await db.item.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!item) return { ok: false, error: "Item not found." };
  if (item.isSystem) return { ok: false, error: "The system item can't be deleted." };

  // The self-relation and session/goal relations cascade, so removing the
  // root removes the whole branch in one operation.
  await db.item.delete({ where: { id } });
  revalidateApp();
  return { ok: true, id };
}

export async function reorderItem(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const item = await db.item.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!item) return { ok: false, error: "Item not found." };

  const siblings = await db.item.findMany({
    where: { workspaceId: workspace.id, parentId: item.parentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const index = siblings.findIndex((candidate) => candidate.id === id);
  const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return { ok: true, id };

  await db.$transaction([
    db.item.update({ where: { id }, data: { sortOrder: swapWith.sortOrder } }),
    db.item.update({ where: { id: swapWith.id }, data: { sortOrder: item.sortOrder } }),
  ]);

  revalidateApp();
  return { ok: true, id };
}
