import { redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/session";
import { can, ROLE_HOME, type Module, type PermissionAction, type Role } from "@/lib/rbac";

/**
 * Server-side route guard. Ensures there is a session and, optionally, that the
 * user holds one of the allowed roles — otherwise bounces to login or the
 * user's own home. Used by each role section's layout.
 */
export async function requireRole(...allowed: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  // Enforced here rather than only after login, so the forced change cannot
  // be skipped by navigating straight to a page.
  if (session.user.mustChangePassword) redirect("/change-password");
  if (allowed.length && !allowed.includes(session.user.role)) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return session;
}

/**
 * Page-level permission guard: session + `can(role, module, action)`, else
 * bounce to the user's home. Use in pages that expose a capability beyond
 * what the section layout's requireRole implies (e.g. an export screen).
 */
export async function requirePermission(
  module: Module,
  action: PermissionAction = "view",
): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  if (!can(session.user.role, module, action)) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return session;
}

export type AuthzResult =
  | { ok: true; session: Session }
  | { ok: false; message: string };

/**
 * Action-level permission check. Server actions return `ActionResult` instead
 * of redirecting, so this resolves the session and verifies the permission,
 * yielding either the session or an ActionResult-compatible failure:
 *
 *   const authz = await authorize("billing", "create");
 *   if (!authz.ok) return authz;
 *   const { user } = authz.session;
 */
export async function authorize(
  module: Module,
  action: PermissionAction,
): Promise<AuthzResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session has expired. Sign in again." };
  if (!can(session.user.role, module, action)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return { ok: true, session };
}
