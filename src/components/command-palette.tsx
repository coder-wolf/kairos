"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Clock,
  CreditCard,
  ClockPlus,
  CornerDownLeft,
  FolderPlus,
  History,
  Home,
  Network,
  Plus,
  Search,
  Settings,
  Target,
  Timer,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import type { GoalSummary, ItemOption } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

type Entry = {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: React.ReactNode;
  color?: string | null;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemOption[];
  goals: GoalSummary[];
  onNewItem: () => void;
  onNewGoal: () => void;
  onAddTime: () => void;
  onStartTimer: () => void;
};

export function CommandPalette(props: CommandPaletteProps) {
  if (!props.open) return null;
  return <CommandPaletteBody {...props} />;
}

function CommandPaletteBody({
  onOpenChange,
  items,
  goals,
  onNewItem,
  onNewGoal,
  onAddTime,
  onStartTimer,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const close = () => onOpenChange(false);

  const navigation: Entry[] = [
    { id: "nav-home", label: "Home", sub: "Today's overview", group: "Navigate", icon: <Home className="h-4 w-4" />, run: () => router.push("/dashboard") },
    { id: "nav-workspace", label: "Projects", sub: "Your project hierarchy", group: "Navigate", icon: <Network className="h-4 w-4" />, run: () => router.push("/workspace") },
    { id: "nav-goals", label: "Goals & Habits", sub: "Progress, streaks, consistency", group: "Navigate", icon: <Target className="h-4 w-4" />, run: () => router.push("/goals") },
    { id: "nav-timer", label: "Timer", sub: "Weekly time-blocking calendar", group: "Navigate", icon: <Clock className="h-4 w-4" />, run: () => router.push("/timer") },
    { id: "nav-pomodoro", label: "Pomodoro", sub: "Focus blocks and real breaks", group: "Navigate", icon: <Timer className="h-4 w-4" />, run: () => router.push("/pomodoro") },
    { id: "nav-analytics", label: "Analytics", sub: "Where your time goes", group: "Navigate", icon: <BarChart3 className="h-4 w-4" />, run: () => router.push("/analytics") },
    { id: "nav-history", label: "Time History", sub: "Every session", group: "Navigate", icon: <History className="h-4 w-4" />, run: () => router.push("/history") },
    { id: "nav-billing", label: "Plan & Billing", sub: "Subscription and Pro features", group: "Navigate", icon: <CreditCard className="h-4 w-4" />, run: () => router.push("/billing") },
    { id: "nav-settings", label: "Settings", sub: "Profile and preferences", group: "Navigate", icon: <Settings className="h-4 w-4" />, run: () => router.push("/settings") },
  ];

  const actions: Entry[] = [
    { id: "action-timer", label: "Start a timer", sub: "Choose any item", group: "Quick actions", icon: <Timer className="h-4 w-4" />, run: onStartTimer },
    { id: "action-time", label: "Add time manually", sub: "Record time after the fact", group: "Quick actions", icon: <ClockPlus className="h-4 w-4" />, run: onAddTime },
    { id: "action-item", label: "Create a project", sub: "Area, project, or custom", group: "Quick actions", icon: <FolderPlus className="h-4 w-4" />, run: onNewItem },
    { id: "action-goal", label: "Create a goal", sub: "Attach a time target", group: "Quick actions", icon: <Target className="h-4 w-4" />, run: onNewGoal },
  ];

  const itemEntries: Entry[] = flattenItemOptions(items).map((item) => ({
    id: `item-${item.id}`,
    label: item.label,
    sub: item.path,
    group: "Items",
    icon: <span>{item.icon ?? "•"}</span>,
    color: item.color,
    run: () => router.push(`/items/${item.id}`),
  }));

  const goalEntries: Entry[] = goals
    .filter((goal) => goal.status === "ACTIVE")
    .map((goal) => ({
      id: `goal-${goal.id}`,
      label: goal.name,
      sub: `${formatDuration(goal.targetSeconds)} ${goal.periodType.toLowerCase()}`,
      group: "Goals",
      icon: <Target className="h-4 w-4" />,
      color: goal.color,
      run: () => router.push("/goals"),
    }));

  const pool = [...actions, ...navigation, ...itemEntries, ...goalEntries];
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? pool.filter((entry) =>
        `${entry.label} ${entry.sub ?? ""} ${entry.group}`.toLowerCase().includes(normalized),
      )
    : [...actions, ...navigation, ...itemEntries.slice(0, 6), ...goalEntries.slice(0, 4)];

  const groups = Array.from(new Set(filtered.map((entry) => entry.group)));

  const execute = (entry: Entry) => {
    close();
    setTimeout(() => entry.run(), 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % Math.max(1, filtered.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = filtered[active];
      if (entry) execute(entry);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="top-[10%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search for pages, items, goals, and quick actions.</DialogDescription>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-2" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to…"
            className="h-14 border-0 bg-transparent px-0 text-[15px] shadow-none focus:shadow-none"
          />
          <kbd className="hidden rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">
            esc
          </kbd>
        </div>

        <div className="scroll-thin max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold">No matches</p>
              <p className="mt-1 text-xs text-muted">Try a different word, or create the item you&apos;re looking for.</p>
              <button
                type="button"
                onClick={() => {
                  close();
                  setTimeout(onNewItem, 0);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> New project
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-1">
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">{group}</p>
                {filtered
                  .filter((entry) => entry.group === group)
                  .map((entry) => {
                    const index = filtered.indexOf(entry);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => execute(entry)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          active === index ? "bg-surface-2" : "hover:bg-surface-2/60",
                        )}
                      >
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-surface text-[13px] text-muted"
                          style={entry.color ? { color: entry.color, borderColor: `${entry.color}33`, background: `${entry.color}12` } : undefined}
                        >
                          {entry.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{entry.label}</span>
                          {entry.sub ? <span className="block truncate text-[11px] text-muted">{entry.sub}</span> : null}
                        </span>
                        {active === index ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-2" /> : null}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[10px] font-medium text-muted-2">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5">↓</kbd> to move
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5">↵</kbd> to open
          </span>
          <span className="ml-auto">Kairos command palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
