"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClockPlus,
  List,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { addMonthsToKey } from "@/lib/time";
import type { ItemOption } from "@/lib/types";
import { flattenItemOptions } from "@/lib/item-options";
import { cn } from "@/lib/utils";

export function HistoryControls({
  month,
  view,
  itemId,
  source,
  query,
  day,
  items,
  todayKey,
}: {
  month: string;
  view: "list" | "calendar";
  itemId?: string;
  source?: string;
  query?: string;
  day?: string;
  items: ItemOption[];
  todayKey: string;
}) {
  const router = useRouter();
  const { openManualTime } = useQuickActions();
  const [pending, startTransition] = React.useTransition();
  const [search, setSearch] = React.useState(query ?? "");

  const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );

  const push = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const values: Record<string, string | undefined> = {
      month,
      view,
      item: itemId,
      source,
      q: query,
      day,
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    startTransition(() => router.push(`/history?${params.toString()}`));
  };

  const todayMonth = todayKey.slice(0, 7);

  return (
    <div className="card p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => push({ month: addMonthsToKey(month, -1), day: undefined, page: undefined })}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[150px] text-center">
            <p className="text-[12px] font-bold">{monthLabel}</p>
            <button
              type="button"
              onClick={() => push({ month: todayMonth, day: undefined, page: undefined })}
              className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-2 hover:text-primary"
            >
              Jump to today
            </button>
          </div>
          <button
            type="button"
            onClick={() => push({ month: addMonthsToKey(month, 1), day: undefined, page: undefined })}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex rounded-lg border border-border bg-surface p-0.5">
          {(
            [
              { value: "list", label: "List", icon: List },
              { value: "calendar", label: "Calendar", icon: CalendarDays },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => push({ view: option.value })}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors",
                view === option.value ? "bg-primary text-primary-contrast" : "text-muted hover:text-text",
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
            <Select
              value={itemId ?? ""}
              onChange={(event) => push({ item: event.target.value || undefined, day: undefined, page: undefined })}
              className="h-9 w-[180px] py-0 pl-8 text-[11px]"
              aria-label="Filter by item"
            >
              <option value="">All items</option>
              {flattenItemOptions(items, true).map((option) => (
                <option key={option.id} value={option.id}>
                  {"— ".repeat(option.depth)}
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <Select
            value={source ?? ""}
            onChange={(event) => push({ source: event.target.value || undefined, day: undefined, page: undefined })}
            className="h-9 w-[120px] py-0 text-[11px]"
            aria-label="Filter by entry type"
          >
            <option value="">All types</option>
            <option value="TIMER">Timer</option>
            <option value="MANUAL">Manual</option>
            <option value="POMODORO">Pomodoro</option>
          </Select>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              push({ q: search || undefined, day: undefined, page: undefined });
            }}
            className="relative flex-1 sm:min-w-[180px]"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search descriptions and items…"
              className="h-9 pl-8 text-[11px]"
            />
          </form>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openManualTime()}
            className="h-9 gap-1.5"
          >
            <ClockPlus className="h-3.5 w-3.5" /> Add time
          </Button>
          {query || itemId || source || day ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-9"
              onClick={() => push({ q: undefined, item: undefined, source: undefined, day: undefined, page: undefined })}
            >
              Clear
            </Button>
          ) : null}
          {pending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}
        </div>
      </div>
    </div>
  );
}
