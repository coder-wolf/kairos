"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { resetPassword, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary-soft text-primary">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">New password</p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.035em]">
          Choose something new.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Updating the password for <strong className="font-semibold text-text">{email}</strong>.
        </p>
      </div>

      {state?.message ? (
        <div className="mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">
          {state.message}
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <Field
          label="New password"
          error={state?.errors?.password?.[0]}
          hint="At least 8 characters, with a letter and a number."
        >
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New password"
              className="pr-11"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm password" error={state?.errors?.confirm?.[0]}>
          <Input
            name="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat the new password"
            required
            minLength={8}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
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
