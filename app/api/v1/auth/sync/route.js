import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: mapping, error: mapError } = await paymentsSupabase
    .from('auth_identity_map')
    .select('legacy_user_id, status')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (mapError) {
    return NextResponse.json({ error: mapError.message }, { status: 500 });
  }

  if (mapping && mapping.status !== 'active') {
    return NextResponse.json({ error: `Identity ${mapping.status}` }, { status: 403 });
  }

  let legacyUserId = mapping?.legacy_user_id;
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;

  if (!legacyUserId) {
    legacyUserId = crypto.randomUUID();

    const { error: insertMapError } = await paymentsSupabase
      .from('auth_identity_map')
      .insert({
        legacy_user_id: legacyUserId,
        clerk_user_id: clerkUserId,
        legacy_email: email,
        status: 'active',
        verified_at: new Date().toISOString(),
      });

    if (insertMapError) {
      return NextResponse.json({ error: insertMapError.message }, { status: 500 });
    }

    const { error: insertUserError } = await paymentsSupabase
      .from('users_table')
      .insert({
        lister_uuid: legacyUserId,
        lister_email: email,
        ward_name: null,
      });

    if (insertUserError) {
      return NextResponse.json({ error: insertUserError.message }, { status: 500 });
    }
  }

  if (!clerkUser.publicMetadata?.role) {
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: 'lister' },
    });
  }

  return NextResponse.json({ legacyUserId });
}