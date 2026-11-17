"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Flame, MoreHorizontal, Pencil, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSession } from "@/app/actions/sessions";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useQuickActions } from "@/components/quick-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionRow } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

function sourceBadge(source: SessionRow["source"]) {
  if (source === "TIMER") return { label: "Timer", icon: Timer, color: "var(--primary)" };
  if (source === "POMODORO") return { label: "Pomodoro", icon: Flame, color: "var(--danger)" };
  return { label: "Manual", icon: Pencil, color: "var(--muted)" };
}

export function SessionTable({
  sessions,
  timezone,
  emptyState,
  compact = false,
}: {
  sessions: SessionRow[];
  timezone: string;
  emptyState?: React.ReactNode;
  compact?: boolean;
}) {
  const router = useRouter();
  const { openManualTime } = useQuickActions();
  const [toDelete, setToDelete] = React.useState<SessionRow | null>(null);

  if (sessions.length === 0) {
    return <>{emptyState ?? <p className="px-5 py-10 text-center text-sm text-muted">No sessions here yet.</p>}</>;
  }

  return (
    <>
      <div className="scroll-thin overflow-x-auto">
        <table className={compact ? "w-full border-collapse text-[11px]" : "w-full min-w-[820px] border-collapse text-[11px]"}>
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">
              <th className={compact ? "px-3 py-2 text-left" : "px-4 py-2.5 text-left"}>Date</th>
              {!compact ? <th className="px-3 py-2.5 text-left">Time</th> : null}
              <th className={compact ? "px-3 py-2 text-left" : "px-3 py-2.5 text-left"}>Item</th>
              {!compact ? <th className="px-3 py-2.5 text-left">Description</th> : null}
              {!compact ? <th className="px-3 py-2.5 text-left">Type</th> : null}
              <th className={compact ? "px-3 py-2 text-right" : "px-3 py-2.5 text-right"}>Duration</th>
              <th className="w-9 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const badge = sourceBadge(session.source);
              const Icon = badge.icon;
              return (
                <ContextMenu key={session.id}>
                  <ContextMenuTrigger asChild>
                    <tr className="group border-b border-border/70 last:border-b-0 hover:bg-surface-2/40">
                  <td className={compact ? "whitespace-nowrap px-3 py-2" : "whitespace-nowrap px-4 py-2.5"}>
                    <span className="block font-semibold">
                      {formatInTimeZone(new Date(session.startTime), timezone, compact ? "MMM d" : "EEE, MMM d")}
                    </span>
                    {compact ? (
                      <span className="block text-[9px] text-muted-2">
                        {formatInTimeZone(new Date(session.startTime), timezone, "h:mm a")}
                      </span>
                    ) : null}
                  </td>
                  {!compact ? (
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {formatInTimeZone(new Date(session.startTime), timezone, "h:mm a")} –{" "}
                      {formatInTimeZone(new Date(session.endTime), timezone, "h:mm a")}
                    </td>
                  ) : null}
                  <td className={compact ? "px-3 py-2" : "px-3 py-2.5"}>
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                        style={{
                          background: `${session.itemColor ?? "#6366f1"}14`,
                          color: session.itemColor ?? "#6366f1",
                        }}
                      >
                        <Timer className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/items/${session.itemId}`} className="block max-w-[210px] truncate font-semibold hover:text-primary">
                          {session.itemName}
                        </Link>
                        <span className="block max-w-[240px] truncate text-[9px] text-muted-2">
                          {compact ? session.description || session.itemPath : session.itemPath}
                        </span>
                      </div>
                    </div>
                  </td>
                  {!compact ? (
                    <td className="px-3 py-2.5">
                      <span className="block max-w-[240px] truncate text-muted">
                        {session.description || <span className="text-muted-2">—</span>}
                      </span>
                    </td>
                  ) : null}
                  {!compact ? (
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `${badge.color}14`, color: badge.color }}>
                        <Icon className="h-2.5 w-2.5" /> {badge.label}
                      </span>
                    </td>
                  ) : null}
                  <td className={compact ? "whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums" : "whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums"}>
                    {formatDuration(session.durationSeconds, { showSeconds: true })}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="grid h-7 w-7 place-items-center rounded-md text-muted-2 opacity-100 hover:bg-surface-2 hover:text-text md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label="Session options"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openManualTime({ itemId: session.itemId, session })}>
                          <Pencil className="h-4 w-4" /> Edit entry
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setToDelete(session)}>
                          <Trash2 className="h-4 w-4" /> Delete entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuLabel>{session.itemName}</ContextMenuLabel>
                    <ContextMenuItem onSelect={() => openManualTime({ itemId: session.itemId, session })}>
                      <Pencil className="h-4 w-4" /> Edit entry
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem destructive onSelect={() => setToDelete(session)}>
                      <Trash2 className="h-4 w-4" /> Delete entry
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this time entry?"
        description={
          toDelete
            ? `${formatDuration(toDelete.durationSeconds, { showSeconds: true })} on ${toDelete.itemName} will be removed. Parent totals and goals will update immediately.`
            : ""
        }
        confirmLabel="Delete entry"
        destructive
        onConfirm={async () => {
          if (!toDelete) return { ok: false, error: "Nothing selected." };
          const result = await deleteSession(toDelete.id);
          if (result.ok) {
            toast.success("Time entry deleted");
            setToDelete(null);
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />
    </>
  );
}
