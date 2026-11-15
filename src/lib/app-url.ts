import "server-only";

/**
 * Resolve the public origin for links we put in emails and checkout redirects.
 * Prefer the configured app URL, then Vercel's trusted deployment host. We do
 * not use request headers here, because they can be influenced by the caller
 * and would otherwise allow host-header poisoning of password-reset links.
 */
export async function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  throw new Error("NEXT_PUBLIC_APP_URL is not configured");
}
