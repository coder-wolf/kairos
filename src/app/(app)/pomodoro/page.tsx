import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { PomodoroPanel } from "@/components/pomodoro/pomodoro-panel";
import { SessionList } from "@/components/sessions/session-list";
import { getAppContext, toItemOptions, toSessionRows } from "@/lib/dal";
import { db } from "@/lib/db";
import { getDateRange, toDateKey } from "@/lib/time";

export const metadata: Metadata = { title: "Pomodoro" };

export default async function PomodoroPage() {
  const { user, items } = await getAppContext();
  const now = new Date();
  const today = getDateRange("today", user.timezone, user.weekStartsOn, { now });
  const todayKey = toDateKey(now, user.timezone);

  const recent = await db.timeSession.findMany({
    where: { workspaceId: user.workspace.id, source: "POMODORO" },
    orderBy: { startTime: "desc" },
    take: 6,
    include: { item: true },
  });

  const todaySessions = await db.timeSession.findMany({
    where: {
      workspaceId: user.workspace.id,
      source: "POMODORO",
      startTime: { gte: today.start, lt: today.end },
    },
    select: { id: true },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">One block at a time</p>
        <h1 className="mt-1.5 flex items-center gap-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-danger-soft text-danger">
            <Flame className="h-5 w-5" />
          </span>
          Pomodoro<span className="text-primary">.</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          A focused round, a real break, then another. Only the focus blocks are recorded — {todaySessions.length}{" "}
          completed today already.
        </p>
      </header>

      <PomodoroPanel items={toItemOptions(items)} />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Recent focus blocks</h2>
            <p className="text-[11px] text-muted">Pomodoro sessions flow into history like any other entry.</p>
          </div>
        </div>
        <SessionList
          sessions={toSessionRows(recent, items)}
          items={toItemOptions(items)}
          timezone={user.timezone}
          todayKey={todayKey}
          showPath
          emptyState={
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold">No focus blocks yet</p>
              <p className="mt-1 text-xs text-muted">Choose a project and start the first round when you&apos;re ready.</p>
            </div>
          }
        />
      </section>
    </div>
  );
}
