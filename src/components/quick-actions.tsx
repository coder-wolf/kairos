"use client";

import * as React from "react";
import { CommandPalette } from "@/components/command-palette";
import { GoalDialog } from "@/components/dialogs/goal-dialog";
import { ItemDialog } from "@/components/dialogs/item-dialog";
import { ManualTimeDialog } from "@/components/dialogs/manual-time-dialog";
import { useTimer } from "@/components/timer/timer-provider";
import type { GoalSummary, ItemOption, SessionRow, UserSummary } from "@/lib/types";

type QuickActionsContextValue = {
  openNewItem: (parentId?: string | null) => void;
  openEditItem: (id: string) => void;
  openNewGoal: (itemId?: string) => void;
  openEditGoal: (id: string) => void;
  openManualTime: (options?: { itemId?: string; session?: SessionRow }) => void;
  startTimerNow: () => void;
  openCommandPalette: () => void;
};

const QuickActionsContext = React.createContext<QuickActionsContextValue | null>(null);

export function useQuickActions() {
  const context = React.useContext(QuickActionsContext);
  if (!context) throw new Error("useQuickActions must be used inside QuickActionsProvider");
  return context;
}

export function QuickActionsProvider({
  user,
  items,
  goals,
  todayKey,
  children,
}: {
  user: UserSummary;
  items: ItemOption[];
  goals: GoalSummary[];
  todayKey: string;
  children: React.ReactNode;
}) {
  const [itemDialog, setItemDialog] = React.useState<{
    open: boolean;
    initialId?: string;
    parentId?: string | null;
  }>({ open: false });
  const [goalDialog, setGoalDialog] = React.useState<{ open: boolean; initialId?: string; itemId?: string }>({
    open: false,
  });
  const [timeDialog, setTimeDialog] = React.useState<{
    open: boolean;
    itemId?: string;
    session?: SessionRow;
  }>({ open: false });
  const [commandOpen, setCommandOpen] = React.useState(false);
  const { start } = useTimer();

  const value = React.useMemo<QuickActionsContextValue>(
    () => ({
      openNewItem: (parentId) => setItemDialog({ open: true, parentId: parentId ?? null }),
      openEditItem: (id) => setItemDialog({ open: true, initialId: id }),
      openNewGoal: (itemId) => setGoalDialog({ open: true, itemId }),
      openEditGoal: (id) => setGoalDialog({ open: true, initialId: id }),
      openManualTime: (options) =>
        setTimeDialog({ open: true, itemId: options?.itemId, session: options?.session }),
      startTimerNow: () => start(),
      openCommandPalette: () => setCommandOpen(true),
    }),
    [start],
  );

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initialItem = itemDialog.initialId ? items.find((item) => item.id === itemDialog.initialId) ?? null : null;
  const initialGoal = goalDialog.initialId ? goals.find((goal) => goal.id === goalDialog.initialId) ?? null : null;

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <ItemDialog
        open={itemDialog.open}
        onOpenChange={(open) => setItemDialog((current) => ({ ...current, open }))}
        items={items}
        initial={initialItem}
        defaultParentId={itemDialog.parentId ?? null}
      />
      <GoalDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog((current) => ({ ...current, open }))}
        items={items}
        initial={initialGoal}
        defaultItemId={goalDialog.itemId}
        timezone={user.timezone}
        todayKey={todayKey}
      />
      <ManualTimeDialog
        open={timeDialog.open}
        onOpenChange={(open) => setTimeDialog((current) => ({ ...current, open }))}
        items={items}
        initial={timeDialog.session ?? null}
        defaultItemId={timeDialog.itemId}
        timezone={user.timezone}
        todayKey={todayKey}
      />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={items}
        goals={goals}
        onNewItem={() => setItemDialog({ open: true, parentId: null })}
        onNewGoal={() => setGoalDialog({ open: true })}
        onAddTime={() => setTimeDialog({ open: true })}
        onStartTimer={() => start()}
      />
    </QuickActionsContext.Provider>
  );
}
