import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — the standard place for auth/role redirects.
 *
 * Runs BEFORE any page renders, so unauthenticated access is redirected with
 * a clean 307 and zero wasted server work (no shell render, no data fetch).
 * The per-section `requireRole` in layouts stays as defense-in-depth and to
 * resolve the actual session.
 *
 * Two cookies, mirroring src/lib/session.ts (kept inline to keep the edge
 * bundle free of server-only imports):
 * - `clinicore_role` — the hidden demo role-switcher (see /dev-login). Its
 *   value directly names the role, so middleware can gate sections on it
 *   without a DB call.
 * - `clinicore_session` — the real, HMAC-signed login. Its value is opaque
 *   (`<userId>.<hmac>`) — middleware can't cheaply resolve a role from it, so
 *   it only checks presence here and defers role enforcement to the
 *   server-side `requireRole()` in each section's layout.
 */

const DEMO_ROLE_COOKIE = "clinicore_role";
const SESSION_COOKIE = "clinicore_session";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/reception",
  PATIENT: "/portal",
};

const SECTION_ROLE: Record<string, string> = {
  "/admin": "ADMIN",
  "/doctor": "DOCTOR",
  "/reception": "RECEPTIONIST",
  "/portal": "PATIENT",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const section = Object.keys(SECTION_ROLE).find(
    (s) => pathname === s || pathname.startsWith(`${s}/`),
  );
  if (!section) return NextResponse.next();

  if (req.cookies.get(SESSION_COOKIE)?.value) {
    // Real login present — role enforcement happens in requireRole().
    return NextResponse.next();
  }

  const role = req.cookies.get(DEMO_ROLE_COOKIE)?.value;

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (role !== SECTION_ROLE[section]) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/reception/:path*", "/portal/:path*"],
};
