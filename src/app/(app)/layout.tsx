import { formatInTimeZone } from "date-fns-tz";
import { getDateRange } from "@/lib/time";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { getAppContext, toGoalSummaries, toItemOptions } from "@/lib/dal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getAppContext();
  const todayKey = formatInTimeZone(new Date(), context.user.timezone, "yyyy-MM-dd");
  const today = getDateRange("today", context.user.timezone, context.user.weekStartsOn);
  const pomodoro = await db.timeSession.aggregate({
    where: {
      workspaceId: context.user.workspace.id,
      source: "POMODORO",
      startTime: { gte: today.start, lt: today.end },
    },
    _count: { _all: true },
    _sum: { durationSeconds: true },
  });

  return (
    <AppShell
      user={context.user}
      items={toItemOptions(context.items)}
      goals={toGoalSummaries(context.goals)}
      timer={context.timer}
      todayKey={todayKey}
      pomodoro={{
        completed: pomodoro._count._all,
        focusSeconds: pomodoro._sum.durationSeconds ?? 0,
      }}
    >
      {children}
    </AppShell>
  );
}
