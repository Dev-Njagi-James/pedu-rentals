import { auth, clerkClient } from "@clerk/nextjs/server";

export async function getCallerRole() {
  const { userId } = await auth();
  if (!userId) return null;
  const client = await clerkClient();
  const u = await client.users.getUser(userId);
  return u.publicMetadata?.role ?? "user";
}

// Stub. Number 2 replaces this body with a query on the access-grants table.
export async function hasActiveViewAccess(listerUuid) {
  return false;
}
