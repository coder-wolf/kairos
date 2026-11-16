"use client";

import * as React from "react";
import { Flame, Pause, Play, SkipForward, Square, Timer as TimerIcon } from "lucide-react";
import { ProGate } from "@/components/billing/pro-gate";
import { phaseColor, phaseLabel, usePomodoro } from "@/components/pomodoro/pomodoro-provider";
import { PomodoroSettingsPanel } from "@/components/pomodoro/pomodoro-settings";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";
import { cn, formatClock, formatDuration } from "@/lib/utils";

type Mode = "timer" | "pomodoro";

function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function ProjectSelect({
  items,
  value,
  onChange,
  label = "Project",
}: {
  items: ItemOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const options = flattenItemOptions(items);
  return (
    <div className="w-full">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">{label}</p>
      <Select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 bg-surface/85 text-[12px]">
        <option value="">No project</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {"— ".repeat(option.depth)}
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Dial({
  progress,
  color,
  main,
  eyebrow,
  detail,
  status,
  statusTone,
}: {
  progress: number;
  color: string;
  main: string;
  eyebrow: string;
  detail: string;
  status: string;
  statusTone: "success" | "warning" | "muted";
}) {
  const gradientId = React.useId().replace(/:/g, "");
  const size = 280;
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress / 100));

  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em]",
          statusTone === "success"
            ? "border-success/20 bg-success-soft text-success"
            : statusTone === "warning"
              ? "border-warning/20 bg-warning-soft text-warning"
              : "border-border bg-surface/80 text-muted-2",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", statusTone === "success" ? "animate-pulse-soft bg-success" : statusTone === "warning" ? "bg-warning" : "bg-muted-2")} />
        {status}
      </span>

      <div className="relative">
        <svg width={size} height={size} viewBox="0 0 280 280" className="max-w-full">
          <defs>
            <linearGradient id={`dial-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
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
            stroke={`url(#dial-${gradientId})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            transform="rotate(-90 140 140)"
            style={{ transition: "stroke-dashoffset 500ms linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <p suppressHydrationWarning className="font-mono text-[46px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
            {main}
          </p>
          <p suppressHydrationWarning className="mt-2 max-w-[170px] truncate text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
            {eyebrow}
          </p>
          <p suppressHydrationWarning className="mt-1 text-[8px] font-medium text-muted-2">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function TimerContent({ items }: { items: ItemOption[] }) {
  const { timer, elapsed, pending, pause, resume, stop, start, changeItem, setDescription } = useTimer();
  const [selectedId, setSelectedId] = React.useState("");
  const [details, setDetails] = React.useState("");
  const active = Boolean(timer);
  const color = timer?.itemColor ?? "var(--primary)";
  const progress = Math.min(100, (elapsed / 3600) * 100);
  const projectId = active ? (timer?.isUnassigned ? "" : timer?.itemId ?? "") : selectedId;

  /* eslint-disable react-hooks/set-state-in-effect -- following the active timer */
  React.useEffect(() => {
    if (timer) setDetails(timer.description ?? "");
  }, [timer]);
  /* eslint-enable react-hooks/set-state-in-effect */

  React.useEffect(() => {
    if (!timer || details === (timer.description ?? "")) return;
    const id = window.setTimeout(() => setDescription(details.trim()), 700);
    return () => window.clearTimeout(id);
  }, [details, timer, setDescription]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Dial
        progress={progress}
        color={color}
        main={formatClock(elapsed)}
        eyebrow={active ? (timer?.isUnassigned ? "No project" : timer?.itemName ?? "Timer") : "Ready to start"}
        detail={elapsed > 3600 ? "60+ minutes" : `${Math.min(60, Math.floor(elapsed / 60))} of 60 min`}
        status={active ? (timer?.status === "RUNNING" ? "Live" : "Paused") : "Ready"}
        statusTone={active ? (timer?.status === "RUNNING" ? "success" : "warning") : "muted"}
      />

      <div className="w-full max-w-sm space-y-3">
        <ProjectSelect
          items={items}
          value={projectId}
          onChange={(value) => {
            if (active) changeItem(value || null);
            else setSelectedId(value);
          }}
        />
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">Details</p>
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            onBlur={() => {
              if (timer && details !== (timer.description ?? "")) setDescription(details.trim());
            }}
            placeholder="What are you working on?"
            maxLength={280}
            className="min-h-16 text-[12px]"
          />
        </div>
        {!active ? (
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => start(selectedId || null, details.trim() || undefined)}
            loading={pending}
          >
            <Play className="h-4 w-4 fill-current" /> Start timer
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={timer?.status === "RUNNING" ? pause : resume}
              disabled={pending}
            >
              {timer?.status === "RUNNING" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {timer?.status === "RUNNING" ? "Pause" : "Resume"}
            </Button>
            <Button size="lg" variant="danger" className="gap-2" onClick={stop} disabled={pending}>
              <Square className="h-3.5 w-3.5" /> Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PomodoroContent({ items }: { items: ItemOption[] }) {
  const {
    phase,
    status,
    remainingMs,
    totalMs,
    completed,
    focusSeconds,
    itemId,
    setItemId,
    description,
    setDescription,
    start,
    toggle,
    reset,
    skip,
    isPro,
  } = usePomodoro();

  if (!isPro) {
    return (
      <ProGate
        title="Pomodoro is a Pro feature"
        description="Run focus rounds with real breaks, then see every completed focus block in today's timeline."
        features={["Focus and break cycles", "Automatic focus history", "Custom phase durations", "Presets and sounds"]}
      />
    );
  }

  const color = phaseColor(phase);
  const progress = totalMs > 0 ? (1 - remainingMs / totalMs) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <Dial
        progress={progress}
        color={color}
        main={mmss(remainingMs)}
        eyebrow={phaseLabel(phase)}
        detail={status === "running" ? "In progress" : status === "paused" ? "Paused" : `${completed} rounds today`}
        status={status === "running" ? "Focus" : status === "paused" ? "Paused" : "Ready"}
        statusTone={status === "running" ? "success" : status === "paused" ? "warning" : "muted"}
      />

      <div className="w-full max-w-sm space-y-3">
        <ProjectSelect items={items} value={itemId ?? ""} onChange={(value) => setItemId(value || null)} />
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">Details</p>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What are you focusing on?"
            maxLength={280}
            className="min-h-16 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="flex-1 gap-2"
            style={{ background: color, color: "white" }}
            onClick={status === "idle" ? start : toggle}
          >
            {status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start focus"}
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={skip} title="Skip phase">
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="danger" className="gap-2" onClick={reset} title="End pomodoro">
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium text-muted-2">
          <span>{completed} rounds today</span>
          <span>{formatDuration(focusSeconds, { zero: "0m" })} focused</span>
        </div>
      </div>
    </div>
  );
}

export function TimerStudio({ items, initialMode = "timer" }: { items: ItemOption[]; initialMode?: Mode }) {
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const timer = useTimer();
  const pomodoro = usePomodoro();
  const isPomodoro = mode === "pomodoro";
  const color = isPomodoro
    ? phaseColor(pomodoro.phase)
    : timer.timer?.itemColor ?? "var(--primary)";

  return (
    <div className="space-y-5">
      <section className="card relative overflow-hidden">
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

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-surface/40 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl",
                isPomodoro ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
              )}
            >
              {isPomodoro ? <Flame className="h-4 w-4" /> : <TimerIcon className="h-4 w-4" />}
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight">{isPomodoro ? "Pomodoro" : "Timer"}</h2>
              <p className="text-[10px] text-muted">
                {isPomodoro ? "Focus, then take a real break" : "Track time against a project"}
              </p>
            </div>
          </div>

          <div className="flex rounded-xl border border-border bg-surface/80 p-0.5">
            {([
              { value: "timer", label: "Timer", icon: TimerIcon },
              { value: "pomodoro", label: "Pomodoro", icon: Flame },
            ] as const).map((option) => {
              const Icon = option.icon;
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold transition-colors",
                    active ? "bg-primary text-primary-contrast" : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <Icon className="h-3 w-3" /> {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative p-5 md:p-7">{isPomodoro ? <PomodoroContent items={items} /> : <TimerContent items={items} />}</div>
      </section>

      {isPomodoro && pomodoro.isPro ? <PomodoroSettingsPanel /> : null}
    </div>
  );
}
