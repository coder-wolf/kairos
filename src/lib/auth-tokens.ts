import "server-only";

import crypto from "node:crypto";
import type { AuthTokenType } from "@prisma/client";
import { db } from "./db";

export function hashAuthToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(userId: string, type: AuthTokenType, ttlMs: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashAuthToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type } }),
    db.authToken.create({ data: { userId, type, tokenHash, expiresAt } }),
  ]);

  return { token, expiresAt };
}

export async function findAuthToken(token: string, type: AuthTokenType) {
  if (!token) return null;
  return db.authToken.findFirst({
    where: {
      tokenHash: hashAuthToken(token),
      type,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export async function deleteAuthTokens(userId: string, type: AuthTokenType) {
  await db.authToken.deleteMany({ where: { userId, type } });
}
