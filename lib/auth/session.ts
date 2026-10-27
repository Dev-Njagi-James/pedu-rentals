// lib/auth/session.ts
import { auth, clerkClient } from "@clerk/nextjs/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

// Clerk userId -> users_table.lister_uuid. 409 = /sync has not linked this user yet.
async function resolveIdentity() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { user: null, error: "Not authenticated", status: 401 };
  }

  const { data, error } = await paymentsSupabase
    .from("users_table")
    .select("lister_uuid")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    return { user: null, error: error.message, status: 500 };
  }

  if (!data) {
    return { user: null, error: "Account not synced", status: 409 };
  }

  return { user: { id: data.lister_uuid }, error: null, status: 200 };
}

export async function requireAuth() {
  return resolveIdentity();
}

// Role from the session token claim; falls back to a Clerk API read.
async function resolveRole() {
  const { userId: clerkUserId, sessionClaims } = await auth();
  if (!clerkUserId) return { clerkUserId: null, role: null };

  let role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role === undefined) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    role = clerkUser?.publicMetadata?.role as string | undefined;
  }
  return { clerkUserId, role };
}

// Role first, identity second: wrong role is 403, never 409.
export async function requireRole(role: string) {
  const { clerkUserId, role: actual } = await resolveRole();
  if (!clerkUserId) {
    return { user: null, error: "Not authenticated", status: 401 };
  }
  if (actual !== role) {
    return { user: null, error: "Forbidden", status: 403 };
  }
  return resolveIdentity();
}

// Admin gate. Does not require a users_table row.
export async function requireAdmin() {
  const { clerkUserId, role } = await resolveRole();
  if (!clerkUserId) {
    return { user: null, error: "Not authenticated", status: 401 };
  }
  if (role !== "admin") {
    return { user: null, error: "Forbidden", status: 403 };
  }

  const { user } = await resolveIdentity();
  return {
    user: { id: user?.id ?? null, clerkUserId },
    error: null,
    status: 200,
  };
}