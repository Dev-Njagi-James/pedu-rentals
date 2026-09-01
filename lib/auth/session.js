import { auth, clerkClient } from '@clerk/nextjs/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

async function resolveIdentity() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { legacyUserId: null, clerkUser: null, error: 'Not authenticated', status: 401 };
  }

  const { data: mapping, error: mapError } = await paymentsSupabase
    .from('auth_identity_map')
    .select('legacy_user_id, status')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (mapError) {
    return { legacyUserId: null, clerkUser: null, error: mapError.message, status: 500 };
  }

  if (!mapping) {
    return { legacyUserId: null, clerkUser: null, error: 'Account not synced', status: 409 };
  }

  if (mapping.status !== 'active') {
    return { legacyUserId: null, clerkUser: null, error: `Identity ${mapping.status}`, status: 403 };
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);

  return { legacyUserId: mapping.legacy_user_id, clerkUser, error: null, status: 200 };
}

export async function requireAuth() {
  const { legacyUserId, error, status } = await resolveIdentity();

  if (error || !legacyUserId) {
    return { user: null, error: error || 'Unauthenticated', status: status || 401 };
  }

  return { user: { id: legacyUserId }, error: null, status: 200 };
}

export async function requireRole(role) {
  const { legacyUserId, clerkUser, error, status } = await resolveIdentity();

  if (error || !legacyUserId) {
    return { user: null, error: error || 'Unauthenticated', status: status || 401 };
  }

  if (clerkUser?.publicMetadata?.role !== role) {
    return { user: null, error: 'Forbidden', status: 403 };
  }

  return { user: { id: legacyUserId }, error: null, status: 200 };
}