"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { createAuthToken, findAuthToken } from "@/lib/auth-tokens";
import { db } from "@/lib/db";
import {
  isEmailVerificationRequired,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { createSession, deleteSession, setThemeCookie } from "@/lib/session";

export type AuthState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
      unverified?: boolean;
      email?: string;
    }
  | undefined;

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const TOKEN_COOLDOWN_MS = 60 * 1000;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
  workspaceName: z.string().trim().max(48, "Keep the workspace name under 48 characters.").optional(),
});

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-zA-Z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is invalid."),
    password: passwordSchema,
    confirm: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

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

async function sendVerification(user: { id: string; email: string; name: string }) {
  if (await recentlyIssued(user.id, "EMAIL_VERIFICATION")) return;

  const { token } = await createAuthToken(user.id, "EMAIL_VERIFICATION", VERIFICATION_TTL_MS);
  const url = `${await getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail({ to: user.email, name: user.name, url });
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { message: "That email and password combination doesn't match an account." };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { message: "That email and password combination doesn't match an account." };
  }

  if (!user.emailVerifiedAt && isEmailVerificationRequired()) {
    return {
      message: "Verify your email before logging in. Check your inbox for the verification link.",
      unverified: true,
      email: user.email,
    };
  }

  await createSession(user.id);
  await setThemeCookie(user.theme);
  redirect("/dashboard");
}

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    workspaceName: formData.get("workspaceName") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, workspaceName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationRequired = isEmailVerificationRequired();

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      emailVerifiedAt: verificationRequired ? null : new Date(),
      workspace: {
        create: {
          name: workspaceName?.trim() || `${name.split(" ")[0]}'s Workspace`,
          icon: "🌿",
        },
      },
    },
  });

  if (verificationRequired) {
    await sendVerification(user);
    redirect(`/verify-email?sent=1&email=${encodeURIComponent(email)}`);
  }

  await createSession(user.id);
  await setThemeCookie("dark");
  redirect("/dashboard?welcome=1");
}

export async function resendVerification(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.emailVerifiedAt) {
    await sendVerification(user);
  }

  return {
    success: true,
    message: "If that email needs verification, a fresh link is on its way. Check your inbox.",
  };
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !(await recentlyIssued(user.id, "PASSWORD_RESET"))) {
    const { token } = await createAuthToken(user.id, "PASSWORD_RESET", RESET_TTL_MS);
    const url = `${await getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: user.email, name: user.name, url });
  }

  return {
    success: true,
    message: "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function resetPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const record = await findAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!record) {
    return { message: "That reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        emailVerifiedAt: record.user.emailVerifiedAt ?? new Date(),
      },
    }),
    db.authToken.deleteMany({ where: { userId: record.userId, type: "PASSWORD_RESET" } }),
  ]);

  redirect("/login?reset=success");
}

export async function loginAsDemo() {
  const demo = await db.user.findUnique({ where: { email: "demo@kairos.app" } });
  if (!demo) {
    redirect("/login?demo=missing");
  }
  await createSession(demo.id);
  await setThemeCookie(demo.theme);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
