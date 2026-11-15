"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { login, loginAsDemo, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm({
  demoMissing = false,
  demoRate = false,
  resetSuccess = false,
}: {
  demoMissing?: boolean;
  demoRate?: boolean;
  resetSuccess?: boolean;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Welcome back</p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.035em]">Pick up where you left off.</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your timers, goals, and history are waiting exactly where you left them.
        </p>
      </div>

      {state?.message ? (
        <div className="mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">
          {state.message}
          {state.unverified && state.email ? (
            <Link
              href={`/verify-email?email=${encodeURIComponent(state.email)}`}
              className="mt-2 block font-bold underline underline-offset-4"
            >
              Resend the verification email
            </Link>
          ) : null}
        </div>
      ) : null}

      {resetSuccess ? (
        <div className="mb-5 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[13px] font-medium text-success">
          Your password was updated. Log in with the new password.
        </div>
      ) : null}

      {demoMissing ? (
        <div className="mb-5 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] font-medium text-warning">
          The demo workspace isn&apos;t seeded yet. Run <code className="font-mono">pnpm db:seed</code> and try again.
        </div>
      ) : null}

      {demoRate ? (
        <div className="mb-5 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] font-medium text-warning">
          The demo workspace has had a lot of visits. Please try again in a little while.
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <Field label="Email" error={state?.errors?.email?.[0]}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password" error={state?.errors?.password?.[0]}>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              className="pr-11"
              required
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

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-[12px] font-medium text-muted">
            <input type="checkbox" defaultChecked className="size-3.5 accent-[var(--primary)]" />
            Keep me signed in
          </label>
          <Link href="/forgot-password" className="text-[12px] font-semibold text-muted hover:text-primary">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Log in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">or explore first</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={loginAsDemo}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <Sparkles className="h-4 w-4 text-primary" />
          Open the demo workspace
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-bold text-text underline decoration-border-strong underline-offset-4 hover:text-primary">
          Create your workspace
        </Link>
      </p>
    </div>
  );
}
