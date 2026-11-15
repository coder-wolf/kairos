"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Clock, NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSession, deleteSession, updateSession } from "@/app/actions/sessions";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import type { ItemOption, SessionRow } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type ManualTimeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemOption[];
  initial?: SessionRow | null;
  defaultItemId?: string;
  defaultDate?: string;
  defaultStartTime?: string;
  timezone: string;
  todayKey: string;
};

export function ManualTimeDialog(props: ManualTimeDialogProps) {
  if (!props.open) return null;
  return (
    <ManualTimeDialogBody
      key={`${props.initial?.id ?? "new"}-${props.defaultItemId ?? ""}-${props.defaultDate ?? ""}-${props.defaultStartTime ?? ""}`}
      {...props}
    />
  );
}

function ManualTimeDialogBody({
  onOpenChange,
  items,
  initial,
  defaultItemId,
  defaultDate,
  defaultStartTime,
  timezone,
  todayKey,
}: ManualTimeDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const initialTotal = initial ? initial.durationSeconds / 60 : 30;
  const [itemId, setItemId] = React.useState(initial?.itemId ?? defaultItemId ?? "");
  const [date, setDate] = React.useState(
    initial ? formatInTimeZone(new Date(initial.startTime), timezone, "yyyy-MM-dd") : defaultDate ?? todayKey,
  );
  const [startTime, setStartTime] = React.useState(
    initial ? formatInTimeZone(new Date(initial.startTime), timezone, "HH:mm") : defaultStartTime ?? "",
  );
  const [hours, setHours] = React.useState(String(Math.floor(initialTotal / 60)));
  const [minutes, setMinutes] = React.useState(String(Math.round(initialTotal % 60)));
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const itemOptions = flattenItemOptions(items);
  const totalMinutes = Math.max(0, Math.round(Number(hours || 0) * 60 + Number(minutes || 0)));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        id: initial?.id,
        itemId,
        date,
        startTime: startTime || undefined,
        durationMinutes: totalMinutes,
        description,
      };
      const result = initial ? await updateSession(payload) : await createSession(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(initial ? "Time entry updated" : `Added ${formatDuration(totalMinutes * 60)}`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit time entry" : "Add time"}</DialogTitle>
          <DialogDescription>
            Record time after the fact. It rolls up through every parent item automatically and updates any goals it
            touches.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Item">
            <Select value={itemId} onChange={(event) => setItemId(event.target.value)} required>
              <option value="" disabled>
                Choose an item
              </option>
              {itemOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {"— ".repeat(option.depth)}
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="Start time" hint="Optional. Defaults to midday.">
              <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/50 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              <Clock className="h-3.5 w-3.5" /> Duration
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  className="w-20"
                  aria-label="Hours"
                />
                <span className="text-sm font-semibold text-muted">h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="w-20"
                  aria-label="Minutes"
                />
                <span className="text-sm font-semibold text-muted">m</span>
              </div>
              <span className="ml-auto text-sm font-bold">{formatDuration(totalMinutes * 60)}</span>
            </div>
          </div>

          <Field label="Description">
            <div className="relative">
              <NotebookPen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-2" />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What did you work on?"
                maxLength={280}
                className="min-h-20 pl-9"
              />
            </div>
          </Field>

          {error ? (
            <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter className="sm:justify-between">
            {initial ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5 text-danger hover:bg-danger-soft hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete entry
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={!itemId || totalMinutes < 1}>
                {initial ? "Save changes" : "Add time"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {initial ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this time entry?"
          description={`${formatDuration(initial.durationSeconds)} on ${initial.itemName} will be removed. Parent totals and goals will update immediately.`}
          confirmLabel="Delete entry"
          destructive
          onConfirm={async () => {
            const result = await deleteSession(initial.id);
            if (result.ok) {
              toast.success("Time entry deleted");
              setConfirmDelete(false);
              onOpenChange(false);
              router.refresh();
            }
            return result;
          }}
        />
      ) : null}
    </Dialog>
  );
}
