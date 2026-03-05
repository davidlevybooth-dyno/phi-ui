import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  if (!isDashboard) return NextResponse.next();

  // Auth guard: check for session cookie set by the client after Firebase sign-in.
  // The actual Firebase token validation happens in the API layer via x-api-key header.
  // This is a lightweight client-side check — real auth enforcement is on the API.
  const hasSession = request.cookies.has("dyno-session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
