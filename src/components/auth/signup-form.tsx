"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { signup, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Start fresh</p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.035em]">
          Your time, on purpose.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          One workspace, any structure you can imagine. You can build the hierarchy as you go.
        </p>
      </div>

      {state?.message ? (
        <div className="mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">
          {state.message}
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <Field label="Your name" error={state?.errors?.name?.[0]}>
          <Input name="name" autoComplete="name" placeholder="Alex Rivera" required />
        </Field>

        <Field label="Email" error={state?.errors?.email?.[0]}>
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </Field>

        <Field
          label="Password"
          error={state?.errors?.password?.[0]}
          hint="At least 8 characters, with a letter and a number."
        >
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a password"
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

        <Field label="Workspace name" hint="Optional — you can change this later.">
          <Input name="workspaceName" placeholder="Alex's Workspace" maxLength={48} />
        </Field>

        <div className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
          <ul className="space-y-1.5">
            {["Unlimited hierarchy depth", "Unlimited independent goals", "Timers that survive refreshes"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12px] font-medium text-muted">
                <Check className="h-3.5 w-3.5 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create workspace
        </Button>
      </form>

      <p className="mt-6 text-center text-[11px] leading-5 text-muted-2">
        By continuing you agree to keep your own time honest. No credit card, no team invites, no noise.
      </p>

      <p className="mt-5 text-center text-sm text-muted">
        Already have a workspace?{" "}
        <Link href="/login" className="font-bold text-text underline decoration-border-strong underline-offset-4 hover:text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}
