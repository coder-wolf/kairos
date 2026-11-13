"use client";

import * as React from "react";
import Link from "next/link";
import {
  Brain,
  Coffee,
  Flame,
  Leaf,
  Pause,
  Pencil,
  Play,
  SkipForward,
  Square,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { usePomodoro, phaseColor, phaseLabel } from "@/components/pomodoro/pomodoro-provider";
import { PomodoroSettingsPanel } from "@/components/pomodoro/pomodoro-settings";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const PHASE_ICON = {
  focus: Flame,
  short_break: Coffee,
  long_break: Leaf,
} as const;

const PRESETS = [
  { name: "Classic", workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsUntilLongBreak: 4 },
  { name: "Deep", workMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20, sessionsUntilLongBreak: 4 },
  { name: "Sprint", workMinutes: 15, shortBreakMinutes: 3, longBreakMinutes: 10, sessionsUntilLongBreak: 3 },
];

export function PomodoroPanel({ items }: { items: ItemOption[] }) {
  const {
    settings,
    phase,
    status,
    remainingMs,
    totalMs,
    completed,
    focusSeconds,
    itemId,
    setItemId,
    setCustomMinutes,
    updateSettings,
    start,
    toggle,
    reset,
    skip,
  } = usePomodoro();
  const { timer } = useTimer();
  const [mounted, setMounted] = React.useState(false);
  const [editingTime, setEditingTime] = React.useState(false);
  const [draftMinutes, setDraftMinutes] = React.useState("25");

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const options = flattenItemOptions(items).filter((option) => !option.archived);
  const selected = options.find((option) => option.id === itemId);
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const radius = 132;
  const circumference = 2 * Math.PI * radius;
  const color = phaseColor(phase);
  const PhaseIcon = PHASE_ICON[phase];
  const interval = Math.max(1, settings.sessionsUntilLongBreak);
  const cycleDone = completed % interval;
  const cycleDisplay = completed > 0 && cycleDone === 0 ? interval : cycleDone;
  const isFocus = phase === "focus";
  const phaseTotalMinutes = Math.round(totalMs / 60_000);

  const beginEditTime = () => {
    setDraftMinutes(String(Math.max(1, Math.round(totalMs / 60_000))));
    setEditingTime(true);
  };

  const commitTime = () => {
    const value = Number(draftMinutes);
    if (Number.isFinite(value) && value >= 1) setCustomMinutes(value);
    setEditingTime(false);
  };
  const primaryLabel = status === "running" ? "Pause" : status === "paused" ? "Resume" : isFocus ? "Start focus" : "Start break";

  const phaseBackground = isFocus
    ? "radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--danger) 16%, transparent) 0%, transparent 46%), radial-gradient(circle at 90% 100%, color-mix(in srgb, var(--warning) 13%, transparent) 0%, transparent 50%)"
    : phase === "short_break"
      ? "radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--success) 16%, transparent) 0%, transparent 46%), radial-gradient(circle at 90% 100%, color-mix(in srgb, var(--info) 12%, transparent) 0%, transparent 50%)"
      : "radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--info) 16%, transparent) 0%, transparent 46%), radial-gradient(circle at 90% 100%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 50%)";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card overflow-hidden">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" style={{ background: phaseBackground }} />
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color }}
                >
                  <PhaseIcon className="h-3 w-3" />
                  {phaseLabel(phase)}
                </span>
                <span className="text-[10px] font-semibold text-muted">
                  {status === "running" ? "in progress" : status === "paused" ? "paused" : "ready"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: interval }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors",
                      index < cycleDisplay ? "" : "bg-surface-3",
                    )}
                    style={index < cycleDisplay ? { background: color } : undefined}
                  />
                ))}
                <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">
                  {cycleDisplay}/{interval} round
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div
                className={cn("relative rounded-full", !editingTime && "cursor-text")}
                onClick={() => {
                  if (!editingTime) beginEditTime();
                }}
                role={!editingTime ? "button" : undefined}
                tabIndex={!editingTime ? 0 : undefined}
                onKeyDown={(event) => {
                  if (!editingTime && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    beginEditTime();
                  }
                }}
                aria-label={!editingTime ? "Edit pomodoro duration" : undefined}
                title={!editingTime ? "Click anywhere on the dial to edit the duration" : undefined}
              >
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  style={{ background: `color-mix(in srgb, ${color} 13%, transparent)` }}
                />
                <svg width="320" height="320" viewBox="0 0 320 320" className="relative max-w-full">
                  <defs>
                    <linearGradient id="pomodoro-ring" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={color} />
                      <stop offset="100%" stopColor={isFocus ? "var(--warning)" : "var(--accent)"} />
                    </linearGradient>
                  </defs>
                  <circle cx="160" cy="160" r="146" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 9" opacity="0.7" />
                  <circle cx="160" cy="160" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="11" />
                  <circle
                    cx="160"
                    cy="160"
                    r={radius}
                    fill="none"
                    stroke="url(#pomodoro-ring)"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - (mounted ? progress : 0))}
                    transform="rotate(-90 160 160)"
                    style={{ transition: "stroke-dashoffset 300ms linear", filter: `drop-shadow(0 0 10px color-mix(in srgb, ${color} 40%, transparent))` }}
                  />
                  {status === "running" ? (
                    <circle cx="160" cy="160" r="112" fill="none" stroke={`color-mix(in srgb, ${color} 13%, transparent)`} strokeWidth="1" className="animate-pulse-soft" />
                  ) : null}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <span
                    className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
                  >
                    <PhaseIcon className="h-3.5 w-3.5" />
                  </span>
                  {editingTime ? (
                    <div>
                      <div className="flex items-end justify-center gap-1.5">
                        <input
                          autoFocus
                          type="number"
                          min={1}
                          max={180}
                          value={draftMinutes}
                          onChange={(event) => setDraftMinutes(event.target.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onBlur={commitTime}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") commitTime();
                            if (event.key === "Escape") setEditingTime(false);
                          }}
                          className="w-[132px] border-b-2 bg-transparent text-center font-mono text-[48px] font-extrabold leading-none tracking-[-0.05em] tabular-nums outline-none sm:text-[54px]"
                          style={{ borderColor: color }}
                          aria-label="Custom timer minutes"
                        />
                        <span className="pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">min</span>
                      </div>
                      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                        Enter to set · Esc to cancel
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={beginEditTime}
                      className="group/time rounded-2xl px-4 py-1 transition-colors hover:bg-surface/60"
                      title="Tap to set a custom total duration"
                    >
                      <span className="block font-mono text-[48px] font-extrabold leading-none tracking-[-0.05em] tabular-nums sm:text-[54px]">
                        {mounted ? mmss(remainingMs) : `${String(phaseTotalMinutes).padStart(2, "0")}:00`}
                      </span>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em] text-muted-2 transition-colors group-enabled:group-hover/time:text-text">
                        <Pencil className="h-2.5 w-2.5" /> Tap to edit total

                      </span>
                    </button>
                  )}
                  <p className="mt-2 max-w-[200px] truncate text-[11px] font-semibold text-muted">
                    {selected ? selected.label : isFocus ? "Choose a project to focus on" : "Recovery time"}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">
                    {isFocus ? `${phaseTotalMinutes} min focus block` : `${phaseTotalMinutes} min break`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border/70 bg-surface/70 p-3 backdrop-blur">
              <label className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">
                <Sparkles className="h-3 w-3 text-primary" /> Working on
              </label>
              <Select
                value={itemId ?? ""}
                onChange={(event) => setItemId(event.target.value || null)}
                className="bg-surface/90"
              >
                <option value="">Choose a project…</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {"— ".repeat(option.depth)}
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                onClick={status === "idle" ? start : toggle}
                className="min-w-[150px] rounded-full gap-2 shadow-(--shadow-card)"
                style={{ background: color, color: "white" }}
              >
                {status === "running" ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {primaryLabel}
              </Button>
              <Button variant="outline" size="lg" onClick={reset} disabled={status === "idle"} className="gap-2">
                <Square className="h-3.5 w-3.5" /> End
              </Button>
              <Button variant="ghost" size="lg" onClick={skip} className="gap-2">
                <SkipForward className="h-4 w-4" /> {isFocus ? "Skip focus" : "Skip break"}
              </Button>
            </div>

            {timer && isFocus ? (
              <div className="mx-auto mt-5 max-w-md rounded-xl border border-warning/20 bg-warning-soft px-3.5 py-2.5 text-center text-[11px] font-medium text-warning">
                A regular timer is running on{" "}
                <Link href={`/items/${timer.itemId}`} className="underline underline-offset-2">
                  {timer.itemName}
                </Link>
                . Stop it before starting a focus block so time isn&apos;t counted twice.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-border/60 pt-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">Presets</span>
              {PRESETS.map((preset) => {
                const active =
                  settings.workMinutes === preset.workMinutes &&
                  settings.shortBreakMinutes === preset.shortBreakMinutes &&
                  settings.longBreakMinutes === preset.longBreakMinutes &&
                  settings.sessionsUntilLongBreak === preset.sessionsUntilLongBreak;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      updateSettings({
                        workMinutes: preset.workMinutes,
                        shortBreakMinutes: preset.shortBreakMinutes,
                        longBreakMinutes: preset.longBreakMinutes,
                        sessionsUntilLongBreak: preset.sessionsUntilLongBreak,
                      })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface/70 text-muted hover:bg-surface hover:text-text",
                    )}
                  >
                    {preset.name} · {preset.workMinutes}/{preset.shortBreakMinutes}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <TimerReset className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Today</h2>
            </div>
            <p className="text-[10px] text-muted">Completed focus rounds and time saved.</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4 text-center">
              <p className="text-[28px] font-extrabold tracking-[-0.04em]">{completed}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Rounds</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[28px] font-extrabold tracking-[-0.04em]">{formatDuration(focusSeconds, { zero: "0m" })}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Focused</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-3">
            <Brain className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-[10px] leading-4 text-muted">
              Focus rounds are saved as <strong className="font-semibold text-text">Pomodoro</strong> sessions, so they
              flow into goals, analytics, and history automatically.
            </p>
          </div>
        </section>

        <PomodoroSettingsPanel />

        <section className="card p-4">
          <h2 className="text-sm font-bold tracking-tight">A gentler way to work</h2>
          <p className="mt-1.5 text-[11px] leading-5 text-muted">
            Protect the first block. Choose one project, close the other tabs, and let the ring do the nagging. When the
            break arrives, actually take it.
          </p>
        </section>
      </div>
    </div>
  );
}
