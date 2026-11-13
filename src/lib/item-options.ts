import type { ItemOption } from "./types";

export type FlatItemOption = {
  id: string;
  label: string;
  path: string;
  depth: number;
  color: string | null;
  icon: string | null;
  type: string | null;
  archived: boolean;
};

export function flattenItemOptions(items: ItemOption[], includeArchived = false, includeSystem = false): FlatItemOption[] {
  const visible = items.filter((item) => (includeArchived || !item.archivedAt) && (includeSystem || !item.isSystem));
  const ids = new Set(visible.map((item) => item.id));
  const children = new Map<string | null, ItemOption[]>();

  for (const item of visible) {
    const parent = item.parentId && ids.has(item.parentId) ? item.parentId : null;
    const list = children.get(parent) ?? [];
    list.push(item);
    children.set(parent, list);
  }

  const result: FlatItemOption[] = [];
  const pathParts = new Map<string, string>();

  const visit = (parentId: string | null, depth: number) => {
    const list = (children.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    for (const item of list) {
      const parentPath = parentId ? pathParts.get(parentId) : undefined;
      const path = parentPath ? `${parentPath} / ${item.name}` : item.name;
      pathParts.set(item.id, path);
      result.push({
        id: item.id,
        label: item.name,
        path,
        depth,
        color: item.color,
        icon: item.icon,
        type: item.type,
        archived: Boolean(item.archivedAt),
      });
      visit(item.id, depth + 1);
    }
  };

  visit(null, 0);
  return result;
}

export function itemPath(items: ItemOption[], id: string) {
  const flat = flattenItemOptions(items, true);
  return flat.find((item) => item.id === id)?.path ?? "Unknown item";
}

export function descendantIds(items: Array<{ id: string; parentId: string | null }>, id: string) {
  const result = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
        result.add(item.id);
        changed = true;
      }
    }
  }
  return result;
}
