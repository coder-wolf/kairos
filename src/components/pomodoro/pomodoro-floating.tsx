"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Coffee,
  Flame,
  Leaf,
  GripVertical,
  Pause,
  Pencil,
  Play,
  SkipForward,
  Square,
} from "lucide-react";
import {
  phaseColor,
  phaseLabel,
  usePomodoro,
  type PomodoroPhase,
} from "@/components/pomodoro/pomodoro-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { RingProgress } from "@/components/ui/progress";
import { flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

const PHASE_ICON: Record<PomodoroPhase, React.ComponentType<{ className?: string }>> = {
  focus: Flame,
  short_break: Coffee,
  long_break: Leaf,
};

function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function PomodoroFloating({ items }: { items: ItemOption[] }) {
  const {
    active,
    windowOpen,
    openWindow,
    closeWindow,
    phase,
    status,
    remainingMs,
    totalMs,
    completed,
    focusSeconds,
    settings,
    itemId,
    setItemId,
    setCustomMinutes,
    start,
    toggle,
    reset,
    skip,
    isPro,
  } = usePomodoro();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("25");
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const floatRef = React.useRef<HTMLDivElement>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);
  const [windowPosition, setWindowPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [windowDragging, setWindowDragging] = React.useState(false);
  const windowDragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [windowSize, setWindowSize] = React.useState({ width: 340, height: 520 });
  const [resizing, setResizing] = React.useState(false);
  const resizeRef = React.useRef<{
    pointerId: number;
    direction: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("kairos:pomodoro-float-position");
      if (raw) {
        const saved = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof saved.x === "number" && typeof saved.y === "number") {
          const width = floatRef.current?.offsetWidth ?? 214;
          const height = floatRef.current?.offsetHeight ?? 56;
          setPosition({
            x: Math.min(Math.max(8, saved.x), Math.max(8, window.innerWidth - width - 8)),
            y: Math.min(Math.max(8, saved.y), Math.max(8, window.innerHeight - height - 8)),
          });
        }
      }
      const rawSize = window.localStorage.getItem("kairos:pomodoro-window-size");
      if (rawSize) {
        const savedSize = JSON.parse(rawSize) as { width?: number; height?: number };
        if (typeof savedSize.width === "number" && typeof savedSize.height === "number") {
          setWindowSize({
            width: Math.min(Math.max(300, savedSize.width), Math.max(300, window.innerWidth - 16)),
            height: Math.min(Math.max(380, savedSize.height), Math.max(380, window.innerHeight - 16)),
          });
        }
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      setWindowSize((current) => ({
        width: Math.min(current.width, Math.max(300, window.innerWidth - 16)),
        height: Math.min(current.height, Math.max(380, window.innerHeight - 16)),
      }));
      setWindowPosition((current) => {
        if (!current) return current;
        return {
          x: Math.min(current.x, Math.max(8, window.innerWidth - 300)),
          y: Math.min(current.y, Math.max(8, window.innerHeight - 380)),
        };
      });
      setPosition((current) => {
        if (!current) return current;
        const width = floatRef.current?.offsetWidth ?? 214;
        const height = floatRef.current?.offsetHeight ?? 56;
        return {
          x: Math.min(current.x, Math.max(8, window.innerWidth - width - 8)),
          y: Math.min(current.y, Math.max(8, window.innerHeight - height - 8)),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const element = floatRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    setPosition({ x: rect.left, y: rect.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const element = floatRef.current;
    const width = element?.offsetWidth ?? 214;
    const height = element?.offsetHeight ?? 56;
    const nextX = Math.min(
      Math.max(8, drag.originX + event.clientX - drag.startX),
      Math.max(8, window.innerWidth - width - 8),
    );
    const nextY = Math.min(
      Math.max(8, drag.originY + event.clientY - drag.startY),
      Math.max(8, window.innerHeight - height - 8),
    );
    setPosition({ x: nextX, y: nextY });
  };

  const endDrag = () => {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      setPosition((current) => {
        if (current) {
          try {
            window.localStorage.setItem("kairos:pomodoro-float-position", JSON.stringify(current));
          } catch {
            // ignore storage failures
          }
        }
        return current;
      });
    }
  };

  const startWindowDrag = (event: React.PointerEvent<HTMLElement>) => {
    const element = windowRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    windowDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    setWindowPosition({ x: rect.left, y: rect.top });
    setWindowDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveWindowDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = windowDragRef.current;
    if (!drag) return;
    const element = windowRef.current;
    const width = element?.offsetWidth ?? windowSize.width;
    const height = element?.offsetHeight ?? windowSize.height;
    setWindowPosition({
      x: Math.min(Math.max(8, drag.originX + event.clientX - drag.startX), Math.max(8, window.innerWidth - width - 8)),
      y: Math.min(Math.max(8, drag.originY + event.clientY - drag.startY), Math.max(8, window.innerHeight - height - 8)),
    });
  };

  const endWindowDrag = () => {
    if (!windowDragRef.current) return;
    windowDragRef.current = null;
    setWindowDragging(false);
    setWindowPosition((current) => {
      if (current) {
        try {
          window.localStorage.setItem("kairos:pomodoro-window-position", JSON.stringify(current));
        } catch {
          // ignore
        }
      }
      return current;
    });
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>, direction: string) => {
    const element = windowRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    resizeRef.current = {
      pointerId: event.pointerId,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top,
    };
    setWindowPosition({ x: rect.left, y: rect.top });
    setResizing(true);
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    event.stopPropagation();
    const direction = resize.direction;
    const maxWidth = Math.max(300, window.innerWidth - 16);
    const maxHeight = Math.max(380, window.innerHeight - 16);
    let width = resize.startWidth;
    let height = resize.startHeight;
    let left = resize.startLeft;
    let top = resize.startTop;
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;

    if (direction.includes("e")) width = Math.min(maxWidth, Math.max(300, resize.startWidth + dx));
    if (direction.includes("w")) width = Math.min(maxWidth, Math.max(300, resize.startWidth - dx));
    if (direction.includes("s")) height = Math.min(maxHeight, Math.max(380, resize.startHeight + dy));
    if (direction.includes("n")) height = Math.min(maxHeight, Math.max(380, resize.startHeight - dy));
    if (direction.includes("w")) left = resize.startLeft + (resize.startWidth - width);
    if (direction.includes("n")) top = resize.startTop + (resize.startHeight - height);

    setWindowSize({ width, height });
    setWindowPosition({ x: Math.max(8, Math.min(left, window.innerWidth - width - 8)), y: Math.max(8, Math.min(top, window.innerHeight - height - 8)) });
  };

  const endResize = () => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    setResizing(false);
    setWindowSize((current) => {
      try {
        window.localStorage.setItem("kairos:pomodoro-window-size", JSON.stringify(current));
      } catch {
        // ignore
      }
      return current;
    });
    setWindowPosition((current) => {
      if (current) {
        try {
          window.localStorage.setItem("kairos:pomodoro-window-position", JSON.stringify(current));
        } catch {
          // ignore
        }
      }
      return current;
    });
  };

  if (!isPro) return null;
  if (!active && !windowOpen) return null;

  const color = phaseColor(phase);
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const Icon = PHASE_ICON[phase];
  const options = flattenItemOptions(items);
  const selected = options.find((option) => option.id === itemId);
  const isFocus = phase === "focus";
  const interval = Math.max(1, settings.sessionsUntilLongBreak);
  const cycleDone = completed % interval;
  const cycleDisplay = completed > 0 && cycleDone === 0 ? interval : cycleDone;
  const totalMinutes = Math.max(1, Math.round(totalMs / 60_000));

  const commitTime = () => {
    const value = Number(draft);
    if (Number.isFinite(value) && value >= 1) setCustomMinutes(value);
    setEditing(false);
  };

  const beginEdit = () => {
    setDraft(String(totalMinutes));
    setEditing(true);
  };

  return (
    <>
      {active && !windowOpen ? (
        <div
          ref={floatRef}
          className={cn(
            "fixed z-40 flex items-center overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-(--shadow-pop) backdrop-blur",
            dragging && "cursor-grabbing shadow-(--shadow-pop) ring-1 ring-primary/30",
          )}
          style={{
            left: position?.x,
            top: position?.y,
            right: position ? undefined : 16,
            bottom: position ? undefined : 16,
          }}
        >
          <button
            type="button"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="grid h-14 w-6 shrink-0 cursor-grab touch-none place-items-center text-muted-2 transition-colors hover:bg-surface-2 hover:text-text active:cursor-grabbing"
            aria-label="Move pomodoro timer"
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={openWindow}
            className="flex h-14 items-center gap-3 pl-1 pr-2 text-left transition-colors hover:bg-surface-2"
            title="Open the pomodoro window"
          >
            <RingProgress value={progress * 100} size={34} stroke={3} color={color}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            </RingProgress>
            <span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
                <Icon className="h-3 w-3" /> {phaseLabel(phase)}
              </span>
              <span className="block font-mono text-[13px] font-bold tabular-nums">{mmss(remainingMs)}</span>
            </span>
          </button>
          <div className="flex items-center gap-0.5 pr-2">
            <button
              type="button"
              onClick={toggle}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label={status === "running" ? "Pause pomodoro" : "Resume pomodoro"}
            >
              {status === "running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={reset}
              className="grid h-8 w-8 place-items-center rounded-lg text-danger transition-colors hover:bg-danger-soft"
              aria-label="End pomodoro"
              title="End pomodoro"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={openWindow}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Open pomodoro window"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <Dialog modal={false} open={windowOpen} onOpenChange={(open) => (open ? openWindow() : closeWindow())}>
        {windowOpen ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-40 animate-fade-in bg-[radial-gradient(ellipse_at_center,transparent_32%,rgba(10,10,16,0.18)_72%,rgba(10,10,16,0.30)_100%)]"
          />
        ) : null}
        <DialogContent
          ref={windowRef}
          showOverlay={false}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button, input, select, a, textarea, [data-no-drag]")) return;
            startWindowDrag(event);
          }}
          onPointerMove={moveWindowDrag}
          onPointerUp={endWindowDrag}
          onPointerCancel={endWindowDrag}
          className={cn(
            "max-w-none gap-0 cursor-grab touch-none select-none overflow-visible rounded-[18px] border-border bg-surface p-0 [&_a]:cursor-pointer [&_button]:cursor-pointer [&_input]:cursor-text [&_select]:cursor-pointer",
            windowPosition ? "translate-x-0 translate-y-0" : "",
            windowDragging && "cursor-grabbing ring-2 ring-primary/30",
            resizing && "ring-2 ring-primary/30",
          )}
          style={{
            left: windowPosition?.x,
            top: windowPosition?.y,
            width: windowSize.width,
            height: windowSize.height,
            maxWidth: "calc(100vw - 16px)",
            maxHeight: "calc(100vh - 16px)",
            boxShadow: [
              `0 0 0 1px color-mix(in srgb, ${color} 32%, var(--border))`,
              "0 1px 2px rgba(10,10,16,0.18)",
              "0 6px 14px -6px rgba(10,10,16,0.34)",
              "0 18px 36px -18px rgba(10,10,16,0.42)",
              "0 32px 64px -34px rgba(10,10,16,0.44)",
            ].join(", "),
          }}
        >
          <DialogTitle className="sr-only">Pomodoro timer</DialogTitle>
          <DialogDescription className="sr-only">Control your current focus or break block.</DialogDescription>
          <div className="relative flex h-full flex-col overflow-hidden rounded-[18px]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 20%, var(--surface)))` }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isFocus
                  ? "radial-gradient(ellipse at 18% 0%, color-mix(in srgb, var(--danger) 10%, transparent), transparent 48%), linear-gradient(180deg, color-mix(in srgb, var(--danger) 3%, var(--surface)) 0%, var(--surface) 42%)"
                  : "radial-gradient(ellipse at 18% 0%, color-mix(in srgb, var(--success) 10%, transparent), transparent 48%), linear-gradient(180deg, color-mix(in srgb, var(--success) 3%, var(--surface)) 0%, var(--surface) 42%)",
              }}
            />
            <div className="scroll-thin relative flex-1 overflow-y-auto p-4">
              <div
                className="rounded-xl px-1 pb-2 pt-0.5"
                title="Drag anywhere on the window to move it"
              >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-2">
                    <GripVertical className="h-2.5 w-2.5" /> Drag
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                    {completed} rounds today
                  </span>
                </span>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
                  >
                    <Icon className="h-3 w-3" /> {phaseLabel(phase)}
                  </span>
                  <p className="mt-1.5 text-[13px] font-bold">{selected?.label ?? "No project yet"}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: interval }).map((_, index) => (
                    <span
                      key={index}
                      className={cn("h-1.5 w-1.5 rounded-full", index < cycleDisplay ? "" : "bg-surface-3")}
                      style={index < cycleDisplay ? { background: color } : undefined}
                    />
                  ))}
                </div>
              </div>
              </div>

              <div className="mx-auto mt-2 flex justify-center">
                <div
                  data-no-drag
                  className={cn("relative rounded-full", !editing && "cursor-text")}
                  onClick={() => {
                    if (!editing) beginEdit();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  role={!editing ? "button" : undefined}
                  tabIndex={!editing ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!editing && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      beginEdit();
                    }
                  }}
                  aria-label={!editing ? "Edit pomodoro duration" : undefined}
                  title={!editing ? "Click anywhere on the dial to edit the duration" : undefined}
                >
                  <RingProgress value={progress * 100} size={196} stroke={8} color={color}>
                    <span className="sr-only">{mmss(remainingMs)}</span>
                  </RingProgress>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {editing ? (
                      <div className="text-center">
                        <div className="flex items-end justify-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            min={1}
                            max={180}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onFocus={(event) => event.currentTarget.select()}
                            onBlur={commitTime}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") commitTime();
                              if (event.key === "Escape") setEditing(false);
                            }}
                            className="w-[98px] border-b-2 bg-transparent text-center font-mono text-[34px] font-extrabold tabular-nums outline-none"
                            style={{ borderColor: color }}
                            aria-label="Custom timer minutes"
                          />
                          <span className="pb-1 text-[9px] font-bold uppercase text-muted-2">min</span>
                        </div>
                        <p className="mt-1 text-[8px] uppercase tracking-wide text-muted-2">Enter · Esc</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={beginEdit}
                        className="rounded-xl px-3 py-1 transition-colors hover:bg-surface-2/60"
                      >
                        <span className="block font-mono text-[36px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
                          {mmss(remainingMs)}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-2">
                          <Pencil className="h-2.5 w-2.5" /> Tap to edit total
                        </span>
                      </button>
                    )}
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                      {isFocus ? `${totalMinutes} min focus` : `${totalMinutes} min break`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Select
                  value={itemId ?? ""}
                  onChange={(event) => setItemId(event.target.value || null)}
                  className="h-9 bg-surface/85 text-[11px]"
                  aria-label="Project for this pomodoro"
                >
                  <option value="">{itemId ? "Choose a project…" : "Add a project (optional)"}</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {"— ".repeat(option.depth)}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={status === "idle" ? start : toggle}
                  className="h-9 flex-1 rounded-lg"
                  style={{ background: color, color: "white" }}
                >
                  {status === "running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => {
                    reset();
                    closeWindow();
                  }}
                  aria-label="End"
                  title="End pomodoro"
                >
                  <Square className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={skip} aria-label="Skip phase">
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted">
                <span>
                  Today · {completed} rounds · {formatDuration(focusSeconds, { zero: "0m" })} focused
                </span>
                <Link href="/timer?mode=pomodoro" className="inline-flex items-center gap-1 font-semibold hover:text-primary">
                  Full view <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
          {[
            { dir: "n", className: "left-3 right-3 top-0 h-1.5 cursor-ns-resize" },
            { dir: "s", className: "bottom-0 left-3 right-3 h-1.5 cursor-ns-resize" },
            { dir: "e", className: "bottom-3 right-0 top-3 w-1.5 cursor-ew-resize" },
            { dir: "w", className: "bottom-3 left-0 top-3 w-1.5 cursor-ew-resize" },
            { dir: "nw", className: "left-0 top-0 h-3 w-3 cursor-nwse-resize" },
            { dir: "ne", className: "right-0 top-0 h-3 w-3 cursor-nesw-resize" },
            { dir: "sw", className: "bottom-0 left-0 h-3 w-3 cursor-nesw-resize" },
            { dir: "se", className: "bottom-0 right-0 h-5 w-5 cursor-nwse-resize" },
          ].map((handle) => (
            <div
              key={handle.dir}
              data-no-drag
              onPointerDown={(event) => startResize(event, handle.dir)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              className={cn("absolute z-30 touch-none", handle.className)}
              aria-hidden="true"
            />
          ))}
          <div
            data-no-drag
            className="pointer-events-none absolute bottom-1.5 right-1.5 z-20 h-3 w-3 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 0 35%, var(--muted-2) 35% 45%, transparent 45% 60%, var(--muted-2) 60% 70%, transparent 70%)",
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
