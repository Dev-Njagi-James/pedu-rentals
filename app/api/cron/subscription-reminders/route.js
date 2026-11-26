import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendReminder } from '@/lib/notifications/dispatch';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function verifyCronAuth(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return { ok: false, error: 'CRON_SECRET not configured', status: 500 };
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing Authorization header', status: 401 };
  }
  const provided = authHeader.slice('Bearer '.length);
  const expected = cronSecret;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { ok: false, error: 'Invalid cron secret', status: 401 };
  }
  return { ok: true };
}

function maskEmail(email) {
  if (!email) return 'none';
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'masked';
  const visible = local.slice(0, 3).padEnd(3, '*');
  return `${visible}@${domain}`;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function resolveEmails(supabase, clerkUserIds, listerUuidToEmail) {
  const emails = new Map();
  const clerkUserIdsFiltered = clerkUserIds.filter(Boolean);
  if (clerkUserIdsFiltered.length > 0) {
    const client = await clerkClient();
    const chunks = chunkArray(clerkUserIdsFiltered, 100);
    for (const chunk of chunks) {
      try {
        const { data: users } = await client.users.getUserList({
          userId: chunk,
          limit: 100,
        });
        for (const u of users ?? []) {
          const email = u.primaryEmailAddress?.emailAddress;
          if (email) emails.set(u.id, email);
        }
      } catch (e) {
        console.error('[cron/reminders] clerk getUserList error', e?.message);
      }
    }
  }
  for (const [uuid, fallbackEmail] of Object.entries(listerUuidToEmail)) {
    if (fallbackEmail && !emails.has(uuid)) {
      emails.set(uuid, fallbackEmail);
    }
  }
  return emails;
}

export async function GET(request) {
  return handler(request);
}

export async function POST(request) {
  return handler(request);
}

async function handler(request) {
  const authResult = await verifyCronAuth(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const testTo = url.searchParams.get('testTo') ?? null;
  const writes = !dry && !testTo;

  const supabase = paymentsSupabase;

  const { data: candidates, error: rpcError } = await supabase
    .rpc('get_reminder_candidates', { p_channel: 'email' });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      candidates: 0,
      groups: 0,
      sent: 0,
      failed: 0,
      skipped_no_email: 0,
      skipped_claimed: 0,
      status_update_failed: 0,
      dry,
      test: testTo ? maskEmail(testTo) : null,
    });
  }

  const groups = new Map();
  for (const c of candidates) {
    const key = `${c.lister_uuid}|${c.kind}`;
    if (!groups.has(key)) {
      groups.set(key, {
        lister_uuid: c.lister_uuid,
        clerk_user_id: c.clerk_user_id,
        kind: c.kind,
        listings: [],
        lister_email_fallback: c.lister_email,
      });
    }
    groups.get(key).listings.push({
      name: c.listing_name,
      publishedAt: c.published_at,
      expiresAt: c.expires_at,
      plan: c.plan_name,
      subscription_id: c.subscription_id,
    });
  }

  const listerUuids = Array.from(groups.values()).map(g => g.lister_uuid);
  const clerkUserIds = Array.from(groups.values()).map(g => g.clerk_user_id).filter(Boolean);
  const listerUuidToEmail = Object.fromEntries(
    Array.from(groups.values()).map(g => [g.lister_uuid, g.lister_email_fallback])
  );

  const emailMap = await resolveEmails(supabase, clerkUserIds, listerUuidToEmail);

  const PROD_BASE = 'https://www.pedurentals.com';
  const envBase = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const baseUrl =
    process.env.NODE_ENV === 'production' &&
    (!envBase || /localhost|127\.0\.0\.1/.test(envBase))
      ? PROD_BASE
      : (envBase || PROD_BASE);
  const dashboardUrl = `${baseUrl}/Lister?tab=listings`;

  let sent = 0;
  let failed = 0;
  let skippedNoEmail = 0;
  let skippedClaimed = 0;
  let statusUpdateFailed = 0;
  let testGroupsSent = 0;

  for (const group of groups.values()) {
    if (testTo && testGroupsSent >= 2) break;

    const email = emailMap.get(group.lister_uuid);
    if (!email) {
      console.warn(`[cron/reminders] No email for lister ${group.lister_uuid}, kind ${group.kind}`);
      skippedNoEmail++;
      continue;
    }

    const recipient = dry ? null : (testTo ?? email);

    let claimIds = group.listings.map(l => l.subscription_id);

    if (writes) {
      const { data: claimed, error } = await supabase.rpc('claim_reminders', {
        p_ids: group.listings.map(l => l.subscription_id),
        p_kind: group.kind,
        p_channel: 'email',
      });

      if (error) {
        console.error(`[cron/reminders] Claim failed for group ${group.lister_uuid}|${group.kind}:`, error.message);
        failed++;
        continue;
      }

      const claimedSet = new Set((claimed ?? []).map(r => r.claimed_id));
      const claimedListings = group.listings.filter(l => claimedSet.has(l.subscription_id));

      if (claimedListings.length === 0) {
        skippedClaimed++;
        continue;
      }

      claimIds = claimedListings.map(l => l.subscription_id);
      group.listings = claimedListings;
    }

    const listingsForEmail = group.listings.map(l => ({
      name: l.name,
      publishedAt: l.publishedAt,
      expiresAt: l.expiresAt,
      plan: l.plan,
    }));

    const result = await sendReminder({
      channel: 'email',
      to: recipient,
      kind: group.kind,
      listings: listingsForEmail,
      dashboardUrl,
    });

    if (writes) {
      let marked = false;
      for (let attempt = 0; attempt < 2 && !marked; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 300));
        }
        const { error: markError } = await supabase.rpc('mark_reminders', {
          p_ids: claimIds,
          p_kind: group.kind,
          p_channel: 'email',
          p_status: result.ok ? 'sent' : 'failed',
          p_error: result.ok ? null : result.error,
        });
        if (!markError) {
          marked = true;
        } else if (attempt === 1) {
          console.error(`[cron/reminders] mark_reminders failed:`, markError.message);
          statusUpdateFailed++;
        }
      }
    }

    if (result.ok) {
      sent++;
    } else {
      failed++;
      console.error(`[cron/reminders] Send failed for ${maskEmail(recipient)}:`, result.error);
    }

    if (testTo) testGroupsSent++;

    if (!dry) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  return NextResponse.json({
    candidates: candidates.length,
    groups: groups.size,
    sent,
    failed,
    skipped_no_email: skippedNoEmail,
    skipped_claimed: skippedClaimed,
    status_update_failed: statusUpdateFailed,
    dry,
    test: testTo ? maskEmail(testTo) : null,
  });
}