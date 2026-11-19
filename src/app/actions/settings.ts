"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import type { ActionResult, PreferencesInput, ProfileInput, WorkspaceInput } from "@/lib/action-types";
import { sendVerificationForUser } from "@/lib/account-email";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { db } from "@/lib/db";
import { createSession, setThemeCookie } from "@/lib/session";

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const { user } = await requireWorkspace();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Keep your name under 80 characters."),
      email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const clash = await db.user.findFirst({
    where: { email: parsed.data.email, id: { not: user.id } },
  });
  if (clash) return { ok: false, error: "That email is already in use." };

  const emailChanged = parsed.data.email !== user.email;
  if (emailChanged) {
    if (!input.currentPassword) {
      return { ok: false, error: "Enter your current password to change your email." };
    }
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) return { ok: false, error: "Your current password doesn't match." };
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...parsed.data,
      ...(emailChanged ? { emailVerifiedAt: null } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  let message: string | undefined;
  if (emailChanged) {
    await db.authToken.deleteMany({ where: { userId: user.id, type: "EMAIL_VERIFICATION" } });
    const sent = await sendVerificationForUser(updated);
    message = sent
      ? "Profile updated. Check your new inbox to verify this email."
      : "Profile updated. Email verification couldn't be sent right now.";
  }

  revalidateApp();
  return { ok: true, id: user.id, message };
}

export async function updateWorkspace(input: WorkspaceInput): Promise<ActionResult> {
  const { user } = await requireWorkspace();
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Workspace names need at least 2 characters." };
  if (name.length > 48) return { ok: false, error: "Keep the workspace name under 48 characters." };

  await db.workspace.update({
    where: { id: user.workspace!.id },
    data: { name, icon: input.icon?.trim().slice(0, 4) || null },
  });

  revalidateApp();
  return { ok: true };
}

export async function updatePreferences(input: PreferencesInput): Promise<ActionResult> {
  const { user } = await requireWorkspace();

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
  } catch {
    return { ok: false, error: "That timezone is not recognized." };
  }

  if (![0, 1, 6].includes(input.weekStartsOn)) {
    return { ok: false, error: "Choose a valid week start." };
  }
  if (!["light", "dark", "system"].includes(input.theme)) {
    return { ok: false, error: "Choose a valid theme." };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      timezone: input.timezone,
      weekStartsOn: input.weekStartsOn,
      theme: input.theme,
    },
  });

  await setThemeCookie(input.theme);
  revalidateApp();
  return { ok: true };
}

/**
 * Persists the browser's IANA timezone without touching week start or theme.
 * Called from the calendar so the saved timezone cannot drift away from the
 * timezone the calendar (and its drag-and-drop edits) use.
 */
export async function syncTimezone(timezone: string): Promise<ActionResult> {
  const { user } = await requireWorkspace();

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { ok: false, error: "That timezone is not recognized." };
  }

  if (timezone === user.timezone) return { ok: true };

  await db.user.update({ where: { id: user.id }, data: { timezone } });
  revalidateApp();
  return { ok: true };
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {  const { user } = await requireWorkspace();

  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { ok: false, error: "New passwords need 8+ characters, including a letter and a number." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Your current password doesn't match." };

  const [updated] = await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        sessionVersion: { increment: 1 },
      },
      select: { sessionVersion: true },
    }),
    db.authToken.deleteMany({ where: { userId: user.id, type: "PASSWORD_RESET" } }),
  ]);

  // Keep this browser signed in while invalidating every other session.
  await createSession(user.id, updated.sessionVersion);

  return { ok: true, message: "Password updated. Other sessions have been signed out." };
}
