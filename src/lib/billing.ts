import "server-only";

import { db } from "./db";
import { isBillingEntitled, planSummary, type PlanSummary } from "./plan";

export async function getBillingAccount(userId: string) {
  return db.billingAccount.findUnique({ where: { userId } });
}

export async function getPlanForUser(userId: string): Promise<PlanSummary> {
  const account = await getBillingAccount(userId);
  return planSummary(isBillingEntitled(account));
}

export function isProAccount(account: { status: string; endsAt: Date | null; currentPeriodEnd: Date | null; renewsAt: Date | null } | null) {
  return isBillingEntitled(account);
}
