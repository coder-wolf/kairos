"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Bell, CalendarDays, Repeat2, Target } from "lucide-react";
import { toast } from "sonner";
import { createGoal, updateGoal } from "@/app/actions/goals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { addDaysToKey } from "@/lib/time";
import type { GoalSummary, ItemOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { flattenItemOptions } from "@/lib/item-options";

const PERIODS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const WEEKDAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

type GoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemOption[];
  initial?: GoalSummary | null;
  defaultItemId?: string;
  timezone: string;
  todayKey: string;
};

export function GoalDialog(props: GoalDialogProps) {
  if (!props.open) return null;
  return (
    <GoalDialogBody
      key={`${props.initial?.id ?? "new"}-${props.defaultItemId ?? ""}`}
      {...props}
    />
  );
}

function GoalDialogBody({
  onOpenChange,
  items,
  initial,
  defaultItemId,
  timezone,
  todayKey,
}: GoalDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const initialPeriod = initial?.periodType ?? "WEEKLY";
  const initialMinutes = initial ? initial.targetSeconds / 60 : 60;

  const [name, setName] = React.useState(initial?.name ?? "");
  const [itemIds, setItemIds] = React.useState<string[]>(
    initial?.itemIds?.length
      ? initial.itemIds
      : initial?.itemId
        ? [initial.itemId]
        : defaultItemId
          ? [defaultItemId]
          : [],
  );
  const [value, setValue] = React.useState(
    initial
      ? initialPeriod === "DAILY"
        ? String(Math.round(initialMinutes))
        : String(Number((initialMinutes / 60).toFixed(2)))
      : initialPeriod === "DAILY"
        ? "30"
        : "5",
  );
  const [unit, setUnit] = React.useState<"hours" | "minutes">(initialPeriod === "DAILY" ? "minutes" : "hours");
  const [periodType, setPeriodType] = React.useState<string>(initialPeriod);
  const [days, setDays] = React.useState<number[]>(initial?.daysOfWeek ?? []);
  const [startDate, setStartDate] = React.useState(
    initial ? formatInTimeZone(new Date(initial.startDate), timezone, "yyyy-MM-dd") : todayKey,
  );
  const [endDate, setEndDate] = React.useState(
    initial?.endDate ? formatInTimeZone(new Date(initial.endDate), timezone, "yyyy-MM-dd") : "",
  );
  const [reminder, setReminder] = React.useState(initial?.reminder ?? false);
  const [error, setError] = React.useState<string | null>(null);

  const itemOptions = flattenItemOptions(items);
  const minutes = Math.max(0, Number(value || 0) * (unit === "hours" ? 60 : 1));
  const hoursLabel = `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;

  const toggleDay = (day: number) => {
    setDays((current) => (current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day]));
  };

  const toggleItem = (id: string) => {
    setItemIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        id: initial?.id,
        itemId: itemIds[0] ?? "",
        itemIds,
        name,
        targetMinutes: Math.round(minutes),
        periodType: periodType as "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM",
        daysOfWeek: days,
        startDate,
        endDate: endDate || null,
        reminder,
      };
      const result = initial ? await updateGoal(payload) : await createGoal(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(initial ? "Goal updated" : "Goal created");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit goal" : "New time goal"}</DialogTitle>
          <DialogDescription>
            Goals measure the time tracked on an item and everything beneath it. Parent and child goals stay completely
            independent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Goal name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Defaults to the selected project names"
              maxLength={80}
            />
          </Field>

          <Field
            label="Projects"
            hint="Time tracked on these projects and everything beneath them counts toward this goal."
          >
            <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-xl border border-border bg-surface p-1.5">
              {itemOptions.map((option) => {
                const selected = itemIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                      selected ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleItem(option.id)}
                      className="size-3.5 shrink-0 accent-[var(--primary)]"
                    />
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[12px]"
                      style={{ background: `${option.color ?? "#6366f1"}14`, color: option.color ?? "#6366f1" }}
                    >
                      {option.icon ?? "•"}
                    </span>
                    <span
                      className="truncate text-[12px] font-semibold"
                      style={{ paddingLeft: option.depth * 8 }}
                    >
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-muted-2">
              <span>
                {itemIds.length} {itemIds.length === 1 ? "project" : "projects"} selected
              </span>
              {itemIds.length > 0 ? (
                <button type="button" onClick={() => setItemIds([])} className="hover:text-primary">
                  Clear
                </button>
              ) : null}
            </div>
          </Field>

          <div className="rounded-xl border border-border bg-surface-2/50 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              <Target className="h-3.5 w-3.5" /> Target
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min="0.01"
                step="any"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="w-28"
                required
              />
              <div className="flex rounded-lg border border-border bg-surface p-0.5">
                {(["hours", "minutes"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setUnit(option)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                      unit === option ? "bg-primary text-primary-contrast" : "text-muted hover:text-text",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold text-muted">per period</span>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                {hoursLabel}
              </span>
            </div>
          </div>

          <Field label="Period">
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map((period) => (
                <button
                  key={period.value}
                  type="button"
                  onClick={() => {
                    setPeriodType(period.value);
                    if (period.value === "DAILY" && !initial) setUnit("minutes");
                    if (period.value === "CUSTOM" && !endDate) setEndDate(addDaysToKey(todayKey, 30));
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold transition-colors",
                    periodType === period.value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <Repeat2 className="h-3.5 w-3.5" />
                  {period.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </Field>
            <Field
              label={periodType === "CUSTOM" ? "End date" : "End date (optional)"}
              hint={periodType === "CUSTOM" ? "Custom goals cover this exact range." : "Leave empty to keep this goal going."}
            >
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                required={periodType === "CUSTOM"}
              />
            </Field>
          </div>

          <Field
            label="Scheduled days"
            hint="Optional. When set, only time tracked on these weekdays counts toward the goal."
          >
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = days.includes(day.value);
                  return (
                    <button
                      key={`${day.value}-${day.label}`}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "h-9 w-9 rounded-lg border text-[12px] font-bold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
                <button type="button" onClick={() => setDays([])} className="hover:text-primary">
                  Every day
                </button>
                <span className="text-border-strong">·</span>
                <button type="button" onClick={() => setDays([1, 2, 3, 4, 5])} className="hover:text-primary">
                  Weekdays
                </button>
                <span className="text-border-strong">·</span>
                <button type="button" onClick={() => setDays([6, 0])} className="hover:text-primary">
                  Weekends
                </button>
              </div>
            </div>
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface-2/40 px-3.5 py-3">
            <input
              type="checkbox"
              checked={reminder}
              onChange={(event) => setReminder(event.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            <Bell className="h-4 w-4 text-muted" />
            <span className="text-[13px] font-medium">Remind me when this goal needs attention</span>
          </label>

          {periodType === "CUSTOM" ? (
            <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-[12px] font-medium text-info">
              <CalendarDays className="h-4 w-4" />
              Custom goals measure the whole selected range as one period.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={itemIds.length === 0 || minutes < 1}>
              {initial ? "Save goal" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
