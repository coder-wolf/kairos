"use client";

import * as React from "react";
import { GripVertical, Maximize2, Pause, Play, Square, Timer } from "lucide-react";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIAL_MINUTES = 60;

function mmssFromElapsed(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerFloating({ items }: { items: ItemOption[] }) {
  const { timer, elapsed, pending, pause, resume, stop, changeItem, windowOpen, closeWindow } = useTimer();
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- restoring a persisted window position */
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("kairos:timer-window-position");
      if (raw) {
        const saved = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof saved.x === "number" && typeof saved.y === "number") {
          setPosition({
            x: Math.min(Math.max(8, saved.x), Math.max(8, window.innerWidth - 360)),
            y: Math.min(Math.max(8, saved.y), Math.max(8, window.innerHeight - 500)),
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    const element = windowRef.current;
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

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const element = windowRef.current;
    const width = element?.offsetWidth ?? 360;
    const height = element?.offsetHeight ?? 500;
    setPosition({
      x: Math.min(Math.max(8, drag.originX + event.clientX - drag.startX), Math.max(8, window.innerWidth - width - 8)),
      y: Math.min(Math.max(8, drag.originY + event.clientY - drag.startY), Math.max(8, window.innerHeight - height - 8)),
    });
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setPosition((current) => {
      if (current) {
        try {
          window.localStorage.setItem("kairos:timer-window-position", JSON.stringify(current));
        } catch {
          // ignore
        }
      }
      return current;
    });
  };

  if (!timer) return null;

  const color = timer.itemColor ?? "var(--primary)";
  const totalSeconds = DIAL_MINUTES * 60;
  const progress = Math.min(1, elapsed / totalSeconds);
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const options = flattenItemOptions(items);
  const overDial = elapsed > totalSeconds;

  return (
    <Dialog modal={false} open={windowOpen} onOpenChange={(open) => (open ? undefined : closeWindow())}>
      <DialogContent
        ref={windowRef}
        showOverlay={false}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, input, select, a, textarea, [data-no-drag]")) return;
          startDrag(event);
        }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "max-w-none gap-0 cursor-grab touch-none select-none overflow-visible rounded-[18px] border-border bg-surface p-0 [&_a]:cursor-pointer [&_button]:cursor-pointer [&_input]:cursor-text [&_select]:cursor-pointer",
          position ? "translate-x-0 translate-y-0" : "",
          dragging && "cursor-grabbing",
        )}
        style={{
          left: position?.x,
          top: position?.y,
          width: 360,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "calc(100vh - 16px)",
          boxShadow: [
            `0 0 0 1px color-mix(in srgb, ${color} 28%, var(--border))`,
            "0 1px 2px rgba(10,10,16,0.18)",
            "0 6px 14px -6px rgba(10,10,16,0.34)",
            "0 18px 36px -18px rgba(10,10,16,0.42)",
            "0 32px 64px -34px rgba(10,10,16,0.44)",
          ].join(", "),
        }}
      >
        <DialogTitle className="sr-only">Running timer</DialogTitle>
        <DialogDescription className="sr-only">Control the timer that is currently running.</DialogDescription>
        <div className="relative flex h-full flex-col overflow-hidden rounded-[18px]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 18%, var(--surface)))` }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 18% 0%, color-mix(in srgb, ${color} 9%, transparent), transparent 48%), linear-gradient(180deg, color-mix(in srgb, ${color} 3%, var(--surface)) 0%, var(--surface) 44%)`,
            }}
          />
          <div className="scroll-thin relative flex-1 overflow-y-auto p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-2">
                  <GripVertical className="h-2.5 w-2.5" /> Drag
                </span>
                <span
                  className={cn("h-2 w-2 rounded-full", timer.status === "RUNNING" ? "animate-pulse-soft bg-success" : "bg-warning")}
                />
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-2">
                  {timer.status === "RUNNING" ? "Live" : "Paused"}
                </span>
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-2">60 min dial</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">Working on</p>
                <p className="mt-1 max-w-[190px] truncate text-[14px] font-bold">
                  {timer.isUnassigned ? "No project yet" : timer.itemName}
                </p>
              </div>
              <span
                className="grid h-8 w-8 place-items-center rounded-lg"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
              >
                <Timer className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-2 flex justify-center">
              <div className="relative">
                <svg width="280" height="280" viewBox="0 0 280 280" className="max-w-full">
                  <defs>
                    <linearGradient id="timer-dial-ring" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={color} />
                      <stop offset="100%" stopColor="var(--accent)" />
                    </linearGradient>
                  </defs>
                  {Array.from({ length: 60 }).map((_, index) => {
                    const major = index % 5 === 0;
                    return (
                      <line
                        key={index}
                        x1="140"
                        y1="8"
                        x2="140"
                        y2={major ? 17 : 13}
                        transform={`rotate(${index * 6} 140 140)`}
                        stroke={major ? "var(--muted-2)" : "var(--border-strong)"}
                        strokeWidth={major ? 1.4 : 0.8}
                        opacity={major ? 0.8 : 0.55}
                      />
                    );
                  })}
                  <circle cx="140" cy="140" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    fill="none"
                    stroke="url(#timer-dial-ring)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    transform="rotate(-90 140 140)"
                    style={{ transition: "stroke-dashoffset 500ms linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="font-mono text-[46px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
                    {mmssFromElapsed(elapsed)}
                  </p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-2">
                    {overDial ? "60+ minutes" : `${Math.min(DIAL_MINUTES, Math.floor(elapsed / 60))} of 60 min`}
                  </p>
                  <p className="mt-1 text-[8px] font-medium text-muted-2">
                    {timer.status === "RUNNING" ? "Time is being recorded" : "Timer paused"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <Select
                value={timer.itemId}
                onChange={(event) => {
                  if (event.target.value) changeItem(event.target.value);
                }}
                className="h-9 bg-surface/85 text-[11px]"
                aria-label="Project for this timer"
              >
                <option value="">{timer.isUnassigned ? "Add a project (optional)" : "Change project…"}</option>
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
                onClick={timer.status === "RUNNING" ? pause : resume}
                disabled={pending}
                className="h-10 flex-1 gap-2 rounded-lg"
              >
                {timer.status === "RUNNING" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {timer.status === "RUNNING" ? "Pause" : "Resume"}
              </Button>
              <Button
                variant="danger"
                onClick={stop}
                disabled={pending}
                className="h-10 gap-2 rounded-lg px-4"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted">
              <span>One full ring = 60 minutes</span>
              <button
                type="button"
                onClick={closeWindow}
                className="inline-flex items-center gap-1 font-semibold hover:text-primary"
              >
                <Maximize2 className="h-3 w-3" /> Hide window
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
