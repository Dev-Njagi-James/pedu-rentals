// lib/auth/session.js
// Clerk session → legacy lister identity resolution.
//
// The identity source is users_table (payments project), keyed by the unique
// nullable clerk_user_id column. Users are only ever provisioned by
// app/api/v1/auth/sync/route.js — this file resolves, it never auto-provisions.

import { auth, clerkClient } from '@clerk/nextjs/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

// Shared resolution: Clerk userId → users_table.lister_uuid.
// Returns { user: { id }, error, status }. status 409 means /sync has not
// linked this Clerk user to a users_table row yet — a legitimate error state,
// not an auto-provision point (provisioning belongs in /sync only).
async function resolveIdentity() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { user: null, error: 'Not authenticated', status: 401 };
  }

  const { data, error } = await paymentsSupabase
    .from('users_table')
    .select('lister_uuid')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    return { user: null, error: error.message, status: 500 };
  }

  if (!data) {
    return { user: null, error: 'Account not synced', status: 409 };
  }

  return { user: { id: data.lister_uuid }, error: null, status: 200 };
}

export async function requireAuth() {
  return resolveIdentity();
}

export async function requireRole(role) {
  const { user, error, status } = await resolveIdentity();
  if (error) {
    return { user: null, error, status };
  }

  // Role lookup needs the Clerk user id — NOT user.id (that is the legacy
  // lister_uuid once resolved). Re-read the session's Clerk user id.
  const { userId: clerkUserId } = await auth();
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);

  if (clerkUser?.publicMetadata?.role !== role) {
    return { user: null, error: 'Forbidden', status: 403 };
  }

  return { user, error: null, status: 200 };
}