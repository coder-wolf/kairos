"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  CreditCard,
  ClockPlus,
  Download,
  FolderPlus,
  History,
  Maximize2,
  House,
  LogOut,
  Network,
  Pause,
  Play,
  Settings,
  Sparkles,
  Square,
  Target,
  Timer,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { StartPomodoroButton } from "@/components/pomodoro/start-pomodoro-button";
import { Brand } from "@/components/brand";
import { useQuickActions } from "@/components/quick-actions";
import { useTimer } from "@/components/timer/timer-provider";
import { usePomodoro } from "@/components/pomodoro/pomodoro-provider";
import { PomodoroChip } from "@/components/pomodoro/pomodoro-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserSummary } from "@/lib/types";
import { cn, formatClock, initials } from "@/lib/utils";

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  badge,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold transition-colors",
        active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-2 group-hover:text-text")} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 ? (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
            active ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-2",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SidebarContent({
  user,
  itemCount,
  activeGoalCount,
  onNavigate,
}: {
  user: UserSummary;
  itemCount: number;
  activeGoalCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { openNewItem, openManualTime } = useQuickActions();
  const { timer, elapsed, pending, pause, resume, stop, openChangeItem, start, openWindow } = useTimer();
  const pomodoro = usePomodoro();
  const [loggingOut, startLogout] = React.useTransition();

  const workspace = [
    { href: "/dashboard", label: "Home", icon: House },
    { href: "/workspace", label: "Projects", icon: Network, badge: itemCount },
    { href: "/goals", label: "Goals & Habits", icon: Target, badge: activeGoalCount },
  ];

  const tracking = [
    { href: "/timer", label: "Timer", icon: Timer },
    { href: "/calendar", label: "Calendar", icon: CalendarRange },
  ];

  const insights = [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/history", label: "Time History", icon: History },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Brand href="/dashboard" />
      </div>

      <div className="px-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-base">
            {user.workspace.icon ?? "🌿"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold">{user.workspace.name}</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-2">
              Personal workspace
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-2" />
        </Link>
      </div>

      <div className="mt-4 space-y-2 px-3">
        {pomodoro.active ? <PomodoroChip variant="sidebar" /> : timer ? (
          <div className="rounded-xl border border-border bg-surface p-2.5 shadow-(--shadow-card)">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  timer.status === "RUNNING" ? "animate-pulse-soft bg-success" : "bg-warning",
                )}
              />
              <button
                type="button"
                onClick={openChangeItem}
                className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold hover:text-primary"
                title={timer.isUnassigned ? "Add a project to this timer" : "Change project"}
              >
                {timer.isUnassigned ? "Add project" : timer.itemName}
              </button>
              <span
                suppressHydrationWarning
                className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted"
              >
                {formatClock(elapsed)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={timer.status === "RUNNING" ? pause : resume}
                disabled={pending}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-surface-2 text-[10px] font-bold text-muted transition-colors hover:bg-surface-3 hover:text-text"
              >
                {timer.status === "RUNNING" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {timer.status === "RUNNING" ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={stop}
                disabled={pending}
                className="flex h-7 items-center justify-center gap-1 rounded-md bg-primary-soft px-2.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/15"
              >
                <Square className="h-2.5 w-2.5" />
                Stop
              </button>
              <button
                type="button"
                onClick={openWindow}
                className="grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-muted-2 transition-colors hover:bg-surface-2 hover:text-text"
                aria-label="Open timer window"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : null}
        {!pomodoro.active && !timer ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              start();
              onNavigate?.();
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-primary-contrast shadow-[0_1px_2px_rgba(20,20,40,0.15)] transition-colors hover:bg-primary-hover"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Start Timer
          </button>
          <StartPomodoroButton className="h-10 w-full text-[13px] font-bold" label="Start Pomodoro" />
        </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              openNewItem();
              onNavigate?.();
            }}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[11px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <FolderPlus className="h-3.5 w-3.5" /> New Project
          </button>
          <button
            type="button"
            onClick={() => {
              openManualTime();
              onNavigate?.();
            }}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[11px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ClockPlus className="h-3.5 w-3.5" /> Add time
          </button>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">Workspace</p>
          <div className="space-y-0.5">
            {workspace.map((entry) => (
              <SidebarNavLink key={entry.href} {...entry} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">Tracking</p>
          <div className="space-y-0.5">
            {tracking.map((entry) => (
              <SidebarNavLink key={entry.href} {...entry} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">Insights</p>
          <div className="space-y-0.5">
            {insights.map((entry) => (
              <SidebarNavLink key={entry.href} {...entry} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">System</p>
          <SidebarNavLink href="/billing" label="Billing" icon={CreditCard} pathname={pathname} onNavigate={onNavigate} />
          <SidebarNavLink href="/settings" label="Settings" icon={Settings} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-[12px] font-extrabold text-white shadow-sm">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold">{user.name}</span>
                <span className="block truncate text-[11px] text-muted">{user.email}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-2" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-[230px]">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/billing">
                {user.isPro ? <CreditCard className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {user.isPro ? "Billing" : "Upgrade to Pro"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/api/export" download>
                <Download className="h-4 w-4" /> Export data
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => startLogout(() => logout())}
              disabled={loggingOut}
            >
              <LogOut className="h-4 w-4" /> {loggingOut ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar(props: {
  user: UserSummary;
  itemCount: number;
  activeGoalCount: number;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-surface/70 backdrop-blur-xl lg:block">
      <SidebarContent {...props} />
    </aside>
  );
}
