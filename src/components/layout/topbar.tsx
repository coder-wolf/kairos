"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ClockPlus, Menu, Search } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { SidebarContent } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TimerWidget } from "@/components/layout/timer-widget";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/button";
import type { UserSummary } from "@/lib/types";

function pageTitle(pathname: string) {
  if (pathname.startsWith("/items/")) return "Item details";
  if (pathname.startsWith("/dashboard")) return "Home";
  if (pathname.startsWith("/workspace")) return "Projects";
  if (pathname.startsWith("/goals")) return "Goals & Habits";
  if (pathname.startsWith("/analytics")) return "Analytics";
  if (pathname.startsWith("/history")) return "Time History";
  if (pathname.startsWith("/timer")) return "Timer";
  if (pathname.startsWith("/pomodoro")) return "Pomodoro";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Kairos";
}

export function Topbar({
  user,
  itemCount,
  activeGoalCount,
}: {
  user: UserSummary;
  itemCount: number;
  activeGoalCount: number;
}) {
  const pathname = usePathname();
  const { openCommandPalette, openManualTime } = useQuickActions();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-xl md:px-6 lg:px-8">
        <IconButton
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </IconButton>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold tracking-tight">{pageTitle(pathname)}</p>
          <p className="hidden truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-2 sm:block">
            {user.workspace.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden h-9 w-[210px] items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[12px] font-medium text-muted-2 transition-colors hover:bg-surface-2 hover:text-muted md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-[9px] font-semibold">⌘K</kbd>
          </button>
          <IconButton
            variant="outline"
            size="icon-sm"
            onClick={openCommandPalette}
            className="md:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </IconButton>

          <TimerWidget />

          <IconButton
            variant="outline"
            size="icon-sm"
            onClick={() => openManualTime()}
            className="hidden sm:grid"
            aria-label="Add time manually"
          >
            <ClockPlus className="h-4 w-4" />
          </IconButton>

          <ThemeToggle user={user} />
        </div>
      </header>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          showClose={false}
          className="left-0 top-0 h-dvh w-[290px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">Move around your Kairos workspace.</DialogDescription>
          <SidebarContent
            user={user}
            itemCount={itemCount}
            activeGoalCount={activeGoalCount}
            onNavigate={() => setMobileOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
