import type { Item } from "@prisma/client";
import { overlapSeconds } from "./time";
import { ITEM_PALETTE } from "./utils";

export type ItemNode = Item & {
  children: ItemNode[];
  depth: number;
};

export type SessionLike = {
  itemId: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
};

export function buildItemTree(items: Item[]): ItemNode[] {
  const byId = new Map<string, ItemNode>();
  for (const item of items) {
    byId.set(item.id, { ...item, children: [], depth: 0 });
  }

  const roots: ItemNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: ItemNode[], depth = 0) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) {
      node.depth = depth;
      sortNodes(node.children, depth + 1);
    }
  };

  sortNodes(roots);
  return roots;
}

export function flattenTree(nodes: ItemNode[]): ItemNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function getSubtreeIds(items: Item[], rootId: string): Set<string> {
  const childrenByParent = new Map<string | null, Item[]>();
  for (const item of items) {
    const key = item.parentId;
    const list = childrenByParent.get(key) ?? [];
    list.push(item);
    childrenByParent.set(key, list);
  }

  const result = new Set<string>();
  const visit = (id: string) => {
    if (result.has(id)) return;
    result.add(id);
    for (const child of childrenByParent.get(id) ?? []) visit(child.id);
  };
  visit(rootId);
  return result;
}

export function getAncestorPath(items: Item[], id: string): Item[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const path: Item[] = [];
  let current = byId.get(id);
  let guard = 0;
  while (current && guard < 200) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard++;
  }
  return path;
}

export function getParentMap(items: Item[]) {
  return new Map(items.map((item) => [item.id, item.parentId]));
}

export function getDescendantCount(items: Item[], id: string) {
  return Math.max(0, getSubtreeIds(items, id).size - 1);
}

/** Returns seconds per item, rolling every descendant's time up to its ancestors exactly once. */
export function aggregateByItem(
  items: Item[],
  sessions: SessionLike[],
  range?: { start: Date; end: Date },
): Map<string, number> {
  const direct = new Map<string, number>();
  for (const session of sessions) {
    const seconds = range
      ? overlapSeconds(session.startTime, session.endTime, range.start, range.end)
      : session.durationSeconds;
    if (seconds <= 0) continue;
    direct.set(session.itemId, (direct.get(session.itemId) ?? 0) + seconds);
  }

  return aggregateDirectByItem(items, direct);
}

/** Roll a map of direct per-item seconds up through every parent. */
export function aggregateDirectByItem(items: Item[], direct: Map<string, number>) {
  const parentOf = getParentMap(items);
  const totals = new Map<string, number>();
  for (const [itemId, seconds] of direct) {
    if (seconds <= 0) continue;
    let current: string | null | undefined = itemId;
    let guard = 0;
    while (current && guard < 200) {
      totals.set(current, (totals.get(current) ?? 0) + seconds);
      current = parentOf.get(current);
      guard++;
    }
  }
  return totals;
}

export function topLevelTotals(items: Item[], sessions: SessionLike[]) {
  const totals = aggregateByItem(items, sessions);
  const roots = items.filter((item) => !item.parentId || !items.some((candidate) => candidate.id === item.parentId));
  return roots
    .map((item, index) => ({
      item,
      seconds: totals.get(item.id) ?? 0,
      color: item.color ?? ITEM_PALETTE[index % ITEM_PALETTE.length],
    }))
    .filter((entry) => entry.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

export function childTotals(items: Item[], parentId: string, sessions: SessionLike[]) {
  const totals = aggregateByItem(items, sessions);
  const children = items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return children
    .map((item, index) => ({
      item,
      seconds: totals.get(item.id) ?? 0,
      color: item.color ?? ITEM_PALETTE[index % ITEM_PALETTE.length],
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

export function directSecondsByItem(sessions: SessionLike[]) {
  const map = new Map<string, number>();
  for (const session of sessions) {
    map.set(session.itemId, (map.get(session.itemId) ?? 0) + session.durationSeconds);
  }
  return map;
}

/** Quick lookup for type-ahead search: "Work / Freelancing / Client A". */
export function itemPathLabel(items: Item[], id: string) {
  return getAncestorPath(items, id)
    .map((item) => item.name)
    .join(" / ");
}
