import "server-only";

import { getAppUrl } from "./app-url";
import { createAuthToken } from "./auth-tokens";
import { db } from "./db";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const TOKEN_COOLDOWN_MS = 60 * 1000;

async function recentlyIssued(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
  return db.authToken.findFirst({
    where: {
      userId,
      type,
      createdAt: { gt: new Date(Date.now() - TOKEN_COOLDOWN_MS) },
    },
    select: { id: true },
  });
}

export async function sendVerificationForUser(user: { id: string; email: string; name: string }) {
  if (await recentlyIssued(user.id, "EMAIL_VERIFICATION")) return false;

  const { token } = await createAuthToken(user.id, "EMAIL_VERIFICATION", VERIFICATION_TTL_MS);
  const url = `${await getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  return sendVerificationEmail({ to: user.email, name: user.name, url });
}

export async function sendPasswordResetForUser(user: { id: string; email: string; name: string }) {
  if (await recentlyIssued(user.id, "PASSWORD_RESET")) return false;

  const { token } = await createAuthToken(user.id, "PASSWORD_RESET", RESET_TTL_MS);
  const url = `${await getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendPasswordResetEmail({ to: user.email, name: user.name, url });
}
