import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveWardNames } from '@/lib/resolveWardName';
import { NextResponse } from 'next/server';

const TRENDING_LIMIT = 10;
const HIDDEN_LISTING_IDS = [40, 43, 34];

export const revalidate = 0;

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_listings_paginated', {
    p_limit: TRENDING_LIMIT + HIDDEN_LISTING_IDS.length,
    p_offset: 0,
    p_ward_id: null,
    p_category_id: null,
    p_type_ids: null,
    p_price_range: null,
    p_rent_duration: null,
    p_property_interior: null,
    p_listing_id: null,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trending listings', details: error.message },
      { status: 500 }
    );
  }

  const filtered = (data ?? []).filter(l => !HIDDEN_LISTING_IDS.includes(l.listing_id));

  // Reroute ward-name resolution to the new-scheme table (payments project).
  const wardMap = await resolveWardNames(filtered.map(l => l.ward_id));
  for (const l of filtered) {
    const resolved = wardMap.get(l.ward_id);
    l.ward_name = resolved?.ward_name ?? null;
    l.ward_id = resolved?.ward_id ?? l.ward_id;
  }

  // hot + warm only — decile logic is in the RPC, so just take top results
  return NextResponse.json({ data: filtered.slice(0, TRENDING_LIMIT) });
}