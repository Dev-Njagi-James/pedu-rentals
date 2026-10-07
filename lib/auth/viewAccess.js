import { auth, clerkClient } from "@clerk/nextjs/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export async function getCallerRole() {
  const { userId } = await auth();
  if (!userId) return null;
  const client = await clerkClient();
  const u = await client.users.getUser(userId);
  return u.publicMetadata?.role ?? "user";
}

// Stub. Number 2 replaces this body with a query on the access-grants table.
export async function getAccessExpiry(listerUuid) {
  const { data, error } = await paymentsSupabase
    .from("contact_access_grants")
    .select("expires_at")
    .eq("lister_uuid", listerUuid)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.expires_at ?? null;
}

export async function hasActiveViewAccess(listerUuid) {
  try {
    const expiry = await getAccessExpiry(listerUuid);
    return Boolean(expiry) && new Date(expiry).getTime() > Date.now();
  } catch (err) {
    console.error("access check failed", err);
    return false; // fail closed
  }
}