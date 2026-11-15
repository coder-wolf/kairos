import "server-only";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

export async function getClientIp() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerStore.get("x-real-ip") || "unknown";
}

function rateLimitKey(scope: string, identifier: string) {
  return crypto.createHash("sha256").update(`${scope}:${identifier}`).digest("hex");
}

export async function enforceRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
) {
  const key = rateLimitKey(scope, identifier);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const existing = await db.rateLimit.findUnique({ where: { key } });

  if (!existing || existing.resetAt <= now) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { ok: true as const, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false as const, retryAt: existing.resetAt };
  }

  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: true as const, remaining: Math.max(0, limit - existing.count - 1) };
}
