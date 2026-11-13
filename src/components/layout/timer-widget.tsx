"use client";

import * as React from "react";
import { ArrowRightLeft, Maximize2, MoreHorizontal, NotebookPen, Pause, Play, Square, Timer, Trash2 } from "lucide-react";
import { useTimer } from "@/components/timer/timer-provider";
import { usePomodoro } from "@/components/pomodoro/pomodoro-provider";
import { PomodoroChip } from "@/components/pomodoro/pomodoro-chip";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/input";
import { cn, formatClock } from "@/lib/utils";

export function TimerWidget() {
  const { timer, elapsed, pending, pause, resume, stop, discard, setDescription, openChangeItem, start, openWindow } = useTimer();
  const pomodoro = usePomodoro();
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");

  if (pomodoro.active) {
    return <PomodoroChip variant="header" />;
  }

  if (!timer) {
    return (
      <Button variant="outline" size="sm" onClick={() => start()} className="gap-2">
        <Timer className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Start timer</span>
        <span className="sm:hidden">Start</span>
      </Button>
    );
  }

  return (
    <>
      <div className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface pl-2.5 pr-1 shadow-(--shadow-card)">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            timer.status === "RUNNING" ? "animate-pulse-soft bg-success" : "bg-warning",
          )}
        />
        <button
          type="button"
          onClick={openChangeItem}
          className="hidden max-w-[150px] truncate text-[12px] font-semibold hover:text-primary sm:block"
          title={timer.isUnassigned ? "Add a project" : "Change project"}
        >
          {timer.isUnassigned ? "+ Add project" : timer.itemName}
        </button>
        <span suppressHydrationWarning className="font-mono text-[12px] font-semibold tabular-nums text-muted sm:ml-1">
          {formatClock(elapsed)}
        </span>
        <IconButton
          size="icon-sm"
          variant="ghost"
          onClick={timer.status === "RUNNING" ? pause : resume}
          disabled={pending}
          aria-label={timer.status === "RUNNING" ? "Pause timer" : "Resume timer"}
          className="h-7 w-7"
        >
          {timer.status === "RUNNING" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </IconButton>
        <IconButton
          size="icon-sm"
          variant="ghost"
          onClick={openWindow}
          aria-label="Open timer window"
          className="h-7 w-7"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          size="icon-sm"
          variant="soft"
          onClick={stop}
          disabled={pending}
          aria-label="Stop and save timer"
          className="h-7 w-7"
        >
          <Square className="h-3 w-3" />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-7 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
              aria-label="Timer options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{timer.status === "RUNNING" ? "Running" : "Paused"}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={openChangeItem}>
              <ArrowRightLeft className="h-4 w-4" /> Change project
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {
              setNote(timer.description ?? "");
              setNoteOpen(true);
            }}>
              <NotebookPen className="h-4 w-4" /> {timer.description ? "Edit note" : "Add a note"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={discard}>
              <Trash2 className="h-4 w-4" /> Discard session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Timer note</DialogTitle>
            <DialogDescription>A little context makes your history easier to review later.</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What are you working on?"
            maxLength={280}
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDescription(note);
                setNoteOpen(false);
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
