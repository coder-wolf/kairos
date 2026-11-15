"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updatePassword,
  updatePreferences,
  updateProfile,
  updateWorkspace,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { UserSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";

function useSaver() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return {
    pending,
    save: (
      action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
      success: string,
      onSuccess?: () => void,
    ) => {
      startTransition(async () => {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error ?? "Something went wrong.");
          return;
        }
        toast.success(result.message ?? success);
        onSuccess?.();
        router.refresh();
      });
    },
  };
}

export function ProfileForm({ user }: { user: UserSummary }) {
  const { pending, save } = useSaver();
  const [name, setName] = React.useState(user.name);
  const [email, setEmail] = React.useState(user.email);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const emailChanged = email.trim().toLowerCase() !== user.email;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(() => updateProfile({ name, email, currentPassword }), "Profile updated");
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
      </div>
      {emailChanged ? (
        <Field label="Current password" hint="Required to confirm an email change.">
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

export function WorkspaceForm({ user }: { user: UserSummary }) {
  const { pending, save } = useSaver();
  const [name, setName] = React.useState(user.workspace.name);
  const [icon, setIcon] = React.useState(user.workspace.icon ?? "🌿");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(() => updateWorkspace({ name, icon }), "Workspace updated");
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-[90px_1fr]">
        <Field label="Icon">
          <Input
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            maxLength={4}
            className="text-center text-xl"
          />
        </Field>
        <Field label="Workspace name">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={48} required />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Save workspace
        </Button>
      </div>
    </form>
  );
}

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function PreferencesForm({ user }: { user: UserSummary }) {
  const { pending, save } = useSaver();
  const [timezone, setTimezone] = React.useState(user.timezone);
  const [weekStartsOn, setWeekStartsOn] = React.useState(String(user.weekStartsOn));
  const [theme, setTheme] = React.useState(user.theme);

  const zones = React.useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Australia/Sydney",
      ];
    }
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(
          () =>
            updatePreferences({
              timezone,
              weekStartsOn: Number(weekStartsOn),
              theme: theme as "light" | "dark" | "system",
            }),
          "Preferences saved",
        );
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Timezone" hint="All periods, dates, and streaks use this timezone.">
          <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Week starts on" hint="Used for weekly goals and calendar views.">
          <Select value={weekStartsOn} onChange={(event) => setWeekStartsOn(event.target.value)}>
            <option value="1">Monday</option>
            <option value="0">Sunday</option>
          </Select>
        </Field>
      </div>

      <Field label="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setTheme(option.value);
                applyTheme(option.value);
              }}
              className={cn(
                "h-10 rounded-xl border text-[12px] font-semibold capitalize transition-colors",
                theme === option.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3.5 py-3">
        <p className="text-[11px] text-muted">
          Local time now:{" "}
          <strong className="font-semibold text-text">
            {new Intl.DateTimeFormat("en-US", {
              timeZone: timezone,
              hour: "numeric",
              minute: "2-digit",
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(new Date())}
          </strong>
        </p>
        <Button type="submit" loading={pending} size="sm">
          Save preferences
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { pending, save } = useSaver();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (next !== confirm) {
          toast.error("The new passwords don't match.");
          return;
        }
        save(() => updatePassword(current, next), "Password changed", () => {
          setCurrent("");
          setNext("");
          setConfirm("");
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password">
          <Input
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" loading={pending}>
          Change password
        </Button>
      </div>
    </form>
  );
}
