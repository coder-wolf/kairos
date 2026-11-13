import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { startCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { getBillingAccount } from "@/lib/billing";
import { getAppContext } from "@/lib/dal";
import { FREE_GOAL_LIMIT, FREE_ITEM_LIMIT } from "@/lib/plan";

export const metadata: Metadata = { title: "Plan & Billing" };

const ERRORS: Record<string, string> = {
  not_configured: "Payments are not configured yet. Add the Lemon Squeezy environment variables first.",
  checkout_failed: "Lemon Squeezy could not start checkout. Please try again in a moment.",
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Active",
    on_trial: "Trial",
    cancelled: "Cancels at period end",
    past_due: "Past due",
    paused: "Paused",
    expired: "Expired",
    unpaid: "Unpaid",
    inactive: "Inactive",
  };
  return labels[status.toLowerCase()] ?? status;
}

function formatDate(date: Date | null, timezone: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const PRO_FEATURES = [
  "Unlimited projects and nested items",
  "Unlimited active goals and habits",
  "Pomodoro focus blocks and floating timer",
  "Advanced analytics and item reports",
  "All future Pro features",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { user } = await getAppContext();
  const billing = await getBillingAccount(user.id);
  const configured = Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID &&
      process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID,
  );
  const monthlyPrice = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE ?? null;
  const yearlyPrice = process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE ?? null;
  const error = params.error ? ERRORS[params.error] ?? "Something went wrong starting checkout." : null;
  const periodEnd = formatDate(billing?.currentPeriodEnd ?? billing?.endsAt ?? billing?.renewsAt ?? null, user.timezone);
  const isDemo = billing?.provider === "demo";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">Support the work</p>
        <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
          Plan & Billing<span className="text-primary">.</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          Kairos stays useful for free. Pro removes the limits and unlocks focus blocks and deeper analytics.
        </p>
      </header>

      {params.checkout === "success" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success-soft px-4 py-3">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-success" />
          <div className="flex-1">
            <p className="text-[12px] font-bold text-success">Checkout complete</p>
            <p className="mt-0.5 text-[11px] leading-5 text-muted">
              Lemon Squeezy is confirming your subscription. This usually takes a few seconds.
            </p>
          </div>
          <Link href="/billing" className="shrink-0 text-[11px] font-bold text-success hover:underline">
            Refresh
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-[12px] font-medium leading-5 text-danger">{error}</p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-b from-surface-2/60 to-surface px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${user.isPro ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"}`}>
                  {user.isPro ? <Crown className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-sm font-bold">{user.isPro ? "Kairos Pro" : "Free plan"}</p>
                  <p className="text-[11px] text-muted">
                    {billing ? statusLabel(billing.status) : "No subscription yet"}
                    {periodEnd ? ` · ${billing?.status === "cancelled" ? "Access until" : "Renews"} ${periodEnd}` : ""}
                  </p>
                </div>
              </div>
              {user.isPro ? (
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-success">
                  Pro
                </span>
              ) : (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  Free
                </span>
              )}
            </div>

            {user.isPro ? (
              <div className="space-y-4 p-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  {PRO_FEATURES.map((feature) => (
                    <p key={feature} className="flex items-start gap-2 text-[12px] text-muted">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {feature}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {billing?.updateUrl && !isDemo ? (
                    <a
                      href={billing.updateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[12px] font-semibold hover:bg-surface-2"
                    >
                      Manage subscription <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="text-[11px] text-muted-2">
                      {isDemo ? "Demo Pro access — no live subscription is attached." : "Subscription management is available through Lemon Squeezy."}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-2">
                    {billing?.interval ? `Billed ${billing.interval}` : "Active plan"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-[12px] leading-5 text-muted">
                  Free includes core time tracking, a flexible hierarchy, and up to{" "}
                  <strong className="font-semibold text-text">{FREE_ITEM_LIMIT} active items</strong> and{" "}
                  <strong className="font-semibold text-text">{FREE_GOAL_LIMIT} active goals</strong>.
                </p>
              </div>
            )}
          </section>

          {!user.isPro ? (
            <section className="grid gap-4 md:grid-cols-2">
              {[
                {
                  interval: "monthly",
                  title: "Pro Monthly",
                  price: monthlyPrice,
                  caption: "Billed every month",
                  badge: null,
                },
                {
                  interval: "yearly",
                  title: "Pro Yearly",
                  price: yearlyPrice,
                  caption: "Billed once a year",
                  badge: "Best value",
                },
              ].map((plan) => (
                <div key={plan.interval} className="card relative overflow-hidden p-5">
                  {plan.badge ? (
                    <span className="absolute right-4 top-4 rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                      {plan.badge}
                    </span>
                  ) : null}
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">Kairos Pro</p>
                  <p className="mt-1.5 text-lg font-extrabold tracking-[-0.03em]">{plan.title}</p>
                  <p className="mt-1 text-[11px] text-muted">{plan.caption}</p>
                  {plan.price ? (
                    <p className="mt-4 text-[28px] font-extrabold tracking-[-0.04em]">{plan.price}</p>
                  ) : (
                    <p className="mt-4 text-[13px] font-semibold text-muted">Price shown at checkout</p>
                  )}
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
                    {PRO_FEATURES.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[11px] text-muted">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {feature}
                      </li>
                    ))}
                  </ul>
                  {configured ? (
                    <form action={startCheckout} className="mt-5">
                      <input type="hidden" name="interval" value={plan.interval} />
                      <Button type="submit" className="w-full gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Subscribe
                      </Button>
                    </form>
                  ) : (
                    <Button disabled className="mt-5 w-full gap-2">
                      <Sparkles className="h-3.5 w-3.5" /> Setup required
                    </Button>
                  )}
                </div>
              ))}
            </section>
          ) : null}

          {!configured ? (
            <section className="card p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-bold">Lemon Squeezy is not configured yet</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    Add these environment variables, then create a monthly and yearly subscription variant in your
                    Lemon Squeezy store:
                  </p>
                  <code className="mt-2 block rounded-lg bg-surface-2 px-3 py-2 font-mono text-[10px] leading-5 text-muted">
                    LEMON_SQUEEZY_API_KEY
                    <br />
                    LEMON_SQUEEZY_STORE_ID
                    <br />
                    LEMON_SQUEEZY_MONTHLY_VARIANT_ID
                    <br />
                    LEMON_SQUEEZY_YEARLY_VARIANT_ID
                    <br />
                    LEMON_SQUEEZY_WEBHOOK_SECRET
                  </code>
                  <p className="mt-2 text-[10px] leading-4 text-muted-2">
                    Webhook URL: <span className="font-mono">/api/webhooks/lemonsqueezy</span> · See README for the
                    full setup.
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">What stays free</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[11px] text-muted">
              {[
                "Timers and manual time entries",
                "Flexible projects and hierarchy",
                "Weekly timer calendar",
                "Time history and JSON export",
                "Core goals and dashboard",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-bold tracking-tight">Pro at a glance</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[11px] text-muted">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Payments</h2>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              Checkout and subscription management are handled securely by Lemon Squeezy. Kairos never sees your card
              details.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
