import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { findAuthToken } from "@/lib/auth-tokens";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const record = await findAuthToken(params.token ?? "", "PASSWORD_RESET");

  return (
    <AuthShell>
      {record ? (
        <ResetPasswordForm token={params.token ?? ""} email={record.user.email} />
      ) : (
        <div className="animate-rise">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-danger/20 bg-danger-soft text-danger">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-danger">Link expired</p>
          <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.035em]">
            That link is no longer valid.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Password reset links expire after one hour. Request a new one and we&apos;ll send another email.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Request a new link
          </Link>
          <p className="mt-6 text-center text-sm text-muted">
            <Link
              href="/login"
              className="font-bold text-text underline decoration-border-strong underline-offset-4 hover:text-primary"
            >
              Back to log in
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
