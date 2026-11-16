"use client";

import { ArrowUpRight, Coffee, Flame, Leaf, Pause, Play, Square } from "lucide-react";
import { phaseColor, phaseLabel, usePomodoro, type PomodoroPhase } from "@/components/pomodoro/pomodoro-provider";
import { cn } from "@/lib/utils";

const ICONS: Record<PomodoroPhase, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  focus: Flame,
  short_break: Coffee,
  long_break: Leaf,
};

function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function PomodoroChip({ variant = "header" }: { variant?: "header" | "sidebar" | "dashboard" }) {
  const { active, phase, status, remainingMs, toggle, reset, openWindow } = usePomodoro();
  if (!active) return null;

  const color = phaseColor(phase);
  const Icon = ICONS[phase];

  if (variant === "sidebar") {
    return (
      <div className="rounded-xl border border-border bg-surface p-2.5 shadow-(--shadow-card)">
        <div className="flex items-center gap-2">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", status === "running" && "animate-pulse-soft")}
            style={{ background: color }}
          />
          <Icon className="h-3 w-3 shrink-0" style={{ color }} />
          <button
            type="button"
            onClick={openWindow}
            className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold hover:text-primary"
            title="Open pomodoro window"
          >
            {phaseLabel(phase)}
          </button>
          <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted">
            {mmss(remainingMs)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-surface-2 text-[10px] font-bold text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            {status === "running" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {status === "running" ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="grid h-7 w-7 items-center justify-center rounded-md bg-danger-soft text-danger transition-colors hover:bg-danger/15"
            aria-label="End pomodoro"
            title="End pomodoro"
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={openWindow}
            className="flex h-7 items-center justify-center gap-1 rounded-md bg-primary-soft px-2.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/15"
          >
            <ArrowUpRight className="h-3 w-3" />
            Open
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface pl-2.5 pr-1 shadow-(--shadow-card)">
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", status === "running" && "animate-pulse-soft")}
        style={{ background: color }}
      />
      <button
        type="button"
        onClick={openWindow}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:text-text"
        title="Open pomodoro window"
      >
        <Icon className="h-3 w-3" style={{ color }} />
        <span className="hidden sm:inline">{phaseLabel(phase)}</span>
      </button>
      <button
        type="button"
        onClick={openWindow}
        className="font-mono text-[12px] font-semibold tabular-nums text-muted transition-colors hover:text-text sm:ml-1"
        title="Open pomodoro window"
      >
        {mmss(remainingMs)}
      </button>
      <button
        type="button"
        onClick={toggle}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
        aria-label={status === "running" ? "Pause pomodoro" : "Resume pomodoro"}
      >
        {status === "running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={openWindow}
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors",
          variant === "dashboard" ? "bg-primary-soft text-primary hover:bg-primary/15" : "text-muted hover:bg-surface-2 hover:text-text",
        )}
        aria-label="Open pomodoro window"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
