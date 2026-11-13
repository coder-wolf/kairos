"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { MoreHorizontal, Pencil, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSession } from "@/app/actions/sessions";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useQuickActions } from "@/components/quick-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dayLabel } from "@/lib/time";
import type { ItemOption, SessionRow } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

function sourceLabel(source: SessionRow["source"]) {
  if (source === "TIMER") return "Timer";
  if (source === "POMODORO") return "Pomodoro";
  return "Manual";
}

export function SessionList({
  sessions,
  timezone,
  grouped = false,
  showPath = false,
  emptyState,
}: {
  sessions: SessionRow[];
  items: ItemOption[];
  timezone: string;
  todayKey: string;
  grouped?: boolean;
  showPath?: boolean;
  emptyState?: React.ReactNode;
}) {
  const router = useRouter();
  const { openManualTime } = useQuickActions();
  const [toDelete, setToDelete] = React.useState<SessionRow | null>(null);

  if (sessions.length === 0) {
    return <>{emptyState ?? <p className="px-4 py-8 text-center text-sm text-muted">No sessions here yet.</p>}</>;
  }

  const groups = new Map<string, SessionRow[]>();
  for (const session of sessions) {
    const key = formatInTimeZone(new Date(session.startTime), timezone, "yyyy-MM-dd");
    const list = groups.get(key) ?? [];
    list.push(session);
    groups.set(key, list);
  }

  const renderRow = (session: SessionRow) => (
    <div
      key={session.id}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50"
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{
          background: `${session.itemColor ?? "#6366f1"}14`,
          color: session.itemColor ?? "#6366f1",
        }}
      >
        <Timer className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{session.itemName}</p>
        <p className="truncate text-[11px] text-muted">
          {session.description || (showPath ? session.itemPath : sourceLabel(session.source))}
          {session.description && showPath ? ` · ${session.itemPath}` : ""}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-[12px] font-semibold tabular-nums">{formatDuration(session.durationSeconds)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-2">
          {formatInTimeZone(new Date(session.startTime), timezone, "h:mm a")} –{" "}
          {formatInTimeZone(new Date(session.endTime), timezone, "h:mm a")}
        </p>
      </div>
      <div className="text-right sm:hidden">
        <p className="text-[12px] font-semibold tabular-nums">{formatDuration(session.durationSeconds)}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-2 opacity-0 transition-opacity hover:bg-surface-2 hover:text-text group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Session options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              openManualTime({
                itemId: session.itemId,
                session,
              })
            }
          >
            <Pencil className="h-4 w-4" /> Edit entry
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setToDelete(session)}>
            <Trash2 className="h-4 w-4" /> Delete entry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      {grouped ? (
        <div className="space-y-5">
          {Array.from(groups.entries()).map(([key, daySessions]) => {
            const total = daySessions.reduce((acc, session) => acc + session.durationSeconds, 0);
            return (
              <div key={key}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    {dayLabel(key, timezone)}
                  </p>
                  <p className={cn("text-[11px] font-semibold tabular-nums text-muted-2")}>{formatDuration(total)}</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="divide-y divide-border">{daySessions.map(renderRow)}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-border">{sessions.map(renderRow)}</div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this time entry?"
        description={
          toDelete
            ? `${formatDuration(toDelete.durationSeconds)} on ${toDelete.itemName} will be removed. Parent totals and goals will update immediately.`
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
