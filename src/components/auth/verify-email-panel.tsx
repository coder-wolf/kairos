"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck, ShieldAlert } from "lucide-react";
import { resendVerification, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function VerifyEmailPanel({
  email,
  invalid,
  emailConfigured,
  devMode,
}: {
  email: string;
  invalid: boolean;
  emailConfigured: boolean;
  devMode: boolean;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resendVerification, undefined);

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary-soft text-primary">
          {invalid ? <ShieldAlert className="h-5 w-5" /> : <MailCheck className="h-5 w-5" />}
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {invalid ? "Link expired" : "One small step"}
        </p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.035em]">
          {invalid ? "That link didn't work." : "Check your inbox."}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {invalid
            ? "Verification links expire after 24 hours. Enter your email and we'll send a fresh one."
            : `We sent a verification link${email ? ` to ${email}` : ""}. Open it to finish setting up your workspace.`}
        </p>
      </div>

      {!emailConfigured ? (
        <div className="mb-5 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[12px] leading-5 font-medium text-warning">
          Email delivery isn&apos;t configured yet. Add <code className="font-mono">RESEND_API_KEY</code> and{" "}
          <code className="font-mono">EMAIL_FROM</code> to send verification mail.
          {devMode ? " In development the link is printed in the server log." : ""}
        </div>
      ) : null}

      {state?.message ? (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-[13px] font-medium ${
            state.success
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <Field label="Email" error={state?.errors?.email?.[0]}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={email}
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Resend verification email
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-bold text-text underline decoration-border-strong underline-offset-4 hover:text-primary"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
