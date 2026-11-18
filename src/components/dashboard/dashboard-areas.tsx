"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, ChevronsDown, ChevronsUp, ClockPlus, Play, Target } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { moveItem } from "@/app/actions/items";
import { toast } from "sonner";
import { descendantIds } from "@/lib/item-options";
import { LiveTimer } from "@/components/timer/live-timer";
import { useTimer } from "@/components/timer/timer-provider";
import type { AreaNode } from "@/lib/types";
import { cn, formatDuration, pluralize } from "@/lib/utils";

type Node = AreaNode & { children: Node[]; depth: number };
type SortMode = "name" | "manual";

function buildTree(nodes: AreaNode[], sortMode: SortMode): Node[] {
  const byId = new Map<string, Node>();
  for (const node of nodes) byId.set(node.id, { ...node, children: [], depth: 0 });
  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (list: Node[], depth: number) => {
    list.sort((a, b) =>
      sortMode === "manual"
        ? a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    for (const node of list) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots, 0);
  return roots;
}

export function DashboardAreas({ nodes }: { nodes: AreaNode[] }) {
  const router = useRouter();
  const { start, timer } = useTimer();
  const { openManualTime, openNewGoal } = useQuickActions();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = React.useState<SortMode>("name");
  const [, startMove] = React.useTransition();
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ id: string; placement: "before" | "after" } | null>(null);
  const tree = React.useMemo(() => buildTree(nodes, sortMode), [nodes, sortMode]);
  const maxSeconds = Math.max(1, ...tree.map((node) => node.seconds));
  const ignored = React.useMemo(
    () => (dragging ? descendantIds(nodes, dragging) : null),
    [dragging, nodes],
  );

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("kairos:dashboard-area-sort");
      // Restoring a persisted UI preference after hydration is an external-store sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "name" || stored === "manual") setSortMode(stored);
    } catch {
      // ignore
    }
  }, []);

  const persistSort = (next: SortMode) => {
    setSortMode(next);
    try {
      localStorage.setItem("kairos:dashboard-area-sort", next);
    } catch {
      // ignore
    }
  };

  const move = (id: string, parentId: string | null, anchor: { id: string; placement: "before" | "after" }) => {
    startMove(async () => {
      const result = await moveItem(id, parentId, anchor);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Order updated");
      setDragging(null);
      setDropTarget(null);
      if (sortMode !== "manual") persistSort("manual");
      router.refresh();
    });
  };

  const parentIds = React.useMemo(
    () => nodes.filter((node) => nodes.some((child) => child.parentId === node.id)).map((node) => node.id),
    [nodes],
  );
  const allExpanded = parentIds.length > 0 && parentIds.every((id) => expanded.has(id));

  const toggleExpandAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(parentIds));
  };

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: Node): React.ReactNode => {
    const open = expanded.has(node.id);
    const children = node.children;

    return (
      <div key={node.id}>
        <ContextMenu>
        <ContextMenuTrigger asChild>
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
            if (!dragging || ignored?.has(node.id)) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            setDropTarget({
              id: node.id,
              placement: event.clientY < rect.top + rect.height / 2 ? "before" : "after",
            });
          }}
          onDragLeave={() => setDropTarget((current) => (current?.id === node.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            if (!dragging || ignored?.has(node.id)) return;
            const placement = dropTarget?.id === node.id ? dropTarget.placement : "after";
            move(dragging, node.parentId, { id: node.id, placement });
          }}
          className={cn(
            "group relative flex cursor-grab items-center gap-2 border-b border-border/60 py-2.5 pr-4 transition-colors last:border-b-0 hover:bg-surface-2/40 active:cursor-grabbing",
            dragging === node.id && "opacity-40",
          )}
          style={{ paddingLeft: 20 + node.depth * 18 }}
        >
          <button
            type="button"
            onClick={() => children.length > 0 && toggle(node.id)}
            aria-expanded={children.length > 0 ? open : undefined}
            aria-label={children.length > 0 ? `${open ? "Collapse" : "Expand"} ${node.name}` : undefined}
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded text-muted-2",
              children.length > 0 ? "hover:bg-surface-3 hover:text-text" : "opacity-30",
            )}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px]"
            style={{ background: `${node.color ?? "#6366f1"}14`, color: node.color ?? "#6366f1" }}
          >
            {node.icon ?? "•"}
          </span>
          <button type="button" onClick={() => children.length > 0 && toggle(node.id)} className="min-w-0 flex-1 text-left">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-semibold">{node.name}</span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                {node.seconds > 0 ? formatDuration(node.seconds) : "—"}
              </span>
            </span>
            <span className="mt-1 flex items-center gap-2">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${node.seconds > 0 ? Math.max(4, (node.seconds / maxSeconds) * 100) : 0}%`,
                    background: node.color ?? "var(--primary)",
                  }}
                />
              </span>
              {node.goalCount > 0 ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px] font-medium text-muted-2">
                  <Target className="h-2.5 w-2.5" />
                  {node.goalCount}
                </span>
              ) : null}
              {children.length > 0 ? (
                <span className="shrink-0 text-[9px] font-medium text-muted-2">
                  {children.length} {pluralize(children.length, "child", "children")}
                </span>
              ) : null}
            </span>
          </button>
          {timer?.itemId === node.id ? (
            <LiveTimer itemId={node.id} name={node.name} />
          ) : (
            <button
              type="button"
              onClick={() => start(node.id)}
              className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-primary/15 bg-primary-soft px-2.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-contrast"
              aria-label={`Start timer for ${node.name}`}
              title={`Start a timer for ${node.name}`}
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              Track
            </button>
          )}
          <Link
            href={`/items/${node.id}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
            aria-label={`Open ${node.name}`}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {dropTarget?.id === node.id ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-primary"
              style={{
                top: dropTarget.placement === "before" ? -1 : undefined,
                bottom: dropTarget.placement === "after" ? -1 : undefined,
              }}
            />
          ) : null}
        </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{node.name}</ContextMenuLabel>
          <ContextMenuItem onSelect={() => start(node.id)}>
            <Play className="h-4 w-4" /> Start timer
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => openManualTime({ itemId: node.id })}>
            <ClockPlus className="h-4 w-4" /> Add time
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => openNewGoal(node.id)}>
            <Target className="h-4 w-4" /> New goal
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => router.push(`/items/${node.id}`)}>
            <ArrowRight className="h-4 w-4" /> Open project
          </ContextMenuItem>
        </ContextMenuContent>
        </ContextMenu>
        {open ? <div>{children.map(renderNode)}</div> : null}
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm font-semibold">Nothing tracked this week yet</p>
        <p className="mt-1 text-xs text-muted">Your top-level areas will appear here as time accumulates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2/60 p-0.5" role="group" aria-label="Sort areas">
          {(
            [
              { value: "name", label: "Name" },
              { value: "manual", label: "Manual" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => persistSort(option.value)}
              aria-pressed={sortMode === option.value}
              className={cn(
                "h-6 rounded-md px-2 text-[10px] font-bold transition-colors",
                sortMode === option.value
                  ? "bg-primary text-primary-contrast"
                  : "text-muted hover:bg-surface-3 hover:text-text",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[9px] font-medium text-muted-2 sm:inline">Drag to reorder</span>
          <button
            type="button"
            onClick={toggleExpandAll}
            disabled={parentIds.length === 0}
            aria-pressed={allExpanded}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
          >
            {allExpanded ? <ChevronsUp className="h-3 w-3" /> : <ChevronsDown className="h-3 w-3" />}
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>
      <div>{tree.map(renderNode)}</div>
    </div>
  );
}
