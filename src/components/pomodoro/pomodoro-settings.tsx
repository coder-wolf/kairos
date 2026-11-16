"use client";

import { Volume2, Zap } from "lucide-react";
import { usePomodoro } from "@/components/pomodoro/pomodoro-provider";
import { cn } from "@/lib/utils";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div>
        <p className="text-[12px] font-semibold">{label}</p>
        <p className="text-[10px] leading-4 text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

export function PomodoroSettingsPanel() {
  const { settings, updateSettings } = usePomodoro();

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Zap className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-bold tracking-tight">Rhythm settings</h2>
          <p className="text-[10px] text-muted">Tune the shape of a round.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {[
          { key: "workMinutes" as const, label: "Focus", suffix: "min" },
          { key: "shortBreakMinutes" as const, label: "Short break", suffix: "min" },
          { key: "longBreakMinutes" as const, label: "Long break", suffix: "min" },
          { key: "sessionsUntilLongBreak" as const, label: "Long break every", suffix: "rounds" },
        ].map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">
              {field.label}
            </span>
            <span className="relative block">
              <input
                type="number"
                min={1}
                max={field.key === "sessionsUntilLongBreak" ? 12 : 180}
                value={settings[field.key]}
                onChange={(event) =>
                  updateSettings({ [field.key]: Math.max(1, Number(event.target.value) || 1) })
                }
                className="field h-9 pr-12 text-[12px]"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wide text-muted-2">
                {field.suffix}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="divide-y divide-border border-t border-border px-4">
        <Toggle
          label="Auto-start breaks"
          description="Roll straight into recovery when focus ends."
          checked={settings.autoStartBreaks}
          onChange={(value) => updateSettings({ autoStartBreaks: value })}
        />
        <Toggle
          label="Auto-start focus"
          description="Begin the next round as soon as a break ends."
          checked={settings.autoStartFocus}
          onChange={(value) => updateSettings({ autoStartFocus: value })}
        />
        <Toggle
          label="Sound cues"
          description="A gentle two-note chime at each transition."
          checked={settings.sound}
          onChange={(value) => updateSettings({ sound: value })}
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-surface-2/50 px-4 py-2.5 text-[10px] text-muted">
        <Volume2 className="h-3 w-3" />
        Only focus time is saved to history. Breaks never touch your goals.
      </div>
    </section>
  );
}
