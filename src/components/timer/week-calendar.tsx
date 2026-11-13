"use client";

import * as React from "react";
import { formatInTimeZone } from "date-fns-tz";
import { useQuickActions } from "@/components/quick-actions";
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
}: {
  sessions: SessionRow[];
  days: CalendarDay[];
  timezone: string;
}) {
  const { openManualTime } = useQuickActions();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * ROW_HEIGHT;
  }, []);

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

  const today = days.find((day) => day.isToday);
  const total = sessions.reduce((acc, session) => acc + session.durationSeconds, 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-b from-surface-2/50 to-surface px-5 py-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Weekly time blocking</h2>
          <p className="text-[11px] text-muted">
            {sessions.length} {sessions.length === 1 ? "entry" : "entries"} · {formatDuration(total)} tracked
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Click a block to edit
        </span>
      </div>

      <div className="scroll-thin overflow-x-auto">
        <div className="min-w-[760px]">
          <div ref={scrollRef} className="scroll-thin max-h-[calc(100vh-300px)] min-h-[480px] overflow-y-auto">
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

              <div className="grid flex-1 grid-cols-7">
                {days.map((day) => (
                  <div
                    key={day.key}
                    className={cn(
                      "relative border-l border-border/60",
                      day.isWeekend && "bg-surface-2/25",
                      day.isToday && "bg-primary-soft/20",
                    )}
                    style={{
                      height: TOTAL_HEIGHT,
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--border) 85%, transparent) 0 1px, transparent 1px 56px), repeating-linear-gradient(to bottom, transparent 0 27px, color-mix(in srgb, var(--border) 28%, transparent) 27px 28px, transparent 28px 56px)",
                    }}
                  >
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
                          onClick={() => openManualTime({ itemId: segment.session.itemId, session: segment.session })}
                          className="absolute z-10 overflow-hidden rounded-lg px-1.5 py-1 text-left transition-all duration-150 hover:z-20 hover:-translate-y-px hover:shadow-[0_5px_16px_-6px_rgba(15,15,25,0.35)]"
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
                          title={`${segment.session.itemName}${segment.session.description ? ` · ${segment.session.description}` : ""}\n${formatInTimeZone(segment.start, timezone, "h:mm a")} – ${formatInTimeZone(segment.end, timezone, "h:mm a")}`}
                        >
                          <span
                            className="block truncate text-[10px] font-bold leading-tight"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
