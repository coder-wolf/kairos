"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession, setThemeCookie } from "@/lib/session";

export type AuthState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

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

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      workspace: {
        create: {
          name: workspaceName?.trim() || `${name.split(" ")[0]}'s Workspace`,
          icon: "🌿",
        },
      },
    },
  });

  await createSession(user.id);
  await setThemeCookie("dark");
  redirect("/dashboard?welcome=1");
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
