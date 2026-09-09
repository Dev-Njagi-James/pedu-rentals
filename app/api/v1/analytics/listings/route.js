// app/api/v1/analytics/listings/route.js
// Lister-scoped listing analytics — v1 schema only (payments listings_table).
// Reviews/ratings data now; views/calls are placeholders pending the PostHog
// aggregation merge (see TODO below).

import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  try {
    const { user, error, status } = await requireAuth();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { data, error: dbError } = await paymentsSupabase
      .from('listings_table')
      .select('listing_id, listing_name, avg_rating, review_count, ward_location')
      .eq('lister_uuid', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const rows = (data ?? []).map((row) => ({
      ...row,
      // TODO: merge PostHog aggregated stats here once /lib/analytics/query.js exists
      views: null,
      call_logs: null,
    }));

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (err) {
    console.error('GET /api/v1/analytics/listings error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}