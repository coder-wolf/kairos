import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Create your workspace" };

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    const exists = await db.user.findUnique({ where: { id: session.userId }, select: { id: true } });
    if (exists) redirect("/dashboard");
  }

  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
