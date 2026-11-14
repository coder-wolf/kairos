import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { isEmailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell>
      <VerifyEmailPanel
        email={params.email ?? ""}
        invalid={params.error === "invalid"}
        emailConfigured={isEmailConfigured()}
        devMode={process.env.NODE_ENV !== "production"}
      />
    </AuthShell>
  );
}
