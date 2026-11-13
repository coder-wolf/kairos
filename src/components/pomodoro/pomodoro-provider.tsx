"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPomodoroSession } from "@/app/actions/sessions";
import { useTimer } from "@/components/timer/timer-provider";
import { formatDuration } from "@/lib/utils";

export type PomodoroPhase = "focus" | "short_break" | "long_break";
export type PomodoroStatus = "idle" | "running" | "paused";

export type PomodoroSettings = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  sound: boolean;
};

export type PomodoroRun = {
  phase: PomodoroPhase;
  status: PomodoroStatus;
  endsAt: number | null;
  remainingMs: number;
  totalMs: number;
  activeMs: number;
  segmentStartedAt: number | null;
  phaseStartedAt: number | null;
  phaseId: string | null;
  itemId: string | null;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  sound: true,
};

const STORAGE_KEY = "kairos:pomodoro";

const IDLE_RUN: PomodoroRun = {
  phase: "focus",
  status: "idle",
  endsAt: null,
  remainingMs: DEFAULT_POMODORO_SETTINGS.workMinutes * 60_000,
  totalMs: DEFAULT_POMODORO_SETTINGS.workMinutes * 60_000,
  activeMs: 0,
  segmentStartedAt: null,
  phaseStartedAt: null,
  phaseId: null,
  itemId: null,
};

type PomodoroContextValue = {
  settings: PomodoroSettings;
  run: PomodoroRun;
  phase: PomodoroPhase;
  status: PomodoroStatus;
  remainingMs: number;
  totalMs: number;
  completed: number;
  focusSeconds: number;
  itemId: string | null;
  active: boolean;
  windowOpen: boolean;
  openWindow: () => void;
  closeWindow: () => void;
  setItemId: (id: string | null) => void;
  updateSettings: (next: Partial<PomodoroSettings>) => void;
  setCustomMinutes: (minutes: number) => void;
  start: () => void;
  startFocus: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
};

const PomodoroContext = React.createContext<PomodoroContextValue | null>(null);

export function usePomodoro() {
  const value = React.useContext(PomodoroContext);
  if (!value) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return value;
}

export function phaseDurationMs(phase: PomodoroPhase, settings: PomodoroSettings) {
  if (phase === "focus") return Math.max(1, settings.workMinutes) * 60_000;
  if (phase === "short_break") return Math.max(1, settings.shortBreakMinutes) * 60_000;
  return Math.max(1, settings.longBreakMinutes) * 60_000;
}

export function phaseLabel(phase: PomodoroPhase) {
  if (phase === "focus") return "Focus";
  if (phase === "short_break") return "Short break";
  return "Long break";
}

export function phaseColor(phase: PomodoroPhase) {
  if (phase === "focus") return "var(--danger)";
  if (phase === "short_break") return "var(--success)";
  return "var(--info)";
}

function playChime() {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.32);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.16);
      oscillator.stop(now + index * 0.16 + 0.35);
    });
    window.setTimeout(() => context.close().catch(() => {}), 900);
  } catch {
    // Sound is a nice-to-have; never break the timer for it.
  }
}

export function PomodoroProvider({
  todayKey,
  initialCompleted,
  initialFocusSeconds,
  children,
}: {
  todayKey: string;
  initialCompleted: number;
  initialFocusSeconds: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { timer } = useTimer();
  const [settings, setSettings] = React.useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [run, setRun] = React.useState<PomodoroRun>(IDLE_RUN);
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [focusSeconds, setFocusSeconds] = React.useState(initialFocusSeconds);
  const [hydrated, setHydrated] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [windowOpen, setWindowOpen] = React.useState(false);
  const openWindow = React.useCallback(() => setWindowOpen(true), []);
  const closeWindow = React.useCallback(() => setWindowOpen(false), []);
  const initialized = React.useRef(false);
  const completionRef = React.useRef<string | null>(null);
  const runRef = React.useRef(run);
  const settingsRef = React.useRef(settings);
  const completedRef = React.useRef(completed);
  const focusSecondsRef = React.useRef(focusSeconds);

  React.useEffect(() => {
    runRef.current = run;
    settingsRef.current = settings;
    completedRef.current = completed;
    focusSecondsRef.current = focusSeconds;
  }, [run, settings, completed, focusSeconds]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          day?: string;
          settings?: PomodoroSettings;
          run?: PomodoroRun;
          completed?: number;
          focusSeconds?: number;
        };
        const mergedSettings = { ...DEFAULT_POMODORO_SETTINGS, ...saved.settings };
        if (saved.settings) setSettings(mergedSettings);
        if (saved.run) {
          const restored = { ...IDLE_RUN, ...saved.run };
          if (typeof saved.run.totalMs !== "number") {
            restored.totalMs = phaseDurationMs(restored.phase, mergedSettings);
          }
          setRun(restored);
          completionRef.current = saved.run.phaseId ?? null;
        }
        if (saved.day === todayKey) {
          if (typeof saved.completed === "number") setCompleted(saved.completed);
          if (typeof saved.focusSeconds === "number") setFocusSeconds(saved.focusSeconds);
        }
      }
    } catch {
      // A corrupt preference shouldn't take the timer down.
    }
    setHydrated(true);
  }, [todayKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ day: todayKey, settings, run, completed, focusSeconds }),
      );
    } catch {
      // ignore storage failures
    }
  }, [hydrated, todayKey, settings, run, completed, focusSeconds]);

  React.useEffect(() => {
    if (!hydrated || run.status !== "running" || !run.endsAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [hydrated, run.status, run.endsAt]);

  React.useEffect(() => {
    if (!hydrated || run.status !== "running" || !run.endsAt) return;
    if (now < run.endsAt) return;
    if (!run.phaseId || completionRef.current === run.phaseId) return;
    completionRef.current = run.phaseId;

    const current = runRef.current;
    const currentSettings = settingsRef.current;
    const finishedAt = current.endsAt ?? Date.now();
    const workedMs = Math.max(
      0,
      current.activeMs + (current.segmentStartedAt ? finishedAt - current.segmentStartedAt : 0),
    );
    const isFocus = current.phase === "focus";
    if (currentSettings.sound) playChime();

    if (isFocus) {
      const nextCompleted = completedRef.current + 1;
      setCompleted(nextCompleted);
      setFocusSeconds(focusSecondsRef.current + Math.round(workedMs / 1000));
      if (current.phaseStartedAt) {
        const start = new Date(finishedAt - workedMs).toISOString();
        const end = new Date(finishedAt).toISOString();
        createPomodoroSession({
          itemId: current.itemId,
          startTime: start,
          endTime: end,
          description: "Pomodoro focus",
        })
          .then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Focus block saved", {
                description: `${formatDuration(Math.round(workedMs / 1000))} added to your history.`,
              });
              router.refresh();
            }
          })
          .catch(() => toast.error("Could not save the focus block."));
      }
      const longBreak = nextCompleted % Math.max(1, currentSettings.sessionsUntilLongBreak) === 0;
      const nextPhase: PomodoroPhase = longBreak ? "long_break" : "short_break";
      const breakMs = phaseDurationMs(nextPhase, currentSettings);
      if (currentSettings.autoStartBreaks) {
        setRun({
          ...current,
          phase: nextPhase,
          status: "running",
          endsAt: Date.now() + breakMs,
          remainingMs: breakMs,
          totalMs: breakMs,
          activeMs: 0,
          segmentStartedAt: Date.now(),
          phaseStartedAt: Date.now(),
          phaseId: `break-${Date.now()}`,
        });
      } else {
        setRun({
          ...current,
          phase: nextPhase,
          status: "idle",
          endsAt: null,
          remainingMs: breakMs,
          totalMs: breakMs,
          activeMs: 0,
          segmentStartedAt: null,
          phaseStartedAt: null,
          phaseId: null,
        });
      }
      toast.success("Focus complete", { description: longBreak ? "Take the long break — you earned it." : "Time for a short break." });
    } else {
      const focusMs = phaseDurationMs("focus", currentSettings);
      if (currentSettings.sound) playChime();
      if (currentSettings.autoStartFocus) {
        setRun({
          ...current,
          phase: "focus",
          status: "running",
          endsAt: Date.now() + focusMs,
          remainingMs: focusMs,
          totalMs: focusMs,
          activeMs: 0,
          segmentStartedAt: Date.now(),
          phaseStartedAt: Date.now(),
          phaseId: `focus-${Date.now()}`,
        });
      } else {
        setRun({
          ...current,
          phase: "focus",
          status: "idle",
          endsAt: null,
          remainingMs: focusMs,
          totalMs: focusMs,
          activeMs: 0,
          segmentStartedAt: null,
          phaseStartedAt: null,
          phaseId: null,
        });
      }
      toast("Break finished", { description: currentSettings.autoStartFocus ? "The next focus block has begun." : "Ready when you are." });
    }
  }, [now, hydrated, run.status, run.endsAt, run.phaseId, router]);

  const remainingMs = React.useMemo(() => {
    if (run.status === "running" && run.endsAt) return Math.max(0, run.endsAt - now);
    return Math.max(0, run.remainingMs);
  }, [run, now]);

  const totalMs = run.totalMs || phaseDurationMs(run.phase, settings);

  const setItemId = React.useCallback((id: string | null) => {
    setRun((current) => ({ ...current, itemId: id }));
  }, []);

  const start = React.useCallback(() => {
    const current = runRef.current;
    if (current.status !== "idle") return;
    if (current.phase === "focus" && timer) {
      toast.error("A regular timer is already running. Stop it first so time isn't counted twice.");
      return;
    }
    const duration = phaseDurationMs(current.phase, settingsRef.current);
    const startAt = Date.now();
    completionRef.current = null;
    setRun({
      ...current,
      status: "running",
      endsAt: startAt + duration,
      remainingMs: duration,
      totalMs: duration,
      activeMs: 0,
      segmentStartedAt: startAt,
      phaseStartedAt: startAt,
      phaseId: `${current.phase}-${startAt}`,
    });
    setNow(startAt);
  }, [timer]);

  const startFocus = React.useCallback(() => {
    const current = runRef.current;
    if (current.status !== "idle") {
      setWindowOpen(true);
      return;
    }
    if (timer) {
      toast.error("A regular timer is already running. Stop it first so time isn't counted twice.");
      setWindowOpen(true);
      return;
    }
    const duration = phaseDurationMs("focus", settingsRef.current);
    const startAt = Date.now();
    completionRef.current = null;
    setRun({
      ...current,
      phase: "focus",
      status: "running",
      endsAt: startAt + duration,
      remainingMs: duration,
      totalMs: duration,
      activeMs: 0,
      segmentStartedAt: startAt,
      phaseStartedAt: startAt,
      phaseId: `focus-${startAt}`,
    });
    setNow(startAt);
  }, [timer]);

  const toggle = React.useCallback(() => {
    const current = runRef.current;
    if (current.status === "running") {
      const remaining = current.endsAt ? Math.max(0, current.endsAt - Date.now()) : current.remainingMs;
      const active =
        current.activeMs + (current.segmentStartedAt ? Date.now() - current.segmentStartedAt : 0);
      setRun({
        ...current,
        status: "paused",
        endsAt: null,
        remainingMs: remaining,
        activeMs: active,
        segmentStartedAt: null,
      });
      return;
    }
    if (current.status === "paused") {
      const startAt = Date.now();
      setRun({
        ...current,
        status: "running",
        endsAt: startAt + current.remainingMs,
        segmentStartedAt: startAt,
      });
      setNow(startAt);
    }
  }, []);

  const reset = React.useCallback(() => {
    const current = runRef.current;
    const duration = phaseDurationMs(current.phase, settingsRef.current);
    completionRef.current = null;
    setRun({
      ...current,
      status: "idle",
      endsAt: null,
      remainingMs: duration,
      totalMs: duration,
      activeMs: 0,
      segmentStartedAt: null,
      phaseStartedAt: null,
      phaseId: null,
    });
  }, []);

  const skip = React.useCallback(() => {
    const current = runRef.current;
    const currentSettings = settingsRef.current;
    const nowMs = Date.now();
    if (current.phase === "focus") {
      const active = current.activeMs + (current.segmentStartedAt ? nowMs - current.segmentStartedAt : 0);
      if (current.phaseStartedAt && active >= 30_000) {
        createPomodoroSession({
          itemId: current.itemId,
          startTime: new Date(nowMs - active).toISOString(),
          endTime: new Date(nowMs).toISOString(),
          description: "Pomodoro focus (ended early)",
        })
          .then((result) => {
            if (result.ok) {
              setFocusSeconds((value) => value + Math.round(active / 1000));
              toast.success("Partial focus saved");
              router.refresh();
            }
          })
          .catch(() => {});
      }
      const nextPhase: PomodoroPhase = "short_break";
      const breakMs = phaseDurationMs(nextPhase, currentSettings);
      setRun({
        ...current,
        phase: nextPhase,
        status: "idle",
        endsAt: null,
        remainingMs: breakMs,
        totalMs: breakMs,
        activeMs: 0,
        segmentStartedAt: null,
        phaseStartedAt: null,
        phaseId: null,
      });
      return;
    }
    const focusMs = phaseDurationMs("focus", currentSettings);
    setRun({
      ...current,
      phase: "focus",
      status: "idle",
      endsAt: null,
      remainingMs: focusMs,
      totalMs: focusMs,
      activeMs: 0,
      segmentStartedAt: null,
      phaseStartedAt: null,
      phaseId: null,
    });
  }, [router]);

  const setCustomMinutes = React.useCallback((minutes: number) => {
    const current = runRef.current;
    const mins = Math.max(1, Math.min(180, Math.round(minutes)));
    const duration = mins * 60_000;
    const key =
      current.phase === "focus"
        ? "workMinutes"
        : current.phase === "short_break"
          ? "shortBreakMinutes"
          : "longBreakMinutes";
    setSettings((value) => ({ ...value, [key]: mins }));

    if (current.status === "running") {
      const nowMs = Date.now();
      const active = current.activeMs + (current.segmentStartedAt ? nowMs - current.segmentStartedAt : 0);
      const remaining = Math.max(1_000, duration - active);
      setRun({
        ...current,
        endsAt: nowMs + remaining,
        remainingMs: remaining,
        totalMs: duration,
        activeMs: active,
        segmentStartedAt: nowMs,
      });
      setNow(nowMs);
      return;
    }

    if (current.status === "paused") {
      const remaining = Math.max(1_000, duration - current.activeMs);
      setRun({ ...current, remainingMs: remaining, totalMs: duration });
      return;
    }

    setRun({ ...current, remainingMs: duration, totalMs: duration });
  }, []);

  const updateSettings = React.useCallback((next: Partial<PomodoroSettings>) => {
    setSettings((current) => {
      const merged = { ...current, ...next };
      setRun((runState) => {
        if (runState.status !== "idle") return runState;
        const duration = phaseDurationMs(runState.phase, merged);
        return { ...runState, remainingMs: duration, totalMs: duration };
      });
      return merged;
    });
  }, []);

  const value = React.useMemo<PomodoroContextValue>(
    () => ({
      settings,
      run,
      phase: run.phase,
      status: run.status,
      remainingMs,
      totalMs,
      completed,
      focusSeconds,
      itemId: run.itemId,
      active: run.status !== "idle",
      windowOpen,
      openWindow,
      closeWindow,
      setItemId,
      setCustomMinutes,
      updateSettings,
      start,
      startFocus,
      toggle,
      reset,
      skip,
    }),
    [
      settings,
      run,
      remainingMs,
      totalMs,
      completed,
      focusSeconds,
      setItemId,
      setCustomMinutes,
      updateSettings,
      start,
      startFocus,
      toggle,
      reset,
      skip,
      windowOpen,
      openWindow,
      closeWindow,
    ],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
