"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Clock3, Search, Square } from "lucide-react";
import { toast } from "sonner";
import {
  changeTimerItem,
  discardTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  updateTimerDescription,
} from "@/app/actions/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flattenItemOptions } from "@/lib/item-options";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ItemOption, TimerSnapshot } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

type TimerContextValue = {
  timer: TimerSnapshot | null;
  elapsed: number;
  pending: boolean;
  start: (itemId?: string | null, description?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  discard: () => void;
  setDescription: (description: string) => void;
  openChangeItem: () => void;
  changeItem: (itemId: string) => void;
  windowOpen: boolean;
  openWindow: () => void;
  closeWindow: () => void;
};

const TimerContext = React.createContext<TimerContextValue | null>(null);

export function useTimer() {
  const context = React.useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used inside TimerProvider");
  return context;
}

export function TimerProvider({
  initialTimer,
  items,
  children,
}: {
  initialTimer: TimerSnapshot | null;
  items: ItemOption[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [timer, setTimer] = React.useState<TimerSnapshot | null>(initialTimer);
  const [now, setNow] = React.useState(() => Date.now());
  const [pending, startTransition] = React.useTransition();
  const [conflict, setConflict] = React.useState<{ itemId: string | null; timer: TimerSnapshot } | null>(null);
  const [changeOpen, setChangeOpen] = React.useState(false);
  const [changeQuery, setChangeQuery] = React.useState("");
  const [windowOpen, setWindowOpen] = React.useState(false);
  const openWindow = React.useCallback(() => setWindowOpen(true), []);
  const closeWindow = React.useCallback(() => setWindowOpen(false), []);

  const openChangeItem = React.useCallback(() => {
    setChangeQuery("");
    setChangeOpen(true);
  }, []);

  const changeItem = React.useCallback((itemId: string) => {
    startTransition(async () => {
      const result = await changeTimerItem(itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if ("timer" in result) setTimer(result.timer);
      setChangeOpen(false);
      router.refresh();
    });
  }, [router]);

  React.useEffect(() => {
    if (!timer || timer.status !== "RUNNING") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.status, timer?.startedAt, timer]);

  const elapsed = React.useMemo(() => {
    if (!timer) return 0;
    if (timer.status === "PAUSED") return timer.accumulatedSeconds;
    const running = Math.max(0, (now - new Date(timer.startedAt).getTime()) / 1000);
    return timer.accumulatedSeconds + running;
  }, [timer, now]);

  const start = React.useCallback(
    (itemId?: string | null, description?: string) => {
      startTransition(async () => {
        const result = await startTimer(itemId ?? null, description ? { description } : undefined);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if ("conflict" in result) {
          setConflict({ itemId: itemId ?? null, timer: result.timer });
          return;
        }
        setTimer(result.timer);
        router.refresh();
      });
    },
    [router],
  );

  const switchTo = (itemId: string | null) => {
    startTransition(async () => {
      const result = await startTimer(itemId, { stopExisting: true });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if ("conflict" in result) return;
      setTimer(result.timer);
      setConflict(null);
      router.refresh();
    });
  };

  const pause = React.useCallback(() => {
    startTransition(async () => {
      const result = await pauseTimer();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if ("timer" in result) setTimer(result.timer);
      router.refresh();
    });
  }, [router]);

  const resume = React.useCallback(() => {
    startTransition(async () => {
      const result = await resumeTimer();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if ("timer" in result) setTimer(result.timer);
      router.refresh();
    });
  }, [router]);

  const stop = React.useCallback(() => {
    startTransition(async () => {
      const result = await stopTimer();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTimer(null);
      setWindowOpen(false);
      router.refresh();
    });
  }, [router]);

  const discard = React.useCallback(() => {
    startTransition(async () => {
      const result = await discardTimer();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTimer(null);
      setWindowOpen(false);
      router.refresh();
    });
  }, [router]);

  const setDescription = React.useCallback(
    (description: string) => {
      startTransition(async () => {
        const result = await updateTimerDescription(description);
        if (result.ok && "timer" in result) {
          setTimer(result.timer);
          router.refresh();
        }
      });
    },
    [router],
  );

  const value = React.useMemo(
    () => ({
      timer,
      elapsed,
      pending,
      start,
      pause,
      resume,
      stop,
      discard,
      setDescription,
      openChangeItem,
      changeItem,
      windowOpen,
      openWindow,
      closeWindow,
    }),
    [
      timer,
      elapsed,
      pending,
      start,
      pause,
      resume,
      stop,
      discard,
      setDescription,
      openChangeItem,
      changeItem,
      windowOpen,
      openWindow,
      closeWindow,
    ],
  );

  return (
    <TimerContext.Provider value={value}>
      {children}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Change project</DialogTitle>
            <DialogDescription>
              Move the running session to another item. The time already tracked goes with it.
            </DialogDescription>
          </DialogHeader>
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
              <Input
                autoFocus
                value={changeQuery}
                onChange={(event) => setChangeQuery(event.target.value)}
                placeholder="Search items…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="scroll-thin max-h-[45vh] overflow-y-auto p-2">
            {flattenItemOptions(items)
              .filter((option) => option.path.toLowerCase().includes(changeQuery.toLowerCase()))
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => changeItem(option.id)}
                  disabled={pending}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60",
                    timer?.itemId === option.id && "bg-primary-soft/60",
                  )}
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
                    style={{ background: `${option.color ?? "#6366f1"}1f`, color: option.color ?? "#6366f1" }}
                  >
                    {option.icon ?? "•"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{option.label}</span>
                    <span className="block truncate text-[11px] text-muted">{option.path}</span>
                  </span>
                  {timer?.itemId === option.id ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                      Current
                    </span>
                  ) : null}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(conflict)} onOpenChange={(open) => !open && setConflict(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>You already have a timer running</DialogTitle>
            <DialogDescription>
              Kairos keeps one timer per person so the numbers stay honest. Stop the current session and start the new
              one, or keep tracking what you&apos;re doing.
            </DialogDescription>
          </DialogHeader>
          {conflict ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{conflict.timer.itemName}</p>
                  <p className="text-xs text-muted">
                    {formatClock(conflict.timer.accumulatedSeconds)} accumulated
                    {conflict.timer.status === "PAUSED" ? " · paused" : " · running"}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted">
                Switching saves the session above to your history. Nothing is lost.
              </p>
            </div>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setConflict(null)}>
              Keep current timer
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!conflict) return;
                  startTransition(async () => {
                    const result = await stopTimer();
                    if (result.ok) {
                      setTimer(null);
                      setWindowOpen(false);
                      router.refresh();
                    }
                  });
                }}
              >
                <Square className="h-3.5 w-3.5" />
                Just stop
              </Button>
              <Button onClick={() => conflict && switchTo(conflict.itemId)} loading={pending}>
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Stop & switch
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TimerContext.Provider>
  );
}
