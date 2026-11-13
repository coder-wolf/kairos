"use client";

import { QuickActionsProvider } from "@/components/quick-actions";
import { PomodoroProvider } from "@/components/pomodoro/pomodoro-provider";
import { PomodoroFloating } from "@/components/pomodoro/pomodoro-floating";
import { TimerFloating } from "@/components/timer/timer-floating";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TimerProvider } from "@/components/timer/timer-provider";
import type { GoalSummary, ItemOption, TimerSnapshot, UserSummary } from "@/lib/types";

export function AppShell({
  user,
  items,
  goals,
  timer,
  todayKey,
  pomodoro,
  children,
}: {
  user: UserSummary;
  items: ItemOption[];
  goals: GoalSummary[];
  timer: TimerSnapshot | null;
  todayKey: string;
  pomodoro: { completed: number; focusSeconds: number };
  children: React.ReactNode;
}) {
  const itemCount = items.filter((item) => !item.archivedAt && !item.isSystem).length;
  const activeGoalCount = goals.filter((goal) => goal.status === "ACTIVE").length;

  return (
    <TimerProvider initialTimer={timer} items={items}>
      <PomodoroProvider
        todayKey={todayKey}
        initialCompleted={pomodoro.completed}
        initialFocusSeconds={pomodoro.focusSeconds}
      >
        <QuickActionsProvider user={user} items={items} goals={goals} todayKey={todayKey}>
        <div className="min-h-dvh">
          <Sidebar user={user} itemCount={itemCount} activeGoalCount={activeGoalCount} />
          <div className="lg:pl-[264px]">
            <Topbar user={user} itemCount={itemCount} activeGoalCount={activeGoalCount} />
            <main className="container-page py-6 md:py-8 lg:py-10">{children}</main>
          </div>
          </div>
        </QuickActionsProvider>
        <PomodoroFloating items={items} />
      </PomodoroProvider>
      <TimerFloating items={items} />
    </TimerProvider>
  );
}
