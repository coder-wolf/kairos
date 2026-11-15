import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CreditCard, Crown, Database, Download, LogOut, Palette, ShieldCheck, UserRound, Clock3 } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { PasswordForm, PreferencesForm, ProfileForm, WorkspaceForm } from "@/components/settings/settings-forms";
import { Button } from "@/components/ui/button";
import { getAppContext, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        </div>
        <p className="mt-1 text-[11px] text-muted">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const [{ user }, account] = await Promise.all([getAppContext(), getCurrentUser()]);

  const [sessionCount, itemCount, goalCount] = await Promise.all([
    db.timeSession.count({ where: { workspaceId: user.workspace.id } }),
    db.item.count({ where: { workspaceId: user.workspace.id } }),
    db.goal.count({ where: { workspaceId: user.workspace.id } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">Make it yours</p>
        <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
          Settings<span className="text-primary">.</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          Your profile, your workspace, your timezone. The small decisions that make every number trustworthy.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Section
            icon={<UserRound className="h-3.5 w-3.5" />}
            title="Profile"
            description="How you appear inside Kairos. Your email is never shared."
          >
            <ProfileForm user={user} />
          </Section>

          <Section
            icon={<Building2 className="h-3.5 w-3.5" />}
            title="Workspace"
            description="One personal workspace holds your items, goals, sessions, and analytics."
          >
            <WorkspaceForm user={user} />
          </Section>

          <Section
            icon={<Palette className="h-3.5 w-3.5" />}
            title="Preferences"
            description="Timezone and calendar boundaries affect every goal period and streak."
          >
            <PreferencesForm user={user} />
          </Section>

          <Section
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            title="Security"
            description="Update the password that protects your workspace."
          >
            <PasswordForm />
          </Section>
        </div>

        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="relative overflow-hidden border-b border-border bg-surface-2/50 px-5 py-6">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary-soft blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-lg font-extrabold text-white shadow-sm">
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-[11px] text-muted">{user.email}</p>
                </div>
              </div>
            </div>
            <dl className="divide-y divide-border text-[12px]">
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Workspace</dt>
                <dd className="max-w-[180px] truncate font-semibold">
                  {user.workspace.icon} {user.workspace.name}
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Timezone</dt>
                <dd className="max-w-[180px] truncate font-semibold">{user.timezone}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Week starts</dt>
                <dd className="font-semibold">{user.weekStartsOn === 1 ? "Monday" : "Sunday"}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted">Member since</dt>
                <dd className="font-semibold">
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: user.timezone,
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(account.createdAt)}
                </dd>
              </div>
            </dl>
            <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
              {[
                { label: "Items", value: itemCount },
                { label: "Goals", value: goalCount },
                { label: "Sessions", value: sessionCount },
              ].map((stat) => (
                <div key={stat.label} className="px-3 py-3 text-center">
                  <p className="text-[16px] font-extrabold tracking-[-0.02em]">{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Your data</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              Export every item, goal, and session as a portable JSON file. Nothing is locked in.
            </p>
            <a
              href="/api/export"
              download
              className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-[12px] font-semibold transition-colors hover:bg-surface-2"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </a>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-2">
              <Clock3 className="h-3 w-3" /> {sessionCount} sessions ready to export
            </p>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              {user.isPro ? <Crown className="h-4 w-4 text-primary" /> : <CreditCard className="h-4 w-4 text-primary" />}
              <h2 className="text-sm font-bold tracking-tight">Plan</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              {user.isPro
                ? "You're on Kairos Pro. Unlimited projects, goals, Pomodoro, and advanced analytics are unlocked."
                : "You're on the free plan with up to 5 active projects, 3 goals, and core time tracking."}
            </p>
            <Link
              href="/billing"
              className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-[12px] font-semibold transition-colors hover:bg-surface-2"
            >
              {user.isPro ? "Manage billing" : "Upgrade to Pro"}
            </Link>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold tracking-tight">Session</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              Signing out clears this browser&apos;s session cookie. Your workspace stays exactly as it is.
            </p>
            <form action={logout} className="mt-4">
              <Button type="submit" variant="outline" className="w-full gap-2">
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
