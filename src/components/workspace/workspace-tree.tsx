"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClockPlus,
  FolderPlus,
  MoreHorizontal,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Target,
  Trash2,
  Undo2,
  Archive,
  MoveRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { archiveItem, createItem, deleteItem, moveItem, restoreItem, updateItem } from "@/app/actions/items";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useQuickActions } from "@/components/quick-actions";
import { LiveTimer } from "@/components/timer/live-timer";
import { useTimer } from "@/components/timer/timer-provider";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/input";
import { descendantIds } from "@/lib/item-options";
import type { WorkspaceItem } from "@/lib/types";
import { cn, formatDuration, pluralize } from "@/lib/utils";

type Node = WorkspaceItem & { children: Node[]; depth: number };

function buildTree(items: WorkspaceItem[]): Node[] {
  const byId = new Map<string, Node>();
  for (const item of items) byId.set(item.id, { ...item, children: [], depth: 0 });
  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (nodes: Node[], depth: number) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots, 0);
  return roots;
}

function flattenNodes(nodes: Node[]): Node[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

const typeTone: Record<string, "primary" | "success" | "neutral" | "info" | "accent"> = {
  AREA: "primary",
  PROJECT: "info",
  CUSTOM: "neutral",
};

function typeLabel(type: string | null) {
  if (type === "AREA") return "Area";
  if (type === "PROJECT") return "Project";
  if (type === "CUSTOM") return "Custom";
  return "Item";
}

export function WorkspaceTree({ items, weekLabel }: { items: WorkspaceItem[]; weekLabel: string }) {
  const router = useRouter();
  const { openNewItem, openManualTime, openNewGoal } = useQuickActions();
  const { start, timer } = useTimer();
  const [query, setQuery] = React.useState("");
  const [addingTo, setAddingTo] = React.useState<string | null | undefined>(undefined);
  const [newName, setNewName] = React.useState("");
  const [newType, setNewType] = React.useState<"AREA" | "PROJECT">("PROJECT");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [addPending, startAddTransition] = React.useTransition();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editType, setEditType] = React.useState<"AREA" | "PROJECT" | "CUSTOM">("PROJECT");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editPending, startEditTransition] = React.useTransition();
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [expandedEmpty, setExpandedEmpty] = React.useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = React.useState(false);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<
    string | { id: string; mode: "before" | "after" | "inside" } | null
  >(null);
  const [moving, setMoving] = React.useState<WorkspaceItem | null>(null);
  const [moveParent, setMoveParent] = React.useState("");
  const [toArchive, setToArchive] = React.useState<WorkspaceItem | null>(null);
  const [toDelete, setToDelete] = React.useState<WorkspaceItem | null>(null);
  const [movePending, startMove] = React.useTransition();

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("kairos:collapsed-items");
      // Restoring a persisted UI preference after hydration is an external-store sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setCollapsed(new Set(JSON.parse(stored) as string[]));
      const storedEmpty = localStorage.getItem("kairos:expanded-empty-items");
      if (storedEmpty) setExpandedEmpty(new Set(JSON.parse(storedEmpty) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const persistCollapsed = (next: Set<string>) => {
    setCollapsed(next);
    try {
      localStorage.setItem("kairos:collapsed-items", JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

  const persistExpandedEmpty = (next: Set<string>) => {
    setExpandedEmpty(next);
    try {
      localStorage.setItem("kairos:expanded-empty-items", JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

  const draggingTree = React.useMemo(
    () => (dragging ? descendantIds(items, dragging) : null),
    [dragging, items],
  );

  const activeItems = items.filter((item) => !item.archivedAt);
  const archivedItems = items.filter((item) => item.archivedAt);
  const tree = React.useMemo(() => buildTree(activeItems), [activeItems]);

  const searchVisible = React.useMemo(() => {
    if (!query.trim()) return null;
    const needle = query.trim().toLowerCase();
    const matches = new Set(
      items
        .filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(needle))
        .map((item) => item.id),
    );
    const parentOf = new Map(items.map((item) => [item.id, item.parentId]));
    const visible = new Set<string>();
    for (const id of matches) {
      let cursor: string | null | undefined = id;
      let guard = 0;
      while (cursor && guard < 100) {
        visible.add(cursor);
        cursor = parentOf.get(cursor);
        guard++;
      }
    }
    return visible;
  }, [query, items]);

  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistCollapsed(next);
  };

  const toggleEmpty = (id: string) => {
    const next = new Set(expandedEmpty);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistExpandedEmpty(next);
  };

  const move = (
    id: string,
    parentId: string | null,
    anchor?: { id: string; placement: "before" | "after" },
  ) => {
    startMove(async () => {
      const result = await moveItem(id, parentId, anchor);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(parentId ? "Item moved" : "Item moved to the top level");
      setDragging(null);
      setDropTarget(null);
      router.refresh();
    });
  };

  const maxSeconds = Math.max(1, ...activeItems.map((item) => item.seconds));

  const startAdding = (parentId: string | null) => {
    setAddingTo(parentId);
    setNewName("");
    setNewType("PROJECT");
    setAddError(null);
    setEditingId(null);
    setEditError(null);
  };

  const cancelAdding = () => {
    setAddingTo(undefined);
    setNewName("");
    setNewType("PROJECT");
    setAddError(null);
  };

  const startEditing = (node: Node) => {
    setEditingId(node.id);
    setEditName(node.name);
    setEditType(node.type === "AREA" || node.type === "CUSTOM" ? node.type : "PROJECT");
    setEditError(null);
    setAddingTo(undefined);
    setNewName("");
    setAddError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditError(null);
  };

  const saveInline = (node: Node) => {
    const name = editName.trim();
    if (!name || editPending) return;
    setEditError(null);
    startEditTransition(async () => {
      const result = await updateItem({
        id: node.id,
        name,
        type: editType,
        parentId: node.parentId,
        description: node.description ?? undefined,
        color: node.color,
        icon: node.icon,
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      toast.success("Item updated");
      setEditingId(null);
      router.refresh();
    });
  };

  const createInline = (parentId: string | null) => {
    const name = newName.trim();
    if (!name || addPending) return;
    setAddError(null);
    startAddTransition(async () => {
      const result = await createItem({ name, type: newType, parentId });
      if (!result.ok) {
        setAddError(result.error);
        return;
      }
      toast.success(`Added ${name}`);
      setNewName("");
      setAddingTo(undefined);
      router.refresh();
    });
  };

  const renderAddRow = (parentId: string | null, depth: number, label = "Add project") => {
    if (query.trim()) return null;
    const isAdding = addingTo === parentId;

    return (
      <div className="border-b border-border/70 px-3 py-1.5 last:border-b-0">
        {isAdding ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createInline(parentId);
            }}
            className="flex flex-wrap items-center gap-1.5"
            style={{ paddingLeft: depth * 16 + 6 }}
          >
            <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-primary/40 bg-surface px-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <Plus className="h-3 w-3 shrink-0 text-primary" />
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelAdding();
                  }
                }}
                placeholder="Name"
                maxLength={80}
                disabled={addPending}
                aria-label="New item name"
                className="h-8 w-full min-w-0 bg-transparent text-[12px] font-medium outline-none placeholder:text-muted-2"
              />
              {addPending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" /> : null}
            </div>
            <div
              role="group"
              aria-label="Item type"
              className="flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5"
            >
              {(["PROJECT", "AREA"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewType(type)}
                  aria-pressed={newType === type}
                  disabled={addPending}
                  className={cn(
                    "h-6 rounded-md px-2 text-[10px] font-bold transition-colors disabled:opacity-60",
                    newType === type
                      ? "bg-primary text-primary-contrast"
                      : "text-muted hover:bg-surface-3 hover:text-text",
                  )}
                >
                  {type === "AREA" ? "Area" : "Project"}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || addPending}
              aria-label={`Create ${newType === "AREA" ? "area" : "project"}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-contrast transition-colors hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelAdding}
              aria-label="Cancel adding project"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {addError ? <p className="w-full text-[10px] font-medium text-danger">{addError}</p> : null}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => startAdding(parentId)}
            className="flex h-7 items-center gap-2 rounded-md pr-2 text-[11px] font-semibold text-muted-2 transition-colors hover:bg-surface-2 hover:text-primary"
            style={{ paddingLeft: depth * 16 + 6 }}
          >
            <span className="grid h-5 w-5 place-items-center rounded-md border border-dashed border-border-strong text-muted-2">
              <Plus className="h-3 w-3" />
            </span>
            {label}
          </button>
        )}
      </div>
    );
  };

  const renderNode = (node: Node): React.ReactNode => {
    if (searchVisible && !searchVisible.has(node.id)) return null;
    const hasChildren = node.children.length > 0;
    const isCollapsed = searchVisible ? false : hasChildren ? collapsed.has(node.id) : !expandedEmpty.has(node.id);
    const cannotDrop = draggingTree?.has(node.id) ?? false;
    const itemDrop = dropTarget && typeof dropTarget === "object" ? dropTarget : null;
    const isDrop = itemDrop?.id === node.id && !cannotDrop;
    const dropMode = isDrop ? itemDrop.mode : null;

    return (
      <div key={node.id}>
        {editingId === node.id ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveInline(node);
            }}
            className="border-b border-border/70 last:border-b-0"
          >
            <div
              className="flex flex-wrap items-center gap-1.5 px-3 py-1.5"
              style={{ paddingLeft: node.depth * 16 + 12 }}
            >
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-primary/40 bg-surface px-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <Pencil className="h-3 w-3 shrink-0 text-primary" />
                <input
                  autoFocus
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEditing();
                    }
                  }}
                  placeholder="Name"
                  maxLength={80}
                  disabled={editPending}
                  aria-label={`Edit name for ${node.name}`}
                  className="h-8 w-full min-w-0 bg-transparent text-[12px] font-medium outline-none placeholder:text-muted-2"
                />
                {editPending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" /> : null}
              </div>
              <div
                role="group"
                aria-label={`Type for ${node.name}`}
                className="flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5"
              >
                {(node.type === "CUSTOM"
                  ? (["PROJECT", "AREA", "CUSTOM"] as const)
                  : (["PROJECT", "AREA"] as const)
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditType(type)}
                    aria-pressed={editType === type}
                    disabled={editPending}
                    className={cn(
                      "h-6 rounded-md px-2 text-[10px] font-bold transition-colors disabled:opacity-60",
                      editType === type
                        ? "bg-primary text-primary-contrast"
                        : "text-muted hover:bg-surface-3 hover:text-text",
                    )}
                  >
                    {typeLabel(type)}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!editName.trim() || editPending}
                aria-label={`Save changes to ${node.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-contrast transition-colors hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                aria-label={`Cancel editing ${node.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {editError ? <p className="w-full text-[10px] font-medium text-danger">{editError}</p> : null}
            </div>
          </form>
        ) : (
        <div
          draggable
          onDragStart={(event) => {
            setDragging(node.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.id);
          }}
          onDragEnd={() => {
            setDragging(null);
            setDropTarget(null);
          }}
          onDragOver={(event) => {
            if (!dragging || cannotDrop) {
              if (isDrop) setDropTarget(null);
              return;
            }
            event.preventDefault();
            if (!isCollapsed) {
              setDropTarget({ id: node.id, mode: "inside" });
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            setDropTarget({
              id: node.id,
              mode: event.clientY < rect.top + rect.height / 2 ? "before" : "after",
            });
          }}
          onDragLeave={() =>
            setDropTarget((current) => (typeof current === "object" && current?.id === node.id ? null : current))
          }
          onDrop={(event) => {
            event.preventDefault();
            if (!dragging || cannotDrop) return;
            if (!isCollapsed) {
              move(dragging, node.id);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const before = event.clientY < rect.top + rect.height / 2;
            move(dragging, node.parentId, {
              id: node.id,
              placement: before ? "before" : "after",
            });
          }}
          className={cn(
            "group relative grid grid-cols-[minmax(0,1fr)_84px_60px_72px_118px_104px] items-center gap-2 border-b border-border/70 px-3 py-2 transition-colors last:border-b-0",
            dropMode === "inside" ? "bg-primary-soft ring-1 ring-inset ring-primary/30" : "hover:bg-surface-2/50",
            dragging === node.id && "opacity-40",
          )}
        >
          <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: node.depth * 16 }}>
            <button
              type="button"
              onClick={() => (hasChildren ? toggle(node.id) : toggleEmpty(node.id))}
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-2 hover:bg-surface-3 hover:text-text"
              aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${node.name}`}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px]"
              style={{ background: `${node.color ?? "#6366f1"}14`, color: node.color ?? "#6366f1" }}
            >
              {node.icon ?? "•"}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/items/${node.id}`}
                className="block truncate text-[12px] font-semibold hover:text-primary"
                title={node.name}
              >
                {node.name}
              </Link>
              {node.description ? (
                <span className="hidden truncate text-[10px] text-muted-2 xl:block">{node.description}</span>
              ) : null}
            </div>
          </div>
          <div>
            <Badge tone={typeTone[node.type ?? ""] ?? "neutral"}>{typeLabel(node.type)}</Badge>
          </div>
          <div className="flex justify-center">
            {node.goalCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted">
                <Target className="h-3 w-3" /> {node.goalCount}
              </span>
            ) : (
              <span className="text-[10px] text-muted-2">—</span>
            )}
          </div>
          <div className="text-center text-[10px] font-medium text-muted-2">
            {node.childCount > 0 ? node.childCount : "—"}
          </div>
          <div className="flex flex-col items-end gap-1">
            {node.seconds > 0 ? (
              <>
                <span className="text-[11px] font-semibold tabular-nums text-muted" title={`${weekLabel} total`}>
                  {formatDuration(node.seconds)}
                </span>
                <span className="h-1 w-full max-w-[70px] overflow-hidden rounded-full bg-surface-3">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(8, (node.seconds / maxSeconds) * 100)}%`,
                      background: node.color ?? "var(--primary)",
                    }}
                  />
                </span>
              </>
            ) : (
              <span className="text-[11px] text-muted-2">—</span>
            )}
          </div>
          <div className="flex justify-end gap-0.5">
            {timer?.itemId === node.id ? (
              <LiveTimer itemId={node.id} name={node.name} variant="compact" />
            ) : (
              <IconButton
                size="icon-sm"
                variant="ghost"
                className="h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => start(node.id)}
                aria-label={`Start timer for ${node.name}`}
              >
                <Play className="h-3.5 w-3.5" />
              </IconButton>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-2 opacity-100 transition-opacity hover:bg-surface-3 hover:text-text md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
                  aria-label="Item options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => start(node.id)}>
                  <Play className="h-4 w-4" /> Start timer
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openManualTime({ itemId: node.id })}>
                  <ClockPlus className="h-4 w-4" /> Add time
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openNewGoal(node.id)}>
                  <Target className="h-4 w-4" /> New goal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openNewItem(node.id)}>
                  <FolderPlus className="h-4 w-4" /> New child project
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => startEditing(node)}>
                  <Pencil className="h-4 w-4" /> Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setMoving(node);
                    setMoveParent(node.parentId ?? "");
                  }}
                >
                  <MoveRight className="h-4 w-4" /> Move item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setToArchive(node)}>
                  <Archive className="h-4 w-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={() => setToDelete(node)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {dropMode === "before" || dropMode === "after" ? (
            <span
              aria-hidden
              className="pointer-events-none absolute z-10 h-0.5 rounded-full bg-primary"
              style={{
                left: 12 + node.depth * 16,
                right: 12,
                top: dropMode === "before" ? -1 : undefined,
                bottom: dropMode === "after" ? -1 : undefined,
              }}
            >
              <span className="absolute -left-0.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
            </span>
          ) : null}
        </div>
        )}
        {!isCollapsed ? (
          <div>
            {node.children.map(renderNode)}
            {renderAddRow(node.id, node.depth + 1)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find an item…"
              className="field pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => persistCollapsed(new Set())}>
              Expand all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                persistCollapsed(
                  new Set(
                    items
                      .filter((item) => items.some((candidate) => candidate.parentId === item.id))
                      .map((item) => item.id),
                  ),
                )
              }
            >
              Collapse
            </Button>
            <Button size="sm" onClick={() => openNewItem()} className="gap-1.5">
              <FolderPlus className="h-3.5 w-3.5" /> New Project
            </Button>
          </div>
        </div>

        {tree.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted">
              <FolderPlus className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold">Your workspace is empty</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
              Start with one area or project. You can nest as deeply as you like and move things around later.
            </p>
            <Button className="mt-5 gap-1.5" onClick={() => openNewItem()}>
              <FolderPlus className="h-3.5 w-3.5" /> Create the first project
            </Button>
          </div>
        ) : (
          <>
            <div
              onDragOver={(event) => {
                if (!dragging) return;
                event.preventDefault();
                setDropTarget("root");
              }}
              onDragLeave={() => setDropTarget((current) => (current === "root" ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging) move(dragging, null);
              }}
              className={cn(
                "mx-2 mt-2 flex h-8 items-center justify-center rounded-lg border border-dashed text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                dragging
                  ? dropTarget === "root"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border-strong text-muted-2"
                  : "border-transparent text-transparent",
              )}
            >
              {dragging ? "Drop here to move to the top level" : "—"}
            </div>
            <div className="scroll-thin overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[minmax(0,1fr)_84px_60px_72px_118px_104px] items-center gap-2 border-b border-border bg-surface-2/50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">
                  <div>Item</div>
                  <div>Type</div>
                  <div className="text-center">Goals</div>
                  <div className="text-center">Sub-items</div>
                  <div className="text-right">This week</div>
                  <div />
                </div>
                <div>
                  {tree.map(renderNode)}
                  {renderAddRow(null, 0, "Add top-level project")}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-border px-4 py-3 text-[10px] font-medium text-muted-2">
          Drag between items to reorder. Drop onto an expanded item to nest inside it. Times show {weekLabel.toLowerCase()} totals, including descendants.
        </div>
      </div>

      {archivedItems.length > 0 ? (
        <div className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left"
          >
            <div>
              <p className="text-sm font-bold">Archived items</p>
              <p className="text-[11px] text-muted">
                {archivedItems.length} {pluralize(archivedItems.length, "item")} hidden from the active workspace. History
                stays intact.
              </p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", showArchived && "rotate-180")} />
          </button>
          {showArchived ? (
            <div className="border-t border-border p-2">
              {archivedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-sm">
                    {item.icon ?? "•"}
                  </span>
                  <span className="flex-1 truncate text-[13px] font-semibold text-muted">{item.name}</span>
                  <span className="text-[11px] text-muted-2">{formatDuration(item.seconds)}</span>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => restoreItem(item.id).then(() => router.refresh())}>
                    <Undo2 className="h-3.5 w-3.5" /> Restore
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(item)} aria-label="Delete archived item">
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(toArchive)}
        onOpenChange={(open) => !open && setToArchive(null)}
        title={`Archive ${toArchive?.name ?? "this item"}?`}
        description="Archived items disappear from the active workspace but their sessions and goals remain in your history and analytics. You can restore it anytime."
        confirmLabel="Archive item"
        onConfirm={async () => {
          if (!toArchive) return { ok: false, error: "Nothing selected." };
          const result = await archiveItem(toArchive.id);
          if (result.ok) {
            toast.success("Item archived");
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "this item"}?`}
        description="Deletion is permanent. Items with children or tracked time can't be deleted — archive them instead so your history remains trustworthy."
        confirmLabel="Delete forever"
        destructive
        onConfirm={async () => {
          if (!toDelete) return { ok: false, error: "Nothing selected." };
          const result = await deleteItem(toDelete.id);
          if (result.ok) {
            toast.success("Item deleted");
            setToDelete(null);
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />

      <Dialog
        open={Boolean(moving)}
        onOpenChange={(open) => {
          if (!open) setMoving(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move {moving?.name}</DialogTitle>
            <DialogDescription>
              Choose a new parent. Time sessions never move with the item — only future aggregation changes.
            </DialogDescription>
          </DialogHeader>
          <Select value={moveParent} onChange={(event) => setMoveParent(event.target.value)}>
            <option value="">Top level</option>
            {flattenNodes(buildTree(activeItems))
              .filter((node) => !moving || !descendantIds(activeItems, moving.id).has(node.id))
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {"— ".repeat(node.depth)}
                  {node.name}
                </option>
              ))}
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoving(null)}>
              Cancel
            </Button>
            <Button
              loading={movePending}
              onClick={() => {
                if (!moving) return;
                startMove(async () => {
                  const result = await moveItem(moving.id, moveParent || null);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Item moved");
                  setMoving(null);
                  router.refresh();
                });
              }}
            >
              Move item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
