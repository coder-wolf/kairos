"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/app-url";
import { requireWorkspace } from "@/lib/authz";
import { getBillingAccount, getPlanForUser } from "@/lib/billing";

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
