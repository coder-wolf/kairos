export const FREE_ITEM_LIMIT = 5;
export const FREE_GOAL_LIMIT = 3;

export type BillingAccountLike =
  | {
      status: string;
      endsAt?: Date | string | null;
      currentPeriodEnd?: Date | string | null;
      renewsAt?: Date | string | null;
    }
  | null
  | undefined;

export function isBillingEntitled(account: BillingAccountLike, now = new Date()) {
  if (!account) return false;
  const status = account.status.toLowerCase();
  const rawEnd = account.endsAt ?? account.currentPeriodEnd ?? account.renewsAt;
  const end = rawEnd ? new Date(rawEnd) : null;
  const endIsFuture = end ? end.getTime() > now.getTime() : true;

  if (status === "active" || status === "on_trial") return endIsFuture;
  // Cancelled subscriptions keep access until the paid period ends.
  if (status === "cancelled" || status === "past_due") return Boolean(end && end.getTime() > now.getTime());
  return false;
}

export type PlanSummary = {
  plan: "free" | "pro";
  isPro: boolean;
  itemLimit: number | null;
  goalLimit: number | null;
  pomodoro: boolean;
  advancedAnalytics: boolean;
};

export function planSummary(isPro: boolean): PlanSummary {
  return {
    plan: isPro ? "pro" : "free",
    isPro,
    itemLimit: isPro ? null : FREE_ITEM_LIMIT,
    goalLimit: isPro ? null : FREE_GOAL_LIMIT,
    pomodoro: isPro,
    advancedAnalytics: isPro,
  };
}
