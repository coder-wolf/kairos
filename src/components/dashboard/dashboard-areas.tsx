"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Play, Target } from "lucide-react";
import { useTimer } from "@/components/timer/timer-provider";
import type { AreaNode } from "@/lib/types";
import { cn, formatDuration, pluralize } from "@/lib/utils";

type Node = AreaNode & { children: Node[]; depth: number };

function buildTree(nodes: AreaNode[]): Node[] {
  const byId = new Map<string, Node>();
  for (const node of nodes) byId.set(node.id, { ...node, children: [], depth: 0 });
  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (list: Node[], depth: number) => {
    list.sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name));
    for (const node of list) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots, 0);
  return roots;
}

export function DashboardAreas({ nodes }: { nodes: AreaNode[] }) {
  const { start } = useTimer();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const tree = React.useMemo(() => buildTree(nodes), [nodes]);
  const maxSeconds = Math.max(1, ...tree.map((node) => node.seconds));

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
        <div
          className="group flex items-center gap-2 border-b border-border/60 py-2.5 pr-4 transition-colors last:border-b-0 hover:bg-surface-2/40"
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
          <Link
            href={`/items/${node.id}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
            aria-label={`Open ${node.name}`}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
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

  return <div>{tree.map(renderNode)}</div>;
}
