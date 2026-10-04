// app/api/v1/auth/sync/route.js
// Clerk session → users_table sync (v1). Sole provisioning point for
// users_table; lib/auth/session.js only resolves, never provisions.

// Flow: select by clerk_user_id → if missing, insert with ignoreDuplicates
// (ON CONFLICT DO NOTHING, race-safe) → re-select. PostgREST returns no row
// for a conflicted ignore-duplicates insert, so the re-select is what
// guarantees the existing lister_uuid is returned.
// Requires a UNIQUE constraint on users_table.clerk_user_id.

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

async function findListerUuid(clerkUserId) {
  const { data, error } = await paymentsSupabase
    .from("users_table")
    .select("lister_uuid")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  return { listerUuid: data?.lister_uuid ?? null, error };
}

export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    
    const [clerkUser, found] = await Promise.all([
      client.users.getUser(clerkUserId),
      findListerUuid(clerkUserId),
    ]);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;

    let { listerUuid, error } = found;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!listerUuid) {
      const { error: insertError } = await paymentsSupabase
        .from("users_table")
        .upsert(
          {
            lister_uuid: crypto.randomUUID(),
            clerk_user_id: clerkUserId,
            lister_email: email,
          },
          { onConflict: "clerk_user_id", ignoreDuplicates: true },
        );
      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 },
        );
      }

      ({ listerUuid, error } = await findListerUuid(clerkUserId));
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (!listerUuid) {
      return NextResponse.json(
        { error: "Failed to resolve user identity" },
        { status: 500 },
      );
    }

    // Role metadata — default unknown roles to 'lister'.
    if (!clerkUser.publicMetadata?.role) {
      await client.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { role: "lister" },
      });
    }

    return NextResponse.json({ listerUuid });
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
