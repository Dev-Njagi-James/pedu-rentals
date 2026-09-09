// app/api/v1/auth/sync/route.js
// Clerk session → users_table sync (v1). The old auth_identity_map select-then-
// insert is gone: this is a single atomic upsert keyed on users_table.clerk_user_id.
//
// NOTE on upsert semantics: supabase-js maps ignoreDuplicates:true to PostgREST
// `Prefer: resolution=ignore-duplicates` (ON CONFLICT ... DO NOTHING). PostgREST
// does NOT return a row for a conflicted insert, so a plain
// `.upsert(...).select('lister_uuid').maybeSingle()` returns empty when the
// Clerk user already exists. We therefore fall back to a select on
// clerk_user_id when the upsert returns nothing, so the existing row's
// lister_uuid is always returned (avoids the old select-then-insert race).

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;

  try {
    // 0. Legacy-email match — link a pre-migration users_table row (real email,
    //    clerk_user_id: null) to this Clerk user instead of minting a new
    //    lister_uuid and orphaning their existing listings/payments/subscriptions.
    //    is('clerk_user_id', null) means this only ever matches an unlinked row
    //    once: after the first login links it, later lookups by the same email
    //    find no unlinked row and fall through to the upsert. Two Clerk accounts
    //    sharing one email is intentionally NOT deduped in this pass.
    let legacyMatch = null;
    if (email) {
      const { data, error: legacyLookupError } = await paymentsSupabase
        .from('users_table')
        .select('lister_uuid, clerk_user_id')
        .eq('lister_email', email)
        .is('clerk_user_id', null)
        .maybeSingle();

      if (legacyLookupError) {
        return NextResponse.json({ error: legacyLookupError.message }, { status: 500 });
      }
      legacyMatch = data;
    }

    let legacyUserId = null;

    // Link an existing legacy row by email if one was found — skip the upsert.
    if (legacyMatch) {
      const { data: linked, error: linkError } = await paymentsSupabase
        .from('users_table')
        .update({ clerk_user_id: clerkUserId })
        .eq('lister_uuid', legacyMatch.lister_uuid)
        .select('lister_uuid')
        .maybeSingle();

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 });
      }

      legacyUserId = linked?.lister_uuid ?? legacyMatch.lister_uuid;
    }

    // No legacy email match — insert a fresh row (existing upsert path unchanged).
    if (!legacyMatch) {
      // 1. Atomic upsert — never select-then-insert.
      const { data, error } = await paymentsSupabase
        .from('users_table')
        .upsert(
          {
            lister_uuid: crypto.randomUUID(),
            clerk_user_id: clerkUserId,
            lister_email: email,
          },
          { onConflict: 'clerk_user_id', ignoreDuplicates: true }
        )
        .select('lister_uuid')
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      legacyUserId = data?.lister_uuid;

      // 2. A conflicted ignore-dup upsert returns no row — fetch the existing
      //    lister_uuid for this Clerk user instead of trusting the response.
      if (!legacyUserId) {
        const { data: existing, error: existingError } = await paymentsSupabase
          .from('users_table')
          .select('lister_uuid')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle();

        if (existingError) {
          return NextResponse.json({ error: existingError.message }, { status: 500 });
        }

        legacyUserId = existing?.lister_uuid ?? null;
      }
    }

    if (!legacyUserId) {
      return NextResponse.json(
        { error: 'Failed to resolve user identity' },
        { status: 500 }
      );
    }

    // 3. Role metadata — default unknown roles to 'lister'.
    if (!clerkUser.publicMetadata?.role) {
      await client.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { role: 'lister' },
      });
    }

    return NextResponse.json({ legacyUserId });
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}