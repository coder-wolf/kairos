"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
] as const;

export function AnalyticsControls({
  preset,
  itemId,
  from,
  to,
  items,
  todayKey,
}: {
  preset: string;
  itemId?: string;
  from?: string;
  to?: string;
  items: ItemOption[];
  todayKey: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [customFrom, setCustomFrom] = React.useState(from ?? todayKey);
  const [customTo, setCustomTo] = React.useState(to ?? todayKey);

  const push = (next: { range?: string; item?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    const range = next.range ?? preset;
    params.set("range", range);
    const item = next.item !== undefined ? next.item : itemId;
    if (item) params.set("item", item);
    if (range === "custom") {
      params.set("from", next.from ?? customFrom);
      params.set("to", next.to ?? customTo);
    }
    startTransition(() => router.push(`/analytics?${params.toString()}`));
  };

  const itemOptions = flattenItemOptions(items, true);

  return (
    <div className="card p-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => push({ range: option.value })}
                className={cn(
                  "flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors",
                  preset === option.value ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
              <Select
                value={itemId ?? ""}
                onChange={(event) => push({ item: event.target.value })}
                className="h-9 w-[190px] py-0 pl-8 text-[11px]"
                aria-label="Filter by item"
              >
                <option value="">Whole workspace</option>
                {itemOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {"— ".repeat(option.depth)}
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            {pending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
          </div>
        </div>

        {preset === "custom" ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
            <CalendarRange className="h-3.5 w-3.5 text-muted-2" />
            <div className="relative">
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-8 w-[142px] text-[11px]"
                aria-label="From date"
              />
            </div>
            <span className="text-[10px] text-muted-2">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-8 w-[142px] text-[11px]"
              aria-label="To date"
            />
            <Button size="sm" onClick={() => push({ range: "custom" })} className="h-8">
              Apply range
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
