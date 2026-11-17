"use client";

import * as React from "react";
import { CalendarRange, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "timer" | "calendar";

export function TimerTabs({ timer, calendar }: { timer: React.ReactNode; calendar: React.ReactNode }) {
  const [tab, setTab] = React.useState<Tab>("timer");

  return (
    <>
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1 xl:hidden">
        {(
          [
            { value: "timer", label: "Timer", icon: Timer },
            { value: "calendar", label: "Calendar", icon: CalendarRange },
          ] as const
        ).map((option) => {
          const Icon = option.icon;
          const active = tab === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-colors",
                active ? "bg-primary text-primary-contrast" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {option.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] xl:gap-5">
        <div
          className={cn(
            "h-full min-h-0 overflow-y-auto scroll-thin pr-1",
            tab === "timer" ? "block" : "hidden",
            "xl:block",
          )}
        >
          {timer}
        </div>
        <div
          className={cn(
            "h-full min-h-0 overflow-hidden",
            tab === "calendar" ? "block" : "hidden",
            "xl:block",
          )}
        >
          {calendar}
        </div>
      </div>
    </>
  );
}
