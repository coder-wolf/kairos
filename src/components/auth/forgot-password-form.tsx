"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary-soft text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Forgot password</p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.035em]">
          Let&apos;s get you back in.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Enter the email on your workspace and we&apos;ll send a link to choose a new password.
        </p>
      </div>

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
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-bold text-text underline decoration-border-strong underline-offset-4 hover:text-primary"
        >
          Back to log in
        </Link>
      </p>
    </div>
  );
}
