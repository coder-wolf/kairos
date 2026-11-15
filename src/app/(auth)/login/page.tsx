import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; reset?: string }>;
}) {
  const session = await getSession();
  if (session) {
    const exists = await db.user.findUnique({ where: { id: session.userId }, select: { id: true } });
    if (exists) redirect("/dashboard");
  }
  const params = await searchParams;

  return (
    <AuthShell>
      <LoginForm
        demoMissing={params.demo === "missing"}
        demoRate={params.demo === "rate"}
        resetSuccess={params.reset === "success"}
      />
    </AuthShell>
  );
}
