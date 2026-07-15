import { createServerSupabaseClient } from '@/lib/supabase/server';
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

  // hot + warm only — decile logic is in the RPC, so just take top results
  return NextResponse.json({ data: filtered.slice(0, TRENDING_LIMIT) });
}