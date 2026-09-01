import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';

export async function POST(request, { params }) {
  // 1. Auth check — get user.id from session. Reject if absent.
  const { user, error: authError, status: authStatus } = await requireAuth();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError || 'Unauthenticated' },
      { status: authStatus || 401 }
    );
  }

  const { id } = await params;
  const listing_id = parseInt(id, 10);

  if (!listing_id) {
    return NextResponse.json(
      { error: 'Invalid listing_id' },
      { status: 400 }
    );
  }

  try {
    // Confirm the requesting user owns the listing (lister_uuid match).
    const { data: listingRow, error: listingErr } = await paymentsSupabase
      .from('listings_table')
      .select('listing_id, plan_name, payment_status, lister_uuid')
      .eq('listing_id', listing_id)
      .single();

    if (listingErr) {
      if (listingErr.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: listingErr.message }, { status: 500 });
    }

    if (listingRow.lister_uuid !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 2. Guarded delete — only delete if still pending.
    const { data: deleted, error: deleteErr } = await paymentsSupabase
      .from('listings_table')
      .delete()
      .eq('listing_id', listing_id)
      .eq('payment_status', 'pending')
      .select('listing_id');

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // 3. Zero rows affected — payment already completed in the meantime (race).
    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          already_paid: true,
          message: 'Listing is already paid and was not deleted.',
        },
        { status: 200 }
      );
    }

    // 4. Row deleted — log to listing_abandon_log.
    const { error: logErr } = await paymentsSupabase
      .from('listing_abandon_log')
      .insert({
        listing_id,
        plan_name_offered: listingRow.plan_name,
        reason: 'rejected',
        abandoned_at: new Date().toISOString(),
      });

    if (logErr) {
      console.error('[listings/cancel] abandon log insert error:', logErr.message);
    }

    // 5. Return success so frontend can show "listing removed" confirmation.
    return NextResponse.json(
      {
        success: true,
        already_paid: false,
        message: 'Listing removed.',
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}