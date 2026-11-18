"use client";

import * as React from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Clock3, Globe2, Layers, LocateFixed, NotebookPen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteSession, updateSession } from "@/app/actions/sessions";
import Link from "next/link";
import { useQuickActions } from "@/components/quick-actions";
import { nowScrollTop, useScrollToNow } from "@/components/timer/use-scroll-to-now";
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

export type CalendarDay = {
  key: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
};

type Segment = {
  session: SessionRow;
  start: Date;
  end: Date;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
  color: string;
};

function layoutDay(segments: Array<Omit<Segment, "lane" | "lanes">>): Segment[] {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const placed: Segment[] = [];
  let group: Segment[] = [];
  let groupEnd = -1;

  const flush = () => {
    if (group.length === 0) return;
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
    if (group.length > 0 && segment.startMin >= groupEnd) flush();
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

export function WeekCalendar({
  sessions,
  days,
  timezone,
  weekLabel,
  weekOfLabel,
  prevHref,
  nextHref,
  todayHref,
  isCurrentWeek,
  weekTotal,
  sessionCount,
  timezoneLabel,
}: {
  sessions: SessionRow[];
  days: CalendarDay[];
  timezone: string;
  weekLabel: string;
  weekOfLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  isCurrentWeek: boolean;
  weekTotal: number;
  sessionCount: number;
  timezoneLabel: string;
}) {
  const { openManualTime } = useQuickActions();
  const router = useRouter();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [selection, setSelection] = React.useState<{ dayKey: string; startMin: number; endMin: number } | null>(null);
  const selectionDrag = React.useRef<{
    dayKey: string;
    anchorMin: number;
    moved: boolean;
    element: HTMLDivElement;
  } | null>(null);
  const [dragPreview, setDragPreview] = React.useState<{
    dayKey: string;
    startMin: number;
    endMin: number;
    sessionId: string;
  } | null>(null);
  const sessionDrag = React.useRef<{
    session: SessionRow;
    dayKey: string;
    durationMin: number;
    offsetMin: number;
    startX: number;
    startY: number;
    moved: boolean;
    element: HTMLButtonElement;
    preview: { dayKey: string; startMin: number } | null;
  } | null>(null);
  const suppressClick = React.useRef<string | null>(null);
  const [contextTarget, setContextTarget] = React.useState<
    | { kind: "session"; session: SessionRow }
    | { kind: "slot"; dayKey: string; startMin: number }
    | null
  >(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SessionRow | null>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useScrollToNow(scrollRef, timezone, ROW_HEIGHT);

  const byDay = React.useMemo(() => {
    const map = new Map<string, Segment[]>();
    for (const day of days) {
      const dayStart = startOfDayKey(day.key, timezone);
      const dayEnd = endOfDayKey(day.key, timezone);
      const segments: Array<Omit<Segment, "lane" | "lanes">> = [];

      for (const session of sessions) {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        if (start >= dayEnd || end <= dayStart) continue;
        const visibleStart = start < dayStart ? dayStart : start;
        const visibleEnd = end > dayEnd ? dayEnd : end;
        const startMin = (visibleStart.getTime() - dayStart.getTime()) / 60_000;
        const endMin = (visibleEnd.getTime() - dayStart.getTime()) / 60_000;
        if (endMin <= startMin) continue;
        segments.push({
          session,
          start: visibleStart,
          end: visibleEnd,
          startMin,
          endMin,
          color: session.itemColor ?? "var(--primary)",
        });
      }
      map.set(day.key, layoutDay(segments));
    }
    return map;
  }, [sessions, days, timezone]);

  const nowMinutes = React.useMemo(() => {
    const hour = Number(formatInTimeZone(new Date(now), timezone, "H"));
    const minute = Number(formatInTimeZone(new Date(now), timezone, "m"));
    return hour * 60 + minute;
  }, [now, timezone]);

  const dayTotals = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const [key, segments] of byDay.entries()) {
      let seconds = 0;
      for (const segment of segments) seconds += (segment.end.getTime() - segment.start.getTime()) / 1000;
      totals.set(key, Math.round(seconds));
    }
    return totals;
  }, [byDay]);

  const today = days.find((day) => day.isToday);
  const snapMinutes = (clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const rawMinutes = ((clientY - rect.top) / ROW_HEIGHT) * 60;
    return Math.max(0, Math.min(23 * 60 + 45, Math.round(rawMinutes / 15) * 15));
  };

  const timeLabel = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  const beginSelection = (dayKey: string, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    const element = event.currentTarget;
    const anchorMin = snapMinutes(event.clientY, element);
    selectionDrag.current = { dayKey, anchorMin, moved: false, element };
    setSelection({ dayKey, startMin: anchorMin, endMin: Math.min(1440, anchorMin + 15) });
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const updateSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = selectionDrag.current;
    if (!drag) return;
    const currentMin = snapMinutes(event.clientY, drag.element);
    if (currentMin !== drag.anchorMin) drag.moved = true;
    const startMin = Math.min(drag.anchorMin, currentMin);
    const endMin = Math.max(drag.anchorMin, currentMin) + 15;
    setSelection({ dayKey: drag.dayKey, startMin, endMin: Math.min(1440, endMin) });
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
      date: drag.dayKey,
      startTime: timeLabel(startMin),
      durationMinutes: Math.max(15, endMin - startMin),
      timezone,
    });
  };

  const cancelSelection = () => {
    selectionDrag.current = null;
    setSelection(null);
  };

  const targetDayElement = (clientX: number, clientY: number, fallback: string) => {
    const under = document.elementFromPoint(clientX, clientY);
    return (under?.closest("[data-day-key]") as HTMLElement | null) ?? document.querySelector<HTMLElement>(`[data-day-key="${fallback}"]`);
  };

  const startSessionDrag = (event: React.PointerEvent<HTMLButtonElement>, session: SessionRow, segment: Segment, dayKey: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const element = event.currentTarget;
    const dayElement = element.closest("[data-day-key]") as HTMLElement | null;
    if (!dayElement) return;
    const durationMin = Math.max(1, Math.round(segment.endMin - segment.startMin));
    const offsetMin = Math.max(
      0,
      Math.min(durationMin, snapMinutes(event.clientY, dayElement) - Math.round(segment.startMin)),
    );
    sessionDrag.current = {
      session,
      dayKey,
      durationMin,
      offsetMin,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      element,
      preview: null,
    };
    element.setPointerCapture(event.pointerId);
  };

  const moveSessionDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = sessionDrag.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    drag.moved = true;
    const dayElement = targetDayElement(event.clientX, event.clientY, drag.dayKey);
    if (!dayElement) return;
    const dayKey = dayElement.dataset.dayKey ?? drag.dayKey;
    const minute = snapMinutes(event.clientY, dayElement);
    const startMin = Math.max(0, Math.min(1440 - drag.durationMin, minute - drag.offsetMin));
    drag.preview = { dayKey, startMin };
    setDragPreview({
      dayKey,
      startMin,
      endMin: startMin + drag.durationMin,
      sessionId: drag.session.id,
    });
  };

  const endSessionDrag = async (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = sessionDrag.current;
    if (!drag) return;
    sessionDrag.current = null;
    if (drag.element.hasPointerCapture(event.pointerId)) drag.element.releasePointerCapture(event.pointerId);
    const preview = drag.preview;
    setDragPreview(null);
    if (!drag.moved) {
      openManualTime({ itemId: drag.session.itemId, session: drag.session, timezone });
      return;
    }
    suppressClick.current = drag.session.id;
    window.setTimeout(() => {
      if (suppressClick.current === drag.session.id) suppressClick.current = null;
    }, 600);
    if (!preview) return;
    const result = await updateSession({
      id: drag.session.id,
      itemId: drag.session.itemId,
      date: preview.dayKey,
      startTime: timeLabel(preview.startMin),
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
    const dayElement = target.closest<HTMLElement>("[data-day-key]");
    if (!dayElement) {
      setContextTarget(null);
      return;
    }
    setContextTarget({
      kind: "slot",
      dayKey: dayElement.dataset.dayKey ?? "",
      startMin: snapMinutes(event.clientY, dayElement),
    });
  };

  const slotDay = contextTarget?.kind === "slot" ? days.find((day) => day.key === contextTarget.dayKey) : null;

  return (
    <section className="card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-b from-surface-2/50 to-surface px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Link
            href={prevHref}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-[170px] px-1 text-center">
            <p className="text-[14px] font-extrabold tracking-[-0.02em]">{weekLabel}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-2">{weekOfLabel}</p>
          </div>
          <Link
            href={nextHref}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={todayHref}
            className={cn(
              "ml-1 inline-flex h-8 items-center rounded-full border px-3 text-[10px] font-bold transition-colors",
              isCurrentWeek
                ? "border-transparent bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            Today
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <Clock3 className="h-3 w-3 text-primary" />
            <strong className="font-semibold text-text">{formatDuration(weekTotal, { zero: "0m" })}</strong> tracked
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <Layers className="h-3 w-3 text-primary" />
            <strong className="font-semibold text-text">{sessionCount}</strong> sessions
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 sm:inline-flex" title={timezone}>
            <Globe2 className="h-3 w-3 text-primary" />
            <strong className="font-semibold text-text">{timezoneLabel}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              const node = scrollRef.current;
              if (node) {
                node.scrollTo({ top: nowScrollTop(node, nowMinutes, ROW_HEIGHT), behavior: "smooth" });
              }
            }}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
          >
            <LocateFixed className="h-3 w-3" /> Now
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-[9px] font-medium text-muted-2">
        <span className="font-bold uppercase tracking-[0.12em]">Weekly time blocking</span>
        <span>Drag to add · drag a block to move · right-click for options</span>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-[760px] flex-col">
          <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 z-30 flex border-b border-border bg-surface/95 backdrop-blur">
              <div className="shrink-0" style={{ width: GUTTER_WIDTH }} />
              {days.map((day) => (
                <div
                  key={day.key}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 border-l border-border/70 py-2.5",
                    day.isWeekend && "bg-surface-2/30",
                    day.isToday && "bg-primary-soft/40",
                  )}
                >
                  <p className={cn("text-[9px] font-bold uppercase tracking-[0.14em]", day.isToday ? "text-primary" : "text-muted-2")}>
                    {day.label}
                  </p>
                  <p
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full text-[13px] font-extrabold tracking-[-0.03em]",
                      day.isToday ? "bg-primary text-primary-contrast shadow-sm" : "text-text",
                    )}
                  >
                    {day.dayNumber}
                  </p>
                  <span className="text-[8px] font-semibold tabular-nums text-muted-2">
                    {formatDuration(dayTotals.get(day.key) ?? 0, { zero: "—" })}
                  </span>
                </div>
              ))}
            </div>
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
                  <div className="grid flex-1 grid-cols-7" onContextMenuCapture={handleContextMenu}>
                    {days.map((day) => (
                  <div
                    key={day.key}
                    data-day-key={day.key}
                    onPointerDown={(event) => beginSelection(day.key, event)}
                    onPointerMove={updateSelection}
                    onPointerUp={finishSelection}
                    onPointerCancel={cancelSelection}
                    className={cn(
                      "relative cursor-crosshair border-l border-border/60 transition-colors hover:bg-primary-soft/10",
                      day.isWeekend && "bg-surface-2/25",
                      day.isToday && "bg-primary-soft/20",
                    )}
                    style={{
                      height: TOTAL_HEIGHT,
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--border) 85%, transparent) 0 1px, transparent 1px 56px), repeating-linear-gradient(to bottom, transparent 0 27px, color-mix(in srgb, var(--border) 28%, transparent) 27px 28px, transparent 28px 56px)",
                    }}
                  >
                    {dragPreview?.dayKey === day.key ? (
                      <div
                        className="pointer-events-none absolute left-1 right-1 z-30 rounded-md border border-primary bg-primary/20 px-1.5 py-1 text-[9px] font-bold text-primary shadow-sm"
                        style={{
                          top: (dragPreview.startMin / 60) * ROW_HEIGHT,
                          height: Math.max(22, ((dragPreview.endMin - dragPreview.startMin) / 60) * ROW_HEIGHT),
                        }}
                      >
                        {timeLabel(dragPreview.startMin)} – {timeLabel(dragPreview.endMin)}
                      </div>
                    ) : null}

                    {selection?.dayKey === day.key ? (
                      <div
                        className="pointer-events-none absolute left-1 right-1 z-[5] rounded-md border border-primary/60 bg-primary/15 px-1.5 py-1 text-[9px] font-bold text-primary"
                        style={{
                          top: (selection.startMin / 60) * ROW_HEIGHT,
                          height: Math.max(18, ((selection.endMin - selection.startMin) / 60) * ROW_HEIGHT),
                        }}
                      >
                        {timeLabel(selection.startMin)} – {timeLabel(selection.endMin)} ·{" "}
                        {formatDuration((selection.endMin - selection.startMin) * 60)}
                      </div>
                    ) : null}

                    {(byDay.get(day.key) ?? []).map((segment) => {
                      const top = (segment.startMin / 60) * ROW_HEIGHT;
                      const height = Math.max(22, ((segment.endMin - segment.startMin) / 60) * ROW_HEIGHT);
                      const width = 100 / segment.lanes;
                      const color = segment.color;
                      const showTime = height > 32;
                      const showDescription = height > 52 && segment.session.description;
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
                          onPointerDown={(event) => startSessionDrag(event, segment.session, segment, day.key)}
                          onPointerMove={moveSessionDrag}
                          onPointerUp={endSessionDrag}
                          onPointerCancel={() => {
                            sessionDrag.current = null;
                            setDragPreview(null);
                          }}
                          className={cn(
                            "absolute z-10 cursor-grab touch-none overflow-hidden rounded-lg px-1.5 py-1 text-left transition-all duration-150 hover:z-20 hover:-translate-y-px hover:shadow-[0_5px_16px_-6px_rgba(15,15,25,0.35)] active:cursor-grabbing",
                            dragPreview?.sessionId === segment.session.id && "opacity-40",
                          )}
                          style={{
                            top,
                            height,
                            left: `calc(${(segment.lane / segment.lanes) * 100}% + 1px)`,
                            width: `calc(${width}% - 3px)`,
                            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 18%, var(--surface)) 0%, color-mix(in srgb, ${color} 10%, var(--surface)) 100%)`,
                            border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
                            borderLeft: `3px solid ${color}`,
                            boxShadow: "0 1px 2px rgba(15,15,25,0.05)",
                          }}
                          title={`${segment.session.itemName}${segment.session.description ? ` · ${segment.session.description}` : ""}\n${formatInTimeZone(segment.start, timezone, "h:mm a")} – ${formatInTimeZone(segment.end, timezone, "h:mm a")} · ${formatDuration(segment.session.durationSeconds, { showSeconds: true })}`}
                        >
                          <span
                            className="block truncate text-[11px] font-bold leading-tight"
                            style={{ color: `color-mix(in srgb, ${color} 72%, var(--text))` }}
                          >
                            {segment.session.itemName}
                          </span>
                          {showTime ? (
                            <span className="mt-0.5 block truncate text-[8px] font-semibold leading-tight text-muted">
                              {formatInTimeZone(segment.start, timezone, "h:mm a")} –{" "}
                              {formatInTimeZone(segment.end, timezone, "h:mm a")}
                            </span>
                          ) : null}
                          {showDescription ? (
                            <span className="mt-0.5 block truncate text-[8px] leading-tight text-muted-2">
                              {segment.session.description}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}

                    {today?.key === day.key && nowMinutes <= 1440 ? (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                        style={{ top: (nowMinutes / 60) * ROW_HEIGHT }}
                        suppressHydrationWarning
                      >
                        <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_18%,transparent)]" />
                        <span className="h-px flex-1 bg-danger/80" />
                      </div>
                    ) : null}
                  </div>
                    ))}
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
                  ) : contextTarget?.kind === "slot" && slotDay ? (
                    <>
                      <ContextMenuLabel>
                        {slotDay.label} {slotDay.dayNumber} · {timeLabel(contextTarget.startMin)}
                      </ContextMenuLabel>
                      <ContextMenuItem
                        onSelect={() =>
                          openManualTime({
                            date: contextTarget.dayKey,
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
