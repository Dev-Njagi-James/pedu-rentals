import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export const revalidate = 0;

export async function POST() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const client = await clerkClient();
  const current = await client.users.getUser(clerkUserId);
  const role = current.publicMetadata?.role;

  if (role === "lister" || role === "admin") {
    return NextResponse.json({ data: { role } });
  }
  const { error: dbError } = await paymentsSupabase
    .from("users_table")
    .update({ account_type: "Lister" })
    .eq("clerk_user_id", clerkUserId);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: "lister" },
  });

  return NextResponse.json({ data: { role: "lister" } });
}
