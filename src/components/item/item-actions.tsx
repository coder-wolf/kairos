"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  ClockPlus,
  FolderPlus,
  MoveRight,
  Pencil,
  Play,
  Target,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { archiveItem, deleteItem, moveItem, restoreItem } from "@/app/actions/items";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useQuickActions } from "@/components/quick-actions";
import { LiveTimer } from "@/components/timer/live-timer";
import { useTimer } from "@/components/timer/timer-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/input";
import { descendantIds, flattenItemOptions } from "@/lib/item-options";
import type { ItemOption } from "@/lib/types";

export function ItemActions({ item, items }: { item: ItemOption; items: ItemOption[] }) {
  const router = useRouter();
  const { start, timer } = useTimer();
  const { openEditItem, openManualTime, openNewGoal, openNewItem } = useQuickActions();
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveParent, setMoveParent] = React.useState(item.parentId ?? "");
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const blocked = descendantIds(items, item.id);
  const parentOptions = flattenItemOptions(items).filter((option) => !blocked.has(option.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {item.archivedAt ? (
        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            startTransition(async () => {
              const result = await restoreItem(item.id);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Item restored");
                router.refresh();
              }
            })
          }
          loading={pending}
        >
          <Undo2 className="h-4 w-4" /> Restore item
        </Button>
      ) : (
        <>
          {timer?.itemId === item.id ? (
            <LiveTimer itemId={item.id} name={item.name} variant="button" showLabel />
          ) : (
            <Button onClick={() => start(item.id)} className="gap-2">
              <Play className="h-3.5 w-3.5 fill-current" />
              Start timer
            </Button>
          )}
          <Button variant="outline" onClick={() => openManualTime({ itemId: item.id })} className="gap-2">
            <ClockPlus className="h-4 w-4" /> Add time
          </Button>
          <Button variant="ghost" onClick={() => openNewGoal(item.id)} className="hidden gap-2 sm:inline-flex">
            <Target className="h-4 w-4" /> New goal
          </Button>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1.5">
            Manage <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => openEditItem(item.id)}>
            <Pencil className="h-4 w-4" /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openNewItem(item.id)}>
            <FolderPlus className="h-4 w-4" /> Add child project
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openNewGoal(item.id)}>
            <Target className="h-4 w-4" /> Add goal
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openManualTime({ itemId: item.id })}>
            <ClockPlus className="h-4 w-4" /> Add manual time
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setMoveParent(item.parentId ?? "");
              setMoveOpen(true);
            }}
          >
            <MoveRight className="h-4 w-4" /> Move item
          </DropdownMenuItem>
          {item.archivedAt ? (
            <DropdownMenuItem
              onSelect={() => {
                restoreItem(item.id).then(() => {
                  toast.success("Item restored");
                  router.refresh();
                });
              }}
            >
              <Undo2 className="h-4 w-4" /> Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem destructive onSelect={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move {item.name}</DialogTitle>
            <DialogDescription>
              Choose a new parent. Historical sessions stay attributed exactly where they happened.
            </DialogDescription>
          </DialogHeader>
          <Select value={moveParent} onChange={(event) => setMoveParent(event.target.value)}>
            <option value="">Top level</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {"— ".repeat(option.depth)}
                {option.label}
              </option>
            ))}
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await moveItem(item.id, moveParent || null);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Item moved");
                  setMoveOpen(false);
                  router.refresh();
                })
              }
            >
              Move item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Archive ${item.name}?`}
        description="It leaves the active workspace but stays in your history and analytics. You can restore it anytime."
        confirmLabel="Archive item"
        onConfirm={async () => {
          const result = await archiveItem(item.id);
          if (result.ok) {
            toast.success("Item archived");
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${item.name}?`}
        description="This is permanent. Items with children or tracked time can't be deleted — archive them instead to keep the history trustworthy."
        confirmLabel="Delete forever"
        destructive
        onConfirm={async () => {
          const result = await deleteItem(item.id);
          if (result.ok) {
            toast.success("Item deleted");
            setDeleteOpen(false);
            router.push("/workspace");
            router.refresh();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />
    </div>
  );
}
