import "server-only";

import type { Item } from "@prisma/client";
import { db } from "./db";

export async function ensureUnassignedItem(workspaceId: string): Promise<Item> {
  const existing = await db.item.findFirst({
    where: { workspaceId, isSystem: true },
  });
  if (existing) return existing;

  return db.item.create({
    data: {
      workspaceId,
      name: "Unassigned",
      type: "CUSTOM",
      icon: "📥",
      color: "#94a3b8",
      sortOrder: 9999,
      isSystem: true,
    },
  });
}
