// app/api/analytics/listings/route.js

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveWardNames } from '@/lib/resolveWardName';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_analytics_listings', {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];

    // Reroute ward-name resolution to the new-scheme table (payments project).
    // Note: get_analytics_listings returns ward_name but NOT ward_id, so we
    // resolve by the listing's stored ward_id via a parallel query.
    const listingIds = rows.map(r => r.listing_id);
    const { data: wardRows, error: wardError } = listingIds.length
      ? await supabase.from('Property_Listing').select('listing_id, ward_id').in('listing_id', listingIds)
      : { data: [], error: null };

    if (wardError) {
      return NextResponse.json({ error: wardError.message }, { status: 500 });
    }

    const wardIdByListing = new Map((wardRows ?? []).map(r => [r.listing_id, r.ward_id]));
    const wardMap = await resolveWardNames([...wardIdByListing.values()]);
    for (const r of rows) {
      const storedWardId = wardIdByListing.get(r.listing_id);
      const resolved = storedWardId != null ? wardMap.get(storedWardId) : null;
      r.ward_name = resolved?.ward_name ?? null;
    }

    return NextResponse.json({ data: rows }, { status: 200 });

  } catch (err) {
    console.error('GET /api/analytics/listings error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}