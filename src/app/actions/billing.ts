"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/app-url";
import { requireWorkspace, revalidateApp } from "@/lib/authz";
import { getBillingAccount, getPlanForUser } from "@/lib/billing";
import { db } from "@/lib/db";
import { isBillingEntitled } from "@/lib/plan";

function asDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function startCheckout(formData: FormData) {
  const interval = formData.get("interval") === "yearly" ? "yearly" : "monthly";
  const { user, workspace } = await requireWorkspace();

  const plan = await getPlanForUser(user.id);
  if (plan.isPro) redirect("/billing");

  const account = await getBillingAccount(user.id);
  if (account?.updateUrl) redirect(account.updateUrl);

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const variantId =
    interval === "yearly"
      ? process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID
      : process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID;

  if (!apiKey || !storeId || !variantId) {
    redirect("/billing?error=not_configured");
  }

  const origin = await getAppUrl();
  const redirectUrl = `${origin}/billing?checkout=success`;

  let checkoutUrl: string | undefined;
  let failure: string | null = null;
  try {
    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email,
              name: user.name,
              custom: {
                user_id: user.id,
                workspace_id: workspace.id,
                interval,
                source: "kairos",
              },
            },
            product_options: {
              redirect_url: redirectUrl,
              enabled_variants: [Number(variantId)],
            },
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("Lemon Squeezy checkout failed", response.status, await response.text());
      failure = "checkout_failed";
    } else {
      const payload = (await response.json()) as {
        data?: { attributes?: { url?: string } };
      };
      checkoutUrl = payload.data?.attributes?.url;
    }
  } catch (error) {
    console.error("Lemon Squeezy checkout error", error);
    failure = "checkout_failed";
  }

  if (failure || !checkoutUrl || !/^https?:\/\//.test(checkoutUrl)) {
    redirect("/billing?error=checkout_failed");
  }

  redirect(checkoutUrl);
}


export async function cancelSubscription() {
  const { user } = await requireWorkspace();
  const account = await getBillingAccount(user.id);

  if (!account || account.provider === "demo") {
    return { ok: false, error: "Demo Pro access can't be cancelled." };
  }
  if (account.status === "cancelled") {
    return { ok: true, message: "Your subscription is already scheduled to cancel." };
  }
  if (!account.subscriptionId) {
    return { ok: false, error: "No active Lemon Squeezy subscription was found for this account." };
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Subscription management is not configured yet." };
  }

  let attributes: Record<string, unknown> | null = null;
  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(account.subscriptionId)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error("Lemon Squeezy cancellation failed", response.status, await response.text());
      return { ok: false, error: "Lemon Squeezy couldn't cancel this subscription. Please try again." };
    }

    const payload = (await response.json()) as {
      data?: { attributes?: Record<string, unknown> };
    };
    attributes = payload.data?.attributes ?? {};
  } catch (error) {
    console.error("Lemon Squeezy cancellation error", error);
    return { ok: false, error: "Lemon Squeezy couldn't cancel this subscription. Please try again." };
  }

  const status = typeof attributes?.status === "string" ? attributes.status.toLowerCase() : "cancelled";
  const endsAt = asDate(attributes?.ends_at);
  const renewsAt = asDate(attributes?.renews_at);
  const currentPeriodEnd = endsAt ?? renewsAt ?? account.currentPeriodEnd;
  const urls = (attributes?.urls ?? {}) as Record<string, unknown>;
  const updateUrl = asHttpsUrl(urls.customer_portal) ?? account.updateUrl;

  await db.billingAccount.update({
    where: { userId: user.id },
    data: {
      status,
      plan: isBillingEntitled({ status, endsAt, currentPeriodEnd, renewsAt }) ? "pro" : "free",
      endsAt,
      renewsAt,
      currentPeriodEnd,
      updateUrl,
      cancelUrl: updateUrl,
    },
  });

  revalidateApp();
  return {
    ok: true,
    message: "Subscription cancelled. Your Pro access continues until the end of the current billing period.",
  };
}
