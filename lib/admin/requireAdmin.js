import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  // Use the session claim if present, otherwise ask Clerk directly.
  let role = sessionClaims?.metadata?.role;
  if (!role) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    role = user.publicMetadata?.role;
  }

  if (role !== "admin") {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { userId };
}
