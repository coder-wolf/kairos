"use client";

import * as React from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Clock3, LocateFixed, NotebookPen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteSession, updateSession } from "@/app/actions/sessions";
import { useQuickActions } from "@/components/quick-actions";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { endOfDayKey, startOfDayKey } from "@/lib/time";
import type { SessionRow } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const ROW_HEIGHT = 56;
const TOTAL_HEIGHT = 24 * ROW_HEIGHT;
const GUTTER_WIDTH = 58;

type Segment = {
  session: SessionRow;
  start: Date;
  end: Date;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
};

function layoutDay(segments: Omit<Segment, "lane" | "lanes">[]): Segment[] {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const placed: Segment[] = [];
  let group: Segment[] = [];
  let groupEnd = -1;

  const flush = () => {
    if (!group.length) return;
    const laneEnds: number[] = [];
    for (const segment of group) {
      let lane = laneEnds.findIndex((end) => end <= segment.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(segment.endMin);
      } else {
        laneEnds[lane] = segment.endMin;
      }
      segment.lane = lane;
    }
    const lanes = laneEnds.length;
    for (const segment of group) {
      segment.lanes = lanes;
      placed.push(segment);
    }
    group = [];
    groupEnd = -1;
  };

  for (const segment of sorted) {
    if (group.length && segment.startMin >= groupEnd) flush();
    group.push({ ...segment, lane: 0, lanes: 1 });
    groupEnd = Math.max(groupEnd, segment.endMin);
  }
  flush();
  return placed;
}

function hourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function DayTimeline({
  sessions,
  todayKey,
  timezone,
  fill = false,
}: {
  sessions: SessionRow[];
  todayKey: string;
  timezone: string;
  fill?: boolean;
}) {
  const { openManualTime } = useQuickActions();
  const router = useRouter();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [selection, setSelection] = React.useState<{ startMin: number; endMin: number } | null>(null);
  const selectionDrag = React.useRef<{ anchorMin: number; moved: boolean; element: HTMLDivElement } | null>(null);
  const [dragPreview, setDragPreview] = React.useState<{ startMin: number; endMin: number; sessionId: string } | null>(null);
  const sessionDrag = React.useRef<{
    session: SessionRow;
    durationMin: number;
    offsetMin: number;
    startX: number;
    startY: number;
    moved: boolean;
    element: HTMLButtonElement;
    previewStartMin: number | null;
  } | null>(null);
  const suppressClick = React.useRef<string | null>(null);
  const [contextTarget, setContextTarget] = React.useState<
    { kind: "session"; session: SessionRow } | { kind: "slot"; startMin: number } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SessionRow | null>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    const hour = Number(formatInTimeZone(new Date(), timezone, "H"));
    scrollRef.current.scrollTop = Math.max(0, hour * ROW_HEIGHT - 160);
  }, [timezone]);

  const nowMinutes = React.useMemo(() => {
    const hour = Number(formatInTimeZone(new Date(now), timezone, "H"));
    const minute = Number(formatInTimeZone(new Date(now), timezone, "m"));
    return hour * 60 + minute;
  }, [now, timezone]);

  const segments = React.useMemo(() => {
    const dayStart = startOfDayKey(todayKey, timezone);
    const dayEnd = endOfDayKey(todayKey, timezone);
    const raw: Omit<Segment, "lane" | "lanes">[] = [];
    for (const session of sessions) {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      if (start >= dayEnd || end <= dayStart) continue;
      const visibleStart = start < dayStart ? dayStart : start;
      const visibleEnd = end > dayEnd ? dayEnd : end;
      const startMin = (visibleStart.getTime() - dayStart.getTime()) / 60_000;
      const endMin = (visibleEnd.getTime() - dayStart.getTime()) / 60_000;
      if (endMin <= startMin) continue;
      raw.push({ session, start: visibleStart, end: visibleEnd, startMin, endMin });
    }
    return layoutDay(raw);
  }, [sessions, todayKey, timezone]);

  const total = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);

  const snapMinutes = (clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const rawMinutes = ((clientY - rect.top) / ROW_HEIGHT) * 60;
    return Math.max(0, Math.min(23 * 60 + 45, Math.round(rawMinutes / 15) * 15));
  };

  const timeLabel = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  const beginSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    const element = event.currentTarget;
    const anchorMin = snapMinutes(event.clientY, element);
    selectionDrag.current = { anchorMin, moved: false, element };
    setSelection({ startMin: anchorMin, endMin: Math.min(1440, anchorMin + 15) });
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const updateSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDrag.current;
    if (!drag) return;
    const currentMin = snapMinutes(event.clientY, drag.element);
    if (currentMin !== drag.anchorMin) drag.moved = true;
    const startMin = Math.min(drag.anchorMin, currentMin);
    const endMin = Math.min(1440, Math.max(drag.anchorMin, currentMin) + 15);
    setSelection({ startMin, endMin });
  };

  const finishSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDrag.current;
    if (!drag) return;
    const currentMin = snapMinutes(event.clientY, drag.element);
    const startMin = Math.min(drag.anchorMin, currentMin);
    const endMin = Math.min(1440, drag.moved ? Math.max(drag.anchorMin, currentMin) + 15 : startMin + 30);
    selectionDrag.current = null;
    setSelection(null);
    if (drag.element.hasPointerCapture(event.pointerId)) {
      drag.element.releasePointerCapture(event.pointerId);
    }
    openManualTime({
      date: todayKey,
      startTime: timeLabel(startMin),
      durationMinutes: Math.max(15, endMin - startMin),
      timezone,
    });
  };

  const cancelSelection = () => {
    selectionDrag.current = null;
    setSelection(null);
  };

  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${todayKey}T12:00:00Z`));

  const startSessionDrag = (event: React.PointerEvent<HTMLButtonElement>, session: SessionRow, segment: Segment) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const element = event.currentTarget;
    const dayElement = element.closest("[data-day-column]") as HTMLElement | null;
    if (!dayElement) return;
    const durationMin = Math.max(1, Math.round(segment.endMin - segment.startMin));
    const offsetMin = Math.max(
      0,
      Math.min(durationMin, snapMinutes(event.clientY, dayElement) - Math.round(segment.startMin)),
    );
    sessionDrag.current = {
      session,
      durationMin,
      offsetMin,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      element,
      previewStartMin: null,
    };
    element.setPointerCapture(event.pointerId);
  };

  const moveSessionDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = sessionDrag.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    drag.moved = true;
    const dayElement = drag.element.closest("[data-day-column]") as HTMLElement | null;
    if (!dayElement) return;
    const minute = snapMinutes(event.clientY, dayElement);
    const startMin = Math.max(0, Math.min(1440 - drag.durationMin, minute - drag.offsetMin));
    drag.previewStartMin = startMin;
    setDragPreview({ startMin, endMin: startMin + drag.durationMin, sessionId: drag.session.id });
  };

  const endSessionDrag = async (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = sessionDrag.current;
    if (!drag) return;
    sessionDrag.current = null;
    if (drag.element.hasPointerCapture(event.pointerId)) drag.element.releasePointerCapture(event.pointerId);
    const startMin = drag.previewStartMin;
    setDragPreview(null);
    if (!drag.moved) {
      openManualTime({ itemId: drag.session.itemId, session: drag.session, timezone });
      return;
    }
    suppressClick.current = drag.session.id;
    window.setTimeout(() => {
      if (suppressClick.current === drag.session.id) suppressClick.current = null;
    }, 600);
    if (startMin === null) return;
    const result = await updateSession({
      id: drag.session.id,
      itemId: drag.session.itemId,
      date: todayKey,
      startTime: timeLabel(startMin),
      durationMinutes: drag.durationMin,
      description: drag.session.description ?? undefined,
      timezone,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const block = target.closest<HTMLElement>("[data-session-id]");
    if (block) {
      const session = sessions.find((candidate) => candidate.id === block.dataset.sessionId);
      setContextTarget(session ? { kind: "session", session } : null);
      return;
    }
    const column = target.closest<HTMLElement>("[data-day-column]");
    if (!column) {
      setContextTarget(null);
      return;
    }
    setContextTarget({ kind: "slot", startMin: snapMinutes(event.clientY, column) });
  };

  return (
    <section
      className={cn(
        "card relative overflow-hidden",
        fill ? "flex h-full min-h-0 flex-col" : "xl:sticky xl:top-24 xl:self-start",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-b from-surface-2/50 to-surface px-5 py-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Today&apos;s timeline</h2>
          <p className="text-[11px] text-muted">
            {dayLabel} ·{" "}
            {sessions.length === 0
              ? "No entries yet — drag a slot to add time"
              : `${sessions.length} ${sessions.length === 1 ? "entry" : "entries"} · ${formatDuration(total, { zero: "0m" })} tracked`}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            scrollRef.current?.scrollTo({
              top: Math.max(0, (nowMinutes / 60) * ROW_HEIGHT - 160),
              behavior: "smooth",
            })
          }
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
        >
          <LocateFixed className="h-3 w-3" /> Now
        </button>
      </div>

      <div className="border-b border-border px-5 py-2 text-[10px] font-medium text-muted-2">
        Drag to add · drag a block to move · right-click for options
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "scroll-thin overflow-y-auto",
          fill ? "min-h-0 flex-1" : "max-h-[calc(100vh-300px)] min-h-[520px]",
        )}
      >
        <div className="flex">
          <div className="relative shrink-0 border-r border-border bg-surface/80" style={{ width: GUTTER_WIDTH, height: TOTAL_HEIGHT }}>
            {Array.from({ length: 24 }).map((_, hour) => (
              <span
                key={hour}
                className="absolute right-2.5 -translate-y-1/2 font-mono text-[9px] font-medium tabular-nums text-muted-2"
                style={{ top: hour * ROW_HEIGHT }}
              >
                {hour === 0 ? "" : hourLabel(hour)}
              </span>
            ))}
          </div>

          <ContextMenu>
          <ContextMenuTrigger asChild>
          <div
            data-day-column
            onContextMenuCapture={handleContextMenu}
            onPointerDown={beginSelection}
            onPointerMove={updateSelection}
            onPointerUp={finishSelection}
            onPointerCancel={cancelSelection}
            className="relative flex-1 cursor-crosshair bg-primary-soft/5 transition-colors hover:bg-primary-soft/10"
            style={{
              height: TOTAL_HEIGHT,
              backgroundImage:
                "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--border) 85%, transparent) 0 1px, transparent 1px 56px), repeating-linear-gradient(to bottom, transparent 0 27px, color-mix(in srgb, var(--border) 28%, transparent) 27px 28px, transparent 28px 56px)",
            }}
          >
            {dragPreview ? (
              <div
                className="pointer-events-none absolute left-1 right-1 z-30 rounded-md border border-primary bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary shadow-sm"
                style={{
                  top: (dragPreview.startMin / 60) * ROW_HEIGHT,
                  height: Math.max(22, ((dragPreview.endMin - dragPreview.startMin) / 60) * ROW_HEIGHT),
                }}
              >
                {timeLabel(dragPreview.startMin)} – {timeLabel(dragPreview.endMin)}
              </div>
            ) : null}

            {selection ? (
              <div
                className="pointer-events-none absolute left-1 right-1 z-[5] rounded-md border border-primary/60 bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary"
                style={{
                  top: (selection.startMin / 60) * ROW_HEIGHT,
                  height: Math.max(20, ((selection.endMin - selection.startMin) / 60) * ROW_HEIGHT),
                }}
              >
                {timeLabel(selection.startMin)} – {timeLabel(selection.endMin)} ·{" "}
                {formatDuration((selection.endMin - selection.startMin) * 60)}
              </div>
            ) : null}

            {segments.map((segment) => {
              const top = (segment.startMin / 60) * ROW_HEIGHT;
              const height = Math.max(24, ((segment.endMin - segment.startMin) / 60) * ROW_HEIGHT);
              const width = 100 / segment.lanes;
              const color = segment.session.itemColor ?? "var(--primary)";
              return (
                <button
                  key={`${segment.session.id}-${segment.startMin}-${segment.lane}`}
                  type="button"
                  data-session-id={segment.session.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressClick.current === segment.session.id) {
                      suppressClick.current = null;
                      return;
                    }
                    openManualTime({ itemId: segment.session.itemId, session: segment.session, timezone });
                  }}
                  onPointerDown={(event) => startSessionDrag(event, segment.session, segment)}
                  onPointerMove={moveSessionDrag}
                  onPointerUp={endSessionDrag}
                  onPointerCancel={() => {
                    sessionDrag.current = null;
                    setDragPreview(null);
                  }}
                  className={cn(
                    "absolute z-10 cursor-grab touch-none overflow-hidden rounded-lg px-2 py-1 text-left transition-all duration-150 hover:z-20 hover:-translate-y-px hover:shadow-[0_5px_16px_-6px_rgba(15,15,25,0.35)] active:cursor-grabbing",
                    dragPreview?.sessionId === segment.session.id && "opacity-40",
                  )}
                  style={{
                    top,
                    height,
                    left: `calc(${(segment.lane / segment.lanes) * 100}% + 2px)`,
                    width: `calc(${width}% - 5px)`,
                    background: `linear-gradient(180deg, color-mix(in srgb, ${color} 20%, var(--surface)) 0%, color-mix(in srgb, ${color} 10%, var(--surface)) 100%)`,
                    border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
                    borderLeft: `3px solid ${color}`,
                  }}
                  title={`${segment.session.itemName}${segment.session.description ? ` · ${segment.session.description}` : ""}\n${formatInTimeZone(segment.start, timezone, "h:mm a")} – ${formatInTimeZone(segment.end, timezone, "h:mm a")} · ${formatDuration(segment.session.durationSeconds, { showSeconds: true })}`}
                >
                  <span
                    className="block truncate text-[11px] font-bold leading-tight"
                    style={{ color: `color-mix(in srgb, ${color} 72%, var(--text))` }}
                  >
                    {segment.session.itemName}
                  </span>
                  {height > 34 ? (
                    <span className="mt-0.5 block truncate text-[9px] font-semibold text-muted">
                      {formatInTimeZone(segment.start, timezone, "h:mm a")} –{" "}
                      {formatInTimeZone(segment.end, timezone, "h:mm a")}
                    </span>
                  ) : null}
                  {height > 58 && segment.session.description ? (
                    <span className="mt-0.5 block truncate text-[9px] text-muted-2">
                      {segment.session.description}
                    </span>
                  ) : null}
                </button>
              );
            })}

            <div
              className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
              style={{ top: (nowMinutes / 60) * ROW_HEIGHT }}
              suppressHydrationWarning
            >
              <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_18%,transparent)]" />
              <span className="h-px flex-1 bg-danger/80" />
              <span suppressHydrationWarning className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-white">
                {formatInTimeZone(new Date(now), timezone, "h:mm a")}
              </span>
            </div>
          </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {contextTarget?.kind === "session" ? (
              <>
                <ContextMenuLabel>{contextTarget.session.itemName}</ContextMenuLabel>
                <ContextMenuItem
                  onSelect={() =>
                    openManualTime({
                      itemId: contextTarget.session.itemId,
                      session: contextTarget.session,
                      timezone,
                    })
                  }
                >
                  <NotebookPen className="h-3.5 w-3.5 text-muted" /> Edit entry
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem destructive onSelect={() => setDeleteTarget(contextTarget.session)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete entry
                </ContextMenuItem>
              </>
            ) : contextTarget?.kind === "slot" ? (
              <>
                <ContextMenuLabel>{timeLabel(contextTarget.startMin)}</ContextMenuLabel>
                <ContextMenuItem
                  onSelect={() =>
                    openManualTime({
                      date: todayKey,
                      startTime: timeLabel(contextTarget.startMin),
                      durationMinutes: 30,
                      timezone,
                    })
                  }
                >
                  <Clock3 className="h-3.5 w-3.5 text-muted" /> Add time at {timeLabel(contextTarget.startMin)}
                </ContextMenuItem>
              </>
            ) : null}
          </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this time entry?"
        description={
          deleteTarget
            ? `${formatDuration(deleteTarget.durationSeconds, { showSeconds: true })} on ${deleteTarget.itemName} will be removed. Parent totals and goals will update immediately.`
            : ""
        }
        confirmLabel="Delete entry"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return { ok: false, error: "Entry not found." };
          const result = await deleteSession(deleteTarget.id);
          if (result.ok) {
            toast.success("Time entry deleted");
            setDeleteTarget(null);
            router.refresh();
          }
          return result;
        }}
      />
    </section>
  );
}
