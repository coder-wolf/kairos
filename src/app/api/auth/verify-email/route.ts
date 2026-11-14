import { NextResponse, type NextRequest } from "next/server";
import { findAuthToken } from "@/lib/auth-tokens";
import { db } from "@/lib/db";
import { createSession, setThemeCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const record = await findAuthToken(token, "EMAIL_VERIFICATION");

  if (!record) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
    }),
    db.authToken.deleteMany({ where: { userId: record.userId, type: "EMAIL_VERIFICATION" } }),
  ]);

  await createSession(record.userId);
  await setThemeCookie(record.user.theme);

  return NextResponse.redirect(new URL("/dashboard?verified=1", request.url));
}
