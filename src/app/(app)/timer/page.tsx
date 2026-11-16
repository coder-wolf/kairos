import type { Metadata } from "next";
import { Timer as TimerIcon } from "lucide-react";
import { DayTimeline } from "@/components/timer/day-timeline";
import { TimerTabs } from "@/components/timer/timer-tabs";
import { TimerStudio } from "@/components/timer/timer-studio";
import { totalSeconds } from "@/lib/analytics";
import { getAppContext, toItemOptions, toSessionRows } from "@/lib/dal";
import { getSessionsWindow } from "@/lib/queries";
import { getDateRange, toDateKey } from "@/lib/time";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Timer" };

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const initialMode = params.mode === "pomodoro" ? "pomodoro" : "timer";
  const { user, items } = await getAppContext();
  const now = new Date();
  const today = getDateRange("today", user.timezone, user.weekStartsOn, { now });
  const todayKey = toDateKey(now, user.timezone);
  const sessions = await getSessionsWindow(user.workspace.id, today.start, today.end);
  const rows = toSessionRows(sessions, items);
  const total = totalSeconds(sessions, today.start, today.end);
  const itemOptions = toItemOptions(items);

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-3 animate-fade-in md:h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-9rem)] xl:h-auto xl:space-y-6">
      <header className="hidden xl:flex xl:flex-col xl:gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">One clock at a time</p>
          <h1 className="mt-1.5 flex items-center gap-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <TimerIcon className="h-5 w-5" />
            </span>
            <span>
              Timer<span className="text-primary">.</span>
            </span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
            Run a regular timer or a Pomodoro focus block, and watch today fill up on the right.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="text-muted">Today</span>
            <strong className="font-semibold text-text">{formatDuration(total, { zero: "0m" })}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="text-muted">Entries</span>
            <strong className="font-semibold text-text">{rows.length}</strong>
          </span>
        </div>
      </header>

      <TimerTabs
        timer={<TimerStudio items={itemOptions} initialMode={initialMode} />}
        calendar={<DayTimeline sessions={rows} todayKey={todayKey} timezone={user.timezone} fill />}
      />
    </div>
  );
}
