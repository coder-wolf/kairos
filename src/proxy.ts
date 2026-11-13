import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const APP_PREFIXES = ["/dashboard", "/workspace", "/items", "/goals", "/analytics", "/history", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAppRoute = APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isAppRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get("kairos_session")?.value;
  const session = await decrypt(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
