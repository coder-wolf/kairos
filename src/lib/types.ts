import type { GoalStatus, PeriodType, SessionSource, TimerStatus } from "@prisma/client";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  weekStartsOn: number;
  theme: string;
  plan: "free" | "pro";
  isPro: boolean;
  workspace: {
    id: string;
    name: string;
    icon: string | null;
  };
};

export type ItemOption = {
  id: string;
  name: string;
  parentId: string | null;
  type: string | null;
  color: string | null;
  description: string | null;
  icon: string | null;
  isSystem: boolean;
  archivedAt: string | null;
};

export type GoalSummary = {
  id: string;
  itemId: string;
  itemName: string;
  name: string;
  targetSeconds: number;
  periodType: PeriodType;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  status: string;
  reminder: boolean;
  color: string | null;
};

export type TimerSnapshot = {
  id: string;
  itemId: string;
  itemName: string;
  itemColor: string | null;
  isUnassigned: boolean;
  status: TimerStatus;
  startedAt: string;
  accumulatedSeconds: number;
  elapsedSeconds: number;
  description: string | null;
  source: SessionSource;
};

export type SessionRow = {
  id: string;
  itemId: string;
  itemName: string;
  itemColor: string | null;
  itemPath: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  description: string | null;
  source: SessionSource;
};

export type AreaNode = {
  id: string;
  name: string;
  parentId: string | null;
  type: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  seconds: number;
  goalCount: number;
  childCount: number;
};

export type WorkspaceItem = {
  id: string;
  name: string;
  parentId: string | null;
  type: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
  archivedAt: string | null;
  seconds: number;
  directSeconds: number;
  goalCount: number;
  childCount: number;
};

export type ItemTimeRow = {
  id: string;
  name: string;
  type: string | null;
  color: string | null;
  parentId: string | null;
  seconds: number;
  directSeconds: number;
  goalCount: number;
  archived: boolean;
};

export type SessionSourceValue = SessionSource;
export type GoalStatusValue = GoalStatus;
