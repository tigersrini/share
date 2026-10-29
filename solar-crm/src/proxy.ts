import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/** Field (crew) logins may only open these areas. Everything else is office-only. */
const FIELD_PREFIXES = ["/my", "/sites", "/schedule", "/account"];
const isFieldPath = (p: string) => FIELD_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));

const PUBLIC_PATHS = ["/login", "/logo.png", "/wordmark.png", "/favicon.ico"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icon");
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role === "FIELD" && !isFieldPath(pathname)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    return NextResponse.redirect(new URL("/my", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
