import type { ItemType, PeriodType, SessionSource } from "@prisma/client";
import type { TimerSnapshot } from "./types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export type TimerActionResult =
  | { ok: true; timer: TimerSnapshot | null }
  | { ok: true; conflict: true; timer: TimerSnapshot }
  | { ok: false; error: string };

export type ItemInput = {
  id?: string;
  name: string;
  type: ItemType | null;
  parentId: string | null;
  description?: string;
  color?: string | null;
  icon?: string | null;
};

export type GoalInput = {
  id?: string;
  itemId: string;
  name?: string;
  targetMinutes: number;
  periodType: PeriodType;
  daysOfWeek: number[];
  startDate: string;
  endDate?: string | null;
  reminder?: boolean;
};

export type SessionInput = {
  id?: string;
  itemId: string;
  date: string;
  startTime?: string;
  durationMinutes: number;
  description?: string;
  source?: SessionSource;
};

export type ProfileInput = {
  name: string;
  email: string;
};

export type WorkspaceInput = {
  name: string;
  icon?: string;
};

export type PreferencesInput = {
  timezone: string;
  weekStartsOn: number;
  theme: "light" | "dark" | "system";
};
