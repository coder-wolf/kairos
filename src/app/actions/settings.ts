"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import type { ActionResult, PreferencesInput, ProfileInput, WorkspaceInput } from "@/lib/action-types";
import { sendVerificationForUser } from "@/lib/account-email";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { db } from "@/lib/db";
import { fromZonedTime } from "date-fns-tz";
import { createSession, setThemeCookie } from "@/lib/session";
import { ITEM_PALETTE } from "@/lib/utils";

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

  if (![0, 1].includes(input.weekStartsOn)) {
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

export async function updatePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  const { user } = await requireWorkspace();

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

export async function loadStarterWorkspace(): Promise<ActionResult> {
  const { user } = await requireWorkspace();
  const workspaceId = user.workspace!.id;

  const existing = await db.item.count({ where: { workspaceId } });
  if (existing > 0) {
    return { ok: false, error: "Your workspace already has items." };
  }

  const structure: Array<{
    name: string;
    type: "AREA" | "PROJECT" | "CUSTOM";
    icon: string;
    color: string;
    children?: Array<{ name: string; type: "AREA" | "PROJECT" | "CUSTOM"; icon?: string; color?: string }>;
  }> = [
    {
      name: "Work",
      type: "AREA",
      icon: "💼",
      color: ITEM_PALETTE[0],
      children: [
        { name: "Freelancing", type: "PROJECT", color: ITEM_PALETTE[1] },
        { name: "Professional Development", type: "PROJECT", color: ITEM_PALETTE[2] },
      ],
    },
    {
      name: "Startup Work",
      type: "AREA",
      icon: "🚀",
      color: ITEM_PALETTE[1],
      children: [
        { name: "Product", type: "PROJECT", color: ITEM_PALETTE[2] },
        { name: "Marketing", type: "PROJECT", color: ITEM_PALETTE[5] },
      ],
    },
    {
      name: "Study",
      type: "AREA",
      icon: "📚",
      color: ITEM_PALETTE[5],
      children: [
        { name: "Competitive Programming", type: "PROJECT", color: ITEM_PALETTE[5] },
        { name: "Software Engineering", type: "PROJECT", color: ITEM_PALETTE[6] },
      ],
    },
    {
      name: "Personal",
      type: "AREA",
      icon: "🌱",
      color: ITEM_PALETTE[3],
      children: [
        { name: "Reading", type: "PROJECT", color: ITEM_PALETTE[3] },
        { name: "Fitness", type: "PROJECT", color: ITEM_PALETTE[7] },
      ],
    },
  ];

  const now = new Date();
  const startDate = fromZonedTime(`${new Intl.DateTimeFormat("en-CA", { timeZone: user.timezone }).format(now)} 00:00:00`, user.timezone);

  for (const [index, root] of structure.entries()) {
    const parent = await db.item.create({
      data: {
        workspaceId,
        name: root.name,
        type: root.type,
        icon: root.icon,
        color: root.color,
        sortOrder: index,
      },
    });

    for (const [childIndex, child] of (root.children ?? []).entries()) {
      await db.item.create({
        data: {
          workspaceId,
          parentId: parent.id,
          name: child.name,
          type: child.type,
          color: child.color ?? ITEM_PALETTE[childIndex % ITEM_PALETTE.length],
          sortOrder: childIndex,
        },
      });
    }
  }

  const reading = await db.item.findFirst({ where: { workspaceId, name: "Reading" } });
  const startup = await db.item.findFirst({ where: { workspaceId, name: "Startup Work" } });

  if (reading) {
    await db.goal.create({
      data: {
        workspaceId,
        itemId: reading.id,
        name: "Read every day",
        targetSeconds: 30 * 60,
        periodType: "DAILY",
        startDate,
        targetHistory: [{ from: startDate.toISOString(), targetSeconds: 30 * 60 }],
        reminder: true,
      },
    });
  }

  if (startup) {
    await db.goal.create({
      data: {
        workspaceId,
        itemId: startup.id,
        name: "Move the startup forward",
        targetSeconds: 15 * 3600,
        periodType: "WEEKLY",
        startDate,
        targetHistory: [{ from: startDate.toISOString(), targetSeconds: 15 * 3600 }],
      },
    });
  }

  revalidateApp();
  return { ok: true };
}
