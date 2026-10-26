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

// Role comes from the session token claim when configured
// ({ "metadata": "{{user.public_metadata}}" } in Clerk). Falls back to a
// Clerk API read so this works before the claim exists.
async function resolveRole() {
  const { userId: clerkUserId, sessionClaims } = await auth();
  if (!clerkUserId) return { clerkUserId: null, role: null };

  let role = sessionClaims?.metadata?.role;
  if (role === undefined) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    role = clerkUser?.publicMetadata?.role;
  }
  return { clerkUserId, role };
}

// Role first, identity second: wrong role is 403, never 409.
export async function requireRole(role) {
  const { clerkUserId, role: actual } = await resolveRole();
  if (!clerkUserId) {
    return { user: null, error: 'Not authenticated', status: 401 };
  }
  if (actual !== role) {
    return { user: null, error: 'Forbidden', status: 403 };
  }
  return resolveIdentity();
}

// Admin gate. Does NOT require a users_table row. user.id is the admin's
// lister_uuid when a row exists, otherwise null. user.clerkUserId is always set.
export async function requireAdmin() {
  const { clerkUserId, role } = await resolveRole();
  if (!clerkUserId) {
    return { user: null, error: 'Not authenticated', status: 401 };
  }
  if (role !== 'admin') {
    return { user: null, error: 'Forbidden', status: 403 };
  }

  const { user } = await resolveIdentity();
  return {
    user: { id: user?.id ?? null, clerkUserId },
    error: null,
    status: 200,
  };
}