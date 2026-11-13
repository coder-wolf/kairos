import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("kairos_session");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
