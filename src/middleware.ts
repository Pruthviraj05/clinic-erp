import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — the standard place for auth/role redirects.
 *
 * Runs BEFORE any page renders, so wrong-role or unauthenticated access is
 * redirected with a clean 307 and zero wasted server work (no shell render,
 * no data fetch). The per-section `requireRole` in layouts stays as
 * defense-in-depth and to resolve the session.
 *
 * TEMPORARY auth: the role is read from the demo cookie. When real auth lands,
 * verify a signed token/session here instead — the routing logic is unchanged.
 */

// Mirrors SESSION_COOKIE in src/lib/session.ts (kept inline to keep the edge
// bundle free of server-only imports).
const SESSION_COOKIE = "clinicore_role";

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

  const role = req.cookies.get(SESSION_COOKIE)?.value;

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
