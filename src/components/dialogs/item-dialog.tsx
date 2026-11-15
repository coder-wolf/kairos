"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Layers, FolderKanban, Shapes, Minus } from "lucide-react";
import { toast } from "sonner";
import { createItem, updateItem } from "@/app/actions/items";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { descendantIds, flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";
import { cn, ITEM_PALETTE } from "@/lib/utils";

const TYPES = [
  { value: "AREA", label: "Area", icon: Layers },
  { value: "PROJECT", label: "Project", icon: FolderKanban },
  { value: "CUSTOM", label: "Custom", icon: Shapes },
] as const;

type ItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemOption[];
  initial?: ItemOption | null;
  defaultParentId?: string | null;
};

export function ItemDialog(props: ItemDialogProps) {
  if (!props.open) return null;
  return <ItemDialogBody key={props.initial?.id ?? props.defaultParentId ?? "new"} {...props} />;
}

function ItemDialogBody({ onOpenChange, items, initial, defaultParentId }: ItemDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [type, setType] = React.useState<string | null>(initial?.type ?? "PROJECT");
  const [parentId, setParentId] = React.useState<string>(initial?.parentId ?? defaultParentId ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [color, setColor] = React.useState(initial?.color ?? ITEM_PALETTE[(items.length + 1) % ITEM_PALETTE.length]);
  const [icon, setIcon] = React.useState(initial?.icon ?? "");
  const [error, setError] = React.useState<string | null>(null);

  const blocked = initial ? descendantIds(items, initial.id) : new Set<string>();
  const parentOptions = flattenItemOptions(items).filter((option) => !blocked.has(option.id));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        id: initial?.id,
        name,
        type: (type as "AREA" | "PROJECT" | "CUSTOM" | null) ?? null,
        parentId: parentId || null,
        description,
        color,
        icon: icon || null,
      };
      const result = initial ? await updateItem(payload) : await createItem(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(initial ? "Item updated" : "Item created");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit item" : "New project"}</DialogTitle>
          <DialogDescription>
            Items can nest as deeply as you need. Type is just a label — it never limits what an item can do.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <Field label="Icon">
                <Input
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="📁"
                  maxLength={4}
                  className="text-center text-lg"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Time Tracking App"
                  required
                  maxLength={80}
                  autoFocus
                />
              </Field>
            </div>
          </div>

          <Field label="Type">
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map((option) => {
                const active = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setType(null)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold transition-colors",
                  type === null
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <Minus className="h-3.5 w-3.5" />
                None
              </button>
            </div>
          </Field>

          <Field label="Parent" hint="Leave empty to place this at the top level of your workspace.">
            <Select value={parentId} onChange={(event) => setParentId(event.target.value)}>
              <option value="">No parent (top level)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {"— ".repeat(option.depth)}
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description" hint="Optional. A sentence about what this item is for.">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does success look like here?"
              maxLength={500}
              className="min-h-20"
            />
          </Field>

          <Field label="Color">
            <div className="rounded-xl border border-border bg-surface-2/40 p-3">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-text ring-offset-2 ring-offset-surface"
                  style={{ background: color }}
                >
                  <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold">Selected color</p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-2">{color}</p>
                </div>
                <span className="ml-auto hidden text-[10px] font-medium text-muted-2 sm:block">
                  Used across charts and the workspace
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {ITEM_PALETTE.map((option) => {
                  const active = color === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      aria-label={`Use color ${option}`}
                      aria-pressed={active}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full border-2 transition-all duration-150",
                        active
                          ? "scale-110 border-text shadow-[0_0_0_3px_color-mix(in_srgb,var(--text)_14%,transparent)]"
                          : "border-transparent opacity-80 hover:scale-105 hover:opacity-100",
                      )}
                      style={{ background: option }}
                    >
                      {active ? (
                        <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </Field>

          {error ? (
            <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {initial ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
