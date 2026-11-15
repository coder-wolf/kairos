import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isBillingEntitled } from "@/lib/plan";

export const dynamic = "force-dynamic";

function validSignature(raw: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function asString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function asDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asHttpsUrl(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-signature") ?? "";
  const raw = await request.text();
  if (!signature || !validSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: Record<string, unknown> };
    data?: { type?: string; id?: string; attributes?: Record<string, unknown> };
  };

  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "";
  if (!eventName.startsWith("subscription_") || payload.data?.type !== "subscriptions") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const attrs = payload.data.attributes ?? {};
  const custom = payload.meta?.custom_data ?? {};
  let userId = asString(custom.user_id);
  const email = asString(attrs.user_email)?.toLowerCase() ?? null;
  const customerId = asString(attrs.customer_id);

  if (!userId && email) {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    userId = user?.id ?? null;
  }
  if (!userId && customerId) {
    const account = await db.billingAccount.findFirst({
      where: { customerId },
      select: { userId: true },
    });
    userId = account?.userId ?? null;
  }
  if (!userId) {
    console.warn("Lemon Squeezy webhook could not match a user", eventName, email);
    return NextResponse.json({ received: true, unmatched: true });
  }

  const variantId = asString(attrs.variant_id);
  const interval =
    variantId && variantId === process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID
      ? "monthly"
      : variantId && variantId === process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID
        ? "yearly"
        : null;

  const renewsAt = asDate(attrs.renews_at);
  const endsAt = asDate(attrs.ends_at);
  const trialEndsAt = asDate(attrs.trial_ends_at);
  const currentPeriodEnd = endsAt ?? renewsAt;
  const status = (asString(attrs.status) ?? eventName.replace("subscription_", "")).toLowerCase();
  const urls = (attrs.urls ?? {}) as Record<string, unknown>;
  const updateUrl = asHttpsUrl(urls.customer_portal);

  const data = {
    provider: "lemonsqueezy",
    customerId,
    subscriptionId: payload.data.id ?? null,
    variantId,
    productId: asString(attrs.product_id),
    orderId: asString(attrs.order_id),
    status,
    plan: isBillingEntitled({ status, endsAt, currentPeriodEnd, renewsAt }) ? "pro" : "free",
    interval,
    email,
    currentPeriodEnd,
    renewsAt,
    endsAt,
    trialEndsAt,
    updateUrl,
    cancelUrl: updateUrl,
  };

  await db.billingAccount.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return NextResponse.json({ received: true });
}
