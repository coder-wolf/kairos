import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const APP_PREFIXES = ["/dashboard", "/workspace", "/items", "/goals", "/analytics", "/history", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAppRoute = APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (!isAppRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get("kairos_session")?.value;
  const session = await decrypt(token);

  if (isAppRoute && !session) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
